# Reverse-Engineering Plan: skilltype.dbss action-config block

> **Goal**: Decode the "action configuration" block in `skilltype.dbss` that
> `bdo-data-extractor` explicitly marks as "not decoded here" (FORMATS.md line 778).
> This block holds the per-skill **damage rows, CC types, protection types,
> cooldowns, PvP%** — the data bdocodex renders into its tooltips.

## Why we need this

BDO Meta currently scrapes damage/CC/cooldown/PvP% from bdocodex tooltips
(via the lurker). bdocodex itself got this data via **"gamecode analysis"**
(per a Reddit r/blackdesertonline PvP formula thread, Aug 2024: "Results
mostly come from gamecode analysis"). So the data IS in the game files —
bdocodex just reverse-engineered it from the client binary + data tables.

The authoritative source is `skilltype.dbss`, which has this record layout
(from `bdo-data-extractor`'s FORMATS.md):

```
skilltype.dbss record:
  0    u32            skillKey          (matches the offset-index key)
  4    inline UTF-16  sourceName        (Korean skill/rank name)
  —    inline UTF-16  sourceGroupName   (Korean family name; may be empty)
  —    u32            kind              (0 unknown/internal, 1 active, 2 passive)
  —    variable      action configuration  ← UNDECODED — this is our target
       (animation, icon, presentation and combat behavior)
```

The `action configuration` block is what we need to decode.

## What's known

From `bdo-data-extractor`'s source (`internal/tables/classskills.go` →
`DecodeSkillTypeHeaders`):
- The header parser reads up through `kind` (the u32 after the two strings),
  then **stops**. The rest of each record (the action config) is left as raw
  bytes.
- The record boundaries come from `skilltypeoffset.dbss` (the paired offset
  index, PABR-formatted: `[u16 key, u32 offset, u32 size]` rows). So we know
  EXACTLY where each action-config block starts and ends — we just don't know
  the internal field layout yet.

From `FORMATS.md`:
- The action config holds: animation reference, icon path, presentation data,
  and combat behavior (damage, CC, protection, cooldown, PvP%).
- It's a variable-length block (inline strings likely present for icon paths).

## What's NOT known (the reverse-engineering target)

The internal layout of the action-config block. Specifically:
- Where the cooldown lives (probably a u32 ms, same as `skill.dbss @95`)
- Where the damage rows are (probably a list of {phase, percent, multiplier,
  maxHits} structs, with phase names in a loc sub-table)
- Where the CC types are (probably a bitfield or a list of enum values)
- Where the protection types are (probably a bitfield: SA/FG/IF/Crouch)
- Where the PvP% is (probably a float or u32 percent)
- Where the animation reference is (probably a u32 hash or a string
  reference into the .paac index)

## The plan (4 phases)

### Phase 1 — Extract the binary tables (user does this)

Use White Desert to extract these files from the PAZ:

```
gamecommondata/binary/skilltype.dbss
gamecommondata/binary/skilltypeoffset.dbss
gamecommondata/binary/skill.dbss
gamecommondata/binary/skilloffset.dbss
gamecommondata/binary/buff.dbss
gamecommondata/binary/buffoffset.dbss
```

Total size: a few MB. Zip them and send.

### Phase 2 — Map record boundaries (we do this)

Using `skilltypeoffset.dbss` (PABR offset index: `[u16 key, u32 offset,
u32 size]` rows), we can list every skill's record boundary in
`skilltype.dbss`. For each skill we already know (from `class_skills.json`):
  - `skillKey` (the offset-index key)
  - `name` (English)
  - `sourceName` (Korean)
  - `kind` (active/passive)

We match the Korean `sourceName` in `skilltype.dbss` to find the start of the
action config for each skill. The bytes between the end of `kind` and the
end of the record (from the offset index) are the action config.

### Phase 3 — Cross-reference with known values (we do this)

We already have ~7,038 skills' damage/CC/cooldown/PvP% scraped from bdocodex
in our DB. We pick 5–10 well-known skills (e.g. Warrior "Prime: Heavy Strike
I", Sorceress "Prime: Black Wave III") and find their records in
`skilltype.dbss`. Then we search the action-config bytes for the known
values:
- Cooldown (e.g. 5000ms → look for `40 4B 00 00` or `88 13 00 00`)
- PvP% (e.g. 31.2% → look for `00 00 FA 42` as float, or `01F4` as fixed-point)
- Damage percent (e.g. 5208% → `88 14` as u16, or `00 14 14 00` as u32)
- CC enum (Stun=1, Float=2, Knockback=3, etc. — guess the enum)

When we find a value at a consistent offset across multiple skills, we've
decoded that field. BDO uses fixed offsets within record types, so once we
find the layout for one skill, it should apply to all.

### Phase 4 — Write the parser + validate (we do this)

Once the layout is mapped, we write `scripts/parse-skilltype-action-config.ts`
that:
1. Reads `skilltype.dbss` + `skilltypeoffset.dbss`
2. For each record, parses the action-config block
3. Outputs `data/skill-combat-data.json` with per-skill:
   `damageRows`, `ccTypes`, `protectionTypes`, `cooldownSec`, `pvpDamagePercent`
4. Validates against our existing bdocodex-scraped DB values — if 95%+ match,
   we've decoded it correctly. The 5% that don't match are likely post-patch
   updates bdocodex hasn't synced yet.

## What we have so far (in `scripts/paz-tools/`)

- `parse-paa-frames.ts` — ✅ working, validated against your uploaded .paa
- `parse-paac-index.ts` — ✅ working, parsed all 31 class files (28,510 action
  entries, 3,692 skill-tagged)
- `bdo-data-extractor-fork.md` — ✅ the fork patch (5-line change to emit
  active-skill Effects)

## What we need from you next

1. **Apply the fork + re-run `bdo-data-extractor build`** (gets us cooldown +
   CC/buff DurationMs for all active skills) — see
   `scripts/paz-tools/bdo-data-extractor-fork.md` for the patch.

2. **Extract the binary tables** listed in Phase 1 above with White Desert
   (search `gamecommondata/binary/` and extract just the 6 files listed — a
   few MB total). Send them as a zip.

3. **Extract the `.paa` animation files** so we can run `parse-paa-frames.ts`
   across all of them. The `.paac` index references paths like
   `1_PC/1_PHM/PHM_01_01_Att_Skill_*.paa`. So with White Desert, search for
   `1_PC/` and extract that whole folder. Should be ~500MB–1GB for all
   classes (much smaller than the 30GB action-chart over-extraction).

Once we have #1 (the fork output), #2 (the binary tables), and #3 (the .paa
files), we have:
- Skill structure: ✅ (already have, from `class_skills.json`)
- Skill cooldown + CC/buff duration: ✅ (from the fork)
- Animation duration (frame-perfect): ✅ (from `parse-paa-frames.ts` + the .paa files)
- Damage/CC/protection/PvP%: ⏳ (from Phase 3–4 of this reverse-engineering plan)

The damage/CC/protection/PvP% is the hardest piece. If the reverse-engineering
takes too long, we can keep scraping it from bdocodex (current approach works)
and just use the PAZ pipeline for the structure + cooldown + animation. But
it's worth attempting — bdocodex did it, so we can too.

## Alternative: keep damage/CC/PvP% from bdocodex

If the skilltype.dbss reverse-engineering is too slow, a pragmatic hybrid:
- **PAZ → structure + cooldown + CC duration + animation duration** (the
  easy wins)
- **bdocodex → damage rows + PvP% + protection types** (the hard-to-decode
  fields)

This eliminates the bdocodex dependency for ~80% of fields while keeping it
as a fallback for the 20% that need gamecode-level reverse-engineering.
