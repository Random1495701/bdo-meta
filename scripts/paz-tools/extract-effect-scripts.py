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
    """Find ALL UTF-16BE ASCII effect-script strings in the record and concatenate them.
    This catches both DAM_ functions AND class-specific functions like BUSTER_TRAINING_I(962)."""
    strings = []
    i = search_start
    while i < len(rec) - 1:
        # Check for start of a UTF-16BE ASCII string: [0x00][printable ASCII]
        if rec[i] == 0 and i + 1 < len(rec) and 0x20 <= rec[i+1] < 0x7F:
            j = i
            chars = []
            while j + 1 < len(rec):
                if rec[j] == 0 and 0x20 <= rec[j+1] < 0x7F:
                    chars.append(chr(rec[j+1]))
                    j += 2
                elif rec[j] == 0 and rec[j+1] in (0x0a, 0x0d):
                    chars.append('\n' if rec[j+1] == 0x0a else '\r')
                    j += 2
                else:
                    break
            s = ''.join(chars)
            # Only keep strings that look like effect script lines (contain '(' or known keywords)
            if len(s) >= 4 and ('(' in s or 'DAM' in s or 'ATT' in s or 'SKILL' in s):
                strings.append(s)
            i = j if j > i else i + 2
        else:
            i += 1
    
    if not strings:
        # Fallback: try the old DAM_-only approach
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
        return None, None, None
    
    full_script = '\n'.join(strings)
    return full_script, search_start, 'utf-16-be-multi'

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
        'all_numeric_calls': [],  # all function calls with numeric first arg (for cross-ref)
    }
    # Known non-damage functions (don't treat their first arg as damage even if >= 100)
    NON_DAMAGE_FUNCS = {
        'HIT_TARGET', 'CRI_POINT', 'WP_ATT_RECOV', 'SP_ATT_RECOV', 'HP_ATT_RECOV',
        'MP_ATT_RECOV', 'USE_SKILL_WP_RECOV', 'USE_SKILL_LAST_WP_RECOV',
        'WP_LAST_ATT_RECOV', 'ALL_AP_UP', 'ALL_DP_UP', 'ALL_EVA_UP', 'HP_UP',
        'USE_SKILL_HP_MAX_UP', 'COLLISION_1', 'COLLISION_2', 'COLLISION_3', 'COLLISION_4',
        'ATT_COUNT_FRAGMENTS', 'COOLTIME', 'ATT_PERCENT_INCRE', 'SUCC_ATT_EVA_PERCENT_DECRE_ALL',
        'USE_SKILL_MOV_PERCENT_INCRE', 'USE_SKILL_DEP_POINT_INCRE_ALL', 'MOV_LENGTH_ADD',
    }
    for c in calls:
        raw_func = c['func']
        args = c['args']
        base_func, attack_index, variant = normalize_func(raw_func)
        # Save all numeric first-arg calls (for cross-reference / debugging)
        if args and isinstance(args[0], (int, float)):
            result['all_numeric_calls'].append({'func': base_func, 'first_arg': args[0], 'all_args': args})
        # Damage functions: any function containing "DAM_ATT" or starting with "DAM_"
        is_damage_func = ('DAM_ATT' in base_func) or base_func.startswith('DAM_') or base_func.startswith('ADD_DAM_')
        # ALSO: any function with numeric first arg >= 100 that isn't a known non-damage function
        # This catches class-specific damage functions like DOUBLE_TAKE_DOWN(1517), BUSTER_TRAINING_I(962), etc.
        if not is_damage_func and args and isinstance(args[0], (int, float)) and args[0] >= 100:
            if base_func not in NON_DAMAGE_FUNCS:
                # Check if the function name suggests damage (contains ATTACK, TRAINING, TAKE_DOWN, etc.)
                damage_keywords = ('ATTACK', 'TRAINING', 'TAKE_DOWN', 'DAM', 'STRIKE', 'SLASH', 'STAB', 
                                   'PUNCH', 'KICK', 'SMASH', 'BURST', 'BLAST', 'STORM', 'FANG',
                                   'BLADE', 'SPEAR', 'LANCE', 'BUSTER', 'RENSIA', 'KERISPEAR',
                                   'SKYSTAFF', 'GLOOM', 'REVENGE', 'WRAITH', 'TITAN', 'GIANT')
                if any(kw in base_func.upper() for kw in damage_keywords):
                    is_damage_func = True
        if is_damage_func:
            if base_func == 'DAM_ATT_X' and len(args) >= 3:
                result['damages'].append({'func': base_func, 'attack_index': args[0], 'damage': args[1], 'hits': args[2]})
            elif base_func == 'DAM_ATT_MAX' and len(args) >= 3:
                result['damages'].append({'func': base_func, 'damage': args[0], 'hits': args[1], 'max_hits': args[2]})
            elif base_func.startswith('DAM_BLOOD') and len(args) >= 3:
                result['damages'].append({'func': base_func, 'args': args})
            elif len(args) >= 2 and isinstance(args[0], (int, float)):
                dmg_entry = {'func': base_func, 'damage': args[0], 'hits': args[1]}
                if attack_index is not None: dmg_entry['attack_index'] = attack_index
                if variant is not None: dmg_entry['variant'] = variant
                if len(args) > 2: dmg_entry['extra_args'] = args[2:]
                result['damages'].append(dmg_entry)
            elif len(args) >= 1 and isinstance(args[0], (int, float)):
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
        elif base_func == 'SUPER_ARMOR': result['protections'].append('Super Armor')  # alt form
        elif base_func == 'GUARD': result['protections'].append('Forward Guard')  # alt form
        elif base_func == 'CRI_POINT':
            if args and isinstance(args[0], (int, float)): result['crit_rate'] = int(args[0])
        elif base_func == 'HIT_TARGET':
            if args and isinstance(args[0], (int, float)): result['max_targets'] = int(args[0])
        elif base_func == 'SUCC_ATT_KNOCKBACK': result['cc_types'].append('Knockback')
        elif base_func == 'SUCC_ATT_KNOCKDOWN': result['cc_types'].append('Knockdown')
        elif base_func in ('SUCC_ATT_AIRBORNE',): result['cc_types'].append('Float')
        elif base_func in ('SUCC_ATT_BOUND', 'FIRST_SUCC_ATT_BOUND'): result['cc_types'].append('Bound')
        elif base_func in ('SUCC_ATT_STIFFNESS',): result['cc_types'].append('Stiffness')
        elif base_func == 'SUCC_ATT_STUN': result['cc_types'].append('Stun')
        elif base_func == 'SUCC_ATT_PUSH' or base_func == 'SIDEATTACK_PUSH': result['cc_types'].append('Push')
        elif base_func == 'SUCC_ATT_PULL': result['cc_types'].append('Pull')
        elif base_func == 'SUCC_ATT_TURN': result['cc_types'].append('Spin')
        elif base_func == 'DOWN_SMASH' or base_func == 'ATT_SUCC_DOWN_SMASH': result['cc_types'].append('Down Smash')
        elif base_func == 'SUCC_ATT_MOV_PERCENT_DECRE': result['cc_types'].append('Movement Speed Decrease')
        elif base_func == 'SUCC_ATT_EVA_PERCENT_DECRE_ALL': result['cc_types'].append('Evasion Decrease')
        elif base_func == 'SUCC_ATT_DEP_POINT_DECRE_ALL': result['cc_types'].append('Debuff Point Decrease')
        # Resource recovery per hit
        elif base_func == 'WP_ATT_RECOV':
            if args and isinstance(args[0], (int, float)): result.setdefault('wp_recover_per_hit', args[0])
        elif base_func == 'HP_ATT_RECOV':
            if args and isinstance(args[0], (int, float)): result.setdefault('hp_recover_per_hit', args[0])
        elif base_func == 'MP_ATT_RECOV':
            if args and isinstance(args[0], (int, float)): result.setdefault('mp_recover_per_hit', args[0])
        elif base_func == 'SP_ATT_RECOV':
            if args and isinstance(args[0], (int, float)): result.setdefault('sp_recover_per_hit', args[0])
        elif base_func == 'ALL_AP_UP':
            if args and isinstance(args[0], (int, float)): result.setdefault('all_ap_up', args[0])
        elif base_func == 'ALL_DP_UP':
            if args and isinstance(args[0], (int, float)): result.setdefault('all_dp_up', args[0])
        elif base_func == 'ALL_EVA_UP':
            if args and isinstance(args[0], (int, float)): result.setdefault('all_eva_up', args[0])
        elif base_func == 'HP_UP':
            if args and isinstance(args[0], (int, float)): result.setdefault('hp_up', args[0])
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
