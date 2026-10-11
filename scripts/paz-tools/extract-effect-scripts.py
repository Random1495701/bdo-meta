#!/usr/bin/env python3
"""
Phase 4: Effect script extractor for skill.dbss records.

Extracts damage values, PvP%, protection types, CC types, crit rate, max targets,
and attack modifiers from the UTF-16BE effect script strings embedded in skill.dbss records.

Output: data/paz-effect-scripts.json mapping skillId → {damages, pvp_pct, protections, cc_types, ...}
"""
import struct, json, re
from pathlib import Path

GCD = '/tmp/gcd-oct/gamecommondata/binary'
OUT = '/home/z/my-project/data/paz-effect-scripts.json'

def load_skill_dbss():
    with open(f'{GCD}/skilloffset.dbss', 'rb') as f: sk_off = f.read()
    with open(f'{GCD}/skill.dbss', 'rb') as f: sk_data = f.read()
    assert sk_off[:4] == b'PABR'
    sk_count = struct.unpack('<I', sk_off[4:8])[0]
    sk_st_pos = struct.unpack('<Q', sk_off[-8:])[0]
    sk_key_to_entry = {}
    for i in range(sk_count):
        o = 8 + i * 12
        if o + 12 > sk_st_pos: break
        key, offset, size = struct.unpack('<III', sk_off[o:o+12])
        sk_key_to_entry[key] = {'key': key, 'offset': offset, 'size': size}
    return sk_data, sk_key_to_entry

def decode_effect_script(rec, search_start=128):
    dam_pattern_be = b'\x00D\x00A\x00M\x00_'
    idx = rec.find(dam_pattern_be, search_start)
    if idx >= 0:
        start_idx = idx
        while start_idx >= 2:
            ch = struct.unpack('>H', rec[start_idx-2:start_idx])[0]
            if ch == 0 or (ch < 32 and ch != 10 and ch != 13): break
            start_idx -= 2
        end_idx = idx
        while end_idx + 1 < len(rec):
            ch = struct.unpack('>H', rec[end_idx:end_idx+2])[0]
            if ch == 0 or (ch < 32 and ch != 10 and ch != 13): break
            end_idx += 2
        return rec[start_idx:end_idx].decode('utf-16-be', errors='replace'), start_idx, 'utf-16-be'
    dam_pattern_le = b'D\x00A\x00M\x00_\x00'
    idx = rec.find(dam_pattern_le, search_start)
    if idx >= 0:
        start_idx = idx
        while start_idx >= 2:
            ch = struct.unpack('<H', rec[start_idx-2:start_idx])[0]
            if ch == 0: break
            start_idx -= 2
        end_idx = idx
        while end_idx + 1 < len(rec):
            ch = struct.unpack('<H', rec[end_idx:end_idx+2])[0]
            if ch == 0: break
            end_idx += 2
        return rec[start_idx:end_idx].decode('utf-16-le', errors='replace'), start_idx, 'utf-16-le'
    return None, None, None

def parse_effect_script(script):
    calls = []
    # Allow leading digits (for attack-index prefixes like '1_DAM_ATT_2_1')
    pattern = re.compile(r'(\d*[A-Z_][A-Z0-9_]*)(\d*)\s*\(([^)]*)\)\s*;')
    for m in pattern.finditer(script):
        func_name = m.group(1)
        suffix = m.group(2)
        args_str = m.group(3).strip()
        args = []
        if args_str:
            for arg in args_str.split(','):
                arg = arg.strip()
                try:
                    if '.' in arg: args.append(float(arg))
                    else: args.append(int(arg))
                except ValueError: args.append(arg)
        calls.append({'func': func_name, 'suffix': suffix, 'args': args, 'raw': m.group(0)})
    return calls

def normalize_func(func_name):
    """Strip leading prefixes (attack-index, NO_N_, RUN_ATT_, STOP_ATT_LAST_, etc.) and trailing variants."""
    attack_index = None
    # Strip leading 'N_' prefix (attack index) — try multiple variants
    prefixes_to_strip = [
        (r'^(\d+)_', 'attack_index'),  # 1_, 2_, etc.
        (r'^NO_(\d+)_', 'variant'),  # NO_2_, NO_3_, etc.
        (r'^RUN_ATT_', 'running'),
        (r'^STOP_ATT_LAST_', 'stopping_last'),
        (r'^STOP_ATT_', 'stopping'),
        (r'^FIRST_', 'first'),
        (r'^MOV_LENGTH_', 'mov_length'),
    ]
    variant = None
    matched_prefix = None
    for pat, kind in prefixes_to_strip:
        m = re.match(pat, func_name)
        if m:
            if kind == 'attack_index':
                attack_index = int(m.group(1))
            elif kind == 'variant':
                variant = int(m.group(1))
            func_name = func_name[m.end():]
            matched_prefix = kind
            break
    # Strip trailing '_N' variant (e.g., DAM_ATT_2_1 → DAM_ATT_2 + variant=1)
    m = re.match(r'^(.+?)_(\d+)$', func_name)
    if m:
        base = m.group(1)
        trailing = int(m.group(2))
        # Only strip if the base looks like a function with a version (ends with a digit)
        if re.search(r'\d$', base):
            if variant is None: variant = trailing
            func_name = base
    return func_name, attack_index, variant

def extract_from_script(script):
    calls = parse_effect_script(script)
    result = {
        'damages': [], 'pvp_pct': None, 'protections': [], 'cc_types': [],
        'crit_rate': None, 'max_targets': None, 'attack_modifiers': [],
    }
    for c in calls:
        raw_func = c['func']
        args = c['args']
        # Normalize the function name (strip attack-index prefix and trailing variant)
        base_func, attack_index, variant = normalize_func(raw_func)
        # Damage functions: any function containing "DAM_ATT" or starting with "DAM_"
        # This catches: DAM_ATT_2, DAM_ATT_X, ADD_DAM_ATT_2, NO_2_DAM_ATT_2, RUN_ATT_DAM_ATT,
        # STOP_ATT_LAST_DAM_ATT_1, DAM_ATT_MAX, DAM_BLOOD_*, etc.
        is_damage_func = ('DAM_ATT' in base_func) or base_func.startswith('DAM_') or base_func.startswith('ADD_DAM_')
        if is_damage_func:
            if base_func == 'DAM_ATT_X' and len(args) >= 3:
                # DAM_ATT_X(attack_idx, dmg, hits)
                result['damages'].append({'func': base_func, 'attack_index': args[0], 'damage': args[1], 'hits': args[2]})
            elif base_func == 'DAM_ATT_MAX' and len(args) >= 3:
                # DAM_ATT_MAX(dmg, ?, max_hits)
                result['damages'].append({'func': base_func, 'damage': args[0], 'hits': args[1], 'max_hits': args[2]})
            elif base_func.startswith('DAM_BLOOD') and len(args) >= 3:
                # DAM_BLOOD(something, count, dmg) — args order varies
                result['damages'].append({'func': base_func, 'args': args})
            elif len(args) >= 2 and isinstance(args[0], (int, float)):
                # DAM_ATT_2(dmg, hits) or variants
                dmg_entry = {'func': base_func, 'damage': args[0], 'hits': args[1]}
                if attack_index is not None: dmg_entry['attack_index'] = attack_index
                if variant is not None: dmg_entry['variant'] = variant
                if len(args) > 2: dmg_entry['extra_args'] = args[2:]
                result['damages'].append(dmg_entry)
            elif len(args) >= 1 and isinstance(args[0], (int, float)):
                # Single-arg damage function (like STOP_ATT_LAST_DAM_ATT_1(dmg) )
                dmg_entry = {'func': base_func, 'damage': args[0], 'hits': 1}
                if attack_index is not None: dmg_entry['attack_index'] = attack_index
                if variant is not None: dmg_entry['variant'] = variant
                if len(args) > 1: dmg_entry['extra_args'] = args[1:]
                result['damages'].append(dmg_entry)
        elif base_func == 'DECRE_PVP_DAM_2' or base_func == 'DECRE_PVP_DAM':
            if args and isinstance(args[0], (int, float)):
                result['pvp_pct'] = float(args[0])
        elif base_func == 'SKILL_ING_GUARD': result['protections'].append('Forward Guard')
        elif base_func == 'SKILL_ING_SUPER_ARMOR': result['protections'].append('Super Armor')
        elif base_func == 'CRI_POINT':
            if args and isinstance(args[0], (int, float)): result['crit_rate'] = int(args[0])
        elif base_func == 'HIT_TARGET':
            if args and isinstance(args[0], (int, float)): result['max_targets'] = int(args[0])
        elif base_func == 'SUCC_ATT_KNOCKBACK': result['cc_types'].append('Knockback')
        elif base_func == 'SUCC_ATT_KNOCKDOWN': result['cc_types'].append('Knockdown')
        elif base_func in ('SUCC_ATT_AIRBORNE',): result['cc_types'].append('Float')
        elif base_func in ('SUCC_ATT_BOUND', 'FIRST_SUCC_ATT_BOUND'): result['cc_types'].append('Bound')
        elif base_func in ('SUCC_ATT_STIFFNESS',): result['cc_types'].append('Stiffness')
        elif base_func in ('DOWN_ATT', 'AIR_ATT', 'BACK_ATT', 'BACK_ATT_DEFENCE', 'BACK_ATT_DOWN_SMASH', 'BACK_ATT_KNOCKBACK'):
            result['attack_modifiers'].append(base_func)
    return result

if __name__ == '__main__':
    sk_data, sk_key_to_entry = load_skill_dbss()
    with open('/home/z/my-project/upload/class_skills.json') as f:
        cs = json.load(f)
    sid_to_skey = {}
    for g in cs.get('groups', []):
        for r in g.get('ranks', []):
            sid = r.get('skillNo'); skey = r.get('skillKey')
            if sid is not None and skey is not None: sid_to_skey[sid] = skey
    
    output = {}
    found_count = 0
    for sid, skey in sid_to_skey.items():
        if skey not in sk_key_to_entry: continue
        e = sk_key_to_entry[skey]
        rec = sk_data[e['offset']:e['offset']+e['size']]
        script, _, _ = decode_effect_script(rec)
        if not script: continue
        extracted = extract_from_script(script)
        if extracted['damages'] or extracted['pvp_pct'] or extracted['protections'] or extracted['cc_types']:
            output[sid] = {**extracted, 'script': script}
            found_count += 1
    
    Path(OUT).write_text(json.dumps(output, ensure_ascii=False, indent=2))
    print(f"Extracted data for {found_count} skills → {OUT}")
