/// The ckBTC ledger, as this canister talks to it.
///
/// ckBTC (`mxzaz-hqaaa-aaaar-qaada-cai`) is a stock ICRC-1 ledger with the
/// ICRC-2 extension. This binding covers exactly that surface -- it is
/// deliberately not the ICP ledger interface it was originally copied from,
/// which also carried `transfer`/`send_dfx`/`account_balance`/`query_blocks`
/// and an `e8s`-based `Tokens` type that ckBTC does not implement.
///
/// `subaccount` and `memo` are `?[Nat8]` rather than `?Blob` because Candid
/// defines `blob` as `vec nat8`; the two are the same wire type.
module {

  public type Account = { owner : Principal; subaccount : ?[Nat8] };

  public type MetadataValue = {
    #Int : Int;
    #Nat : Nat;
    #Blob : [Nat8];
    #Text : Text;
  };

  public type StandardRecord = { name : Text; url : Text };

  // --- ICRC-1 ---------------------------------------------------------------

  public type TransferArg = {
    from_subaccount : ?[Nat8];
    to : Account;
    amount : Nat;
    fee : ?Nat;
    memo : ?[Nat8];
    created_at_time : ?Nat64;
  };

  public type TransferError = {
    #BadFee : { expected_fee : Nat };
    #BadBurn : { min_burn_amount : Nat };
    #InsufficientFunds : { balance : Nat };
    #TooOld;
    #CreatedInFuture : { ledger_time : Nat64 };
    #Duplicate : { duplicate_of : Nat };
    #TemporarilyUnavailable;
    #GenericError : { error_code : Nat; message : Text };
  };

  public type TransferResult = { #Ok : Nat; #Err : TransferError };

  // --- ICRC-2 ---------------------------------------------------------------

  public type Allowance = { allowance : Nat; expires_at : ?Nat64 };

  public type AllowanceArgs = { account : Account; spender : Account };

  public type ApproveArgs = {
    from_subaccount : ?[Nat8];
    spender : Account;
    amount : Nat;
    expected_allowance : ?Nat;
    expires_at : ?Nat64;
    fee : ?Nat;
    memo : ?[Nat8];
    created_at_time : ?Nat64;
  };

  public type ApproveError = {
    #BadFee : { expected_fee : Nat };
    #InsufficientFunds : { balance : Nat };
    #AllowanceChanged : { current_allowance : Nat };
    #Expired : { ledger_time : Nat64 };
    #TooOld;
    #CreatedInFuture : { ledger_time : Nat64 };
    #Duplicate : { duplicate_of : Nat };
    #TemporarilyUnavailable;
    #GenericError : { error_code : Nat; message : Text };
  };

  public type ApproveResult = { #Ok : Nat; #Err : ApproveError };

  public type TransferFromArgs = {
    spender_subaccount : ?[Nat8];
    from : Account;
    to : Account;
    amount : Nat;
    fee : ?Nat;
    memo : ?[Nat8];
    created_at_time : ?Nat64;
  };

  public type TransferFromError = {
    #BadFee : { expected_fee : Nat };
    #BadBurn : { min_burn_amount : Nat };
    #InsufficientFunds : { balance : Nat };
    #InsufficientAllowance : { allowance : Nat };
    #TooOld;
    #CreatedInFuture : { ledger_time : Nat64 };
    #Duplicate : { duplicate_of : Nat };
    #TemporarilyUnavailable;
    #GenericError : { error_code : Nat; message : Text };
  };

  public type TransferFromResult = { #Ok : Nat; #Err : TransferFromError };

  public type Service = actor {
    icrc1_balance_of : shared query Account -> async Nat;
    icrc1_decimals : shared query () -> async Nat8;
    icrc1_fee : shared query () -> async Nat;
    icrc1_metadata : shared query () -> async [(Text, MetadataValue)];
    icrc1_minting_account : shared query () -> async ?Account;
    icrc1_name : shared query () -> async Text;
    icrc1_supported_standards : shared query () -> async [StandardRecord];
    icrc1_symbol : shared query () -> async Text;
    icrc1_total_supply : shared query () -> async Nat;
    icrc1_transfer : shared TransferArg -> async TransferResult;
    icrc2_allowance : shared query AllowanceArgs -> async Allowance;
    icrc2_approve : shared ApproveArgs -> async ApproveResult;
    icrc2_transfer_from : shared TransferFromArgs -> async TransferFromResult;
  };
};
