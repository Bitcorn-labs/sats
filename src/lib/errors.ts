/// Render an unknown rejection reason as something displayable. Candid error
/// variants carry bigints, which JSON.stringify refuses outright.
export function describeError(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, (_key, inner) =>
      typeof inner === 'bigint' ? inner.toString() : inner
    );
  } catch {
    return String(value);
  }
}
