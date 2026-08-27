// Canister IDs this frontend talks to.
//
// Adapted from the upstream design repo, which resolves the backend ID at
// runtime from an `ic_env` cookie served by an icp-cli static-site canister.
// This project deploys to a dfx asset canister, which sets no such cookie, so
// the target is selected at BUILD time instead:
//
//   DFX_NETWORK=local   -> local replica backend
//   DEPLOY_ENV=staging  -> backend-staging
//   otherwise           -> production backend
//
// Build the staging bundle with `npm run build:staging` so the staging asset
// canister can never ship a bundle wired to production. Verify a deployment by
// fetching the live bundle and grepping for the expected canister id -- module
// hashes cannot distinguish one asset bundle from another.

const isLocal = process.env.DFX_NETWORK === 'local';
const isStaging = process.env.DEPLOY_ENV === 'staging';

// ckBTC ledger. An external mainnet canister that is not part of this project,
// so it is a constant rather than something a deploy injects.
export const ckbtcCanisterID = 'mxzaz-hqaaa-aaaar-qaada-cai';

export const SATSCanisterID = isLocal
  ? 'bkyz2-fmaaa-aaaaa-qaaaq-cai'
  : isStaging
    ? '5r3gp-3iaaa-aaaap-qqaeq-cai'
    : '4fu6t-haaaa-aaaap-quxda-cai';

export const deployTarget = isLocal ? 'local' : isStaging ? 'staging' : 'production';

// Only a local replica needs its root key fetched; on mainnet the agent has it
// built in. The upstream cookie carried one, so actors.ts still reads this --
// undefined is the correct value for every network we deploy to.
export const canisterEnv: { IC_ROOT_KEY?: Uint8Array } | undefined = undefined;
