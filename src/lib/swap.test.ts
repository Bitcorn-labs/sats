import { describe, expect, it } from 'vitest';
import {
  MIN_WRAP_RAW_CKBTC,
  SCALE,
  maxPayable,
  minUnwrapRawSats,
  quote,
  type Fees,
} from './swap';

// The live values from the backend's get_fee_breakdown().
const fees: Fees = { ckbtcLedger: 10n, protocol: 5n, satsTransfer: 100n };

const wrap = (pay: bigint, balance = 10n ** 12n) =>
  quote({ mode: 'wrap', payRaw: pay, balanceRaw: balance, fees });
const unwrap = (pay: bigint, balance = 10n ** 20n) =>
  quote({ mode: 'unwrap', payRaw: pay, balanceRaw: balance, fees });

describe('wrap', () => {
  it('mints 1e8 raw SATS per raw ckBTC', () => {
    // The design's default: 0.001 ckBTC in, 100,000.00000000 SATS out.
    expect(wrap(100_000n).receiveRaw).toBe(100_000n * SCALE);
  });

  it('adds both ledger fees on top of the amount', () => {
    // approve costs one fee, transfer_from costs another; neither is taken
    // out of the deposit, so the account is debited amount + 20.
    expect(wrap(100_000n).totalRaw).toBe(100_020n);
  });

  it('has no sub-unit remainder', () => {
    expect(wrap(100_000n).remainderRaw).toBe(0n);
  });

  it('rejects below the backend minimum of 1000 raw', () => {
    expect(wrap(MIN_WRAP_RAW_CKBTC).belowMinimum).toBe(false);
    expect(wrap(MIN_WRAP_RAW_CKBTC - 1n).belowMinimum).toBe(true);
    expect(wrap(400n).belowMinimum).toBe(true);
  });

  it('treats an empty field as neither below minimum nor submittable', () => {
    const q = wrap(0n);
    expect(q.belowMinimum).toBe(false);
    expect(q.canSubmit).toBe(false);
  });

  it('flags a balance that cannot cover the amount plus both fees', () => {
    expect(wrap(100_000n, 100_020n).insufficient).toBe(false);
    expect(wrap(100_000n, 100_019n).insufficient).toBe(true);
  });

  it('is submittable only when it is at or above the minimum and affordable', () => {
    expect(wrap(100_000n, 100_020n).canSubmit).toBe(true);
    expect(wrap(100_000n, 100_019n).canSubmit).toBe(false);
    expect(wrap(999n).canSubmit).toBe(false);
  });
});

describe('unwrap', () => {
  it('releases whole satoshis less the 15 raw of fees', () => {
    // The design's default: 100,000 SATS in, 0.00099985 ckBTC out.
    expect(unwrap(100_000n * SCALE).receiveRaw).toBe(99_985n);
  });

  it('burns only the whole-satoshi part and leaves the remainder behind', () => {
    const q = unwrap(100_000n * SCALE + 42n);
    expect(q.totalRaw).toBe(100_000n * SCALE);
    expect(q.remainderRaw).toBe(42n);
    expect(q.receiveRaw).toBe(99_985n);
  });

  it('requires 16 whole SATS, one more than the fees consume', () => {
    expect(minUnwrapRawSats(fees)).toBe(16n * SCALE);
    expect(unwrap(16n * SCALE).belowMinimum).toBe(false);
    expect(unwrap(16n * SCALE).receiveRaw).toBe(1n);
    // 15 SATS releases exactly the fee, which the backend rejects.
    expect(unwrap(15n * SCALE).belowMinimum).toBe(true);
    expect(unwrap(16n * SCALE - 1n).belowMinimum).toBe(true);
  });

  it('never reports a negative release', () => {
    expect(unwrap(1n * SCALE).receiveRaw).toBe(0n);
  });

  it('flags a balance smaller than the requested amount', () => {
    const amount = 100_000n * SCALE;
    expect(unwrap(amount, amount).insufficient).toBe(false);
    expect(unwrap(amount, amount - 1n).insufficient).toBe(true);
  });

  it('lets the whole balance be unwrapped even with a remainder', () => {
    const balance = 16n * SCALE + 50n;
    const q = unwrap(balance, balance);
    expect(q.insufficient).toBe(false);
    expect(q.canSubmit).toBe(true);
    expect(q.remainderRaw).toBe(50n);
  });

  it('tracks a fee change instead of assuming 15', () => {
    const dearer: Fees = {
      ckbtcLedger: 20n,
      protocol: 30n,
      satsTransfer: 100n,
    };
    expect(minUnwrapRawSats(dearer)).toBe(51n * SCALE);
    const q = quote({
      mode: 'unwrap',
      payRaw: 100n * SCALE,
      balanceRaw: 10n ** 20n,
      fees: dearer,
    });
    expect(q.receiveRaw).toBe(50n);
  });
});

describe('maxPayable', () => {
  it('leaves room for both ledger fees when wrapping', () => {
    // The design's MAX: balance 0.04213770 becomes 0.04213750.
    expect(maxPayable('wrap', 4_213_770n, fees)).toBe(4_213_750n);
  });

  it('never goes negative on a dust balance', () => {
    expect(maxPayable('wrap', 5n, fees)).toBe(0n);
  });

  it('offers the whole balance when unwrapping, since the fee comes out of the release', () => {
    expect(maxPayable('unwrap', 421_377_000_000_000n, fees)).toBe(
      421_377_000_000_000n
    );
  });
});
