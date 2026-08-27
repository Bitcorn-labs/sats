# Plan: migrate to core, the 0.2.x ICRC libraries, and icp-cli

Sketch only. Nothing here is implemented.

Goal: reach the toolchain `XanderBrendon/sats` uses, **without losing block
history, holder balances, allowances or the archive**. Everything below is
sequenced so that each step is separately verifiable and separately revertible
until the point of no return, which is called out explicitly.

## What we are moving between

| | now | target |
|---|---|---|
| stdlib | `base` 0.12.1 | `core` 2.6.1 |
| ledger libs | icrc1/2/3/4-mo 0.0.x–0.3.5 | 0.2.1 / 0.4.3 |
| umbrella | `icrc-fungible` 0.0.7 | dropped, libraries used directly |
| actor | `shared actor class` | `persistent actor class` |
| compiler | dfx 0.28.0's moc | moc 1.14.1, pinned in `mops.toml` |
| CLI | `dfx` + `dfx.json` | `icp` + `icp.yaml` |
| frontend canister | asset canister | `@dfinity/static-site` |
| canister IDs in the UI | build-time `DEPLOY_ENV` | runtime `ic_env` cookie |

The frontend already runs on `@icp-sdk/core` and `@icp-sdk/bindgen`, so the UI
side of this is only the deployment mechanism.

## The state that must survive

| | production `4fu6t` | staging `5r3gp` |
|---|---|---|
| blocks | 42 | 48 |
| holders | 5 | 4 |
| separate archive canister | **none** | **none** |
| stable declarations in `Backend.mo` | 20 | 20 |

**No separate archive canister exists on either.** `icrc3_get_archives` returns
a single entry that is the ledger itself. That removes the hardest part of this
migration — the sibling GLDT ledger has 38,043 blocks in a *separate* archive
canister on older library code, and migrating that is a genuinely open problem.
Here there is nothing to migrate but the ledger's own state.

This is the single strongest argument for doing it **now** rather than later:
the moment block volume crosses the archive threshold, a separate archive
canister spawns and this plan gets materially harder.

## The actual risk

`icrc1-mo` 0.2.1 and `icrc3-mo` 0.4.3 each add a `v000_002_000` migration, so
the stored schema changes. The good news, from reading the libraries:

- the migration is implemented, not a stub: `upgrades = [v0_1_0.upgrade,
  v0_2_0.upgrade]` with a `migrate` that walks the chain by index;
- the v1 → v2 delta is a single field rename, `icrc85` →
  `var org_icdevs_ovs_fixed_state`.

So it is designed to work. It has never run against a ledger holding balances.

**The point of no return.** Once v2 state is written, the old module cannot read
it. There is no downgrade. Everything before the production upgrade is
reversible; that step is not.

## Sequence

### Phase 0 — make the current state reproducible
1. Snapshot production: every block via `icrc3_get_blocks`, every holder via
   `holders`, all 20 stable values via their query methods. Store as fixtures.
2. Write a comparison script that diffs a live canister against a fixture set.
   This is the instrument for every later phase; build it first.

### Phase 1 — port the backend, unreleased
3. Branch. Port `Backend.mo` to `core` and the 0.2.x libraries, using upstream's
   file as the worked example.
4. **Re-apply the four fixes upstream lacks** — the minting subaccount, the
   deposit mint caller, the withdraw re-mint caller, and the fee collector
   pointing at the canister's own account. Upstream has none of these, and a
   port that starts from his file silently loses all four.
5. Keep the three `let #v0_1_0(#data(_)) = ..._migration_state` assertions.
   Upstream deletes them; they are what traps if the state version is not what
   the code expects, which is exactly the failure this phase risks.
6. Build under moc 1.14.1. Confirm the Candid delta is additive.

### Phase 2 — rehearse on staging, with state
7. Ensure staging holds real state first: several holders, a spread of block
   types, a non-trivial block count. An empty ledger does not exercise a
   migration.
8. Capture the fixture set.
9. Upgrade staging. Then diff against the fixtures: every block, every holder
   balance, every stable value.
10. Exercise wrap, unwrap, transfer, approve, fee collection. Confirm the
    invariant and that block numbering continues rather than restarting.

### Phase 3 — deployment mechanism, independently
11. `icp.yaml` alongside `dfx.json`, both able to build the same wasm. Compare
    hashes: they should be identical, since the toolchain is pinned in
    `mops.toml` rather than by the CLI.
12. Create a **production frontend canister** on the static-site recipe. This
    does not exist yet, so there is nothing to migrate — it can start on the new
    stack. Doing this first also removes the build-time `DEPLOY_ENV` switch,
    which is what caused Rivver F1 and F7.
13. Retire `dfx.json` only once `icp` has deployed both canisters successfully.

### Phase 4 — production
14. Cycles check first. An upgrade can fail at install for want of cycles while
    the canister reports Running.
15. Capture production fixtures immediately before.
16. Upgrade. Diff against fixtures.
17. Wrap and unwrap for real, smallest viable amount.

## Notes

- **Do not bundle this with anything.** No behavioural change, no new endpoint,
  no dependency bump beyond the ones listed, in the same release.
- `timer-tool` appears in upstream's dependencies but nothing beyond its own
  initialisation uses it. Do not adopt it without a reason.
- The `upgradeError` / `upgradeComplete` stable variables are retained here
  deliberately and must be carried across, or the stable signature changes on
  top of everything else.
