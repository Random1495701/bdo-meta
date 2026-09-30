#!/usr/bin/env python3
"""
Validate skillcommand-records.json against the DB.
- Match by icon_skill_id (skills.skillId)
- Match by Korean name (skills.krName with TRIM)
- Report: matches, mismatches, missing skills
- Cross-check against PAZ-verified skills (data/paz-damage-comprehensive.json)
"""
import sqlite3
import json
import os
import re

DB_PATH = '/home/z/my-project/db/custom.db'
RECORDS_JSON = '/home/z/my-project/data/skillcommand-records.json'
PAZ_JSON = '/home/z/my-project/data/paz-damage-comprehensive.json'

def load_paz_skill_ids():
    """Load the set of skill IDs that have PAZ-verified damage values."""
    if not os.path.exists(PAZ_JSON):
        print(f'WARNING: PAZ JSON not found at {PAZ_JSON}')
        return set()
    with open(PAZ_JSON, 'r', encoding='utf-8') as f:
        data = json.load(f)
    # Try several possible schema shapes
    paz_ids = set()
    if isinstance(data, list):
        for item in data:
            if isinstance(item, dict):
                sid = item.get('skillId') or item.get('skill_id') or item.get('id')
                if sid is not None:
                    paz_ids.add(int(sid))
            elif isinstance(item, (int, str)):
                paz_ids.add(int(item))
    elif isinstance(data, dict):
        # might be {skill_id: {...}} or {skills: [...]}
        if 'skills' in data and isinstance(data['skills'], list):
            for item in data['skills']:
                if isinstance(item, dict):
                    sid = item.get('skillId') or item.get('skill_id') or item.get('id')
                    if sid is not None:
                        paz_ids.add(int(sid))
        else:
            for k in data.keys():
                try:
                    paz_ids.add(int(k))
                except ValueError:
                    pass
    return paz_ids


def main():
    # Load skillcommand records
    with open(RECORDS_JSON, 'r', encoding='utf-8') as f:
        records = json.load(f)
    print(f'Loaded {len(records)} records from {RECORDS_JSON}')

    # Load PAZ-verified skill IDs
    paz_ids = load_paz_skill_ids()
    print(f'Loaded {len(paz_ids)} PAZ-verified skill IDs from {PAZ_JSON}')

    # Connect to DB
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Get DB skill IDs and Korean names
    c.execute('SELECT skillId, krName FROM skills')
    db_by_id = {}
    db_by_krname = {}
    for skill_id, kr_name in c.fetchall():
        db_by_id[skill_id] = kr_name
        if kr_name:
            db_by_krname[kr_name.strip()] = skill_id

    # Get total DB damage row count for context
    c.execute('SELECT COUNT(*) FROM skills WHERE damageRowsJson IS NOT NULL AND damageRowsJson != \"\"')
    print(f'DB skills with damage rows: {c.fetchone()[0]}')

    print(f'DB total skills: {len(db_by_id)}')
    print(f'DB skills with krName: {len(db_by_krname)}')

    # Validate each record
    match_by_id = 0
    match_by_krname = 0
    match_by_both = 0
    match_by_neither = 0
    mismatched_id_vs_krname = 0  # cases where both match but to different skill IDs
    not_in_db_by_id = []
    not_in_db_by_krname = []
    paz_overlap = 0
    new_paz_candidates = []

    for r in records:
        icon_id = r.get('icon_skill_id')
        strings = r.get('strings', [])
        kr_name = strings[1].strip() if len(strings) > 1 else None

        id_match_skill_id = icon_id if icon_id in db_by_id else None
        krname_match_skill_id = db_by_krname.get(kr_name) if kr_name else None

        if id_match_skill_id and krname_match_skill_id:
            match_by_both += 1
            if id_match_skill_id != krname_match_skill_id:
                mismatched_id_vs_krname += 1
                # print(f'  Mismatch for record {r["record_index"]}: icon_id={icon_id} -> skillId={id_match_skill_id}, but kr_name={kr_name!r} -> skillId={krname_match_skill_id}')
        elif id_match_skill_id:
            match_by_id += 1
            # If only icon_id matched, the Korean name doesn't exist in DB
            not_in_db_by_krname.append((r['record_index'], icon_id, kr_name))
        elif krname_match_skill_id:
            match_by_krname += 1
            # Korean name matched but icon_skill_id doesn't (skill not in DB by ID)
            not_in_db_by_id.append((r['record_index'], icon_id, kr_name, krname_match_skill_id))
        else:
            match_by_neither += 1
            not_in_db_by_id.append((r['record_index'], icon_id, kr_name, krname_match_skill_id))

        # Check if this skill is already PAZ-verified
        skill_id_to_check = id_match_skill_id or krname_match_skill_id
        if skill_id_to_check is not None:
            if skill_id_to_check in paz_ids:
                paz_overlap += 1
            else:
                new_paz_candidates.append({
                    'record_index': r['record_index'],
                    'icon_skill_id': icon_id,
                    'matched_skill_id': skill_id_to_check,
                    'matched_by': 'icon_id' if id_match_skill_id else 'krname',
                    'kr_name': kr_name,
                })

    print()
    print('=== VALIDATION STATS ===')
    print(f'Records parsed: {len(records)}')
    print(f'Match by BOTH icon_skill_id AND krName: {match_by_both}')
    print(f'  (of which mismatched: {mismatched_id_vs_krname})')
    print(f'Match by icon_skill_id only: {match_by_id}')
    print(f'Match by krName only: {match_by_krname}')
    print(f'Match by NEITHER: {match_by_neither}')
    print(f'Total records with icon_skill_id match: {match_by_id + match_by_both}')
    print(f'Total records with krName match: {match_by_krname + match_by_both}')
    print()
    print('=== PAZ OVERLAP ===')
    print(f'Records whose skill_id IS already PAZ-verified: {paz_overlap}')
    print(f'Records whose skill_id is NOT yet PAZ-verified: {len(new_paz_candidates)}')
    print(f'Total PAZ-verified skills in DB: {len(paz_ids)}')
    print()

    # Show sample mismatches and new candidates
    print(f'=== Sample records where icon_skill_id NOT in DB (first 15) ===')
    for tup in not_in_db_by_id[:15]:
        print(f'  {tup}')
    print()
    print(f'=== Sample records where icon_skill_id matches but krName NOT in DB (first 15) ===')
    for tup in not_in_db_by_krname[:15]:
        print(f'  {tup}')
    print()
    print(f'=== Sample NEW PAZ candidates (not yet verified, first 15) ===')
    for cand in new_paz_candidates[:15]:
        print(f'  {cand}')

    # Save new candidates
    with open('/home/z/my-project/data/skillcommand-new-paz-candidates.json', 'w', encoding='utf-8') as f:
        json.dump(new_paz_candidates, f, ensure_ascii=False, indent=2)
    print(f'\nSaved {len(new_paz_candidates)} new PAZ candidates to /home/z/my-project/data/skillcommand-new-paz-candidates.json')

    # Save summary
    summary = {
        'records_parsed': len(records),
        'match_by_both': match_by_both,
        'match_by_icon_skill_id_only': match_by_id,
        'match_by_krname_only': match_by_krname,
        'match_by_neither': match_by_neither,
        'mismatched_id_vs_krname': mismatched_id_vs_krname,
        'paz_overlap': paz_overlap,
        'new_paz_candidates': len(new_paz_candidates),
        'paz_total_verified': len(paz_ids),
    }
    with open('/home/z/my-project/data/skillcommand-validation-summary.json', 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print(f'Saved summary to /home/z/my-project/data/skillcommand-validation-summary.json')

    conn.close()


if __name__ == '__main__':
    main()
