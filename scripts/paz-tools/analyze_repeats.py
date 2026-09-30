#!/usr/bin/env python3
"""
Carefully analyze the most-common 8-byte block in the decrypted file.
Look at:
1. Where it appears (positions, periodicity)
2. What bytes surround it (look for record structure)
3. Are there multiple repeating 8-byte blocks that share common bytes?
"""
import struct
import json
from collections import Counter
from pathlib import Path

DEC = Path("/tmp/cmdtt/cmdtt_ice_go_decrypted.bin")
RAW = Path("/home/z/my-project/upload/commandtooltip.dbss")

dec = DEC.read_bytes()
raw = RAW.read_bytes()

# Where does the most common block appear?
target = bytes.fromhex("7ebb8e447aabca50")
positions = []
start = 0
while True:
    i = dec.find(target, start)
    if i == -1: break
    positions.append(i)
    start = i + 1
print(f"Target block {target.hex()} appears at {len(positions)} positions in decrypted file")
# Are positions 8-byte aligned?
all_aligned = all(p % 8 == 0 for p in positions)
print(f"All 8-byte aligned: {all_aligned}")
# Positions mod 8
mods = Counter(p % 8 for p in positions)
print(f"Positions mod 8: {dict(mods)}")

# Position diffs
diffs = [positions[i+1] - positions[i] for i in range(min(50, len(positions)-1))]
print(f"First 50 position diffs: {diffs[:50]}")

# Are positions mostly aligned to record boundaries?
# Each record is variable-length. Let me check if positions are aligned to record starts.
entries = json.loads(Path("/tmp/cmdtt/offset_entries.json").read_text())
# Build a map from offset -> entry index
entry_offsets = {e['offset']: i for i, e in enumerate(entries)}

# For each occurrence of the target block, check if it's at a record boundary
at_record_start = 0
in_record_offsets = Counter()
for p in positions[:1000]:
    if p in entry_offsets:
        at_record_start += 1
    else:
        # Find the containing record
        # Use binary search
        # Naive: iterate entries (slow but works for first 1000)
        # Actually let's just see which records contain the position
        for e in entries:
            if e['offset'] <= p < e['offset'] + e['size']:
                offset_in_record = p - e['offset']
                in_record_offsets[offset_in_record] += 1
                break

print(f"\nOut of first 1000 occurrences of target block:")
print(f"  At record start: {at_record_start}")
print(f"  Most common offsets within a record: {in_record_offsets.most_common(20)}")

# Show context: 32 bytes around first occurrence
print(f"\n=== Context around first 5 occurrences ===")
for p in positions[:5]:
    start = max(0, p-32)
    end = min(len(dec), p+40)
    chunk = dec[start:end]
    print(f"@{p} (showing {start}..{end}):")
    # Hexdump
    for i in range(0, len(chunk), 16):
        line = chunk[i:i+16]
        hex_part = " ".join(f"{x:02x}" for x in line)
        ascii_part = "".join(chr(x) if 32 <= x < 127 else "." for x in line)
        marker = " <--" if start+i+8 == p else ""
        print(f"  {start+i:08x}  {hex_part:<48}  {ascii_part}{marker}")
    print()

# Look at a single record (first 5) and show its full structure
print(f"\n=== Full content of first 3 records ===")
for i, e in enumerate(entries[:3]):
    rec = dec[e['offset']:e['offset']+e['size']]
    print(f"\nRecord {i}: key=0x{e['key']:08x}, offset={e['offset']}, size={e['size']}")
    for j in range(0, len(rec), 16):
        line = rec[j:j+16]
        hex_part = " ".join(f"{x:02x}" for x in line)
        ascii_part = "".join(chr(x) if 32 <= x < 127 else "." for x in line)
        print(f"  {j:04x}  {hex_part:<48}  {ascii_part}")

# Now look at the encrypted version of the same records
print(f"\n=== Full RAW (encrypted) content of first 3 records ===")
for i, e in enumerate(entries[:3]):
    rec = raw[e['offset']:e['offset']+e['size']]
    print(f"\nRecord {i}: key=0x{e['key']:08x}, offset={e['offset']}, size={e['size']}")
    for j in range(0, len(rec), 16):
        line = rec[j:j+16]
        hex_part = " ".join(f"{x:02x}" for x in line)
        ascii_part = "".join(chr(x) if 32 <= x < 127 else "." for x in line)
        print(f"  {j:04x}  {hex_part:<48}  {ascii_part}")
