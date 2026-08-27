import { describe, expect, it } from 'vitest';
import {
  formatRaw,
  isAmountInput,
  parseAmount,
  toDecimalString,
  trimTrailingZeros,
  truncatePrincipal,
} from './format';

describe('parseAmount', () => {
  it('reads whole and fractional parts exactly', () => {
    expect(parseAmount('0.001')).toBe(100_000n);
    expect(parseAmount('1')).toBe(100_000_000n);
    expect(parseAmount('0.00000001')).toBe(1n);
    expect(parseAmount('100000.00000000')).toBe(10_000_000_000_000n);
  });

  it('stays exact past 2^53, where float arithmetic loses digits', () => {
    // 1e8 SATS is 1e16 raw -- above Number.MAX_SAFE_INTEGER (~9.007e15).
    expect(parseAmount('100000000.00000001')).toBe(10_000_000_000_000_001n);
  });

  it('pads a short fraction rather than misreading its scale', () => {
    expect(parseAmount('1.5')).toBe(150_000_000n);
  });

  it('accepts the shorthand forms a user can type mid-entry', () => {
    expect(parseAmount('.5')).toBe(50_000_000n);
    expect(parseAmount('5.')).toBe(500_000_000n);
  });

  it('returns null for input that is not yet a number', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('.')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('1.2.3')).toBeNull();
    expect(parseAmount('-1')).toBeNull();
  });
});

describe('isAmountInput', () => {
  it('allows digits with at most eight decimals', () => {
    expect(isAmountInput('')).toBe(true);
    expect(isAmountInput('0.12345678')).toBe(true);
    expect(isAmountInput('.')).toBe(true);
    expect(isAmountInput('0.123456789')).toBe(false);
    expect(isAmountInput('1,000')).toBe(false);
    expect(isAmountInput('1e8')).toBe(false);
  });
});

describe('formatRaw', () => {
  it('groups the integer part and always shows eight decimals', () => {
    expect(formatRaw(10_000_000_000_000n)).toBe('100,000.00000000');
    expect(formatRaw(4_213_770n)).toBe('0.04213770');
    expect(formatRaw(0n)).toBe('0.00000000');
    expect(formatRaw(1n)).toBe('0.00000001');
  });

  it('groups values that exceed float precision', () => {
    expect(formatRaw(124_831_025_000_000_000n)).toBe('1,248,310,250.00000000');
  });
});

describe('toDecimalString', () => {
  it('omits grouping so the result can go back into an input', () => {
    expect(toDecimalString(10_000_000_000_000n)).toBe('100000.00000000');
    expect(toDecimalString(4_213_750n)).toBe('0.04213750');
  });
});

describe('trimTrailingZeros', () => {
  it('drops trailing fractional zeros and a bare decimal point', () => {
    expect(trimTrailingZeros('0.00000100')).toBe('0.000001');
    expect(trimTrailingZeros('0.00001000')).toBe('0.00001');
    expect(trimTrailingZeros('100,000.00000000')).toBe('100,000');
  });
});

describe('truncatePrincipal', () => {
  it('keeps the head and tail so the identity stays recognisable', () => {
    expect(truncatePrincipal('hqbg2-ryaaa-aaaar-qaaba-4ae-cai')).toBe(
      'hqbg2-ryaaa…4ae-cai'
    );
  });

  it('takes a narrower head and tail for the mobile header', () => {
    expect(truncatePrincipal('hqbg2-ryaaa-aaaar-qaaba-4ae-cai', 5, 3)).toBe(
      'hqbg2…cai'
    );
  });

  it('leaves short principals alone', () => {
    expect(truncatePrincipal('2vxsx-fae')).toBe('2vxsx-fae');
    expect(truncatePrincipal('')).toBe('');
  });
});
