/// Pure conversions between raw ckBTC and raw SATS.
///
/// ckBTC and SATS both carry 8 decimals, but one raw ckBTC unit (one satoshi)
/// is worth 1.00000000 SATS, so raw_SATS = raw_ckBTC * SCALE.
///
/// This module exists so the conversion arithmetic is testable in isolation:
/// a units error here does not trap, it silently mints or releases the wrong
/// amount, so it must be covered by tests rather than review alone.
module {

  public let SCALE : Nat = 100_000_000;

  /// raw ckBTC -> raw SATS. Used when minting on deposit.
  public func toSats(ckbtc : Nat) : Nat {
    ckbtc * SCALE;
  };

  /// raw SATS -> whole raw ckBTC, floored. Only whole satoshis can be sent out.
  public func toCkbtcFloor(sats : Nat) : Nat {
    sats / SCALE;
  };

  /// The portion of a raw SATS amount that maps to whole satoshis. This is what
  /// gets burned on withdrawal -- never the full requested amount, or the
  /// remainder would be destroyed without compensation.
  public func burnable(sats : Nat) : Nat {
    (sats / SCALE) * SCALE;
  };

  /// The sub-satoshi remainder, which stays in the caller's balance.
  public func remainder(sats : Nat) : Nat {
    sats % SCALE;
  };

};
