// Actor construction for the two ledgers this app talks to.
//
// Bindings come from @icp-sdk/bindgen (see vite.config.ts), which replaces
// `dfx generate`. Note the generated wrappers are idiomatic rather than raw
// Candid: `opt T` is an optional property, not `[] | [T]`, and variants carry a
// `__kind__` discriminator.
import type { Identity } from '@icp-sdk/core/agent';
import type { Principal } from '@icp-sdk/core/principal';
import { createActor as createBackendActor, Backend } from './bindings/backend';
import { createActor as createCkbtcActor, Ckbtc } from './bindings/ckbtc';
import { SATSCanisterID, ckbtcCanisterID, canisterEnv } from './config';

// The backend lives on whatever network served this page, so it gets no
// explicit `host`: the agent resolves the page origin on known gateway hosts
// (ic0.app, icp0.io, localhost) and falls back to https://icp-api.io elsewhere,
// which is what keeps a custom domain working. The matching root key travels in
// the ic_env cookie, so local networks need no fetchRootKey() round trip.
export const createBackend = (identity?: Identity): Backend => {
  if (!SATSCanisterID) {
    throw new Error(
      'No backend canister ID. The ic_env cookie is missing -- deploy the ' +
        'frontend canister, or run `icp deploy backend` before `npm start`.'
    );
  }
  return createBackendActor(SATSCanisterID, {
    agentOptions: { identity, rootKey: canisterEnv?.IC_ROOT_KEY },
  });
};

// ckBTC only exists on mainnet, so it is pinned there regardless of where this
// page is served -- and deliberately does NOT take the ic_env root key, which
// on a local network belongs to a different network than the one being called.
export const createCkbtc = (identity?: Identity): Ckbtc =>
  createCkbtcActor(ckbtcCanisterID, {
    agentOptions: { identity, host: 'https://icp-api.io' },
  });

export { Backend, Ckbtc };

// The slice of ICRC-1 that the generic send/receive UI needs. Both bindings are
// generated separately but land on the same shape here, so this lets one
// component drive either ledger without a union of two unrelated classes.
export interface Icrc1Ledger {
  icrc1_transfer(args: {
    to: { owner: Principal; subaccount?: Uint8Array };
    amount: bigint;
    fee?: bigint;
    memo?: Uint8Array;
    from_subaccount?: Uint8Array;
    created_at_time?: bigint;
  }): Promise<
    { __kind__: 'Ok'; Ok: bigint } | { __kind__: 'Err'; Err: unknown }
  >;
}
