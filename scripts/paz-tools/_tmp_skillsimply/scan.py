#!/usr/bin/env python3
"""Scan skillsimply.dbss records for known bdocodex damage values.

Build a single inverted index of all u32/u16/float32 values at every byte
position in every record, then look up each expected damage value.
"""
import json
import struct
import sqlite3
import re
import sys
from collections import defaultdict, Counter

DBSS_PATH = '/tmp/skill-extract/skillsimply.dbss'
OFFSETS_JSON = '/tmp/skillsimply_offsets.json'

# ---------- 1. Load offsets ----------
with open(OFFSETS_JSON) as f:
    oj = json.load(f)
offsets = oj['offsets']
lengths = oj['lengths']
n_records = len(offsets)
print(f'Records: {n_records}')

# ---------- 2. Read all records into memory ----------
with open(DBSS_PATH, 'rb') as f:
    f.seek(0, 2)
    dbss_size = f.tell()
    f.seek(0)
    raw = f.read()

records = []  # list of (offset, length, bytes)
for i in range(n_records):
    off = offsets[i]
    ln = lengths[i]
    rec = raw[off:off+ln]
    records.append((off, ln, rec))

print(f'Loaded {len(records)} records, total bytes = {sum(len(r[2]) for r in records)}')

# ---------- 3. Build inverted index ----------
# For each value (u32), record list of (record_idx, byte_offset, encoding)
# Also u16 and float32
# encodings: 'u32', 'u16', 'f32'

print('Building inverted index...', flush=True)
u32_idx = defaultdict(list)
u16_idx = defaultdict(list)
f32_idx = defaultdict(list)

for ridx, (off, ln, rec) in enumerate(records):
    # u32 at every byte position (skip last 3 bytes since not enough for u32)
    for b in range(0, ln - 3):
        v = rec[b] | (rec[b+1] << 8) | (rec[b+2] << 16) | (rec[b+3] << 24)
        u32_idx[v].append((ridx, b))
    # u16 at every byte position (skip last 1 byte)
    for b in range(0, ln - 1):
        v = rec[b] | (rec[b+1] << 8)
        u16_idx[v].append((ridx, b))
    # f32 at every 4-byte-aligned position (faster)
    for b in range(0, ln - 3, 4):
        v = struct.unpack('<f', rec[b:b+4])[0]
        # store as rounded int if integer-valued
        if v == v and not (v != v):  # not NaN
            # store the rounded int value for integer matching
            r = round(v)
            if r > 0 and r < 10**8 and abs(v - r) < 1e-3:
                f32_idx[r].append((ridx, b))

print(f'u32 unique values: {len(u32_idx)}')
print(f'u16 unique values: {len(u16_idx)}')
print(f'f32 (integer-valued) unique values: {len(f32_idx)}')

# Save the indexes (they may be large)
print('Saving indexes...', flush=True)
import pickle
with open('/tmp/skillsimply_idx.pkl', 'wb') as f:
    pickle.dump({'u32': u32_idx, 'u16': u16_idx, 'f32': f32_idx}, f, protocol=pickle.HIGHEST_PROTOCOL)
print('Saved /tmp/skillsimply_idx.pkl')

# ---------- 4. Get 200 known damage values from DB ----------
con = sqlite3.connect('/home/z/my-project/db/custom.db')
cur = con.cursor()

# Load verified IDs
with open('/home/z/my-project/data/paz-damage-comprehensive.json') as f:
    verified = json.load(f)
verified_ids = set(int(k) for k in verified.keys())

DMG_RE = re.compile(r'(\d+)%')
def extract_dmg(rows_json):
    try:
        rows = json.loads(rows_json)
    except Exception:
        return None
    for row in rows:
        label = row.get('label', '')
        m = DMG_RE.search(label)
        if m:
            v = int(m.group(1))
            # filter junk values: must be plausible damage (1..100000)
            if 1 <= v <= 100000:
                return v
    return None

# Get all max-rank skills with damage
cur.execute('SELECT skillId, name, damageRowsJson FROM skills WHERE isMaxRank=1 AND damageRowsJson IS NOT NULL AND damageRowsJson != "[]" ORDER BY RANDOM()')
rows = cur.fetchall()
print(f'Candidates: {len(rows)}')
# Extract damage values
samples = []  # (skillId, name, dmg, verified_flag)
for r in rows:
    sid, nm = r[0], r[1]
    dmg = extract_dmg(r[2])
    if dmg is None:
        continue
    is_verified = sid in verified_ids
    samples.append((sid, nm, dmg, is_verified))

print(f'Skills with extractable damage value: {len(samples)}')
# Take a mix: 100 verified + 100 unverified
verified_samples = [s for s in samples if s[3]]
unverified_samples = [s for s in samples if not s[3]]
print(f'Verified available: {len(verified_samples)}')
print(f'Unverified available: {len(unverified_samples)}')

# Take 100 of each (or all if fewer)
selected = (verified_samples[:100] + unverified_samples[:100])[:200]
print(f'Selected for scan: {len(selected)}')

# Save the selected sample
with open('/tmp/skillsimply_scan_input.json', 'w') as f:
    json.dump([{'skillId': s[0], 'name': s[1], 'damage': s[2], 'alreadyVerified': s[3]} for s in selected], f, indent=2)

# ---------- 5. For each expected damage value, look up in indexes ----------
print('\n--- Scanning for matches ---', flush=True)
# For each skill, check value, value*10, value*100, as float32
results = []
for sid, nm, dmg, is_v in selected:
    matches = []
    # Direct u32
    if dmg in u32_idx:
        for (ridx, b) in u32_idx[dmg][:5]:  # cap to 5 sample positions
            matches.append(('u32', ridx, b, dmg))
    # u16 (only valid for dmg < 65536)
    if dmg < 65536 and dmg in u16_idx:
        for (ridx, b) in u16_idx[dmg][:5]:
            matches.append(('u16', ridx, b, dmg))
    # f32 (integer-valued)
    if dmg in f32_idx:
        for (ridx, b) in f32_idx[dmg][:5]:
            matches.append(('f32', ridx, b, dmg))
    # scaled x10 as u32
    if dmg * 10 in u32_idx:
        for (ridx, b) in u32_idx[dmg * 10][:3]:
            matches.append(('u32_x10', ridx, b, dmg))
    # scaled x100 as u32
    if dmg * 100 in u32_idx:
        for (ridx, b) in u32_idx[dmg * 100][:3]:
            matches.append(('u32_x100', ridx, b, dmg))
    results.append({
        'skillId': sid,
        'name': nm,
        'expected_damage': dmg,
        'alreadyVerified': is_v,
        'match_count': len(matches),
        'matches': matches,
    })

# Save full results
with open('/tmp/skillsimply_scan_results.json', 'w') as f:
    json.dump(results, f, indent=2)

# ---------- 6. Report yield ----------
total_skills = len(results)
skills_with_matches = sum(1 for r in results if r['match_count'] > 0)
print(f'\n=== YIELD ===')
print(f'Total skills scanned: {total_skills}')
print(f'Skills with at least one match: {skills_with_matches} ({skills_with_matches*100/total_skills:.1f}%)')

# Break down by verified status
v_total = sum(1 for r in results if r['alreadyVerified'])
v_matched = sum(1 for r in results if r['alreadyVerified'] and r['match_count'] > 0)
uv_total = sum(1 for r in results if not r['alreadyVerified'])
uv_matched = sum(1 for r in results if not r['alreadyVerified'] and r['match_count'] > 0)
print(f'  Already-verified skills: {v_matched}/{v_total} matched')
print(f'  Not-yet-verified skills (NEW): {uv_matched}/{uv_total} matched')

# Encoding distribution
enc_counts = Counter()
rel_offsets = Counter()
for r in results:
    for m in r['matches']:
        enc, ridx, b, dmg = m
        enc_counts[enc] += 1
        # Use relative offset (within the 114-byte base record — but records vary, so use b directly)
        rel_offsets[b] += 1

print(f'\nEncoding distribution:')
for e, c in enc_counts.most_common():
    print(f'  {e}: {c} matches')

print(f'\nTop 15 byte offsets (record-relative):')
for b, c in rel_offsets.most_common(15):
    print(f'  byte_offset={b}: {c} matches')

# Show 5 sample matches
print(f'\n5 sample matches:')
for r in results:
    if r['match_count'] > 0:
        print(f"  skillId={r['skillId']} name='{r['name']}' expected={r['expected_damage']} matches={r['matches'][:3]}")
