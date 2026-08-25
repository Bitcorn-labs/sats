// Single source of truth for the canister IDs this frontend talks to.
//
// The backend target is chosen at build time, not at runtime:
//   DFX_NETWORK=local   -> local replica backend
//   DEPLOY_ENV=staging  -> backend-staging
//   otherwise           -> production backend
//
// Build the staging bundle with `npm run build:staging` so the staging asset
// canister can never ship a bundle wired to production.

const isLocal = process.env.DFX_NETWORK === 'local';
const isStaging = process.env.DEPLOY_ENV === 'staging';

// ckBTC ledger. Name kept as gldtCanisterID for now so this diff stays
// reviewable; renamed in the cosmetic pass.
export const gldtCanisterID = 'mxzaz-hqaaa-aaaar-qaada-cai';

export const sGLDTCanisterID = isLocal
  ? 'bkyz2-fmaaa-aaaaa-qaaaq-cai'
  : isStaging
  ? '5r3gp-3iaaa-aaaap-qqaeq-cai'
  : 'i2s4q-syaaa-aaaan-qz4sq-cai';

export const deployTarget = isLocal
  ? 'local'
  : isStaging
  ? 'staging'
  : 'production';
