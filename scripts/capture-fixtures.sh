#!/bin/bash
# Capture the full observable state of a SATS ledger into a fixture directory,
# so a post-migration canister can be diffed against a pre-migration one.
#   usage: fixtures.sh <canister-id> <out-dir>
export DFX_WARNING=-mainnet_plaintext_identity
C="$1"; OUT="$2"; cd /home/vp/sats
mkdir -p "$OUT"

q() { timeout 90 dfx canister --network ic call "$C" "$1" "${2:-()}" 2>&1 | tr -d '\n' | sed 's/[[:space:]]\+/ /g'; }

# --- scalars and config -----------------------------------------------------
{
  for m in icrc1_name icrc1_symbol icrc1_decimals icrc1_fee icrc1_total_supply \
           icrc1_minting_account icrc1_supported_standards icrc10_supported_standards \
           icrc3_supported_block_types get_fee_collector get_authorized_fee_collector \
           get_accumulated_fees get_fee_stats get_fee_breakdown get_sats_balance \
           stats icrc4_maximum_query_batch_size icrc4_maximum_update_batch_size \
           icrc106_get_index_canister; do
    printf '%-34s %s\n' "$m" "$(q $m)"
  done
} > "$OUT/scalars.txt"

# --- metadata (sorted; the map order is not stable across upgrades) ---------
q icrc1_metadata | grep -oE '"[a-z0-9:_]+"; variant \{ [A-Za-z]+ = [^;}]+' | sort > "$OUT/metadata.txt"

# --- every block ------------------------------------------------------------
L=$(q icrc3_get_blocks '(vec { record { start = 0 : nat; length = 1 : nat } })' | grep -oE 'log_length = [0-9_]+' | grep -oE '[0-9_]+' | tr -d '_')
echo "$L" > "$OUT/log_length.txt"
timeout 180 dfx canister --network ic call "$C" icrc3_get_blocks "(vec { record { start = 0 : nat; length = $L : nat } })" 2>&1 > "$OUT/blocks.raw"
python3 - "$OUT" <<'PY'
import re, sys, hashlib
out = sys.argv[1]
s = re.sub(r'\s+', ' ', open(out + '/blocks.raw', encoding='utf-8').read())
parts = re.split(r'id = (\d+) : nat;', s)
rows = []
for i in range(1, len(parts), 2):
    bid, seg = int(parts[i]), parts[i+1]
    g = lambda p: (re.search(p, seg).group(1) if re.search(p, seg) else '-')
    rows.append((bid,
                 g(r'"btype"; variant \{ Text = "([^"]+)"'),
                 g(r'"amt"; variant \{ Nat = ([\d_]+)').replace('_',''),
                 g(r'"memo"; variant \{ Blob = blob "((?:\\[0-9a-f]{2})+)"'),
                 g(r'"phash"; variant \{ Blob = blob "((?:\\[0-9a-f]{2})+)"')))
with open(out + '/blocks.txt', 'w') as f:
    for r in sorted(rows):
        f.write('%s\n' % (r,))
print(f"  blocks captured: {len(rows)}")
PY

# --- every holder -----------------------------------------------------------
timeout 120 dfx canister --network ic call "$C" holders '(null, null, null, opt (1000 : nat))' 2>&1 | tr -d '\n' > "$OUT/holders.raw"
python3 - "$OUT" <<'PY'
import re, sys
out = sys.argv[1]
s = open(out + '/holders.raw', encoding='utf-8').read()
rows = re.findall(r'owner = principal "([a-z0-9-]+)";\s*subaccount = (null|opt blob "[^"]*")\s*;?\s*\};\s*([0-9_]+) : nat', s)
with open(out + '/holders.txt', 'w') as f:
    for owner, sub, bal in sorted(rows):
        f.write('%-64s %-10s %20s\n' % (owner, 'null' if sub == 'null' else 'sub', f"{int(bal.replace('_','')):,}"))
print(f"  holders captured: {len(rows)}")
PY
rm -f "$OUT/holders.raw"
rm -f "$OUT/blocks.raw"
echo "  fixtures -> $OUT"
