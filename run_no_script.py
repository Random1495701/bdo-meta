import struct, json, sqlite3, re
from pathlib import Path

GCD = '/tmp/gcd-extract/gamecommondata/binary'

# If /tmp/gcd-extract doesn't exist, re-extract
import os
if not os.path.exists(GCD):
    import py7zr
    os.makedirs('/tmp/gcd-extract', exist_ok=True)
    with py7zr.SevenZipFile('/home/z/my-project/upload/gamecommondata.7z', mode='r') as z:
        z.extractall(path='/tmp/gcd-extract')

# Load skill.dbss + offset
with open(f'{GCD}/skilloffset.dbss', 'rb') as f:
    sk_off = f.read()
with open(f'{GCD}/skill.dbss', 'rb') as f:
    sk_data = f.read()
assert sk_off[:4] == b'PABR'
sk_count = struct.unpack('<I', sk_off[4:8])[0]
sk_st_pos = struct.unpack('<Q', sk_off[-8:])[0]
sk_key_to_entry = {}
for i in range(sk_count):
    o = 8 + i * 12
    if o + 12 > sk_st_pos: break
    key, offset, size = struct.unpack('<III', sk_off[o:o+12])
    sk_key_to_entry[key] = {'key': key, 'offset': offset, 'size': size}

# Load class_skills.json bridge
with open('/home/z/my-project/upload/class_skills.json') as f:
    cs = json.load(f)
skillid_to_skillkey = {}
for g in cs.get('groups', []):
    for r in g.get('ranks', []):
        sid = r.get('skillNo')
        skey = r.get('skillKey')
        if sid is not None and skey is not None:
            skillid_to_skillkey[sid] = skey

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
        script = rec[start_idx:end_idx].decode('utf-16-be', errors='replace')
        return script, start_idx, 'utf-16-be'
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
        script = rec[start_idx:end_idx].decode('utf-16-le', errors='replace')
        return script, start_idx, 'utf-16-le'
    return None, None, None

# Build missing skills list (smart parser, not in tooltiptable.dbss)
conn = sqlite3.connect('/home/z/my-project/db/custom.db')
c = conn.cursor()
WHERE = "isMaxRank = 1 AND className NOT LIKE 'NEW_CLASS%' AND name NOT LIKE '%(Not in use)%' AND name NOT LIKE '%(Not in Use)%' AND name NOT LIKE '%Evasion%' AND name NOT LIKE '%Evasive%'"
c.execute(f"SELECT skillId, name, krName, className, isPassive, isBlackSpirit, isAbsolute, isAwakening, isSuccession, isFlow, isCore, damageRowsJson, pvpDamagePercent, command, description FROM skills WHERE {WHERE} AND damageRowsJson IS NOT NULL AND damageRowsJson != '[]'")
displayed = c.fetchall()
conn.close()

def parse_damages_pvp(dj):
    if not dj: return [], None
    try: rows = json.loads(dj)
    except: return [], None
    damages = []
    pvp = None
    for row in rows:
        kind = row.get('kind', '')
        val = str(row.get('value', ''))
        label = str(row.get('label', ''))
        if kind == 'pvp':
            m = re.match(r'(\d+(?:\.\d+)?)%', val)
            if m: pvp = float(m.group(1))
        elif kind == 'damage':
            m = re.match(r'(\d+(?:\.\d+)?)%', val)
            if m: damages.append(int(float(m.group(1))))
        elif kind == 'note':
            text = val + ' ' + label
            m = re.search(r'(\d+(?:\.\d+)?)%\s*x\s*\d+', text)
            if m: damages.append(int(float(m.group(1))))
    return damages, pvp

# Build u32 set of tooltiptable.dbss for "is PAZ-verified" check
with open(f'{GCD}/tooltiptable.dbss', 'rb') as f:
    tt_data = f.read()
tt_u32_set = set()
for i in range(len(tt_data) - 3):
    v = struct.unpack('<I', tt_data[i:i+4])[0]
    tt_u32_set.add(v)

# Find the 246 skills: missing skills WITHOUT a DAM_ pattern in their skill.dbss record
no_script_skills = []
for row in displayed:
    sid, name, kr, cls, isP, isBSR, isAbs, isAwk, isSuc, isFlow, isCore, dj, pvp, cmd, desc = row
    dmgs, _ = parse_damages_pvp(dj)
    if not dmgs: continue
    # Check if PAZ-verified (in tooltiptable.dbss)
    if any(d in tt_u32_set for d in dmgs): continue  # already verified, skip
    # Get skill.dbss record
    skey = skillid_to_skillkey.get(sid)
    if not skey or skey not in sk_key_to_entry:
        no_script_skills.append((sid, name, cls, dmgs, pvp, cmd, isP, isBSR, isAbs, isAwk, isSuc, isFlow, isCore))
        continue
    e = sk_key_to_entry[skey]
    rec = sk_data[e['offset']:e['offset']+e['size']]
    script, _, _ = decode_effect_script(rec)
    if not script:
        no_script_skills.append((sid, name, cls, dmgs, pvp, cmd, isP, isBSR, isAbs, isAwk, isSuc, isFlow, isCore))
    elif not any(str(d) in script for d in dmgs):
        # Script found but damage NOT in script — these are the "no-match" skills, NOT the "no-script" ones
        # Skip these — we want only the 246 with NO script
        pass

print(f"Found {len(no_script_skills)} no-script skills")

# Build markdown
md = []
md.append("# No-script skills — manual verification list")
md.append("")
md.append(f"Generated: 2026-10-12  |  Total: **{len(no_script_skills)}**")
md.append("")
md.append("These are displayed (max-rank, post-default-filter) skills with bdocodex damage values,")
md.append("but we couldn't find a `DAM_` effect script pattern in their skill.dbss record.")
md.append("")
md.append("Possible explanations:")
md.append("- The effect script is in skilltype.dbss action_config (different file)")
md.append("- The skill uses a different effect script format (not `DAM_` prefix)")
md.append("- The skill is a special type (summon, BSR-only, transformation, etc.)")
md.append("- The script is in commandtooltip.dbss (encrypted)")
md.append("")
md.append("## By class")
md.append("")
from collections import defaultdict
by_class = defaultdict(list)
for skill in no_script_skills:
    by_class[skill[2]].append(skill)
for cls in sorted(by_class.keys()):
    md.append(f"- **{cls}**: {len(by_class[cls])} skills")
md.append("")
md.append("## Skill list (sorted by class, then skillId)")
md.append("")
md.append("| skillId | name | class | type flags | bdocodex damages | pvp% | command | bdocodex link |")
md.append("|---|---|---|---|---|---|---|---|")

for cls in sorted(by_class.keys()):
    for skill in sorted(by_class[cls], key=lambda x: x[0]):
        sid, name, _, dmgs, pvp, cmd, isP, isBSR, isAbs, isAwk, isSuc, isFlow, isCore = skill
        flags = []
        if isBSR: flags.append('BSR')
        if isP: flags.append('Passive')
        if isAbs: flags.append('Absolute')
        if isAwk: flags.append('Awaken')
        if isSuc: flags.append('Succ')
        if isFlow: flags.append('Flow')
        if isCore: flags.append('Core')
        flag_str = ', '.join(flags) if flags else '(main)'
        dmg_str = ', '.join(str(d) + '%' for d in dmgs[:5])
        if len(dmgs) > 5: dmg_str += f' (+{len(dmgs)-5} more)'
        pvp_str = f"{pvp:.2f}%" if pvp else '—'
        cmd_str = (cmd or '').replace('|', '\\|')[:30]
        link = f"https://bdocodex.com/us/skill/{sid}/"
        md.append(f"| {sid} | {name} | {cls} | {flag_str} | {dmg_str} | {pvp_str} | {cmd_str} | [open]({link}) |")

md.append("")
md.append("## What to look for")
md.append("")
md.append("- Open each bdocodex link")
md.append("- Check if the skill has damage values on bdocodex")
md.append("- Note the skill TYPE (passive, summon, BSR, transformation, etc.)")
md.append("- If many are passive or non-combat skills, our parser may be mis-categorizing them")
md.append("- If they're all awakening skills, the script might be in skilltype.dbss action_config (which we know awakening skills have different record layouts)")

with open('/home/z/my-project/NO_SCRIPT_SKILLS.md', 'w') as f:
    f.write('\n'.join(md))

print(f"Saved to /home/z/my-project/NO_SCRIPT_SKILLS.md ({len(md)} lines)")

# Print per-class breakdown and pattern analysis
print("\n=== Per-class breakdown ===")
for cls in sorted(by_class.keys()):
    print(f"  {cls}: {len(by_class[cls])} skills")

print("\n=== Flag pattern analysis ===")
flag_combos = defaultdict(int)
for skill in no_script_skills:
    sid, name, cls, dmgs, pvp, cmd, isP, isBSR, isAbs, isAwk, isSuc, isFlow, isCore = skill
    flags = []
    if isBSR: flags.append('BSR')
    if isP: flags.append('Passive')
    if isAbs: flags.append('Absolute')
    if isAwk: flags.append('Awaken')
    if isSuc: flags.append('Succ')
    if isFlow: flags.append('Flow')
    if isCore: flags.append('Core')
    flag_str = ', '.join(flags) if flags else '(main)'
    flag_combos[flag_str] += 1
for k, v in sorted(flag_combos.items(), key=lambda x: -x[1]):
    print(f"  {k}: {v}")

print("\n=== Sample skills (first 5 from top class) ===")
top_cls = max(by_class.keys(), key=lambda k: len(by_class[k]))
print(f"Top class: {top_cls}")
for skill in sorted(by_class[top_cls], key=lambda x: x[0])[:5]:
    sid, name, cls, dmgs, pvp, cmd, isP, isBSR, isAbs, isAwk, isSuc, isFlow, isCore = skill
    print(f"  {sid} {name} | dmgs={dmgs[:3]} pvp={pvp} cmd={cmd!r} passive={isP} BSR={isBSR} awk={isAwk} suc={isSuc}")
