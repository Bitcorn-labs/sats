function bigintToFloatString(bigintValue: bigint, decimals = 8) {
  const stringValue = bigintValue.toString();
  // Ensure the string is long enough by padding with leading zeros if necessary
  const paddedStringValue = stringValue.padStart(decimals + 1, '0');
  // Insert decimal point decimals places from the end
  const beforeDecimal = paddedStringValue.slice(0, -decimals);
  const afterDecimal = paddedStringValue.slice(-decimals);
  // Combine and trim any trailing zeros after the decimal point for display
  const result = `${beforeDecimal}.${afterDecimal}`.replace(/\.?0+$/, '');
  return result;
}

export default bigintToFloatString;
