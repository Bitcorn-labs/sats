# Plan: native BTC in and out, via the ckBTC minter

Sketch only. Nothing here is implemented.

Goal: `mainnet_deposit` and `mainnet_withdraw`, so a user sends **BTC** and
receives **SATS**, and burns **SATS** to receive **BTC**. The ckBTC leg happens
behind the scenes.

## The minter

`mqygn-kiaaa-aaaar-qaadq-cai`. Live parameters, read from it:

| | |
|---|---|
| `min_confirmations` | **4** Bitcoin blocks (~40 min) |
| `deposit_btc_min_amount` | 300 sats |
| `retrieve_btc_min_amount` | **50,000 sats** |
| `kyt_fee` / `get_deposit_fee()` | 100 sats |
| withdrawal fee @100k sats | `minter_fee` 300 + `bitcoin_fee` 230 |

Methods we need: `get_btc_address`, `update_balance`, `get_deposit_fee`,
`retrieve_btc_with_approval`, `retrieve_btc_status_v2`,
`estimate_withdrawal_fee`.

## Deposit: BTC → SATS

The key decision is **whose principal owns the BTC address**.

`get_btc_address({owner, subaccount})` derives an address from that pair. If
`owner` is the *user*, ckBTC mints to the user and they must then call
`deposit()` themselves — two steps, and they hold ckBTC in between. If `owner`
is **this canister** with a per-user subaccount, ckBTC mints to us and we mint
SATS to them. That is the "behind the scenes" behaviour, so:

```
subaccount := sha256("btc-deposit" ‖ user_principal)     deterministic, so we
                                                          always know whose
                                                          deposit a UTXO is
```

**Flow**

1. `mainnet_deposit_address()` → we call `get_btc_address({owner = this;
   subaccount = derived})` and return the BTC address. Cache it: derivation is
   deterministic, so the same user always gets the same address.
2. User sends BTC to it. **We are not involved and cannot observe this.**
3. After 4 confirmations, `mainnet_deposit()` calls
   `update_balance({owner = this; subaccount = derived})`. The minter mints ckBTC
   into `{this, derived}` and returns `vec UtxoStatus`.
4. We read the ckBTC balance of `{this, derived}`, move it to our main account,
   and mint `Convert.toSats(amount)` SATS to the user.

**What makes this harder than `deposit()`**

- **It is not synchronous.** Step 2 takes ~40 minutes and happens off-platform.
  The endpoint cannot be request/response the way `deposit()` is; it is
  "tell me if anything arrived", callable repeatedly.
- **`update_balance` is not a simple idempotent call.** It returns
  `vec UtxoStatus`, whose variants include `ValueTooSmall`, `Tainted`, and
  `Checked`/`Minted`. `Tainted` means the Bitcoin checker rejected the UTXO —
  that BTC does not become ckBTC and the user must be told plainly.
  `NoNewUtxos` carries `current_confirmations` / `required_confirmations`, which
  is exactly what a UI should display while waiting.
- **Minimum mismatch.** The minter accepts deposits from 300 sats; our
  `deposit()` requires 1,000 raw ckBTC. A 300–999 sat deposit mints ckBTC into
  the user's subaccount that we would then refuse to wrap. Either lower our
  minimum for this path, or accumulate across UTXOs until the threshold is met,
  or reject with a clear message before the user sends anything.
- **Per-user ckBTC dust.** Each subaccount can retain a remainder. It belongs to
  that user and must be claimable, not swept.

## Withdraw: SATS → BTC

1. `mainnet_withdraw(btc_address, sats_amount)`.
2. Reject below the floor. `retrieve_btc_min_amount` is **50,000 sats**, which
   is `5_000_000_000_000` raw SATS — **50× our existing unwrap minimum**. This
   is the single most surprising number in this design and the error message
   must state it in raw SATS, in the caller's units.
3. Burn `Convert.burnable(sats_amount)`; the sub-satoshi remainder stays with
   the caller, exactly as `withdraw()` does today.
4. `icrc2_approve` the minter to spend our ckBTC.
5. `retrieve_btc_with_approval({address; amount; from_subaccount})` → the minter
   burns our ckBTC and broadcasts a Bitcoin transaction. Returns `block_index`.
6. Return that index so the caller can poll `retrieve_btc_status_v2`.

## Fee stack, end to end

A user sending BTC and later taking BTC back pays, in order:

```
BTC network fee        their wallet's, we never see it
minter deposit/kyt     100 sats
our conversion fee       5 sats-equivalent, on unwrap
ckBTC ledger fee        10 raw, on our outbound leg
minter withdrawal      300 sats + bitcoin_fee (~230 at current rates)
```

Roughly **645 sats plus their own network fee**, against a 50,000-sat minimum
withdrawal — about 1.3% at the floor, less above it. Worth surfacing as a quote
before the user commits, not discovered afterwards.

## Failure modes to design for

1. **BTC arrives, SATS mint fails.** ckBTC sits in `{this, derived}`. This must
   be recoverable: a retry that mints against an existing balance rather than a
   new UTXO. The existing `refund()` does not cover this, because the value
   arrived from the minter rather than from the caller.
2. **Tainted UTXO.** No ckBTC is minted. Surface the minter's own reason; do not
   translate it into a generic failure.
3. **`retrieve_btc_with_approval` fails after our burn.** Same shape as the bug
   fixed in `withdraw()` today: the SATS are gone and no BTC is coming. Inspect
   the result, re-mint on failure, and log loudly. Do not repeat the mistake.
4. **`AlreadyProcessing`.** The minter serialises retrievals per principal. All
   our withdrawals share *one* principal — this canister — so concurrent user
   withdrawals will collide. This needs a queue, and it is the least obvious
   constraint in the whole design.
5. **Malformed address.** Validate before burning anything.

## Open questions

- **Who pays for `update_balance`?** It costs cycles and can be called by
  anyone. An unauthenticated endpoint is a cycle-drain vector.
- **Does the 50,000-sat withdrawal floor make this product viable** for the
  micro-transaction use case SATS is pitched at? The wrapper's whole premise is
  cheap small transfers; native BTC withdrawal is the opposite.
- **Are both directions needed at once?** Deposit is materially simpler than
  withdrawal — no queue, no burn-then-fail path, a 300-sat floor instead of
  50,000. Shipping deposit first would deliver most of the value at a fraction
  of the risk.

## Sequence, if it proceeds

1. Read-only first: `mainnet_deposit_address()` and a status query. No value
   moves; the derivation and the minter wiring get proven.
2. Deposit, on staging, with real testnet-scale amounts.
3. Withdrawal, with the queue, only after deposit has run for a while.
4. Never both in one release.
