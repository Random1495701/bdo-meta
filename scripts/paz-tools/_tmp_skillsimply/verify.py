#!/usr/bin/env python3
"""Verify the field layout: look up each DB skill's skillKey, find the matching
skillsimply record by marker, and read damage at byte 53/other offsets.

The previous analysis showed that "matches" can be COINCIDENTAL — i.e., the
damage value D for skill X happened to appear in a record whose skillKey's high
u16 = D (but the record isn't for skill X). To verify REAL damage storage, we
need to:
  1. Find skillsimply record whose marker == skill_X's actual skillKey
  2. Read the damage value at byte offset(s) in THAT record
  3. Compare to bdocodex damage for skill X
"""
import json
import struct
import pickle
import sqlite3
import re
from collections import Counter, defaultdict

DBSS_PATH = '/tmp/skill-extract/skillsimply.dbss'

# Load
with open('/tmp/skillsimply_offsets.json') as f:
    oj = json.load(f)
offsets = oj['offsets']
lengths = oj['lengths']
markers = [int(m, 16) for m in oj['markers']]

# Build marker -> record_idx dict (some records may have duplicate markers,
# but let's see)
marker_to_idx = defaultdict(list)
for i, mk in enumerate(markers):
    marker_to_idx[mk].append(i)

print(f'Total records: {len(markers)}')
print(f'Unique markers: {len(marker_to_idx)}')

# Sample: how many markers are duplicates?
dups = [(m, len(idxs)) for m, idxs in marker_to_idx.items() if len(idxs) > 1]
print(f'Duplicate markers: {len(dups)}')
if dups:
    for m, c in sorted(dups, key=lambda x: -x[1])[:5]:
        print(f'  marker 0x{m:08X}: {c} records')

# Load raw bytes
with open(DBSS_PATH, 'rb') as f:
    raw = f.read()

# Load class_skills.json -> skillNo -> skillKey
with open('/home/z/my-project/upload/class_skills.json') as f:
    csd = json.load(f)

sn_to_sk = {}  # skillNo -> skillKey
sk_to_sn = {}  # skillKey -> skillNo (last wins for duplicates)
for g in csd['groups']:
    for r in g.get('ranks', []):
        sn = r.get('skillNo')
        sk = r.get('skillKey')
        if sn is not None and sk is not None:
            sn_to_sk[sn] = sk
            sk_to_sn[sk] = sn
print(f'class_skills.json: {len(sn_to_sk)} skillNo -> skillKey mappings')

# Load DB
con = sqlite3.connect('/home/z/my-project/db/custom.db')
cur = con.cursor()

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
            if 1 <= v <= 100000:
                return v
    return None

# Get all max-rank skills with damage
cur.execute('SELECT skillId, name, damageRowsJson FROM skills WHERE isMaxRank=1 AND damageRowsJson IS NOT NULL AND damageRowsJson != "[]"')
db_rows = cur.fetchall()

samples = []
for sid, nm, dj in db_rows:
    dmg = extract_dmg(dj)
    if dmg is None:
        continue
    sk = sn_to_sk.get(sid)
    if not sk:
        continue  # skill not in class_skills.json
    samples.append((sid, nm, dmg, sk))

print(f'DB skills with damage + skillKey mapping: {len(samples)}')

# For each sample, find skillsimply record with matching marker
# Then read u32 LE at various byte offsets (53, 27, 71, 79, 75, 57, 35)
# Compare to expected damage

offsets_to_check = [27, 35, 53, 57, 71, 75, 79, 107, 99, 91, 85, 21, 23, 33]

verified_matches = []
no_record = 0
no_match = 0
wrong_match = 0

for sid, nm, dmg, sk in samples:
    rec_idxs = marker_to_idx.get(sk, [])
    if not rec_idxs:
        no_record += 1
        continue
    # Use the first matching record (or all of them?)
    matched_offsets = []
    for ridx in rec_idxs:
        off = offsets[ridx]
        ln = lengths[ridx]
        rec = raw[off:off+ln]
        for b in offsets_to_check:
            if b + 4 > ln:
                continue
            v = struct.unpack('<I', rec[b:b+4])[0]
            if v == dmg:
                matched_offsets.append((ridx, b))
                break  # one per record is enough
        if matched_offsets:
            break  # found in first record
    if not matched_offsets:
        no_match += 1
    else:
        verified_matches.append({
            'skillId': sid,
            'name': nm,
            'expected_damage': dmg,
            'skillKey': sk,
            'matches': [{'record_idx': r, 'byte_offset': b} for r, b in matched_offsets],
        })

print(f'\n=== VERIFIED MATCHES (record matched by skillKey, damage at known offset) ===')
print(f'Total skills with skillKey lookup: {len(samples)}')
print(f'  No record found for skillKey: {no_record}')
print(f'  Record found, but damage NOT at known offset: {no_match}')
print(f'  Damage found at known offset: {len(verified_matches)}')

# Verify offset distribution for verified matches
off_dist = Counter()
for v in verified_matches:
    for m in v['matches']:
        off_dist[m['byte_offset']] += 1
print(f'\nOffset distribution (verified):')
for b, c in off_dist.most_common():
    print(f'  byte_offset={b}: {c}')

# Show 10 samples
print(f'\n10 sample verified matches:')
for v in verified_matches[:10]:
    print(f"  skillId={v['skillId']} name={v['name']!r} dmg={v['expected_damage']} skillKey=0x{v['skillKey']:08X} matches={v['matches']}")

# How many of these are NEW (not in paz-damage-comprehensive.json)?
with open('/home/z/my-project/data/paz-damage-comprehensive.json') as f:
    verified_paz = json.load(f)
paz_ids = set(int(k) for k in verified_paz.keys())

new_matches = [v for v in verified_matches if v['skillId'] not in paz_ids]
print(f'\nOf {len(verified_matches)} verified matches, NEW (not PAZ-verified before): {len(new_matches)}')
print(f'10 NEW samples:')
for v in new_matches[:10]:
    print(f"  skillId={v['skillId']} name={v['name']!r} dmg={v['expected_damage']}")

# Save the verified results
with open('/tmp/skillsimply_verified.json', 'w') as f:
    json.dump({
        'total_with_skillKey_lookup': len(samples),
        'no_record_for_skillKey': no_record,
        'record_found_but_no_damage_at_known_offset': no_match,
        'verified_matches': len(verified_matches),
        'new_matches_not_in_paz': len(new_matches),
        'verified_matches_list': verified_matches,
        'new_matches_list': new_matches,
    }, f, indent=2)

# ---------- Dump 10 sample records for verified matches ----------
print(f'\n=== 10 sample records (verified matches with hex) ===')
for v in verified_matches[:10]:
    sid = v['skillId']
    nm = v['name']
    dmg = v['expected_damage']
    sk = v['skillKey']
    m = v['matches'][0]
    ridx = m['record_idx']
    b = m['byte_offset']
    off = offsets[ridx]
    ln = lengths[ridx]
    rec = raw[off:off+ln]
    print(f'\nskillId={sid} {nm} dmg={dmg} rec[{ridx}] off={off} len={ln} skillKey=0x{sk:08X}')
    print(f'  Full hex:')
    for i in range(0, ln, 16):
        chunk = rec[i:i+16]
        hex_str = ' '.join(f'{c:02x}' for c in chunk)
        ascii_str = ''.join(chr(c) if 32 <= c < 127 else '.' for c in chunk)
        print(f'    {i:3d}: {hex_str:<48} {ascii_str}')
    print(f'  bytes {b}-{b+3}: {rec[b:b+4].hex()} = {struct.unpack("<I", rec[b:b+4])[0]}')
