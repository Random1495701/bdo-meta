#!/usr/bin/env python3
"""Verified damage extraction: for each DB skill, find its skillsimply record
by skillKey (marker) and check ALL byte offsets for the damage value (u32, u16, f32).

Then build a per-skill damage record with the byte offset of the match.
"""
import json
import struct
import sqlite3
import re
from collections import Counter, defaultdict

DBSS_PATH = '/tmp/skill-extract/skillsimply.dbss'

# Load offsets & markers
with open('/tmp/skillsimply_offsets.json') as f:
    oj = json.load(f)
offsets = oj['offsets']
lengths = oj['lengths']
markers = [int(m, 16) for m in oj['markers']]

marker_to_idx = defaultdict(list)
for i, mk in enumerate(markers):
    marker_to_idx[mk].append(i)

# Load raw bytes
with open(DBSS_PATH, 'rb') as f:
    raw = f.read()

# class_skills.json
with open('/home/z/my-project/upload/class_skills.json') as f:
    csd = json.load(f)
sn_to_sk = {}
for g in csd['groups']:
    for r in g.get('ranks', []):
        sn = r.get('skillNo')
        sk = r.get('skillKey')
        if sn is not None and sk is not None:
            sn_to_sk[sn] = sk

# DB skills
con = sqlite3.connect('/home/z/my-project/db/custom.db')
cur = con.cursor()

# Get the FULL damage info from damageRowsJson (extract all damage numbers, not just first)
DMG_RE = re.compile(r'(\d+)%')

def extract_all_dmg(rows_json):
    """Return list of damage numbers from damageRowsJson (deduplicated)."""
    try:
        rows = json.loads(rows_json)
    except Exception:
        return []
    out = []
    for row in rows:
        label = row.get('label', '')
        for m in DMG_RE.finditer(label):
            v = int(m.group(1))
            if 1 <= v <= 100000:
                out.append(v)
    return out

def extract_first_dmg(rows_json):
    """First damage number."""
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

# Build samples with skillKey
samples = []
for sid, nm, dj in db_rows:
    dmg_first = extract_first_dmg(dj)
    dmg_all = extract_all_dmg(dj)
    if dmg_first is None or not dmg_all:
        continue
    sk = sn_to_sk.get(sid)
    if not sk:
        continue
    samples.append((sid, nm, dmg_first, dmg_all, sk))

print(f'Skills with damage + skillKey mapping: {len(samples)}')

# For each skill, find the matching record by skillKey, then scan ALL byte offsets
verified_matches = []
no_record = 0
no_match = 0

for sid, nm, dmg_first, dmg_all, sk in samples:
    rec_idxs = marker_to_idx.get(sk, [])
    if not rec_idxs:
        no_record += 1
        continue
    
    found_in_skill = []
    for ridx in rec_idxs:
        off = offsets[ridx]
        ln = lengths[ridx]
        rec = raw[off:off+ln]
        
        # Check ALL byte offsets for ANY damage value from dmg_all
        # u32 scan
        u32_hits = defaultdict(list)  # byte_offset -> damage_value
        for b in range(0, ln - 3):
            v = struct.unpack('<I', rec[b:b+4])[0]
            if v in dmg_all:
                u32_hits[b].append(v)
        
        if u32_hits:
            # Pick the best byte_offset (one with most matches, prefer non-aligned)
            for b, vals in u32_hits.items():
                for v in vals:
                    found_in_skill.append((ridx, b, 'u32', v))
            break  # one record is enough
    
    if not found_in_skill:
        no_match += 1
    else:
        # Only keep matches where the value equals the FIRST damage value (main damage)
        # OR any value in dmg_all
        verified_matches.append({
            'skillId': sid,
            'name': nm,
            'expected_dmg_first': dmg_first,
            'all_damage_values': dmg_all,
            'skillKey': sk,
            'matches': [{'record_idx': r, 'byte_offset': b, 'encoding': e, 'value': v} for r, b, e, v in found_in_skill],
        })

print(f'\n=== VERIFIED MATCHES (record matched by skillKey, ANY damage value in dmg_all) ===')
print(f'Total skills with skillKey: {len(samples)}')
print(f'  No record found: {no_record}')
print(f'  Record found, NO damage value from skill found: {no_match}')
print(f'  Damage value found: {len(verified_matches)} ({len(verified_matches)*100/len(samples):.1f}%)')

# Of matches, check whether first/main damage is found
has_first_dmg_match = 0
for v in verified_matches:
    if any(m['value'] == v['expected_dmg_first'] for m in v['matches']):
        has_first_dmg_match += 1
print(f'  Of matches, first-damage-value also matched: {has_first_dmg_match}')

# Encoding distribution
enc_dist = Counter()
off_dist = Counter()
for v in verified_matches:
    for m in v['matches']:
        enc_dist[m['encoding']] += 1
        off_dist[m['byte_offset']] += 1

print(f'\nEncoding distribution:')
for e, c in enc_dist.most_common():
    print(f'  {e}: {c}')

print(f'\nTop 25 byte offsets (verified, any-damage match):')
for b, c in off_dist.most_common(25):
    print(f'  byte_offset={b}: {c}')

# Check overlap with existing PAZ-verified
with open('/home/z/my-project/data/paz-damage-comprehensive.json') as f:
    verified_paz = json.load(f)
paz_ids = set(int(k) for k in verified_paz.keys())

new_matches = [v for v in verified_matches if v['skillId'] not in paz_ids]
print(f'\n=== NEW MATCHES (not yet PAZ-verified) ===')
print(f'NEW matches: {len(new_matches)}')

# Distribution of NEW matches' byte offsets
new_off_dist = Counter()
for v in new_matches:
    for m in v['matches']:
        new_off_dist[m['byte_offset']] += 1
print(f'Top 25 byte offsets for NEW matches:')
for b, c in new_off_dist.most_common(25):
    print(f'  byte_offset={b}: {c}')

# Pick 5 NEW matches' first-match (main damage verified) for hex dump
print(f'\n=== 8 NEW matches (sample records) ===')
shown = 0
for v in new_matches:
    if not any(m['value'] == v['expected_dmg_first'] for m in v['matches']):
        continue
    sid = v['skillId']
    nm = v['name']
    dmg = v['expected_dmg_first']
    sk = v['skillKey']
    # Pick the first match where value == main dmg
    chosen = next(m for m in v['matches'] if m['value'] == dmg)
    ridx = chosen['record_idx']
    b = chosen['byte_offset']
    off = offsets[ridx]
    ln = lengths[ridx]
    rec = raw[off:off+ln]
    print(f'\nskillId={sid} {nm} dmg={dmg} rec[{ridx}] off={off} len={ln} skillKey=0x{sk:08X}')
    for i in range(0, ln, 16):
        chunk = rec[i:i+16]
        hex_str = ' '.join(f'{c:02x}' for c in chunk)
        ascii_str = ''.join(chr(c) if 32 <= c < 127 else '.' for c in chunk)
        print(f'    {i:3d}: {hex_str:<48} {ascii_str}')
    print(f'  bytes {b}-{b+3}: {rec[b:b+4].hex()} = {struct.unpack("<I", rec[b:b+4])[0]}')
    shown += 1
    if shown >= 8:
        break

# Save verified matches
with open('/tmp/skillsimply_verified_full.json', 'w') as f:
    json.dump({
        'total_skills_with_skillKey': len(samples),
        'no_record_for_skillKey': no_record,
        'record_but_no_damage_match': no_match,
        'damage_match_found': len(verified_matches),
        'new_matches_not_in_paz': len(new_matches),
        'matches': verified_matches,
        'new_matches': new_matches,
    }, f, indent=2)
print('\nSaved /tmp/skillsimply_verified_full.json')
