#!/usr/bin/env python3
"""
Search skillcommand.dbss byte-by-byte for known PvP% / damage values.

Known damage values to search for (from task description):
- 2951: Soul Ascent I = 82.32% (so value 8232 or 82.32 or similar)
- 1016: Evasive Explosion Shot I = 50.00% (so value 5000 or 50 or 50.00)
- 1180: Elastic Force II = 42.51%
- 1490: Sharp Light I = 70.00%
- 5762: Vengeful Star IV = 92.48%
- 7198: Flower Shroud II = 45.41%
- 3344: Earth Kick II = 85.00%

We search as:
- u32 (raw value, e.g., 8232)
- u16 (raw value)
- float32 (e.g., 82.32)
- scaled ×10 (e.g., 823.2 as float, or 8232 as u32)
- scaled ×100 (e.g., 8232 as u32)
"""
import struct
import json

DBSS_PATH = '/tmp/skill-extract/skillcommand.dbss'
OFFSET_PATH = '/tmp/skill-extract/skillcommandoffset.dbss'

KNOWN_VALUES = [
    # (skill_id, name, pvp_pct, raw_value_x100, scaled_x10, raw_value)
    (2951, 'Soul Ascent I', 82.32, 8232, 823.2, 82),
    (1016, 'Evasive Explosion Shot I', 50.00, 5000, 500.0, 50),
    (1180, 'Elastic Force II', 42.51, 4251, 425.1, 42),
    (1490, 'Sharp Light I', 70.00, 7000, 700.0, 70),
    (5762, 'Vengeful Star IV', 92.48, 9248, 924.8, 92),
    (7198, 'Flower Shroud II', 45.41, 4541, 454.1, 45),
    (3344, 'Earth Kick II', 85.00, 8500, 850.0, 85),
    # Also try damage% values (different from PvP%) — these are bdocodex values
    # 2951 Soul Ascent I: damage 82.32%? or 8232%?
    # Let's also try the raw integer damage values that might appear
]


def search_value(data, value, label):
    """Search the data for a value as u32, u16, float32."""
    matches = []
    # As u32 LE
    val_bytes_u32 = struct.pack('<I', value) if 0 <= value < 2**32 else None
    if val_bytes_u32:
        pos = 0
        while True:
            p = data.find(val_bytes_u32, pos)
            if p < 0: break
            matches.append(('u32', p, value))
            pos = p + 1
    # As u16 LE
    if 0 <= value < 65536:
        val_bytes_u16 = struct.pack('<H', value)
        pos = 0
        while True:
            p = data.find(val_bytes_u16, pos)
            if p < 0: break
            matches.append(('u16', p, value))
            pos = p + 1
    return matches


def search_float(data, value, label):
    """Search for a float32 value."""
    val_bytes = struct.pack('<f', value)
    matches = []
    pos = 0
    while True:
        p = data.find(val_bytes, pos)
        if p < 0: break
        matches.append(('float32', p, value))
        pos = p + 1
    return matches


def main():
    with open(DBSS_PATH, 'rb') as f:
        data = f.read()
    print(f'skillcommand.dbss size: {len(data)}')

    # Also check the offset index file
    with open(OFFSET_PATH, 'rb') as f:
        off_data = f.read()
    print(f'skillcommandoffset.dbss size: {len(off_data)}')

    print()
    print('=== Searching skillcommand.dbss for known damage values ===')
    print()
    all_results = []

    for skill_id, name, pvp_pct, raw_x100, scaled_x10, raw_int in KNOWN_VALUES:
        print(f'--- Skill {skill_id} ({name}, PvP%={pvp_pct}) ---')
        # Try various representations
        candidates = [
            (f'u32 raw_int={raw_int}', raw_int, 'u32'),
            (f'u32 raw_x100={raw_x100}', raw_x100, 'u32'),
            (f'u16 raw_int={raw_int}', raw_int, 'u16'),
            (f'u16 raw_x100={raw_x100}', raw_x100, 'u16'),
            (f'float pvp_pct={pvp_pct}', pvp_pct, 'float'),
            (f'float scaled_x10={scaled_x10}', scaled_x10, 'float'),
            (f'float pvp_pct/100={pvp_pct/100}', pvp_pct/100, 'float'),
        ]
        for label, val, kind in candidates:
            if kind == 'u32':
                m = search_value(data, val, label)
            elif kind == 'u16':
                m = search_value(data, val, label)  # handles both u32 and u16
                # filter to u16 only
                m = [(k, p, v) for k, p, v in m if k == 'u16']
            else:
                m = search_float(data, val, label)
            if m:
                # Only show unique byte positions
                print(f'  {label}: {len(m)} matches (first 3): {m[:3]}')
                all_results.append({'skill_id': skill_id, 'name': name, 'encoding': label, 'matches': m})
            else:
                print(f'  {label}: 0 matches')

    print()
    print('=== Searching skillcommandoffset.dbss for known damage values ===')
    print()
    for skill_id, name, pvp_pct, raw_x100, scaled_x10, raw_int in KNOWN_VALUES:
        # The offset file is small (6.3 KB), so any matches are likely the skill_id itself
        candidates = [
            (f'u32 raw_int={raw_int}', raw_int, 'u32'),
            (f'u32 raw_x100={raw_x100}', raw_x100, 'u32'),
            (f'u16 raw_int={raw_int}', raw_int, 'u16'),
            (f'u16 raw_x100={raw_x100}', raw_x100, 'u16'),
        ]
        for label, val, kind in candidates:
            if kind == 'u32':
                m = search_value(off_data, val, label)
            elif kind == 'u16':
                m = search_value(off_data, val, label)
                m = [(k, p, v) for k, p, v in m if k == 'u16']
            else:
                m = []
            if m:
                print(f'  Skill {skill_id} ({name}) {label}: {len(m)} matches: {m[:5]}')

    # Also search for the SKILL IDs themselves (e.g., 2951 should appear if the offset index includes it)
    print()
    print('=== Searching skillcommand.dbss for skill IDs ===')
    for skill_id, name, *_ in KNOWN_VALUES:
        m_u16 = search_value(data, skill_id, '')
        m_u16 = [(k, p, v) for k, p, v in m_u16 if k == 'u16']
        m_u32 = search_value(data, skill_id, '')
        m_u32 = [(k, p, v) for k, p, v in m_u32 if k == 'u32']
        print(f'  Skill ID {skill_id} ({name}): u16={len(m_u16)} matches, u32={len(m_u32)} matches')
        if m_u16:
            for k, p, v in m_u16[:3]:
                # Show some context
                context = data[max(0,p-4):p+8].hex(' ')
                print(f'    u16 at byte {p}: {context}')

    # Save the results
    with open('/home/z/my-project/data/skillcommand-damage-search.json', 'w', encoding='utf-8') as f:
        # Convert tuples to lists for JSON
        json_safe = []
        for r in all_results:
            json_safe.append({
                'skill_id': r['skill_id'],
                'name': r['name'],
                'encoding': r['encoding'],
                'matches': [[m[0], m[1], m[2]] for m in r['matches']],
            })
        json.dump(json_safe, f, ensure_ascii=False, indent=2)
    print(f'\nSaved damage search results to /home/z/my-project/data/skillcommand-damage-search.json')


if __name__ == '__main__':
    main()
