# Upstream diff spec

What still differs between this repository and `XanderBrendon/sats`, and what it
would take to close each gap. Upstream is a **reference**: this repository stays
canonical, and changes are pulled across deliberately rather than by merging.

Upstream forked at `f2161f2`, before four fixes landed here, so the difference
runs in both directions.

State at time of writing: branch `feat/frontend-redesign`, backend
`1642f22464e6983f`, production `4fu6t-haaaa-aaaap-quxda-cai` running
`b3a908318c9ccdd6`.

---

## 1. Already closed

| | |
|---|---|
| `Convert.mo` | identical — 0 differing lines |
| `CkBtcLedger.mo` | adopted verbatim, replaces `ICPTypes.mo` |
| `FakeBob.mo`, `FakeGLDT.mo`, `Types.mo` | deleted, 1,459 lines |
| Phase 4 archive stubs | removed, matching upstream |
| sGLDT memo comments | relabelled (bytes unchanged — they are on-chain) |
| Frontend | rebuilt to the upstream design, wired to our backend |

---

## 2. The remaining backend delta

`Backend.mo` differs by **767 lines**, and essentially all of it is one change:
the migration to `core` and the 0.2.x ICRC libraries.

```
base 0.12.1      -> core 2.6.1          icrc1-mo 0.0.16 -> 0.2.1
icrc-fungible    -> dropped              icrc2-mo 0.0.17 -> 0.2.1
cert             -> dropped              icrc3-mo 0.3.5  -> 0.4.3
devefi-icrc-ledger -> dropped            icrc4-mo 0.0.16 -> 0.2.1
                                         + class-plus 0.2.1, timer-tool 0.2.1
                                         moc pinned 1.14.1
```

Mechanically that is 13 `mo:core` imports, 19 `transient` annotations, a handful
of core API calls (`Array.toBlob` for `Blob.fromArray`), and the ICRC-85/OVS
plumbing the new libraries carry.

**Why this is not a mechanical port.** `icrc1-mo` 0.2.1 and `icrc3-mo` 0.4.3 both
add a `v000_002_000` stable-state migration, so the ledger's stored schema
changes. The migration is implemented — `upgrades = [v0_1_0.upgrade,
v0_2_0.upgrade]` with proper chain-walking — and the v1→v2 delta is one field
rename (`icrc85` → `var org_icdevs_ovs_fixed_state`). So it is upgradeable in
principle. It has never run against a ledger holding real balances.

**What it would take**

1. Port the imports and API calls; upstream's `Backend.mo` is the worked example.
2. Re-apply the fixes in §3 — upstream does not have them.
3. Rehearse the upgrade on `5r3gp-3iaaa-aaaap-qqaeq-cai` **with state**: wrap,
   confirm balances and history survive, unwrap. An empty ledger does not
   exercise a state migration.
4. Only then production. There is no downgrade path: the old module cannot read
   v2 state.

**Verdict.** Worth doing, not urgent. The gain is a modern toolchain and a
smaller dependency tree, not a fix. Do it as its own change, never alongside
anything else.

---

## 3. Fixes upstream is missing

Upstream forked before these. Anyone porting from it must re-apply them, and
they are worth offering back.

| | Where | Status upstream |
|---|---|---|
| **Refund passes the wrong caller** | `withdraw()` re-mint | **broken** |
| Minting account on a tagged subaccount | `default_icrc1_args` | absent |
| Deposit mint authorises as `minting_account.owner` | `deposit()` | absent |
| `get_fee_breakdown` reads the live fee | query | equivalent |

The first is a real defect. `icrc1().mint(caller, …)` authorises against
`state.minting_account.owner`, so passing the withdrawing user returns **401
unconditionally**: after a failed ckBTC transfer the burn is never reversed.
Upstream noticed the discarded result and added a `STUCK FUNDS` log around it,
treating the failure as expected rather than fixing the cause. Passing
`icrc1().get_state().minting_account.owner` makes the refund work.

The second matters on any fresh install: upstream's `minting_account` is back to
`subaccount = null`, which reopens the burn path — a transfer to the canister
destroys tokens. Production here is already on the tagged subaccount, and an
upgrade will not move it, so the exposure is limited to a reinstall.

The fourth is not a defect: upstream reads the `sats_transaction_fee` stable
variable, this repo reads `icrc1().fee()`. Both are correct; only ours cannot
drift if `#Fee` is changed at runtime.

---

## 4. Deployment stack

The largest structural difference, and the one with real operational value.

| | here | upstream |
|---|---|---|
| CLI | `dfx` + `dfx.json` | `icp` + `icp.yaml` |
| Frontend canister | asset canister | `@dfinity/static-site` |
| Canister IDs in the UI | build-time `DEPLOY_ENV` switch | runtime `ic_env` cookie |
| Bindings | `dfx generate` | `@icp-sdk/bindgen` |
| Agent | `@dfinity/agent` | `@icp-sdk/*` |

The bindings and agent are **already adopted** — the frontend rebuild took both.
What remains is the deployment itself.

The `ic_env` cookie is the interesting part. Each deployment serves its own
canister IDs, so one bundle is correct everywhere and there is no build-time
staging/production switch. That switch is precisely what caused Rivver findings
F1 (staging frontend driving the production backend) and F7 (`dfx deploy`
silently shipping the wrong-environment bundle). Adopting it removes that class
of bug rather than mitigating it.

Cost: `icp.yaml` replaces `dfx.json`, the frontend canister type changes, and
every deploy path and runbook changes with it. `src/config.ts` here carries the
one deliberate divergence and documents why.

**Blocked on a prerequisite.** There is no SATS production frontend canister —
`canister_ids.json` has `frontend` as local-only. Creating one is the natural
moment to decide this, since it is cheaper to start on the new stack than to
migrate later.

---

## 5. Files

Upstream has, we do not:

- `CLAUDE.md` — repo instructions for agents. Worth adopting.
- `icp.yaml`, `.icp/data/mappings/staging.ids.json` — see §4.
- `mops.lock` — gitignored here; the global `mops` (2.13.2) writes v3 and the
  pinned `ic-mops` (0.39.2) reads v1 only, so a stray global run breaks
  `npm install`.

We have, upstream does not:

- `wasm/` — committed artifacts, checksums and reproduction steps. **Keep.**
  Governance and audit both depend on a reproducible hash.
- `dfx.json`, `canister_ids.json` — see §4.
- `ntn/ntntest.mo` — the `devefi-icrc-ledger` integration client. It points at
  `5r3gp…` and is a genuine third-party ICRC compliance check. Keep, retarget.
- `deploy_loop.sh`, `scripts/send-tokens.sh` — operational scripts.

---

## 6. Suggested order

1. **Push the fixes in §3 upstream.** They cost nothing here and the refund bug
   is live in his tree.
2. **Create a production frontend canister**, and decide §4 at that moment.
3. **The library migration**, on its own, rehearsed against staging with state.

Nothing in §2 or §4 is required for the current deployment to be correct.
