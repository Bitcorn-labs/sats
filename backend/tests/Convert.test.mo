import Convert "../Convert";

// ---------------------------------------------------------------------------
// Conversion between raw ckBTC and raw SATS.
//
// 1 raw ckBTC unit  = 1 satoshi        = 1.00000000 SATS = 100_000_000 raw SATS
// 1.00000000 ckBTC  = 100_000_000 raw  = 100_000_000 SATS = 1e16 raw SATS
// ---------------------------------------------------------------------------

assert Convert.SCALE == 100_000_000;

// --- toSats: minting on deposit --------------------------------------------

// one whole ckBTC mints one hundred million SATS
assert Convert.toSats(100_000_000) == 10_000_000_000_000_000;

// the documented worked example: 100_000 raw ckBTC in
assert Convert.toSats(100_000) == 10_000_000_000_000;

// a single satoshi mints exactly one whole SATS
assert Convert.toSats(1) == 100_000_000;

// the minimum deposit
assert Convert.toSats(10_000) == 1_000_000_000_000;

assert Convert.toSats(0) == 0;

// --- toCkbtcFloor: whole satoshis out on withdrawal ------------------------

// exact multiple
assert Convert.toCkbtcFloor(1_600_000_000) == 16;

// non-multiple floors down, never up
assert Convert.toCkbtcFloor(1_650_000_000) == 16;
assert Convert.toCkbtcFloor(1_699_999_999) == 16;

// below one whole satoshi yields nothing
assert Convert.toCkbtcFloor(99_999_999) == 0;
assert Convert.toCkbtcFloor(0) == 0;

// --- burnable: what actually gets burned ------------------------------------

// an exact multiple burns in full
assert Convert.burnable(1_600_000_000) == 1_600_000_000;

// a non-multiple burns only the whole-satoshi portion
assert Convert.burnable(1_650_000_000) == 1_600_000_000;

// burnable never exceeds the requested amount
assert Convert.burnable(1_699_999_999) == 1_600_000_000;

// --- remainder: what stays with the caller ----------------------------------

assert Convert.remainder(1_600_000_000) == 0;
assert Convert.remainder(1_650_000_000) == 50_000_000;
assert Convert.remainder(99_999_999) == 99_999_999;

// --- invariants -------------------------------------------------------------
// These are the properties that keep the wrapper solvent. If any of them can be
// violated, the canister can release more ckBTC than it holds.

for (n in [0, 1, 99_999_999, 100_000_000, 1_600_000_000, 1_650_000_000, 1_699_999_999].vals()) {
  // nothing is created or destroyed: burned + kept == requested
  assert Convert.burnable(n) + Convert.remainder(n) == n;

  // the burn always corresponds exactly to the ckBTC released
  assert Convert.burnable(n) == Convert.toCkbtcFloor(n) * Convert.SCALE;

  // flooring never rounds up, so we never owe more ckBTC than was burned
  assert Convert.toCkbtcFloor(n) * Convert.SCALE <= n;
};

// round-trip: ckBTC -> SATS -> ckBTC is lossless
for (c in [0, 1, 10_000, 100_000, 100_000_000].vals()) {
  assert Convert.toCkbtcFloor(Convert.toSats(c)) == c;
  assert Convert.remainder(Convert.toSats(c)) == 0;
};
