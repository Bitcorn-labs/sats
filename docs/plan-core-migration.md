# Plan: migrate to core and the 0.2.x ICRC libraries

**Status: attempted on staging, blocked. Do not attempt as a plain upgrade.**

An earlier draft of this document said the migration was safe because the
library's own v1→v2 migration was implemented and the delta was a single field
rename. That was wrong, and the attempt is what established it. This version
records what actually happens.

## What was attempted

On branch `feat/core-migration`, against staging `5r3gp` (48 blocks, 4 holders):

- `mops.toml` moved to `core 2.6.1`, `icrc1/2/4-mo 0.2.1`, `icrc3-mo 0.4.3`,
  `class-plus 0.2.1`, `timer-tool 0.2.1`; `base` and `devefi-icrc-ledger`
  retained for `ntn/ntntest.mo`.
- `ic-mops` upgraded 0.39.2 → 3.1.0; the old CLI cannot read `[toolchain]`.
- `Backend.mo` ported, using upstream's already-ported file as the base and
  re-applying the fixes it lacks.
- Built through **dfx** with `DFX_MOC_PATH` pointing at the mops-managed
  moc 1.14.1.

**The port compiles.** `dfx build` produces a wasm, and its Candid interface is
identical to the deployed one: 52 methods, none added, none removed.

**The upgrade is refused.** Three times, for three different reasons, and the
canister was never written to — all five fixture files were byte-identical
before and after.

## The blocker

```
stable variable `icrc1_migration_state` is not compatible with the previous version

  [var ?(keys, values, indexes, bounds)]              <- mo:map 9.x, icrc1-mo 0.0.16
is not compatible with
  {var root : Node<Account, Balance>; var size : Nat} <- mo:core,   icrc1-mo 0.2.1

in `Map` ... in `accounts` in `State`
```

The account map's underlying data structure changed: an array-based hash map
became a tree. The same applies to the icrc2, icrc3 and icrc4 states.

**Why the earlier reasoning failed.** The libraries do ship a `v0_1_0.upgrade →
v0_2_0.upgrade` chain, and within 0.2.1 that delta really is one field rename.
But Motoko's stable-signature compatibility check runs **before** any library
migration code executes. The upgrade is rejected at the type level, so the
chain never runs. Checking the migration functions was checking the wrong thing;
what matters is whether the *stable types* are structurally compatible, and the
`Map` swap between 0.0.16 and 0.2.1 means they are not.

## Two findings worth keeping regardless

**This ledger has two ICRC-3 state variables.**

```motoko
stable let icrc3_migration_state = ICRC3.initialState();       // legacy, unused
stable var icrc3_migration_state_new = icrc3_migration_state;  // wired to the class
```

`icrc3_migration_state_new` is the one passed as `initialState` and written by
`onStorageChange`, so **it holds every block**. Upstream's file has only the
first name. A port based on his file discards the second — and with it the
entire block history. M0169 refused it, but anything that bypassed the check
would have destroyed the ledger's history silently.

**`total_deposit_fees` is dead but undroppable.** Never incremented — `deposit`
tracks `total_ledger_fees` instead — but it exists on the deployed canister, and
removing a stable variable is itself a compatibility break.

Both are reasons to be wary of any port that starts from upstream's file: it was
written for a canister that has never carried this one's history.

## Options, in the order I would consider them

**1. Do not migrate.** The 0.0.x libraries work. Everything gained today —
the fee routing, the memos, the refund and deposit error paths, the ICRC-103
correction — was achieved on them. The migration buys toolchain modernity and
parity with upstream, not correctness. This is the cheapest correct answer and
should be the default until something forces the issue.

**2. Explicit migration functions.** Motoko supports
`(with migration = func (old : OldState) : NewState { ... })`. It would have to
name the old `mo:map` representation, walk it, and rebuild each `mo:core` Map —
for icrc1, icrc2, icrc3 and icrc4. Substantial, and the failure mode is silent
data corruption rather than a refused upgrade. If taken, it needs its own
fixtures, its own rehearsal, and a way to verify every account balance and every
block survived.

**3. Reinstall and replay.** Wipe, re-mint balances from a snapshot. Loses the
block history, which was the thing worth protecting. Only viable while the
ledger is small — and it is small *now* (production 42 blocks, 5 holders), which
is the one argument for doing it soon rather than later.

**4. Wait.** If a future `icrc*-mo` ships a migration path from 0.0.x, this
becomes routine. Worth asking upstream before building option 2.

## What is reusable

- `scratchpad/fixtures.sh` captures a ledger's full observable state — every
  block, every holder, all scalars and metadata — into a diffable directory. It
  is what proved staging was untouched, and it is the instrument any of options
  2 or 3 would need.
- The ported `Backend.mo` on `feat/core-migration`, with all our fixes
  re-applied and the two stable variables above restored. **Unpushed.** It
  compiles and its interface matches; only the state transition is unsolved.

## Half B is unaffected

`icp.yaml`, the static-site frontend canister and the `ic_env` cookie touch no
stable state and remain available independently. `DFX_MOC_PATH` was proven to
work — dfx built upstream's `core` tree — so the CLI was never the obstacle.
The obstacle is the ledger libraries' stable representation, and that would
block the migration under `icp` exactly as it does under `dfx`.
