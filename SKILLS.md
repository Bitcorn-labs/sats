# SATS for agents

A guide for autonomous agents using the SATS wrapper to make Bitcoin-denominated
micropayments on the Internet Computer.

## Why this exists

ckBTC's smallest unit is one satoshi, and moving it costs **10 satoshis** per
transfer. That makes payments below a few hundred satoshis uneconomic and
payments below one satoshi impossible.

SATS solves both. One satoshi of ckBTC becomes `1.00000000 SATS`, and SATS is
divisible to a further 8 decimals. A SATS transfer costs `0.000001 SATS` —
one-millionth of a satoshi.

| | ckBTC | SATS |
|---|---|---|
| Smallest unit | 1 satoshi | 0.00000001 satoshi |
| Transfer fee | 10 satoshis | 0.000001 satoshi |
| Fee ratio | — | **10,000,000× cheaper** |

Wrapped SATS are backed 1:1 by ckBTC held in the canister and can be unwrapped
at any time.

## Canisters

| Purpose | Canister ID |
|---|---|
| SATS ledger + wrapper (production) | `4fu6t-haaaa-aaaap-quxda-cai` |
| SATS ledger + wrapper (staging) | `5r3gp-3iaaa-aaaap-qqaeq-cai` |
| ckBTC ledger | `mxzaz-hqaaa-aaaar-qaada-cai` |

The wrapper **is** the ledger — one canister exposes both `deposit`/`withdraw`
and the full ICRC-1/2/3/4 token interface. Test against staging first.

## The unit rule — read this before anything else

```
raw_SATS = raw_ckBTC × 100_000_000
```

Both tokens report 8 decimals, but they are **not** interchangeable amounts:

| Call | Units |
|---|---|
| `deposit(subaccount, amount)` | `amount` is **raw ckBTC** |
| `withdraw(subaccount, amount)` | `amount` is **raw SATS** |
| `icrc1_transfer` on the SATS ledger | raw SATS |
| `icrc2_approve` on the ckBTC ledger | raw ckBTC |

Passing a SATS amount where ckBTC is expected is off by a factor of 100 million.
This is the single most likely failure mode. Convert explicitly; never reuse a
variable across the boundary.

## Should you wrap at all?

Wrapping costs 20 satoshis (two ckBTC ledger fees). Unwrapping costs 15.

| Plan | Break-even |
|---|---|
| Wrap, transact, unwrap | **4+ transfers** (10 × N > 35) |
| Wrap and hold in SATS | **3+ transfers** (10 × N > 20) |
| Any sub-satoshi payment | **immediately** — ckBTC cannot represent it |

Below those thresholds, transact in ckBTC directly. Above them, wrap once and
stay wrapped for as long as the payment stream continues — the cost is in the
round trip, not the transfers.

## Wrapping: ckBTC → SATS

Two calls. `deposit` mints the **full** amount with no protocol fee.

```bash
BACKEND=4fu6t-haaaa-aaaap-quxda-cai
CKBTC=mxzaz-hqaaa-aaaar-qaada-cai

# 1. approve — must cover the deposit PLUS the 10-raw ckBTC ledger fee
dfx canister --network ic call $CKBTC icrc2_approve "(record {
  spender = record { owner = principal \"$BACKEND\"; subaccount = null };
  amount = 10_010 : nat;
  fee = null; memo = null; from_subaccount = null;
  created_at_time = null; expected_allowance = null; expires_at = null;
})"

# 2. deposit — raw ckBTC
dfx canister --network ic call $BACKEND deposit '(null, 10_000 : nat)'
```

icp CLI — same arguments, `--network` after them:

```bash
icp canister call $CKBTC icrc2_approve "(record { … })" --network ic
icp canister call $BACKEND deposit '(null, 10_000 : nat)' --network ic
```

Returns `variant { ok = record { <ckBTC block> : nat; <SATS mint index> : nat } }`.

`10_000` raw ckBTC mints exactly `1_000_000_000_000` raw SATS.

**Budget 20 raw ckBTC of headroom.** The approve and the `transfer_from` each
cost 10, charged to your account on top of the amount. To wrap a balance `B`,
deposit at most `B − 20` and approve `B − 10`.

## Unwrapping: SATS → ckBTC

One call. No approval — it burns from the caller's balance directly.

```bash
dfx canister --network ic call $BACKEND withdraw '(null, 1_600_000_000 : nat)'
```

```bash
icp canister call $BACKEND withdraw '(null, 1_600_000_000 : nat)' --network ic
```

Sizing:

```
withdraw_amount = (desired_raw_ckBTC + 15) × 100_000_000
```

The 15 is a **flat** fee — 10 for the ckBTC network fee, 5 protocol. Flat means
it is brutal on small amounts:

| Unwrap | You receive | Effective fee |
|---|---|---|
| 10,000 SATS | 9,985 sats | 0.15% |
| 1,000 SATS | 985 sats | 1.5% |
| 100 SATS | 85 sats | **15%** |
| 16 SATS | 1 sat | **94%** |

**Agents should batch unwraps.** Accumulate and unwrap once rather than
unwrapping per payment.

Withdrawals **floor to whole satoshis**. A request that is not a multiple of
`100_000_000` burns only the whole-satoshi portion and leaves the remainder in
your balance. Nothing is lost, but the released amount is `floor(amount / 1e8) − 15`.

## Transfers, balances, allowances

```bash
# balance — works on either ledger, units differ
dfx canister --network ic call $BACKEND icrc1_balance_of \
  "(record { owner = principal \"$P\"; subaccount = null })" --query

# pay someone in SATS
dfx canister --network ic call $BACKEND icrc1_transfer "(record {
  to = record { owner = principal \"$RECIPIENT\"; subaccount = null };
  amount = 1_000_000 : nat;
  fee = null; memo = null; from_subaccount = null; created_at_time = null;
})"
```

> **Sending a full balance:** the 100-raw fee is charged **on top of** the
> amount, not deducted from it. To empty an account, send `balance − 100`.
> Sending `balance` fails with `InsufficientFunds` — and the failure is easy to
> miss if you do not check the result.

## Errors an agent should handle

| Condition | Response |
|---|---|
| Deposit below minimum | `err = "amount too low - minimum deposit is 1000 raw ckBTC (0.00001)"` |
| Withdrawal below floor | `err = "amount too low - must exceed 15 SATS to cover fees"` — nothing is burned |
| Transfer to the canister ID | `err = "Cannot transfer to the token canister - this would burn your tokens. Use withdraw() to unwrap."` |
| Full-balance transfer | `Err = variant { InsufficientFunds }` — retry with `balance − 100` |

**Always inspect the result.** `deposit`, `withdraw` and `icrc1_transfer` all
return errors as *values*, not traps. A discarded result looks identical to
success.

> ⚠️ **Never use a canister ID as a payment recipient.** The wrapper's minting
> account is the canister itself, so under ICRC-1 a transfer to it is a burn.
> The canister rejects these with the error above, but the habit is dangerous:
> the same mistake on an unguarded ICRC-1 ledger destroys the tokens
> irreversibly. Recipients are always principals.

## Verifying solvency

Every SATS in circulation is backed by ckBTC in the canister. Any agent holding
a material balance can verify this independently:

```bash
# reserves × 1e8 must be >= total supply
dfx canister --network ic call $CKBTC icrc1_balance_of \
  '(record { owner = principal "4fu6t-haaaa-aaaap-quxda-cai"; subaccount = null })' --query
dfx canister --network ic call $BACKEND icrc1_total_supply '()' --query
```

The invariant holds exactly in normal operation — retained protocol fees are
matched by SATS minted to the fee collector, so reserves and supply move in
lockstep. A surplus means fees accrued unbacked; a deficit would mean insolvency
and should never occur.

## Worked example

An agent making 500 payments of 0.5 satoshi each:

```
Direct in ckBTC     impossible — 0.5 satoshi is below the smallest unit

Via SATS
  wrap 1_000 raw ckBTC                       20 sats
  500 transfers × 50_000_000 raw SATS         0.0005 sats in fees
  unwrap the remainder                       15 sats
  ────────────────────────────────────────────────────
  total cost                                ~35 sats
```

Payments that ckBTC cannot express at all, for the cost of three and a half
ckBTC transfers.

## Reference

- Token: `Sat - 1 Satoshi` / `SATS`, 8 decimals, transfer fee 100 raw
- Standards: ICRC-1, ICRC-2, ICRC-3, ICRC-4, ICRC-10, ICRC-103, ICRC-106
- Minimum deposit: 1,000 raw ckBTC (`0.00001`)
- Minimum withdrawal: 16 SATS (`1_600_000_000` raw)
- Candid UI: `https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=4fu6t-haaaa-aaaap-quxda-cai`

See [README.md](README.md) for deployment and development details.
