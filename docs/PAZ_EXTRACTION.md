# BDO PAZ File Extraction — Animation Data

> **Goal**: Extract skill animation durations directly from BDO game files,
> bypassing bdocodex entirely. This gives frame-accurate durations and can be
> re-extracted after every BDO patch.

## Can I extract animation data from PAZ files?

**Yes.** BDO's PAZ archives contain everything we need:

1. **Skill metadata** (descriptions, damage, CC, cooldowns) — in XML files
2. **Skill animations** (frame counts, bone transforms) — in `.pac` action files
3. **Skill icons** — in `.dds`/`.webp` texture files

The animation duration is stored as `frame_count / 60.0` seconds (BDO's internal
tick rate is 60 FPS).

## What You Need

### 1. UnPAZ (PAZ Extractor)
- **Download**: https://github.com/AngeloCairo/BDO-UnPAZ
- Extracts all `Pad00000.paz` through `Pad00037.paz` archives
- Output: ~500K files, ~50GB total

### 2. BDO Codec / PAK Tool (for .pac files)
- The `.pac` files are BDO's proprietary animation format
- Community tools in the BDO Modding Discord can parse them
- Alternative: `WistfulHopes/FrontiersAnimDecompress` (for BlackSpace engine)

## File Locations After Extraction

### Skill Descriptions (XML)
```
ui_data/skill/skill_*.xml          # Skill tooltip text (descriptions, damage rows)
ui_data/skill/skill_text_*.xml     # Skill names (EN/KR/DE/FR/ES)
```

### Skill Animations (.pac files)
```
character/skillaction/phm_skill_*.pac    # Warrior skill actions
character/skillaction/pef_skill_*.pac    # Ranger skill actions
character/skillaction/pwk_skill_*.pac    # Sorceress skill actions
character/skillaction/pgw_skill_*.pac    # Berserker skill actions
character/skillaction/pkm_skill_*.pac    # Tamer skill actions
character/skillaction/pvf_skill_*.pac    # Valkyrie skill actions
character/skillaction/pmg_skill_*.pac    # Wizard skill actions
character/skillaction/pwf_skill_*.pac    # Witch skill actions
character/skillaction/pbs_skill_*.pac    # Musa skill actions
character/skillaction/pbe_skill_*.pac    # Maehwa skill actions
character/skillaction/plm_skill_*.pac    # Lahn skill actions
character/skillaction/pgf_skill_*.pac    # Striker skill actions
character/skillaction/pmf_skill_*.pac    # Mystic skill actions
character/skillaction/pku_skill_*.pac    # Kunoichi skill actions
character/skillaction/pkn_skill_*.pac    # Ninja skill actions
character/skillaction/pdk_skill_*.pac    # Dark Knight skill actions
character/skillaction/par_skill_*.pac    # Archer skill actions
character/skillaction/psh_skill_*.pac    # Shai skill actions
character/skillaction/pgd_skill_*.pac    # Guardian skill actions
character/skillaction/phs_skill_*.pac    # Hashashin skill actions
character/skillaction/pnv_skill_*.pac    # Nova skill actions
character/skillaction/psg_skill_*.pac    # Sage skill actions
character/skillaction/pcs_skill_*.pac    # Corsair skill actions
character/skillaction/pdk_skill_*.pac    # Drakania skill actions
character/skillaction/pwo_skill_*.pac    # Woosa skill actions
character/skillaction/pmyf_skill_*.pac   # Maegu skill actions
character/skillaction/psl_skill_*.pac    # Scholar skill actions
character/skillaction/pds_skill_*.pac    # Dosa skill actions
```

**File naming**: `{class_prefix}_skill_{skill_id}.pac`
- Example: `phm_skill_1018.pac` = Warrior's Slash I (skill ID 1018)

### Skill Icons
```
new_icon/04_pc_skill/01_pc_skill/{prefix}_skill/{prefix}_skill_{id}.webp
```

## How to Extract Animation Duration

### Method 1: Parse .pac files (most accurate)

The `.pac` file format contains:
- Header with frame count
- Per-frame bone transform data
- The animation duration = `frame_count / 60.0` seconds

```python
# Pseudocode for parsing a .pac file
def parse_pac_duration(filepath):
    with open(filepath, 'rb') as f:
        # Read header (format varies by BDO version)
        magic = f.read(4)
        frame_count = struct.unpack('<I', f.read(4))[0]
        # duration = frame_count / 60.0  # BDO runs at 60 FPS
        return frame_count / 60.0
```

### Method 2: Use bdocodex preview videos (current approach)

We already extract durations from bdocodex preview videos using `ffprobe`.
This is less accurate (videos may have hanging time or double casts) but
doesn't require PAZ extraction.

See `docs/VIDEO_PARSING_PLAN.md` for improving the video-based approach.

### Method 3: Manual frame counting

1. Record the skill in-game at 60+ FPS
2. Count frames from animation start to end
3. Duration = frame_count / 60

## How to Import Extracted Data

Once you have extracted the data, format it as JSON and upload via the
**Data** button in the app's footer (or POST to `/api/upload/skills-json`):

```json
{
  "skills": [
    {
      "skillId": 1018,
      "name": "Slash I",
      "className": "Warrior",
      "description": "A basic slashing attack.",
      "animationDurationMs": 833,
      "damageRows": [
        {"label": "Attack 1 damage", "value": "385% x2", "kind": "damage"}
      ],
      "ccTypes": null,
      "protectionTypes": null,
      "cooldown": "0s",
      "cooldownSec": 0
    }
  ]
}
```

The upload endpoint upserts by `skillId`, so it will update existing skills
or create new ones.

## Live Database Injection Workflow

To keep the database up-to-date after each BDO patch:

1. **Extract PAZ files** using UnPAZ after each patch
2. **Parse the XML** for skill descriptions/damage/CC
3. **Parse the .pac files** for animation frame counts → duration
4. **Export as JSON** with the format above
5. **Upload** via the Data button or `/api/upload/skills-json`
6. The app will instantly update all skills with the new data

### Automation Script (Future)

A script could be written to automate steps 2-4:

```bash
# Future: scripts/parse-paz.ts
bun run scripts/parse-paz.ts --paz-dir /path/to/extracted/paz \
  --output /tmp/bdo-skills.json
# Then upload:
curl -X POST http://localhost:3000/api/upload/skills-json \
  -F "file=@/tmp/bdo-skills.json"
```

## Advantages Over bdocodex

| Aspect | bdocodex (current) | PAZ extraction |
|--------|-------------------|----------------|
| Animation duration | From preview video (may have hanging time) | Frame-accurate (frame_count / 60) |
| Update speed | Wait for bdocodex to update | Instant after patch |
| Rate limiting | bdocodex bot challenge | None (local files) |
| Data completeness | ~7,231 skills | All skills in game files |
| Bot detection | Must solve JS challenge | None |
| Accuracy | Good but video-based | Perfect (from source) |

## Notes

- BDO's `.pac` format is proprietary. The BDO Modding Discord
  (https://discord.gg/bdomodding) has tools and documentation for parsing it.
- The frame count in `.pac` files is the **authoritative** animation duration.
  BDO's engine plays animations at exactly 60 FPS, so `duration = frames / 60`.
- Some skills have multiple action files for different phases (e.g., startup,
  active, recovery). Sum all phase durations for the total.
- Awakening/Succession skills may share base animation files with modifications.
  Check the skill's XML for the correct `.pac` file reference.
