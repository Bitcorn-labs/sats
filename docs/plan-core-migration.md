# Plan: migrate to core and the 0.2.x ICRC libraries

Sketch only. Nothing here is implemented.

Goal: reach the library stack `XanderBrendon/sats` uses, **without losing block
history, holder balances, allowances or the archive**.

## The key finding: this is two migrations, not one

They were originally planned as one change. They are independent, and only one
of them carries risk.

| | half A — libraries | half B — CLI |
|---|---|---|
| what moves | `base`→`core`, icrc\*-mo 0.0.x→0.2.x, `persistent actor`, moc 0.14.13→1.14.1 | `dfx.json`→`icp.yaml`, asset canister→static-site, build-time `DEPLOY_ENV`→runtime `ic_env` cookie |
| risk | **a `v000_002_000` stable-state migration** | none to state |
| can be done alone | **yes** | yes |
| required | for parity with upstream | optional |

**dfx can build the new stack.** This was tested, not assumed: upstream's tree —
`core 2.6.1`, `icrc*-mo 0.2.x`, `persistent actor class`, no `icrc-fungible` —
was built with `dfx build` and produced a wasm. The only change needed was one
environment variable.

```bash
DFX_MOC_PATH=$HOME/.cache/mops/moc/1.14.1/moc dfx build --network ic backend
```

The real coupling is compiler-to-library, not dfx-to-library:

| | moc 0.14.13 (dfx 0.28.0's own) | moc 1.14.1 (mops-managed) |
|---|---|---|
| icrc3-mo **0.3.5** (ours) | builds | fails M0219 |
| icrc3-mo **0.4.3** (upstream) | fails | builds |

That is also why dfx 0.31.0 cannot build this project today — a newer bundled
compiler meeting an older library, not a dfx defect.

So half A can be taken while keeping `dfx.json`, `dfx deploy`,
`canister_ids.json` and the asset canister exactly as they are. Half B becomes a
separate decision, judged on its own merits.

`dfx.json` has no field for the compiler path — only `args` for extra moc
flags — so `DFX_MOC_PATH` has to be an environment variable. Put it in the npm
build scripts, never in a runbook step someone can forget: a build with the
wrong compiler fails loudly (M0219), but the failure looks like a broken
project rather than a missing variable, which is exactly the confusion that
cost time earlier.

---

# Half A — libraries and compiler

## The state that must survive

| | production `4fu6t` | staging `5r3gp` |
|---|---|---|
| blocks | 42 | 48 |
| holders | 5 | 4 |
| separate archive canister | **none** | **none** |
| stable declarations | 20 | 20 |

**Neither canister has spawned a separate archive canister.**
`icrc3_get_archives` returns a single entry that is the ledger itself. There is
nothing to migrate but the ledger's own state.

That is the argument for doing this **now**. Once block volume crosses the
archive threshold, a separate archive canister spawns running old library code,
and the problem becomes the one the sibling GLDT ledger has — 38,043 blocks in
an archive on `icrc3-mo` 0.2.6, which is genuinely unsolved.

## The risk

`icrc1-mo` 0.2.1 and `icrc3-mo` 0.4.3 each add a `v000_002_000` migration, so
the stored schema changes. From reading the libraries:

- the migration is implemented, not a stub: `upgrades = [v0_1_0.upgrade,
  v0_2_0.upgrade]`, with a `migrate` that walks the chain by index;
- the v1 → v2 delta is a single field rename, `icrc85` →
  `var org_icdevs_ovs_fixed_state`.

Designed to work. Never run against a ledger holding balances.

**Point of no return:** once v2 state is written the old module cannot read it.
Everything before the production upgrade is reversible; that step is not.

## Sequence

**Phase 0 — make current state reproducible**
1. Snapshot production: every block, every holder, all 20 stable values. Store
   as fixtures.
2. Write a script that diffs a live canister against a fixture set. Build this
   first — it is the instrument for every later phase.

**Phase 1 — port, unreleased**
3. Branch. Port `Backend.mo` to `core` and the 0.2.x libraries, using upstream's
   file as the worked example.
4. **Re-apply the four fixes upstream lacks**: the minting subaccount, the
   deposit mint caller, the withdraw re-mint caller, and the fee collector
   pointing at the canister's own account. A port that starts from his file
   silently loses all four.
5. Keep the three `let #v0_1_0(#data(_)) = ..._migration_state` assertions.
   Upstream deletes them; they are what traps if the state version is not what
   the code expects — precisely the failure this phase risks.
6. Add `DFX_MOC_PATH` to the npm build scripts. Confirm the Candid delta is
   additive.

**Phase 2 — rehearse on staging, with state**
7. Give staging real state first: several holders, a spread of block types, a
   non-trivial block count. An empty ledger does not exercise a migration.
8. Capture fixtures.
9. Upgrade staging. Diff against fixtures: every block, every holder balance,
   every stable value.
10. Exercise wrap, unwrap, transfer, approve, fee collection. Confirm the
    invariant, and that block numbering continues rather than restarting.

**Phase 3 — production**
11. Cycles check. An upgrade can fail at install for want of cycles while the
    canister reports Running.
12. Capture production fixtures immediately before.
13. Upgrade. Diff against fixtures.
14. Wrap and unwrap for real, smallest viable amount.

## Notes

- Do not bundle half A with anything: no behavioural change, no new endpoint, no
  half B, in the same release.
- `timer-tool` appears in upstream's dependencies but nothing beyond its own
  initialisation uses it. Do not adopt it without a reason.
- `upgradeError` / `upgradeComplete` are retained here deliberately and must be
  carried across, or the stable signature changes on top of everything else.

---

# Half B — CLI and deployment

Independent of half A, and safe to defer indefinitely.

**What it buys.** The `ic_env` cookie serves each deployment its own canister
IDs, so one bundle is correct everywhere and the build-time staging/production
switch disappears. That switch is what caused Rivver F1 (staging frontend
driving the production backend) and F7 (`dfx deploy` silently shipping the
wrong-environment bundle). Adopting it removes that class of bug rather than
mitigating it.

**What it costs.** `icp.yaml` replaces `dfx.json`, the frontend canister type
changes, and every deploy path and runbook changes with it.

**The natural trigger.** There is no SATS production frontend canister —
`canister_ids.json` has `frontend` as local-only. Creating one is the moment to
decide, because starting on the static-site recipe is free whereas migrating an
existing asset canister later is not.

**Sequence, if taken**
1. Add `icp.yaml` alongside `dfx.json`; confirm both produce the same wasm hash
   (they should — the toolchain is pinned in `mops.toml`, not by the CLI).
2. Create the production frontend canister on the static-site recipe.
3. Move staging's frontend across; verify by fetching the live bundle, not by
   comparing module hashes — asset canisters hash identically regardless of
   contents, which is the F7 trap.
4. Retire `dfx.json` only once `icp` has deployed both canisters successfully.
