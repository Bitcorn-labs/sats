// Display and input helpers for raw ledger amounts.
//
// Every amount in this app is a raw bigint with 8 decimals. Nothing here goes
// through Number: the SATS supply is ~1.2e17 raw, well past the 2^53 where a
// double starts dropping digits, so `parseFloat(v) * 1e8` silently corrupts
// large values.

const DECIMALS = 8;

const AMOUNT_PATTERN = /^(\d*)(?:\.(\d*))?$/;

/// Split raw into its integer and fixed-width fractional halves.
function split(raw: bigint, decimals: number): [string, string] {
  const digits = raw.toString().padStart(decimals + 1, '0');
  return [digits.slice(0, -decimals), digits.slice(-decimals)];
}

/// Raw -> a grouped decimal string: 10000000000000n -> "100,000.00000000".
export function formatRaw(raw: bigint, decimals = DECIMALS): string {
  const [whole, fraction] = split(raw, decimals);
  return `${BigInt(whole).toLocaleString('en-US')}.${fraction}`;
}

/// Raw -> an ungrouped decimal string, so the result can be fed back into an
/// amount input (which rejects separators).
export function toDecimalString(raw: bigint, decimals = DECIMALS): string {
  const [whole, fraction] = split(raw, decimals);
  return `${BigInt(whole).toString()}.${fraction}`;
}

/// Drop trailing fractional zeros -- and the point itself if nothing is left.
/// Used for the fee captions, which read "0.000001" rather than "0.00000100".
export function trimTrailingZeros(value: string): string {
  return value.includes('.') ? value.replace(/\.?0+$/, '') : value;
}

/// User input -> raw, or null when the text is not yet a number. Exact: the
/// fraction is padded and truncated as text before it ever becomes a bigint.
export function parseAmount(text: string, decimals = DECIMALS): bigint | null {
  const match = AMOUNT_PATTERN.exec(text);
  if (!match) return null;

  const [, whole, fraction = ''] = match;
  if (whole === '' && fraction === '') return null;

  const scaled = fraction.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt(scaled || '0');
}

/// Whether a keystroke may land in an amount field. Deliberately permissive
/// about incomplete entries ("", ".", "1.") so typing is not fought.
export function isAmountInput(text: string, decimals = DECIMALS): boolean {
  return new RegExp(`^\\d*\\.?\\d{0,${decimals}}$`).test(text);
}

/// hqbg2-ryaaa-aaaar-qaaba-4ae-cai -> hqbg2-ryaaa…4ae-cai. The narrower
/// head/tail is what the mobile header uses, where the full form does not fit.
export function truncatePrincipal(
  principal: string,
  head = 11,
  tail = 7
): string {
  if (principal.length <= head + tail + 1) return principal;
  return `${principal.slice(0, head)}…${principal.slice(-tail)}`;
}
