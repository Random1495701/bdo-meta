# PAZ Data Extraction Guide for BDO Meta

## Overview
This guide explains how to extract skill data directly from Black Desert Online's game files (PAZ archives) for the most accurate, frame-perfect data possible. This is the future data source for BDO Meta, replacing bdocodex scraping.

## What PAZ Files Contain

| File Type | Location in PAZ | What We Need |
|-----------|-----------------|--------------|
| **Skill XML** | `skills/` | Skill descriptions, damage values, CC types, protection types, cooldowns, prerequisites |
| **Skill .pac files** | `skills/` | Frame-accurate animation durations (frame_count / 60 FPS) |
| **Skill icons** | `items/new_icon/04_pc_skill/` | Skill icons (we already have 2,889 self-hosted) |
| **Class data** | `character/` | Class definitions, weapon types |
| **Skill add-ons** | `skills/` | Add-on slot data |

## Step 1: Install UnPAZ

### Option A: BDO Toolkit (Recommended)
- **Download**: BDOToolkit (repo no longer available — search BDO modding communities for mirrors)
- This is a .NET library + GUI for reading PAZ files
- Supports all PAZ formats including the latest BDO patches

### Option B: UnPAZ (Command Line)
- **Download**: Search "BDO UnPAZ" on BDO modding Discords/communities (original repo at github.com/AngeloCairo/BDO-UnPAZ is no longer available)
- Simpler CLI tool, extracts all files from PAZ archives

### Option C: Black Desert Online File Extractor
- Available on various BDO modding Discord servers
- Ask in the BDO modding community for the latest version

## Step 2: Locate Your BDO Installation

Default paths:
- **Steam**: `C:\Program Files (x86)\Steam\steamapps\common\Black Desert Online\`
- **Launcher**: `C:\Program Files\Black Desert Online\`

The PAZ files are in the `ads/` or ` Paz/` directory:
```
Black Desert Online/
├── ads/                    # or "Paz/" depending on version
│   ├── pad00000.paz        # Main game data
│   ├── pad00001.paz
│   ├── pad00002.paz
│   ├── ...
│   └── pad00095.paz        # Latest patches (higher = newer)
└── Black Desert Online.ini
```

## Step 3: Extract Skill Data

### What to Extract
```
# Skill XML files (contain damage, CC, protection, cooldown data)
items/new_icon/04_pc_skill/01_pc_skill/*     # Main weapon skills
items/new_icon/04_pc_skill/02_pc_skill/*     # Awakening skills  
items/new_icon/04_pc_skill/03_pc_skill/*     # Succession skills
items/new_icon/04_pc_skill/*_pc_skill/*      # All class skills

# Skill animation files (.pac)
character/skill/*                            # Animation data (frame_count / 60 = duration in seconds)

# Class definitions
character/pc_*                              # Per-class configuration
```

### Extraction Process
1. Open UnPAZ / BDO Toolkit
2. Point it at your BDO `ads/` or `Paz/` directory
3. Filter for `*pc_skill*` files
4. Extract to a folder (e.g., `C:\bdo-extract\`)
5. Also extract `character/skill/` for animation .pac files

## Step 4: Parse the Extracted Data

### Skill XML Format
Each skill has an XML file containing:
```xml
<Skill>
  <Name>Prime: Black Wave</Name>
  <Class>Sorceress</Class>
  <Level>56</Level>
  <Cooldown>5.0</Cooldown>
  <PvPDamage>32.0</PvPDamage>
  <DamageRows>
    <Row type="damage" phase="Attack 1" percent="5208" multiplier="2" maxHits="3" />
    <Row type="damage" phase="Last attack" percent="2976" multiplier="3" maxHits="1" />
    <Row type="cc" name="Float" pveOnly="false" />
    <Row type="protection" name="Forward Guard" />
  </DamageRows>
</Skill>
```

### Animation .pac Format
.pac files contain animation frame data:
- Frame count = total frames in the animation
- FPS = 60 (BDO runs at 60 FPS)
- **Animation Duration (ms)** = `(frame_count / 60) * 1000`

This is MORE accurate than bdocodex's video-based duration (which includes hanging time and double casts).

## Step 5: Format for Upload to BDO Meta

Once you have the extracted data, format it as JSON matching our DB schema:

```json
{
  "skills": [
    {
      "skillId": 4582,
      "name": "Prime: Black Wave III",
      "className": "Sorceress",
      "classId": 8,
      "requiredLevel": 60,
      "cooldownSec": 5.0,
      "pvpDamagePercent": 32.0,
      "damageRowsJson": "[{\"label\":\"Attack 1 damage\",\"value\":\"5208% x2, max 3 hits\",\"kind\":\"note\"}, ...]",
      "ccTypes": "Float,Down Smash",
      "protectionTypes": "Forward Guard",
      "animationDurationMs": 1833,
      "isAwakening": false,
      "isSuccession": true,
      "isAbsolute": false,
      "isBlackSpirit": false,
      "isPassive": false,
      "prerequisiteIds": "4581"
    }
  ]
}
```

Upload via: **POST /api/upload/skills-json** (with the JSON file)

## Step 6: What This Replaces

| Current Source | PAZ Replacement | Improvement |
|---------------|-----------------|-------------|
| bdocodex tooltips | PAZ skill XML | More accurate, no bot protection, complete data |
| bdocodex video duration | .pac frame count | Frame-perfect (no hanging time, no double casts) |
| bdocodex skill IDs | PAZ file names | Complete list (no missing skills) |
| Manual PA Wiki data | PAZ class config | Official, always up-to-date |
| Lurker (bdocodex scraper) | Not needed | Eliminates all bdocodex dependency |

## Important Notes

1. **PAZ files change with each BDO patch** — re-extract after major patches
2. **Patch notes tell you what changed** — only re-extract skills mentioned in patch notes, not the entire PAZ
3. **Class prefix mapping** (for file paths):
   - `phm` = Warrior
   - `pef` = Ranger
   - `pew` = Sorceress
   - `pbs` = Berserker
   - `pbw` = Tamer
   - `pvl` = Valkyrie
   - `pwm` = Wizard
   - `pww` = Witch
   - `pmu` = Musa
   - `pmw` = Maehwa
   - `plb` = Lahn
   - `pst` = Striker
   - `pmt` = Mystic
   - `pkn` = Kunoichi
   - `pnj` = Ninja
   - `pdk` = Dark Knight
   - `pgd` = Guardian
   - `pha` = Hashashin
   - `pnv` = Nova
   - `pse` = Sage
   - `pcs` = Corsair
   - `pdr` = Drakania
   - `pwo` = Woosa
   - `pmg` = Maegu
   - `psu` = Scholar
   - `pdo` = Dosa
   - `pde` = Deadeye
   - `pwk` = Wukong
   - `pse` = Seraph

4. **For patch updates**: Only extract the skills that were changed in the patch notes, then upload via `/api/upload/skills-json`. The change log system will track the differences automatically.

## Next Steps for BDO Meta

1. **User**: Extract PAZ data using this guide
2. **User**: Format as JSON per Step 5
3. **User**: Upload via `/api/upload/skills-json` or place file in project directory
4. **App**: Parse JSON, update DB, log changes via SkillChangeLog
5. **App**: Re-compute max-rank with `bun run scripts/compute-max-rank.ts`
6. **App**: Lurker becomes unnecessary — all data comes from PAZ

---

*This guide was created on 2025-07-01. PAZ file structure may change with BDO updates — verify the class prefix mapping and file paths after major patches.*
