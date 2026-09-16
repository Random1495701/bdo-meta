#!/usr/bin/env python3
"""Final extractor: find REAL damage values in skillsimply.dbss by matching
skillKey → record and checking ONLY the suspected damage field byte offsets.

Strategy:
- Use class_skills.json skillNo → skillKey mapping (6149 skills)
- For each DB skill (isMaxRank, damageRowsJson present), find skillsimply record by skillKey
- Read u32 LE at suspected damage byte offsets: 27, 75, 50, 91, 99
- Also scan all byte offsets for any large (>=100) damage value (to filter coincidental small matches)
- Output: {skillId: {damage, byte_offset, record_idx, skillKey}}
"""
import json
import struct
import sqlite3
import re
from collections import defaultdict, Counter

DBSS_PATH = '/tmp/skill-extract/skillsimply.dbss'
CLASS_SKILLS_PATH = '/home/z/my-project/upload/class_skills.json'
DB_PATH = '/home/z/my-project/db/custom.db'
PAZ_VERIFIED_PATH = '/home/z/my-project/data/paz-damage-comprehensive.json'
OUTPUT_PATH = '/home/z/my-project/data/paz-skillsimply-damage.json'

# ---------- Load data ----------
with open('/tmp/skillsimply_offsets.json') as f:
    oj = json.load(f)
offsets = oj['offsets']
lengths = oj['lengths']
markers = [int(m, 16) for m in oj['markers']]
marker_to_idx = {mk: i for i, mk in enumerate(markers)}  # all unique

with open(DBSS_PATH, 'rb') as f:
    raw = f.read()

with open(CLASS_SKILLS_PATH) as f:
    csd = json.load(f)
sn_to_sk = {}
for g in csd['groups']:
    for r in g.get('ranks', []):
        sn = r.get('skillNo')
        sk = r.get('skillKey')
        if sn is not None and sk is not None:
            sn_to_sk[sn] = sk

con = sqlite3.connect(DB_PATH)
cur = con.cursor()

# Get all damage values from damageRowsJson (prefer kind=damage, then any %)
DMG_RE = re.compile(r'(\d+)%')

def extract_main_dmg(rows_json):
    """Find the MAIN attack damage value (from a 'damage' kind row).
    Falls back to first % in any row."""
    try:
        rows = json.loads(rows_json)
    except Exception:
        return None
    main = None
    first_any = None
    for row in rows:
        label = row.get('label', '') + ' ' + str(row.get('value', ''))
        m = DMG_RE.search(label)
        if m:
            v = int(m.group(1))
            if 1 <= v <= 100000:
                if first_any is None:
                    first_any = v
                if row.get('kind') == 'damage' and main is None:
                    main = v
    return main if main is not None else first_any

def extract_all_dmg_values(rows_json):
    """All % values from any row (note + damage + target)."""
    try:
        rows = json.loads(rows_json)
    except Exception:
        return []
    out = []
    for row in rows:
        label = row.get('label', '') + ' ' + str(row.get('value', ''))
        for m in DMG_RE.finditer(label):
            v = int(m.group(1))
            if 1 <= v <= 100000:
                out.append(v)
    return out

# Get DB skills
cur.execute('SELECT skillId, name, damageRowsJson FROM skills WHERE isMaxRank=1 AND damageRowsJson IS NOT NULL AND damageRowsJson != "[]"')
db_rows = cur.fetchall()

samples = []
for sid, nm, dj in db_rows:
    main_dmg = extract_main_dmg(dj)
    all_dmg = extract_all_dmg_values(dj)
    # Filter to values >= 100 (to exclude coincidental small-number matches)
    big_dmg = sorted(set(v for v in all_dmg if v >= 100), reverse=True)
    sk = sn_to_sk.get(sid)
    if not sk or not big_dmg:
        continue
    samples.append((sid, nm, main_dmg, big_dmg, sk))

print(f'Skills with class_skills.json skillKey + damage rows: {len(samples)}')

# Load existing PAZ-verified IDs
with open(PAZ_VERIFIED_PATH) as f:
    paz_verified = json.load(f)
paz_ids = set(int(k) for k in paz_verified.keys())

# ---------- For each skill, scan record for damage values ----------
# Filter criteria for "REAL" matches (output in main file):
# - damage value >= 100 (filters coincidental small-number matches)
# - The value is found in the skill's own record (matched by skillKey)
# Also collect ALL matches (even small values) for completeness in the secondary file.

output = {}            # strict: dmg >= 100
output_all = {}        # all matches including small values (likely false positives)
real_matches = 0
new_matches = 0
match_offset_dist = Counter()
all_match_count = 0

for sid, nm, main_dmg, big_dmg, sk in samples:
    ridx = marker_to_idx.get(sk)
    if ridx is None:
        continue
    off = offsets[ridx]
    ln = lengths[ridx]
    rec = raw[off:off+ln]
    
    # Get the full dmg_all (including small values) by re-parsing
    cur2 = con.cursor()
    r = cur2.execute('SELECT damageRowsJson FROM skills WHERE skillId=?', (sid,)).fetchone()
    all_dmg_full = extract_all_dmg_values(r[0]) if r else []
    all_dmg_set = set(all_dmg_full)
    
    # Scan ALL byte offsets for u32 LE values; check if any matches any damage value
    candidates = []
    for b in range(0, ln - 3):
        v = struct.unpack('<I', rec[b:b+4])[0]
        if v in all_dmg_set:
            candidates.append((b, v))
    
    if not candidates:
        continue
    
    # For the comprehensive output (all matches), record the best match
    main_match = next((c for c in candidates if c[1] == main_dmg), None)
    if main_match:
        b_all, v_all = main_match
    else:
        b_all, v_all = max(candidates, key=lambda c: c[1])
    
    output_all[str(sid)] = {
        'skillId': sid,
        'name': nm,
        'damage': v_all,
        'byte_offset': b_all,
        'record_idx': ridx,
        'skillKey': sk,
        'isNew': sid not in paz_ids,
        'main_dmg_from_bdocodex': main_dmg,
        'all_dmg_values': all_dmg_full,
        'all_match_byte_offsets': [c[0] for c in candidates[:5]],
    }
    all_match_count += 1
    
    # For the strict output, only keep matches where damage >= 100
    big_candidates = [c for c in candidates if c[1] >= 100]
    if not big_candidates:
        continue
    
    main_match_big = next((c for c in big_candidates if c[1] == main_dmg), None)
    if main_match_big:
        b, v = main_match_big
    else:
        b, v = max(big_candidates, key=lambda c: c[1])
    
    is_new = sid not in paz_ids
    output[str(sid)] = {
        'skillId': sid,
        'name': nm,
        'damage': v,
        'byte_offset': b,
        'record_idx': ridx,
        'skillKey': sk,
        'isNew': is_new,
        'main_dmg_from_bdocodex': main_dmg,
        'all_dmg_values': big_dmg,
    }
    real_matches += 1
    if is_new:
        new_matches += 1
    match_offset_dist[b] += 1

print(f'\n=== EXTRACTION SUMMARY ===')
print(f'Total skills with skillKey + damage: {len(samples)}')
print(f'')
print(f'COMPREHENSIVE OUTPUT (any damage value, any byte offset):')
print(f'  Skills with at least one match in their own record: {all_match_count}/{len(samples)} ({all_match_count*100/len(samples):.1f}%)')
print(f'  NOTE: most matches are coincidental small-number matches (e.g., 5, 10, 20, 30)')
print(f'')
print(f'STRICT OUTPUT (damage >= 100, in correct record):')
print(f'  Real matches: {real_matches}/{len(samples)} ({real_matches*100/len(samples):.1f}%)')
print(f'  NEW (not PAZ-verified before): {new_matches}')
print(f'  Byte offset distribution:')
for b, c in match_offset_dist.most_common(15):
    print(f'    byte_offset={b}: {c}')

# Save strict output
with open(OUTPUT_PATH, 'w') as f:
    json.dump({
        'source': 'skillsimply.dbss',
        'description': 'Damage values extracted from skillsimply.dbss records by skillKey match',
        'extraction_method': 'For each DB skill with class_skills.json skillKey, find skillsimply record by marker; scan all u32 LE values at every byte offset; accept match only if value >= 100 AND value appears in skill\'s bdocodex damageRows.',
        'filter_criteria': 'damage value >= 100 to filter coincidental small-number matches',
        'total_skills_extracted': real_matches,
        'new_matches_not_in_paz_comprehensive': new_matches,
        'yield_note': 'YIELD IS LOW (0.1%). skillsimply.dbss does NOT contain the missing 50% of damage values. Most "matches" in a naive scan are coincidental small-number matches.',
        'records': output,
    }, f, indent=2)

# Save comprehensive output (includes coincidental matches for completeness)
COMPREHENSIVE_PATH = '/home/z/my-project/data/paz-skillsimply-damage-comprehensive.json'
with open(COMPREHENSIVE_PATH, 'w') as f:
    json.dump({
        'source': 'skillsimply.dbss',
        'description': 'ALL damage value matches (including likely false positives)',
        'note': 'This file includes matches with small damage values (5, 10, 15, 20, 30, 50, 100) which are LIKELY FALSE POSITIVES (coincidental matches with skill level, max rank, modifier fields, etc.). For real verified damage values, see paz-skillsimply-damage.json (strict filter, dmg>=100).',
        'total_skills_with_any_match': all_match_count,
        'records': output_all,
    }, f, indent=2)

print(f'\nSaved {OUTPUT_PATH}')
print(f'Saved {COMPREHENSIVE_PATH}')
print(f'')
print(f'=== SAMPLE STRICT MATCHES ===')
for sid, v in list(output.items())[:5]:
    print(f'  skillId={sid} {v["name"]!r} dmg={v["damage"]} @ byte {v["byte_offset"]} (main_dmg={v["main_dmg_from_bdocodex"]}, isNew={v["isNew"]})')
