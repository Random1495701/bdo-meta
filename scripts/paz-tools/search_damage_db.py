#!/usr/bin/env python3
"""
Search the decrypted commandtooltip.dbss for known bdocodex damage values.
The DB has 3737 unique damage values, max 47620.
"""
import struct
import sqlite3
import json
import re
from pathlib import Path
from collections import Counter

DEC = Path("/tmp/cmdtt/cmdtt_ice_go_decrypted.bin")
RAW = Path("/home/z/my-project/upload/commandtooltip.dbss")

dec = DEC.read_bytes()
raw = RAW.read_bytes()

# Get all damage values from DB
con = sqlite3.connect("/home/z/my-project/db/custom.db")
cur = con.cursor()
cur.execute("SELECT damageRowsJson FROM skills WHERE damageRowsJson IS NOT NULL")
rows = cur.fetchall()
all_values = set()
for r in rows:
    try:
        data = json.loads(r[0])
        for item in data:
            if isinstance(item, dict):
                for k, v in item.items():
                    if isinstance(v, int) and 1 < v < 100000:
                        all_values.add(v)
                lbl = item.get('label', '')
                for m in re.finditer(r'(\d+)%', lbl):
                    n = int(m.group(1))
                    if 1 < n < 100000:
                        all_values.add(n)
    except Exception as e:
        pass
print(f"Loaded {len(all_values)} unique damage values from DB")
print(f"Sample (sorted): {sorted(all_values)[:30]}")
print(f"Max: {max(all_values)}")
# Filter out very small values (likely false positives — counts like 1, 2, 3, hit counts etc)
damage_values = sorted(v for v in all_values if v > 50)
print(f"Filtered (>50): {len(damage_values)} values, sample: {damage_values[:20]}")

# Search as u32 LE in decrypted file
print(f"\n=== Search u32 LE in ICE-decrypted file ===")
hits_dec = Counter()
positions_dec = {}
for v in damage_values:
    target = struct.pack('<I', v)
    cnt = dec.count(target)
    if cnt > 0:
        hits_dec[v] = cnt
        positions_dec[v] = dec.find(target)
print(f"  Damage values found in decrypted: {len(hits_dec)}/{len(damage_values)}")
print(f"  Top 20 by count: {hits_dec.most_common(20)}")
print(f"  First 10 positions:")
for v, p in list(positions_dec.items())[:10]:
    print(f"    value={v} at offset {p} (0x{p:x})")

# Search as u16 LE in decrypted file
print(f"\n=== Search u16 LE in ICE-decrypted file ===")
hits_dec16 = Counter()
for v in damage_values:
    if v > 65535: continue  # u16 max
    target = struct.pack('<H', v)
    cnt = dec.count(target)
    if cnt > 0:
        hits_dec16[v] = cnt
print(f"  Damage values found as u16: {len(hits_dec16)}/{len(damage_values)}")
print(f"  Top 20 by count: {hits_dec16.most_common(20)}")

# Search as u32 BE in decrypted file
print(f"\n=== Search u32 BE in ICE-decrypted file ===")
hits_decbe = Counter()
for v in damage_values:
    target = struct.pack('>I', v)
    cnt = dec.count(target)
    if cnt > 0:
        hits_decbe[v] = cnt
print(f"  Damage values found as u32 BE: {len(hits_decbe)}/{len(damage_values)}")
print(f"  Top 10 by count: {hits_decbe.most_common(10)}")

# Search in RAW (encrypted) file for comparison
print(f"\n=== Search u32 LE in RAW (encrypted) file ===")
hits_raw = Counter()
for v in damage_values:
    target = struct.pack('<I', v)
    cnt = raw.count(target)
    if cnt > 0:
        hits_raw[v] = cnt
print(f"  Damage values found in raw: {len(hits_raw)}/{len(damage_values)}")
print(f"  Top 10 by count: {hits_raw.most_common(10)}")

# Also try scaled damage values (×10, ×100, ×1000)
print(f"\n=== Search scaled damage values (×10) as u32 LE in decrypted file ===")
hits_scaled = Counter()
for v in damage_values:
    if v * 10 > 0xFFFFFFFF: continue
    target = struct.pack('<I', v * 10)
    cnt = dec.count(target)
    if cnt > 0:
        hits_scaled[v] = cnt
print(f"  Damage values ×10 found: {len(hits_scaled)}/{len(damage_values)}")
print(f"  Top 10 by count: {hits_scaled.most_common(10)}")

# Look at one of the positions in context
if hits_dec:
    val, cnt = hits_dec.most_common(1)[0]
    pos = dec.find(struct.pack('<I', val))
    print(f"\n=== Context around first occurrence of value {val} (count={cnt}) ===")
    start = max(0, pos - 16)
    end = min(len(dec), pos + 32)
    chunk = dec[start:end]
    print(f"  Offset 0x{pos:x} (showing {start}..{end}):")
    print(f"  {chunk.hex()}")
    print(f"  ASCII: {chunk!r}")
