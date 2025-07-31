import ICRCLedger "mo:devefi-icrc-ledger";
import Principal "mo:base/Principal";

actor class NTNTEST() = this {

    let SGLDT_ledger_id = "5r3gp-3iaaa-aaaap-qqaeq-cai"; // IMPORTANT replace with staging canister id

    stable let sGLDT_mem_v1 = ICRCLedger.Mem.Ledger.V1.new();
    let SGLDT_ledger = ICRCLedger.Ledger<system>(sGLDT_mem_v1, SGLDT_ledger_id, #last, Principal.fromActor(this));

    stable var txs_received : Nat = 0;
    // send tokens to the Canister ID

    SGLDT_ledger.onReceive(
        func(t) {
            // we are sending the tokens back to the sender
            let #icrc(account) = t.from else return;

            // do any other custom stuff in here you want
            // I am just counting the number of transactions received

            txs_received += 1;

            // this sends back to the sender
            // you can put some other wallet in the `to` field if you want
            ignore SGLDT_ledger.send({
                to = #icrc(account);
                amount = t.amount;
                from_subaccount = null;
                memo = null;
            });
        }
    );

    public query func get_ledger_errors() : async [Text] {
        SGLDT_ledger.getErrors();
    };

    public query func get_ledgers_info() : async ICRCLedger.Info {
        SGLDT_ledger.getInfo();
    };

    public query func get_transaction_count() : async Nat {
        txs_received;
    };

};