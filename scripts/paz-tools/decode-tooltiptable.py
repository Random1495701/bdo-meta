#!/usr/bin/env python3
"""
Full tooltiptable.dbss decoder.
Extracts damage rows, PvP%, description, BSR cost, and protection types for ALL skills.

Pipeline:
1. Parse clean strings from string table (null-terminated u16 with PA markup)
2. Walk all skill.dbss records (30,400 entries) — extract skillId, u32@76 = tooltiptable offset index
3. For each skill, find the tooltip record at offsets[u32@76]
4. The tooltip record spans multiple 21-byte sub-records (consecutive offset indices)
   Each sub-record: [u32 hash][u32 str_id][u32 param1][u32 param2][u32 param3][u8 pad]
5. Build full tooltip text by:
   - For each sub-record, look up strings[str_id]
   - Substitute {p0}, {p1}, {p2} with params (param1, param2, param3) — though order may vary
6. Extract from rendered text:
   - Damage rows: "{p0}% x {p1}" templates with damage values
   - PvP%: "PVP 시 피해 적용 비율 : {p1}%" templates
   - Description text: the concatenated clean text
   - BSR cost: "흑정령의 분노 - {p0}% 소모" templates
   - Protection types: "전방 가드", "슈퍼 아머", "무적" keywords
"""
import struct, json, re
from pathlib import Path
import sys

# --- 1. Parse clean strings from string table ---
def parse_strings(tt_bytes, tt_st):
    """Parse null-terminated u16 strings from string table starting at tt_st + 9."""
    # The first 9 bytes are: [u32 count][u32 m][u8 0x00 separator]
    # Strings start at tt_st + 9
    pos = tt_st + 9
    strings = []
    i = 0
    while pos < len(tt_bytes) - 8:
        # Find next null u16
        null_pos = tt_bytes.find(b'\x00\x00', pos)
        if null_pos < 0 or null_pos > len(tt_bytes) - 8: break
        text = tt_bytes[pos:null_pos].decode('utf-16-le', errors='replace')
        clean = re.sub(r'<PA[^>]*>', '', text).strip()
        # Filter: keep strings with Korean text or PA markup
        has_korean = any(0xAC00 <= ord(c) <= 0xD7AF for c in clean)
        has_pa = '<PAColor' in text or '<PAOldColor' in text
        has_p_tag = '{p' in text
        korean_count = sum(1 for c in clean if 0xAC00 <= ord(c) <= 0xD7AF)
        if (has_korean and korean_count >= 1) or has_pa or has_p_tag:
            strings.append({
                'pos': pos,
                'end': null_pos,
                'text': text,
                'clean': clean,
            })
            # Skip null terminator + 0x01 separator if present
            next_pos = null_pos + 2
            if next_pos < len(tt_bytes) and tt_bytes[next_pos] in [0, 1, 2, 3]:
                next_pos += 1
            pos = next_pos
        else:
            # Skip noise and try next position
            pos = null_pos + 2
        i += 1
    return strings

# --- 2. Parse skill.dbss records ---
def parse_skill_dbss():
    sk = Path('tool-results/bt/skill/skill.dbss').read_bytes()
    sk_off = Path('tool-results/bt/skill/skilloffset.dbss').read_bytes()
    sk_off_st = struct.unpack('<Q', sk_off[-8:])[0]
    sk_rows = struct.unpack('<I', sk_off[4:8])[0]

    # Each entry: [u32 key][u32 offset][u32 size]
    # key = (skillId << 16) | rank
    entries = {}
    for i in range(sk_rows):
        o = 8 + i * 12
        if o+12 > sk_off_st: break
        key = struct.unpack('<I', sk_off[o:o+4])[0]
        offset = struct.unpack('<I', sk_off[o+4:o+8])[0]
        size = struct.unpack('<I', sk_off[o+8:o+12])[0]
        entries[key] = (offset, size)
    return sk, entries

# --- 3. Parse tooltiptable offset index ---
def parse_tt_offsets():
    tt_off = Path('upload/tooltiptableoffset.dbss').read_bytes()
    tt = Path('upload/tooltiptable.dbss').read_bytes()
    tt_st = struct.unpack('<Q', tt[-8:])[0]
    off_st = struct.unpack('<Q', tt_off[-8:])[0]
    offsets = []
    rows = (off_st - 8) // 16
    for i in range(rows):
        base = 8 + i * 16
        for ps in (0, 2):
            v = struct.unpack('<I', tt_off[base+ps*4:base+ps*4+4])[0]
            if 8 <= v < tt_st:
                offsets.append(v)
    offsets = sorted(set(offsets))
    return offsets, tt_st

# --- 4. Parse sub-records at a given offset index ---
def parse_sub_records(tt, offsets, tt_st, start_idx, max_sub_records=30):
    """Parse up to max_sub_records 21-byte sub-records starting at offsets[start_idx]."""
    sub_records = []
    for i in range(start_idx, min(start_idx + max_sub_records, len(offsets))):
        off = offsets[i]
        # Sub-records can be 21, 42, 63 bytes (1, 2, or 3 units of 21 bytes)
        next_off = offsets[i+1] if i+1 < len(offsets) else tt_st
        size = next_off - off
        # Number of 21-byte units in this offset entry
        n_units = size // 21
        for unit in range(n_units):
            sub = tt[off + unit*21 : off + (unit+1)*21]
            if len(sub) < 21: break
            h = struct.unpack('<I', sub[0:4])[0]
            str_id = struct.unpack('<I', sub[4:8])[0]
            p1 = struct.unpack('<I', sub[8:12])[0]
            p2 = struct.unpack('<I', sub[12:16])[0]
            p3 = struct.unpack('<I', sub[16:20])[0]
            sub_records.append({
                'offset_idx': i,
                'unit': unit,
                'hash': h,
                'str_id': str_id,
                'params': [p1, p2, p3],
            })
        # Stop if we hit a sentinel (str_id is way out of range, or hash repeats)
        # Use a heuristic: if str_id is 0, this might be the end
        # Actually, we should stop when the str_id wraps to a much lower value (reset)
    return sub_records

# --- 5. Render template text ---
def render_template(text, params):
    """Substitute {p0}, {p1}, {p2}, {p3} in text with params."""
    # Extract numeric params (skip if 0 or huge values that are likely flags)
    clean_params = []
    for p in params:
        if 0 < p < 100000:  # plausible damage/percent value
            clean_params.append(p)
        else:
            clean_params.append(0)
    # Replace {pN} with the Nth param
    def replace(m):
        n = int(m.group(1))
        if n < len(clean_params):
            return str(clean_params[n])
        return m.group(0)
    return re.sub(r'\{p(\d+)\}', replace, text)

# --- 6. Extract damage rows from rendered text ---
def extract_damage_rows(text):
    """Extract damage rows like '타격 피해 1000% x 5' from rendered text."""
    rows = []
    # Pattern: Korean/English text followed by {p0}% x {p1} or {p0}% {p1} (damage template)
    # After substitution: "타격 피해 1000% x 5"
    # Match: <text> <number>% x <number> OR <text> <number>% <number>
    # Find all damage patterns
    # Also: max N hits, max N targets
    patterns = [
        (r'([^\n<>]+?)\s+(\d+)%\s*x\s*(\d+)', 'damage_mult'),  # 1000% x 5
        (r'([^\n<>]+?)\s+(\d+)%\s+(\d+)', 'damage_simple'),  # 1000% 5
        (r'최대\s+(\d+)\s*타격', 'max_hits'),  # max N hits
        (r'최대\s+(\d+)\s*명', 'max_targets'),  # max N targets
    ]
    return rows

# --- Main ---
def main():
    print('Loading tooltiptable...')
    tt = Path('upload/tooltiptable.dbss').read_bytes()
    tt_st = struct.unpack('<Q', tt[-8:])[0]
    
    print('Parsing strings...')
    strings = parse_strings(tt, tt_st)
    print(f'  {len(strings)} strings parsed')
    
    print('Parsing tooltiptable offsets...')
    offsets, _ = parse_tt_offsets()
    print(f'  {len(offsets)} offset indices')
    
    print('Parsing skill.dbss...')
    sk, sk_entries = parse_skill_dbss()
    print(f'  {len(sk_entries)} skill entries')
    
    # For each skill, extract tooltip text
    print('\nExtracting tooltip text for all skills...')
    results = {}
    skipped = 0
    no_tooltip = 0
    for key, (offset, size) in sk_entries.items():
        skill_id = key >> 16
        rank = key & 0xFFFF
        # Take rank 1 only (each skill has multiple rank entries, all share the same tooltip)
        if rank != 1:
            continue
        # Read the record and extract u32@76
        rec = sk[offset:offset+size]
        if len(rec) < 80:
            skipped += 1
            continue
        tt_off_idx = struct.unpack('<I', rec[76:80])[0]
        if tt_off_idx == 0 or tt_off_idx >= len(offsets):
            no_tooltip += 1
            continue
        # Parse sub-records starting at this offset index
        sub_records = parse_sub_records(tt, offsets, tt_st, tt_off_idx, max_sub_records=20)
        # Build full tooltip text
        full_text_parts = []
        damage_rows = []
        pvp_percent = None
        bsr_cost = None
        protection_types = []
        for sr in sub_records:
            if sr['str_id'] < len(strings):
                s = strings[sr['str_id']]
                text = s['clean']
                # Render template
                rendered = render_template(text, sr['params'])
                full_text_parts.append(rendered)
                # Extract damage info
                # Pattern 1: "{p0}% x {p1}" → "1000% x 5"
                # Pattern 2: "{p0}% {p1}" → "1000% 5" (without 'x')
                m = re.search(r'(\d+)%\s*x\s*(\d+)', rendered)
                if m:
                    dmg_pct = int(m.group(1))
                    dmg_mult = int(m.group(2))
                    damage_rows.append({
                        'label': text.split('{')[0].strip(),
                        'pct': dmg_pct,
                        'mult': dmg_mult,
                    })
                # PvP%
                if 'PVP' in rendered.upper() or '피해 적용 비율' in rendered:
                    m = re.search(r'(\d+(?:\.\d+)?)\s*%', rendered)
                    if m and pvp_percent is None:
                        pvp_percent = float(m.group(1))
                # BSR cost: "흑정령의 분노 - X% 소모"
                if '흑정령' in rendered and '소모' in rendered:
                    m = re.search(r'(\d+)\s*%', rendered)
                    if m and bsr_cost is None:
                        bsr_cost = int(m.group(1))
                # Protection types
                if '전방 가드' in rendered:
                    if 'Forward Guard' not in protection_types:
                        protection_types.append('Forward Guard')
                if '슈퍼 아머' in rendered:
                    if 'Super Armor' not in protection_types:
                        protection_types.append('Super Armor')
                if '무적' in rendered:
                    if 'I-Frame' not in protection_types:
                        protection_types.append('I-Frame')
        results[skill_id] = {
            'skill_id': skill_id,
            'tt_offset_idx': tt_off_idx,
            'sub_records': len(sub_records),
            'damage_rows': damage_rows,
            'pvp_percent': pvp_percent,
            'bsr_cost': bsr_cost,
            'protection_types': protection_types,
            'full_text': '\n'.join(full_text_parts)[:2000],  # truncate for storage
        }
    
    print(f'\nResults:')
    print(f'  Total skills processed: {len(results)}')
    print(f'  Skipped (record too small): {skipped}')
    print(f'  No tooltip ref: {no_tooltip}')
    print(f'  With damage rows: {sum(1 for r in results.values() if r["damage_rows"])}')
    print(f'  With pvp_percent: {sum(1 for r in results.values() if r["pvp_percent"] is not None)}')
    print(f'  With bsr_cost: {sum(1 for r in results.values() if r["bsr_cost"] is not None)}')
    print(f'  With protection: {sum(1 for r in results.values() if r["protection_types"])}')
    
    # Save
    Path('data/tooltip-extracted-v2.json').write_text(json.dumps(results, ensure_ascii=False, indent=2))
    print(f'\nSaved → data/tooltip-extracted-v2.json')

if __name__ == '__main__':
    main()
