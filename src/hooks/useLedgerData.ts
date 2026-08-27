import { useCallback, useEffect, useRef, useState } from 'react';
import { Principal } from '@icp-sdk/core/principal';
import { createBackend, createCkbtc } from '../actors';
import { SATSCanisterID } from '../config';
import type { Fees } from '../lib/swap';
import type { Session } from './useAuth';

// What the backend ships with today. Shown for the instant before
// get_fee_breakdown() answers, then replaced by whatever it actually returns --
// the fees are admin-settable and the swap minimums derive from them.
const ASSUMED_FEES: Fees = {
  ckbtcLedger: 10n,
  protocol: 5n,
  satsTransfer: 100n,
};

// The previous implementation guarded refetches with a 2s window to keep tab
// switching from stacking up queries. Kept.
const REFETCH_WINDOW_MS = 2000;

export interface Vault {
  ckbtcInVault: bigint | null;
  satsSupply: bigint | null;
  holders: bigint | null;
}

export interface Balances {
  ckbtc: bigint;
  sats: bigint;
}

export interface LedgerData {
  vault: Vault;
  fees: Fees;
  balances: Balances;
  /// Refetch balances and vault totals. Skips if called again inside the
  /// refetch window unless `force` is set, which is what a completed
  /// transaction passes.
  refresh: (force?: boolean) => void;
}

const NO_VAULT: Vault = { ckbtcInVault: null, satsSupply: null, holders: null };
const NO_BALANCES: Balances = { ckbtc: 0n, sats: 0n };

export function useLedgerData(session: Session | null): LedgerData {
  const [vault, setVault] = useState<Vault>(NO_VAULT);
  const [fees, setFees] = useState<Fees>(ASSUMED_FEES);
  const [balances, setBalances] = useState<Balances>(NO_BALANCES);
  const lastFetch = useRef(0);

  // The vault total and supply are public and must render before anyone
  // connects, so they are read anonymously rather than through the session.
  const fetchPublic = useCallback(async () => {
    if (!SATSCanisterID) return;
    const backend = createBackend();

    const [ckbtcInVault, stats, breakdown] = await Promise.all([
      createCkbtc().icrc1_balance_of({
        owner: Principal.fromText(SATSCanisterID),
      }),
      backend.stats(),
      backend.get_fee_breakdown(),
    ]);

    setVault({
      ckbtcInVault,
      satsSupply: stats.totalSupply,
      holders: stats.holders,
    });
    setFees({
      ckbtcLedger: breakdown.ckbtc_ledger_fee,
      protocol: breakdown.canister_withdraw_fee,
      satsTransfer: breakdown.sats_transfer_fee,
    });
  }, []);

  const fetchBalances = useCallback(async (active: Session) => {
    const owner = Principal.fromText(active.principal);
    const [ckbtc, sats] = await Promise.all([
      active.ckbtc.icrc1_balance_of({ owner }),
      active.backend.icrc1_balance_of({ owner }),
    ]);
    setBalances({ ckbtc, sats });
  }, []);

  const refresh = useCallback(
    (force = false) => {
      const now = Date.now();
      if (!force && now - lastFetch.current < REFETCH_WINDOW_MS) return;
      lastFetch.current = now;

      fetchPublic().catch((error) =>
        console.error('Could not read vault totals:', error)
      );
      if (session) {
        fetchBalances(session).catch((error) =>
          console.error('Could not read balances:', error)
        );
      }
    },
    [session, fetchPublic, fetchBalances]
  );

  useEffect(() => {
    if (!session) setBalances(NO_BALANCES);
    refresh(true);
  }, [session]);

  return { vault, fees, balances, refresh };
}
