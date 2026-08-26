# Build artifacts

Compiled canister module for this branch, committed so the deployed code can be
verified against source without rebuilding.

Built from commit `d1364a6` with **dfx 0.28.0** (`DFX_VERSION=0.28.0`).

## Hashes

| Artifact | SHA-256 |
|---|---|
| `backend.wasm` | `844bfb594b7742af176479ab0002d055b217672edbeca38de8dc4c65891c224f` |

`backend` and `backend-staging` share `backend/Backend.mo` and compile to the
same module, so a single `backend.wasm` covers both.

## Deployed state at time of commit

| Canister | ID | On-chain module | Matches |
|---|---|---|---|
| backend (production) | `4fu6t-haaaa-aaaap-quxda-cai` | `844bfb59…` | yes |

SATS has **no frontend canister and no staging environment**. The staging
canisters this repo inherited from Bobsplitter (`5r3gp…`, `coqqu…`) were
returned to that project on 2026-08-25, so `canister_ids.json` entries for them
do not describe anything SATS deploys.

## Reproducing

```bash
DFX_VERSION=0.28.0 dfx build --network ic backend
sha256sum .dfx/ic/canisters/backend/backend.wasm
```

The default dfx (0.31.0) **cannot build this project** — it rejects
`icrc3-mo@0.3.5` with M0219 (implicit transient). 0.27.0 and earlier fail on
`sha2@0.1.4`. Use 0.28.0.

## Minting account

This module moves the minting account off the canister's default account onto a
tagged subaccount, so that a transfer to `4fu6t-haaaa-aaaap-quxda-cai` is no
longer a burn. The subaccount lives in **ledger state, not init args** — an
upgrade alone does not move it. An existing deployment needs a one-time:

```bash
dfx canister --network ic call <canister> admin_update_icrc1 \
  '(vec { variant { MintingAccount = record {
     owner = principal "<canister>";
     subaccount = opt blob "\\6d\\69\\6e\\74\\69\\6e\\67\\00\\00\\00\\00\\00\\00\\00\\00\\00\\00\\00\\00\\00\\00\\00\\00\\00\\00\\00\\00\\00\\00\\00\\00" } } })'
```

Verify with `icrc1_minting_account`.
