#!/usr/bin/env python3
"""Analyze skillsimply.dbss scan results — examine record structure for matched samples."""
import json
import struct
import pickle
import sqlite3
import re
from collections import Counter, defaultdict

DBSS_PATH = '/tmp/skill-extract/skillsimply.dbss'
RESULTS_PATH = '/tmp/skillsimply_scan_results.json'
INPUT_PATH = '/tmp/skillsimply_scan_input.json'

# Load
with open(RESULTS_PATH) as f:
    results = json.load(f)
with open(INPUT_PATH) as f:
    inp = json.load(f)
with open('/tmp/skillsimply_idx.pkl', 'rb') as f:
    idx = pickle.load(f)

u32_idx = idx['u32']
u16_idx = idx['u16']
f32_idx = idx['f32']

# Load offsets
with open('/tmp/skillsimply_offsets.json') as f:
    oj = json.load(f)
offsets = oj['offsets']
lengths = oj['lengths']
markers = [int(m, 16) for m in oj['markers']]

# Load raw bytes
with open(DBSS_PATH, 'rb') as f:
    raw = f.read()

# Filter: separate "strong" matches from "weak" ones
# Strong match = u32 at a byte offset other than {2,6,21,23,33} (those are likely marker/structure positions)
# Better: a match is "strong" if the damage value is unique (>= 200) AND matched at one of the
# "real field" byte offsets (e.g., 53 which dominates for u32)
# Or the match appears in EXACTLY ONE record (not multiple records = same value in many records = coincidence)

# Count records per u32 value
rec_count_per_u32 = {v: len(set(r[0] for r in lst)) for v, lst in u32_idx.items()}
rec_count_per_u16 = {v: len(set(r[0] for r in lst)) for v, lst in u16_idx.items()}

# Print stats
print('=== u32 record count distribution ===')
counts = Counter()
for v, lst in u32_idx.items():
    n_rec = len(set(r[0] for r in lst))
    counts[n_rec] += 1
for c, n in sorted(counts.items())[:20]:
    print(f'  {n_rec_recs if False else c} records: {n} unique u32 values')

# Analyze filtered matches: only consider matches where the value appears in <=5 records
# (i.e. unique-enough to be a real damage value)
strong_matches = []  # list of (skill, matches_with_strong_filter)
for r in results:
    sid = r['skillId']
    nm = r['name']
    dmg = r['expected_damage']
    is_v = r['alreadyVerified']
    strong = []
    for m in r['matches']:
        enc, ridx, b, d = m
        if enc == 'u32':
            n_rec = rec_count_per_u32.get(d, 0)
        elif enc == 'u16':
            n_rec = rec_count_per_u16.get(d, 0)
        elif enc == 'f32':
            n_rec = len(set(r2[0] for r2 in f32_idx.get(d, [])))
        elif enc == 'u32_x10':
            n_rec = rec_count_per_u32.get(d * 10, 0)
        elif enc == 'u32_x100':
            n_rec = rec_count_per_u32.get(d * 100, 0)
        else:
            n_rec = 0
        # Strong if value is unique to <=10 records (i.e., not a common small value)
        if n_rec <= 10:
            strong.append((enc, ridx, b, d, n_rec))
    strong_matches.append({
        **r,
        'strong_matches': strong,
        'strong_count': len(strong),
    })

print('\n=== FILTERED YIELD (matches where value appears in <=10 records) ===')
total = len(strong_matches)
with_strong = sum(1 for r in strong_matches if r['strong_count'] > 0)
print(f'Skills with strong matches: {with_strong}/{total} ({with_strong*100/total:.1f}%)')
v_matched = sum(1 for r in strong_matches if r['alreadyVerified'] and r['strong_count'] > 0)
uv_matched = sum(1 for r in strong_matches if not r['alreadyVerified'] and r['strong_count'] > 0)
v_total = sum(1 for r in strong_matches if r['alreadyVerified'])
uv_total = sum(1 for r in strong_matches if not r['alreadyVerified'])
print(f'  Already-verified: {v_matched}/{v_total}')
print(f'  NEW (not-yet-verified): {uv_matched}/{uv_total}')

# Enc distribution of strong matches
enc_counts = Counter()
rel_offsets = Counter()
for r in strong_matches:
    for m in r['strong_matches']:
        enc, ridx, b, d, n_rec = m
        enc_counts[enc] += 1
        rel_offsets[b] += 1

print(f'\nStrong encoding distribution:')
for e, c in enc_counts.most_common():
    print(f'  {e}: {c}')

print(f'\nTop 15 byte offsets for strong matches:')
for b, c in rel_offsets.most_common(15):
    print(f'  byte_offset={b}: {c}')

# For strong matches, identify which records appear most often (matches per record)
print('\n=== Records appearing in many strong matches (top 20) ===')
rec_appearance = Counter()
for r in strong_matches:
    seen_in_skill = set()
    for m in r['strong_matches']:
        enc, ridx, b, d, n_rec = m
        # Don't double-count same record across multiple encodings
        if ridx not in seen_in_skill:
            rec_appearance[ridx] += 1
            seen_in_skill.add(ridx)
for ridx, c in rec_appearance.most_common(20):
    off = offsets[ridx]
    ln = lengths[ridx]
    mk = markers[ridx]
    print(f'  record[{ridx}] off={off} len={ln} marker=0x{mk:08X} appears_in={c}_skills')

# Dump 10 sample records that matched unique damage values at byte_offset 53
print('\n=== 10 sample records with matches at byte_offset 53 (u32) ===')
count = 0
for r in strong_matches:
    if r['strong_count'] == 0:
        continue
    # Pick the first match at byte_offset=53 with u32
    chosen = None
    for m in r['strong_matches']:
        enc, ridx, b, d, n_rec = m
        if b == 53 and enc == 'u32':
            chosen = (ridx, b, d)
            break
    if not chosen:
        # Try any u32 match
        for m in r['strong_matches']:
            enc, ridx, b, d, n_rec = m
            if enc == 'u32':
                chosen = (ridx, b, d)
                break
    if not chosen:
        continue
    ridx, b, d = chosen
    off = offsets[ridx]
    ln = lengths[ridx]
    mk = markers[ridx]
    rec = raw[off:off+ln]
    print(f'\nskillId={r["skillId"]} {r["name"]} dmg={d} rec[{ridx}] off={off} len={ln} marker=0x{mk:08X}')
    print(f'  Full hex ({ln}B):')
    for i in range(0, ln, 16):
        chunk = rec[i:i+16]
        hex_str = ' '.join(f'{c:02x}' for c in chunk)
        ascii_str = ''.join(chr(c) if 32 <= c < 127 else '.' for c in chunk)
        print(f'    {i:3d}: {hex_str:<48} {ascii_str}')
    print(f'  bytes {b}-{b+3}: {rec[b:b+4].hex()} = {int.from_bytes(rec[b:b+4], "little")}')
    count += 1
    if count >= 10:
        break

# Save filtered results
with open('/tmp/skillsimply_strong_results.json', 'w') as f:
    json.dump(strong_matches, f, indent=2)
