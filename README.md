# SATS — a low-fee ckBTC wrapper

Wrap **ckBTC** into **SATS** and transact at a fraction of the cost. One raw ckBTC
unit — one satoshi — becomes `1.00000000 SATS`, and SATS is divisible to a further
8 decimals.

Moving ckBTC costs **10 satoshis** per transfer. Moving SATS costs
**0.000001 SATS**. That is roughly ten million times cheaper, which is the point:
low-friction transactions for automated processes.

> **Building an agent?** See **[SKILLS.md](SKILLS.md)** — a guide written for
> autonomous agents using SATS for Bitcoin-denominated micropayments: when
> wrapping is worth it, the exact call sequences, the unit conversions, and the
> failure modes to guard against.

## Canisters

| | Canister ID |
|---|---|
| Backend / SATS ledger (production) | `4fu6t-haaaa-aaaap-quxda-cai` |

**The backend canister *is* the SATS ledger.** It embeds `icrc-fungible`, so one
canister serves both the wrapper logic and the ICRC-1/2/3/4 token. There is no
separate ledger canister.

> ⚠️ Because the ledger's minting account is the canister itself, an ICRC-1
> transfer **to** the canister ID is a burn. The canister rejects these with a
> `can_transfer` guard, but never treat the canister ID as a recipient address.
> To get ckBTC back, call `withdraw`.

## Token

| | |
|---|---|
| Name | `Sat - 1 Satoshi` |
| Symbol | `SATS` |
| Decimals | 8 |
| Transfer fee | 100 raw (`0.000001 SATS`) |
| Standards | ICRC-1, ICRC-2, ICRC-3, ICRC-4, ICRC-10, ICRC-103, ICRC-106 |

## The conversion

```
raw_SATS = raw_ckBTC × 100_000_000
```

Both tokens use 8 decimals, but one raw ckBTC unit is a satoshi and is worth a
whole SATS. The arithmetic lives in [`backend/Convert.mo`](backend/Convert.mo)
and is covered by [`backend/tests/Convert.test.mo`](backend/tests/Convert.test.mo).

| ckBTC in | SATS out |
|---|---|
| `1_000` (minimum) | `100_000_000_000` |
| `10_000` | `1_000_000_000_000` |
| `100_000_000` (1 ckBTC) | `10_000_000_000_000_000` |

## Fees

| Action | Cost |
|---|---|
| Wrap | 20 raw ckBTC — two ckBTC ledger fees (approve + `transfer_from`). No protocol fee. |
| Unwrap | 15 raw ckBTC — 10 ckBTC network fee + 5 protocol fee |
| SATS transfer | 100 raw SATS |

Minimum deposit is **1,000 raw ckBTC** (`0.00001`). Minimum withdrawal is
**16 SATS** (`1_600_000_000` raw), since the release must clear the 15-raw fee.

---

# Wrapping: ckBTC → SATS

Two calls. Approve the backend to pull your ckBTC, then deposit.

`deposit(subaccount: opt vec nat8, amount: nat) -> (Result)` — `amount` is in
**raw ckBTC**.

### dfx

```bash
export DFX_WARNING=-mainnet_plaintext_identity
BACKEND=4fu6t-haaaa-aaaap-quxda-cai
CKBTC=mxzaz-hqaaa-aaaar-qaada-cai

# 1. approve — must cover the deposit PLUS the 10-raw ckBTC ledger fee
dfx canister --network ic call $CKBTC icrc2_approve "(record {
  spender = record { owner = principal \"$BACKEND\"; subaccount = null };
  amount = 10_010 : nat;
  fee = null; memo = null; from_subaccount = null;
  created_at_time = null; expected_allowance = null; expires_at = null;
})"

# 2. deposit — null subaccount = default
dfx canister --network ic call $BACKEND deposit '(null, 10_000 : nat)'
```

### icp

```bash
BACKEND=4fu6t-haaaa-aaaap-quxda-cai
CKBTC=mxzaz-hqaaa-aaaar-qaada-cai

icp canister call $CKBTC icrc2_approve "(record {
  spender = record { owner = principal \"$BACKEND\"; subaccount = null };
  amount = 10_010 : nat;
  fee = null; memo = null; from_subaccount = null;
  created_at_time = null; expected_allowance = null; expires_at = null;
})" --network ic

icp canister call $BACKEND deposit '(null, 10_000 : nat)' --network ic
```

Returns `variant { ok = record { … } }` carrying the ckBTC block index and the
SATS mint index, or `variant { err = text }`.

10,000 raw ckBTC mints `1_000_000_000_000` raw SATS — 10,000.00000000 SATS.

---

# Unwrapping: SATS → ckBTC

One call. No approval needed — `withdraw` burns from the caller's balance directly.

`withdraw(subaccount: opt vec nat8, amount: nat) -> (Result)` — `amount` is in
**raw SATS**.

### dfx

```bash
dfx canister --network ic call $BACKEND withdraw '(null, 1_600_000_000 : nat)'
```

### icp

```bash
icp canister call $BACKEND withdraw '(null, 1_600_000_000 : nat)' --network ic
```

That example burns 16.00000000 SATS and releases **1 raw ckBTC** (16 − 15 fee).

To size a withdrawal:

```
withdraw_amount = (desired_raw_ckBTC + 15) × 100_000_000
```

| Want out | `withdraw` amount |
|---|---|
| 1 sat (minimum) | `1_600_000_000` |
| 100 sats | `11_500_000_000` |
| 1,000 sats | `101_500_000_000` |

**Withdrawals floor to whole satoshis.** A request that is not a multiple of
`100_000_000` burns only the whole-satoshi portion; the remainder stays in your
balance. Nothing is lost to rounding.

---

# Checking balances

### dfx

```bash
P=<your-principal>
dfx canister --network ic call $CKBTC icrc1_balance_of \
  "(record { owner = principal \"$P\"; subaccount = null })" --query
dfx canister --network ic call $BACKEND icrc1_balance_of \
  "(record { owner = principal \"$P\"; subaccount = null })" --query
```

### icp

```bash
icp canister call $CKBTC icrc1_balance_of \
  "(record { owner = principal \"$P\"; subaccount = null })" --query --network ic
icp canister call $BACKEND icrc1_balance_of \
  "(record { owner = principal \"$P\"; subaccount = null })" --query --network ic
```

> **Units differ between the two calls.** `deposit` takes raw ckBTC; `withdraw`
> takes raw SATS. They are 1e8 apart. This is the easiest thing to get wrong.

---

# Development

### Toolchain

**Only dfx 0.28.0 builds this project.** Pin it:

```bash
export DFX_VERSION=0.28.0
```

dfx 0.31.0 rejects `icrc3-mo@0.3.5` with `M0219` (implicit transient);
dfx ≤ 0.27.0 fails on `sha2@0.1.4`.

### Build and test

```bash
npm install                                  # also runs `mops install`
DFX_VERSION=0.28.0 dfx build --network ic backend
npx mo-test                                  # conversion arithmetic
```

### Deploying the frontend

The frontend targets production by default. Build staging explicitly:

```bash
npm run build:staging
```

> ⚠️ `dfx deploy` **re-runs `npm run build` itself** and overwrites `dist/`.
> Building the staging bundle first is not enough — export the variable for the
> whole deploy command, or dfx will silently ship a production bundle and report
> success:
>
> ```bash
> export DEPLOY_ENV=staging
> DFX_VERSION=0.28.0 dfx deploy frontend-staging --network ic
> ```
>
> The asset-canister wasm hash is identical for both builds, so module hashes
> cannot detect a wrong-environment deploy. Verify by fetching the live bundle:
>
> ```bash
> curl -s https://<canister>.icp0.io/ | grep -oE '/assets/index-[a-z0-9]+\.js'
> ```
>
> and confirming it contains the expected backend canister ID.

### Metadata changes need a fresh install

`stable let icrc1_migration_state` only runs its initialiser on first install, so
editing `default_icrc1_args` and *upgrading* changes nothing. Either reinstall
(which wipes all balances) or use `admin_update_icrc1` at runtime — `#Name`,
`#Symbol`, `#Logo` and `#FeeCollector` are all updatable that way. After a runtime
change, fold the value back into the source or the next install will revert it.

## Licence

GNU — see [LICENSE](LICENSE).
