// The wrap/unwrap arithmetic, kept free of React so it can be tested directly.
//
// A units error here does not throw -- it wraps or releases the wrong amount --
// so every rule below mirrors one in backend/Convert.mo and backend/Backend.mo.

/// Raw SATS per raw ckBTC. One raw ckBTC unit is one satoshi, and one satoshi
/// is 1.00000000 SATS. Mirrors Convert.SCALE.
export const SCALE = 100_000_000n;

/// Backend.deposit rejects anything under 1000 raw ckBTC (0.00001).
export const MIN_WRAP_RAW_CKBTC = 1_000n;

export type Mode = 'wrap' | 'unwrap';

/// Live values from the backend's get_fee_breakdown(). They are admin-settable,
/// so nothing here hardcodes 10/5/100.
export interface Fees {
  /// The ckBTC ledger's own fee, raw ckBTC. Charged once per ledger operation.
  ckbtcLedger: bigint;
  /// Protocol revenue on unwrap, raw ckBTC. Taken out of the release.
  protocol: bigint;
  /// The SATS ledger fee, raw SATS. Only applies to plain SATS transfers.
  satsTransfer: bigint;
}

export interface Quote {
  /// Raw units of the token being paid in.
  payRaw: bigint;
  /// Raw units of the token coming back.
  receiveRaw: bigint;
  /// Wrap: total debited in raw ckBTC. Unwrap: total burned in raw SATS.
  totalRaw: bigint;
  /// Unwrap only: the sub-satoshi SATS that stays in the caller's balance.
  remainderRaw: bigint;
  belowMinimum: boolean;
  insufficient: boolean;
  canSubmit: boolean;
}

/// What unwrapping costs in raw ckBTC: the ledger's fee for sending the release
/// out, plus the protocol's cut. Both come out of the released amount.
export function unwrapFeeRawCkbtc(fees: Fees): bigint {
  return fees.ckbtcLedger + fees.protocol;
}

/// Wrapping pays the ledger twice out of pocket -- once to approve, once for the
/// backend's transfer_from -- and neither comes out of the deposit.
export function wrapFeeRawCkbtc(fees: Fees): bigint {
  return fees.ckbtcLedger * 2n;
}

/// The smallest unwrap the backend accepts: one satoshi more than the fees
/// consume, since Backend.withdraw requires gross > fees rather than >=.
export function minUnwrapRawSats(fees: Fees): bigint {
  return (unwrapFeeRawCkbtc(fees) + 1n) * SCALE;
}

export function quote(args: {
  mode: Mode;
  payRaw: bigint;
  balanceRaw: bigint;
  fees: Fees;
}): Quote {
  const { mode, payRaw, balanceRaw, fees } = args;

  const partial =
    mode === 'wrap'
      ? wrapQuote(payRaw, balanceRaw, fees)
      : unwrapQuote(payRaw, balanceRaw, fees);

  return {
    ...partial,
    payRaw,
    // An empty field is not an error, but it is not submittable either.
    canSubmit: payRaw > 0n && !partial.belowMinimum && !partial.insufficient,
  };
}

type PartialQuote = Omit<Quote, 'payRaw' | 'canSubmit'>;

function wrapQuote(
  payRaw: bigint,
  balanceRaw: bigint,
  fees: Fees
): PartialQuote {
  const totalRaw = payRaw + wrapFeeRawCkbtc(fees);
  return {
    receiveRaw: payRaw * SCALE,
    totalRaw,
    remainderRaw: 0n,
    belowMinimum: payRaw > 0n && payRaw < MIN_WRAP_RAW_CKBTC,
    insufficient: totalRaw > balanceRaw,
  };
}

function unwrapQuote(
  payRaw: bigint,
  balanceRaw: bigint,
  fees: Fees
): PartialQuote {
  // Only whole satoshis can leave as ckBTC; the rest is never burned.
  const wholeSats = payRaw / SCALE;
  const fee = unwrapFeeRawCkbtc(fees);

  return {
    receiveRaw: wholeSats > fee ? wholeSats - fee : 0n,
    totalRaw: wholeSats * SCALE,
    remainderRaw: payRaw % SCALE,
    belowMinimum: payRaw > 0n && wholeSats <= fee,
    // The burn carries no fee, so the balance only has to cover the request.
    insufficient: payRaw > balanceRaw,
  };
}

/// What MAX fills in. Wrapping has to leave both ledger fees behind; unwrapping
/// does not, because its fee comes out of the released ckBTC.
export function maxPayable(mode: Mode, balanceRaw: bigint, fees: Fees): bigint {
  if (mode === 'unwrap') return balanceRaw;
  const spendable = balanceRaw - wrapFeeRawCkbtc(fees);
  return spendable > 0n ? spendable : 0n;
}
