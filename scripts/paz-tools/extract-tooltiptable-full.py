#!/usr/bin/env python3
"""
Full tooltiptable.dbss decoder — extract damage rows, PvP%, description, BSR cost.
"""
import struct, json, re, sqlite3
from pathlib import Path
from collections import defaultdict

TT_PATH = 'upload/tooltiptable.dbss'
TT_OFF_PATH = 'upload/tooltiptableoffset.dbss'
DB_PATH = 'db/custom.db'
OUT_PATH = 'data/tooltip-full-extract.json'

def parse_strings(tt, tt_st):
    pos = tt_st + 9
    strings = []
    while pos < len(tt) - 8:
        null_pos = tt.find(b'\x00\x00', pos)
        if null_pos < 0 or null_pos > len(tt) - 8: break
        text = tt[pos:null_pos].decode('utf-16-le', errors='replace')
        clean = re.sub(r'<PA[^>]*>', '', text).strip()
        has_korean = any(0xAC00 <= ord(c) <= 0xD7AF for c in clean)
        has_pa = '<PAColor' in text or '<PAOldColor' in text
        has_p = '{p' in text
        korean_count = sum(1 for c in clean if 0xAC00 <= ord(c) <= 0xD7AF)
        if (has_korean and korean_count >= 1) or has_pa or has_p:
            strings.append({'pos': pos, 'text': text, 'clean': clean})
            next_pos = null_pos + 2
            if next_pos < len(tt) and tt[next_pos] in [0, 1, 2, 3]:
                next_pos += 1
            pos = next_pos
        else:
            pos = null_pos + 2
    return strings

def parse_subrecords(tt, tt_st, strings):
    pos = 8
    subs = []
    while pos + 21 <= tt_st:
        u0 = struct.unpack('<I', tt[pos:pos+4])[0]
        u4 = struct.unpack('<I', tt[pos+4:pos+8])[0]
        u8 = struct.unpack('<I', tt[pos+8:pos+12])[0]
        u12 = struct.unpack('<I', tt[pos+12:pos+16])[0]
        u16 = struct.unpack('<I', tt[pos+16:pos+20])[0]
        is_str_ref = u0 < len(strings)
        text = strings[u0]['clean'] if is_str_ref else None
        subs.append({
            'byte': pos, 'idx': (pos - 8) // 21,
            'u0': u0, 'u4': u4, 'u8': u8, 'u12': u12, 'u16': u16,
            'is_str_ref': is_str_ref,
            'text': text,
            'hash': u4 if is_str_ref else u0,
        })
        pos += 21
    return subs

def parse_offset_index(tt_off, tt_st):
    off_st = struct.unpack('<Q', tt_off[-8:])[0]
    rows = (off_st - 8) // 16
    hash_to_offset = {}
    for i in range(rows):
        base = 8 + i * 16
        a, b, c, d = struct.unpack('<IIII', tt_off[base:base+16])
        if 8 <= b < tt_st: hash_to_offset[a] = b
        if 8 <= d < tt_st: hash_to_offset[c] = d
    return hash_to_offset

def group_by_hash(subs):
    groups = defaultdict(list)
    for sr in subs:
        groups[sr['hash']].append(sr)
    return groups

def render_template(text, params):
    def replace(m):
        n = int(m.group(1))
        if n < len(params) and params[n] is not None:
            return str(params[n])
        return m.group(0)
    return re.sub(r'\{p(\d+)\}', replace, text)

def extract_from_group(group, strings):
    damage_rows = []
    pvp_pct = None
    description_parts = []
    bsr_cost = None
    protection = []
    
    for sr in group:
        if not sr['is_str_ref']:
            pct = sr['u4']
            mult = sr['u8']
            if 50 < pct < 100000:
                damage_rows.append({
                    'pct': pct,
                    'mult': mult if mult > 0 else 1,
                    'label': 'Attack damage',
                    'source': 'data_record',
                    'byte': sr['byte'],
                })
            continue
        
        text = sr['text']
        if not text: continue
        
        params = [sr['u8'], sr['u12'], sr['u16'], 0, 0, 0, 0]
        rendered = render_template(text, params)
        description_parts.append(rendered)
        
        if '{p0}' in text and '%' in text:
            pct = sr['u8']
            mult = sr['u12'] if sr['u12'] > 0 else sr['u16']
            if 50 < pct < 100000:
                label = text.split('{')[0].strip()
                if not label: label = 'Attack damage'
                damage_rows.append({
                    'pct': pct,
                    'mult': mult if mult > 0 else 1,
                    'label': label,
                    'source': 'str_ref',
                    'byte': sr['byte'],
                })
        
        if ('PVP' in rendered.upper() or '피해 적용 비율' in rendered) and pvp_pct is None:
            m = re.search(r'(\d+(?:\.\d+)?)\s*%', rendered)
            if m: pvp_pct = float(m.group(1))
        
        if '흑정령' in rendered and '소모' in rendered and bsr_cost is None:
            m = re.search(r'(\d+)\s*%', rendered)
            if m: bsr_cost = int(m.group(1))
        
        if '전방 가드' in rendered and 'Forward Guard' not in protection:
            protection.append('Forward Guard')
        if '슈퍼 아머' in rendered and 'Super Armor' not in protection:
            protection.append('Super Armor')
        if '무적' in rendered and 'I-Frame' not in protection:
            protection.append('I-Frame')
    
    return {
        'damage_rows': damage_rows,
        'pvp_pct': pvp_pct,
        'bsr_cost': bsr_cost,
        'protection': protection,
        'description': '\n'.join(description_parts)[:2000],
        'sub_record_count': len(group),
    }

def match_skills(extracted_groups, db_skills):
    damage_to_groups = defaultdict(list)
    for h, data in extracted_groups.items():
        for dr in data['damage_rows']:
            damage_to_groups[(dr['pct'], dr['mult'])].append(h)
    
    matched = {}
    for sid, info in db_skills.items():
        vals = info['vals']
        if not vals: continue
        
        best_hash = None
        best_score = 0
        for pct, mult in vals:
            key = (pct, mult)
            if key in damage_to_groups:
                for h in damage_to_groups[key]:
                    group = extracted_groups[h]
                    score = sum(1 for dr in group['damage_rows']
                               if (dr['pct'], dr['mult']) in [(p, m) for p, m in vals])
                    if score > best_score:
                        best_score = score
                        best_hash = h
        
        if best_hash is None:
            for pct, mult in vals:
                for key in list(damage_to_groups.keys()):
                    if key[0] == pct:
                        best_hash = damage_to_groups[key][0]
                        best_score = 1
                        break
                if best_hash: break
        
        if best_hash:
            matched[sid] = {
                **extracted_groups[best_hash],
                'hash': best_hash,
                'bdocodex_name': info['name'],
                'bdocodex_vals': vals,
                'match_score': best_score,
            }
    
    return matched

def main():
    print('Loading files...')
    tt = Path(TT_PATH).read_bytes()
    tt_st = struct.unpack('<Q', tt[-8:])[0]
    tt_off = Path(TT_OFF_PATH).read_bytes()
    
    print('Parsing strings...')
    strings = parse_strings(tt, tt_st)
    print(f'  {len(strings)} strings')
    
    print('Parsing sub-records...')
    subs = parse_subrecords(tt, tt_st, strings)
    str_refs = sum(1 for s in subs if s['is_str_ref'])
    data_recs = sum(1 for s in subs if not s['is_str_ref'])
    print(f'  {len(subs)} sub-records ({str_refs} string refs, {data_recs} data records)')
    
    print('Parsing offset index...')
    hash_to_offset = parse_offset_index(tt_off, tt_st)
    print(f'  {len(hash_to_offset)} hashes')
    
    print('Grouping by hash...')
    groups = group_by_hash(subs)
    print(f'  {len(groups)} unique hashes')
    
    print('Extracting from groups...')
    extracted = {}
    for h, srs in groups.items():
        data = extract_from_group(srs, strings)
        if data['damage_rows'] or data['pvp_pct'] or data['bsr_cost'] or data['protection']:
            extracted[h] = data
    print(f'  {len(extracted)} groups with extractable data')
    
    print('Loading DB skills...')
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    db_skills = {}
    for sid, name, drj, pvp in c.execute('SELECT skillId, name, damageRowsJson, pvpDamagePercent FROM skills WHERE damageRowsJson IS NOT NULL').fetchall():
        rows = json.loads(drj)
        vals = []
        for row in rows:
            text = f'{row.get("label","")} {row.get("value","")}'
            for m in re.finditer(r'(\d+)%\s*x\s*(\d+)', text, re.I):
                pct = int(m.group(1))
                mult = int(m.group(2))
                if pct > 50: vals.append((pct, mult))
        if vals:
            db_skills[sid] = {'name': name, 'vals': vals, 'pvp': pvp}
    print(f'  {len(db_skills)} skills with parseable damage')
    
    print('Matching skills...')
    matched = match_skills(extracted, db_skills)
    print(f'  {len(matched)} skills matched')
    
    with_damage = sum(1 for v in matched.values() if v['damage_rows'])
    with_pvp = sum(1 for v in matched.values() if v['pvp_pct'] is not None)
    with_bsr = sum(1 for v in matched.values() if v['bsr_cost'] is not None)
    with_protection = sum(1 for v in matched.values() if v['protection'])
    print(f'\n=== EXTRACTION STATS ===')
    print(f'  With damage rows: {with_damage}')
    print(f'  With PvP%: {with_pvp}')
    print(f'  With BSR cost: {with_bsr}')
    print(f'  With protection: {with_protection}')
    
    Path('data').mkdir(exist_ok=True)
    output = {}
    for sid, data in matched.items():
        output[str(sid)] = {
            'name': data['bdocodex_name'],
            'damage_rows': data['damage_rows'],
            'pvp_pct': data['pvp_pct'],
            'bsr_cost': data['bsr_cost'],
            'protection': data['protection'],
            'description': data['description'][:500],
            'match_score': data['match_score'],
        }
    Path(OUT_PATH).write_text(json.dumps(output, ensure_ascii=False, indent=2))
    print(f'\nSaved {len(output)} skills → {OUT_PATH}')
    
    print(f'\n=== SAMPLE EXTRACTIONS ===')
    for sid in list(output.keys())[:5]:
        d = output[sid]
        print(f'\nskill {sid} ({d["name"][:25]}):')
        print(f'  damage_rows: {d["damage_rows"][:3]}')
        print(f'  pvp_pct: {d["pvp_pct"]}')
        print(f'  bsr_cost: {d["bsr_cost"]}')
        print(f'  protection: {d["protection"]}')
        print(f'  desc: {d["description"][:100]!r}')

if __name__ == '__main__':
    main()
