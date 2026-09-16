#!/usr/bin/env python3
"""
Search for known bdocodex damage values in the ICE-decrypted commandtooltip.dbss.
If we find many u32 hits, the decryption is correct (the file IS just ICE-encrypted)
and the records contain damage values directly.
"""
import struct
import json
from pathlib import Path
from collections import Counter

DEC = Path("/tmp/cmdtt/cmdtt_ice_go_decrypted.bin")
RAW = Path("/home/z/my-project/upload/commandtooltip.dbss")
TOOLTIP = Path("/home/z/my-project/upload/tooltiptable.dbss")

dec = DEC.read_bytes()
raw = RAW.read_bytes()

# Load known bdocodex damage values — from the existing data
# Load paz-damage-verified to get a set of known damage values
PAZ_VERIFIED = Path("/home/z/my-project/data/paz-verified-damage.json")
PAZ_COMBINED = Path("/home/z/my-project/data/paz-damage-combined.json")
PAZ_FULL = Path("/home/z/my-project/data/paz-damage-full-extraction.json")
PAZ_COMPREHENSIVE = Path("/home/z/my-project/data/paz-damage-comprehensive.json")
PAZ_GEN = Path("/home/z/my-project/data/paz-damage-genuine.json")

# Get a list of known bdocodex damage values from the DB
import sqlite3
DB = Path("/home/z/my-project/db/custom.db")
if DB.exists():
    con = sqlite3.connect(str(DB))
    cur = con.cursor()
    # Check schema
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cur.fetchall()
    print(f"DB tables: {tables}")
    # Get damage values from skills table
    try:
        cur.execute("SELECT damageRowsJson FROM skills WHERE damageRowsJson IS NOT NULL LIMIT 100")
        rows = cur.fetchall()
        print(f"Got {len(rows)} sample rows")
        if rows:
            sample = json.loads(rows[0][0])
            print(f"Sample damageRowsJson: {json.dumps(sample, indent=2)[:500]}")
    except Exception as e:
        print(f"Error: {e}")
    con.close()

# Get all damage values
all_damage_values = set()
for p in [PAZ_VERIFIED, PAZ_COMBINED, PAZ_FULL, PAZ_COMPREHENSIVE, PAZ_GEN]:
    if p.exists():
        try:
            data = json.loads(p.read_text())
            # Extract damage values - try different formats
            if isinstance(data, dict):
                for k, v in data.items():
                    if isinstance(v, dict):
                        for kk, vv in v.items():
                            if isinstance(vv, (int, str)):
                                try:
                                    n = int(vv)
                                    if 1 < n < 100000:
                                        all_damage_values.add(n)
                                except: pass
                    elif isinstance(v, list):
                        for item in v:
                            if isinstance(item, dict):
                                for kk, vv in item.items():
                                    if isinstance(vv, (int, str)):
                                        try:
                                            n = int(vv)
                                            if 1 < n < 100000:
                                                all_damage_values.add(n)
                                        except: pass
                            elif isinstance(item, (int, str)):
                                try:
                                    n = int(item)
                                    if 1 < n < 100000:
                                        all_damage_values.add(n)
                                except: pass
                    elif isinstance(v, (int, str)):
                        try:
                            n = int(v)
                            if 1 < n < 100000:
                                all_damage_values.add(n)
                        except: pass
            print(f"Loaded {p.name}: {len(all_damage_values)} unique values so far")
        except Exception as e:
            print(f"Failed to load {p}: {e}")

print(f"\nTotal unique known damage values: {len(all_damage_values)}")
print(f"Sample: {sorted(list(all_damage_values))[:20]}")

# Search for these damage values as u32 LE in the decrypted file
print(f"\n=== Search known damage values in decrypted file (u32 LE) ===")
hits_dec = Counter()
for v in list(all_damage_values)[:2000]:  # First 2000 for speed
    target = struct.pack('<I', v)
    cnt = dec.count(target)
    if cnt > 0:
        hits_dec[v] = cnt
print(f"  Total damage values found as u32 LE in decrypted: {len(hits_dec)}/{2000}")
print(f"  Top 10 by count: {hits_dec.most_common(10)}")

# Search in raw (encrypted) file for comparison
print(f"\n=== Search known damage values in raw (encrypted) file (u32 LE) ===")
hits_raw = Counter()
for v in list(all_damage_values)[:2000]:
    target = struct.pack('<I', v)
    cnt = raw.count(target)
    if cnt > 0:
        hits_raw[v] = cnt
print(f"  Total damage values found as u32 LE in raw: {len(hits_raw)}/{2000}")
print(f"  Top 10 by count: {hits_raw.most_common(10)}")

# Also search in tooltiptable.dbss for comparison (we know it's plaintext PABR)
tt = TOOLTIP.read_bytes()
hits_tt = Counter()
for v in list(all_damage_values)[:2000]:
    target = struct.pack('<I', v)
    cnt = tt.count(target)
    if cnt > 0:
        hits_tt[v] = cnt
print(f"\n=== Search known damage values in tooltiptable.dbss (u32 LE) ===")
print(f"  Total damage values found as u32 LE in tooltiptable: {len(hits_tt)}/{2000}")
print(f"  Top 10 by count: {hits_tt.most_common(10)}")
