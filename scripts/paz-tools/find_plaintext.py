#!/usr/bin/env python3
"""
Search the ICE-decrypted file for:
1. PABR magic (anywhere)
2. Known Korean strings from tooltiptable.dbss (which IS plaintext)
3. Common damage templates like "{p0}%"
"""
import struct
from pathlib import Path
from collections import Counter

DEC = Path("/tmp/cmdtt/cmdtt_ice_go_decrypted.bin")
RAW = Path("/home/z/my-project/upload/commandtooltip.dbss")
TOOLTIP = Path("/home/z/my-project/upload/tooltiptable.dbss")

dec = DEC.read_bytes()
raw = RAW.read_bytes()
tt = TOOLTIP.read_bytes()

# 1. Search for PABR in decrypted file
print("=== Search for PABR in decrypted file ===")
pabr_positions = []
start = 0
while True:
    i = dec.find(b"PABR", start)
    if i == -1: break
    pabr_positions.append(i)
    start = i + 1
print(f"  Found {len(pabr_positions)} PABR occurrences in decrypted file")
for p in pabr_positions[:10]:
    print(f"    @{p}: context: {dec[p:p+32].hex()}")

# 2. Look at the tooltiptable.dbss to find known Korean strings, then search them in decrypted cmdtt
print("\n=== Extract known Korean strings from tooltiptable.dbss ===")
# tooltiptable.dbss is PABR-formatted. Let me find Korean strings.
def extract_korean_strings(data, min_len=4):
    """Extract sequences of Hangul syllables (3-byte UTF-8 starting with 0xEA-0xED)."""
    strings = []
    cur = bytearray()
    start = 0
    for i in range(len(data)-2):
        b0 = data[i]
        # Hangul syllables in UTF-8: 0xEA 0xB0 0x80 .. 0xED 0x9E 0xA0
        if 0xEA <= b0 <= 0xED:
            try:
                ch = data[i:i+3].decode("utf-8")
                # check it's a Korean character
                if '\uAC00' <= ch <= '\uD7A3' or '\u3131' <= ch <= '\u318E':
                    if not cur:
                        start = i
                    cur.extend(data[i:i+3])
                    # advance
            except UnicodeDecodeError:
                if len(cur) >= min_len:
                    strings.append((start, bytes(cur).decode("utf-8", "ignore")))
                cur = bytearray()
        else:
            if len(cur) >= min_len:
                strings.append((start, bytes(cur).decode("utf-8", "ignore")))
            cur = bytearray()
    return strings

korean_strings_tt = extract_korean_strings(tt, 6)
print(f"  Found {len(korean_strings_tt)} Korean strings (>= 2 chars) in tooltiptable.dbss")
print(f"  First 10:")
for off, s in korean_strings_tt[:10]:
    print(f"    @{off}: {s}")

# Search these strings in the decrypted cmdtt file
print(f"\n=== Search Korean strings from tooltiptable in decrypted cmdtt ===")
hits = 0
sample_hits = []
for off, s in korean_strings_tt:
    s_bytes = s.encode("utf-8")
    if len(s_bytes) < 4: continue
    p = dec.find(s_bytes)
    if p != -1:
        hits += 1
        if len(sample_hits) < 10:
            sample_hits.append((off, s, p))
print(f"  Total Korean strings found in decrypted cmdtt: {hits}/{len(korean_strings_tt)}")
for tt_off, s, cmdtt_off in sample_hits:
    print(f"    tooltiptable@{tt_off}: '{s}' -> cmdtt@{cmdtt_off}")

# 3. Search for damage template tokens
print(f"\n=== Search for damage template tokens in decrypted file ===")
for tok in [b"{p0}", b"{p1}", b"{p2}", b"{p3}", b"{0}", b"%"]:
    cnt = dec.count(tok)
    first = dec.find(tok)
    print(f"  {tok!r}: count={cnt}, first_at={first}")

# 4. Check the most common byte patterns at each position mod 8 in the decrypted file
# This might reveal structure if the file is just ICE-encrypted (no XOR layer)
print(f"\n=== Position-mod-8 byte frequency (more detailed) in decrypted file ===")
for pos in range(8):
    bytes_at_pos = [dec[i] for i in range(pos, len(dec), 8)]
    c = Counter(bytes_at_pos)
    print(f"  pos {pos}: top 5 bytes:")
    for byte, cnt in c.most_common(5):
        print(f"    0x{byte:02x}: {cnt} ({100*cnt/len(bytes_at_pos):.2f}%)")

# 5. Look at the position of the most common 8-byte block in the decrypted file
# and check if it's always at a specific offset within records
print(f"\n=== Most common 8-byte block in decrypted file ===")
blocks = Counter()
for i in range(0, len(dec)-8, 8):
    blocks[bytes(dec[i:i+8])] += 1
top_block, top_count = blocks.most_common(1)[0]
print(f"  Top block: {top_block.hex()} ({top_count} occurrences)")

# Where does this block appear? Check positions and offsets within records
import json
entries = json.loads(Path("/tmp/cmdtt/offset_entries.json").read_text())

# Build sorted list of (offset, size, key) for finding containing records
sorted_entries = sorted(entries, key=lambda e: e['offset'])
positions_in_file = []
start = 0
while True:
    i = dec.find(top_block, start)
    if i == -1: break
    positions_in_file.append(i)
    start = i + 1

# For each position, find which record contains it
within_record_offsets = Counter()
containing_record_size = Counter()
for p in positions_in_file:
    # Binary search for containing record
    lo, hi = 0, len(sorted_entries)
    while lo < hi:
        mid = (lo + hi) // 2
        if sorted_entries[mid]['offset'] <= p:
            lo = mid + 1
        else:
            hi = mid
    # lo-1 is the record containing p (if any)
    if lo > 0:
        rec = sorted_entries[lo-1]
        if rec['offset'] <= p < rec['offset'] + rec['size']:
            offset_in_record = p - rec['offset']
            within_record_offsets[offset_in_record] += 1
            containing_record_size[rec['size']] += 1

print(f"  Top 10 within-record offsets:")
for off, c in within_record_offsets.most_common(10):
    print(f"    offset {off} (0x{off:x}): {c} occurrences")
print(f"  Top 10 containing record sizes:")
for sz, c in containing_record_size.most_common(10):
    print(f"    size {sz}: {c} occurrences")
