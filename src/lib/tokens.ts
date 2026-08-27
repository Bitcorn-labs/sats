import type { Fees } from './swap';

export type Ticker = 'ckBTC' | 'SATS';

export const TICKERS: readonly Ticker[] = ['SATS', 'ckBTC'];

/// The ledger fee for a plain icrc1_transfer of this token, in its raw units.
export function transferFee(ticker: Ticker, fees: Fees): bigint {
  return ticker === 'SATS' ? fees.satsTransfer : fees.ckbtcLedger;
}
