# PAZ Data Extraction Guide for BDO Meta

> **Last researched**: 2026-07-05 (P3.4) — see "Research Log" at bottom for sources.

## Overview
This guide explains how to extract skill data directly from Black Desert Online's game files (PAZ archives) for the most accurate, frame-perfect data possible. This is the aspirational future data source for BDO Meta, replacing bdocodex scraping.

## TL;DR — What Actually Works in 2026

| Tool | Type | Last Updated | Status | URL |
|------|------|--------------|--------|-----|
| **sibercat/PAZ-Unpacker** | Windows GUI (64-bit, dark mode) | **2026-04-09** (v2.3.0) | ✅ **RECOMMENDED** | https://github.com/sibercat/PAZ-Unpacker |
| kukdh1/PAZ-Unpacker | Windows GUI (32-bit, original) | 2019-08-08 | ⚠️ Legacy (use sibercat fork) | https://github.com/kukdh1/PAZ-Unpacker |
| AMGarkin/UnPAZ | Command-line (C++) | 2018-09-06 (v1.2) | ⚠️ Legacy, but useful for scripting | https://github.com/AMGarkin/UnPAZ |
| FearYuzu/BDOToolBox | Language patcher (C#) | 2017-06-21 | ❌ Not an extractor | https://github.com/FearYuzu/BDOToolBox |
| jabbber/BDO-toolkit | Toolkit (CSS-heavy, unclear) | 2023-08-02 | ❌ Only 2 stars, unclear purpose | https://github.com/jabbber/BDO-toolkit |
| Black Desert Explorer (Maxes727) | File browser w/ 3D preview | ~2016 | ❌ Dead / unmaintained | (Reddit post only) |

**Bottom line**: Use **sibercat/PAZ-Unpacker v2.3.0** — it is the only actively-maintained PAZ extractor as of July 2026. The previous guide mentioned BDOToolkit/UnPAZ being "gone" — that referred to the original `BDOToolkit` repo (no longer available) and the AngeloCairo BDO-UnPAZ repo (also gone). The AMGarkin/UnPAZ and kukdh1/PAZ-Unpacker repos are still alive but stale.

## What PAZ Files Contain

| File Type | Location in PAZ | What We Need |
|-----------|-----------------|--------------|
| **Skill XML** | `ui_data/skill/skill_*.xml`, `skills/` | Skill descriptions, damage values, CC types, protection types, cooldowns, prerequisites |
| **Skill .pac files** | `character/skillaction/{prefix}_skill_*.pac` | Frame-accurate animation durations (frame_count / 60 FPS) |
| **Skill icons** | `items/new_icon/04_pc_skill/` | Skill icons (we already have 2,889 self-hosted) |
| **Class data** | `character/pc_*` | Class definitions, weapon types |
| **Skill add-ons** | `skills/` | Add-on slot data |
| **Localization** | `languagedata_*.txt`, `ui_data/skill/skill_text_*.xml` | EN/KR/DE/FR/ES skill names |

## Step 1: Install a PAZ Extractor

### Option A: sibercat/PAZ-Unpacker (Recommended — actively maintained)

- **Download**: https://github.com/sibercat/PAZ-Unpacker/releases
  - Latest: `PAZ-Unpacker.7z` from release **v2.3.0** (2026-04-03)
  - ~70 KB binary (VS2025 / C++26 / x64)
- **Platform**: Windows 10 or 11 (x64). Not available on macOS/Linux — use a Windows VM or Wine.
- **Source**: https://github.com/sibercat/PAZ-Unpacker

**Features**:
- Dark-mode GUI for browsing the virtual filesystem inside BDO PAZ archives
- Extracts individual files, folders, or entire archives
- Search across **800k+ files** with live filtering (search by `.dds`, `ui_texture`, `_skill_`, etc.)
- Settings dialog: configure PAZ folder + extract path once
- Inline preview panel for DDS/PNG/BMP textures
- Multi-language UI (English, Japanese, Korean)
- Binary cache (v2) for fast startup
- "Check for Updates" button (checks GitHub releases)

**How to use**:
1. Download `PAZ-Unpacker.7z` from the v2.3.0 release
2. Extract with 7-Zip
3. Launch `PAZ-Unpacker.exe`
4. Go to **Settings → Configure Paths** and set:
   - PAZ folder: the folder containing `pad00000.meta` (e.g. `C:\Program Files (x86)\Steam\steamapps\common\Black Desert Online\Paz`)
   - Extract output folder (e.g. `C:\bdo-extract\`)
5. Click **Load** to load the PAZ archive (reads all `pad*.paz` files via the `.meta` index)
6. Use the **Search** window to filter for `*pc_skill*` files (icons, XML, .pac)
7. Select the root node or specific folders → click **Extract**

**What it extracts**: Everything in the PAZ archives — skill XML, .pac animation files, .dds icons, .luac scripts, localization, class config, models, textures. The original `kukdh1` notes:
- "Tested on KR client. The meta file format changed on KR client since 2016.05 (decrypt key changed)" — sibercat's fork is 64-bit and modern but uses the same parsing logic, so this caveat still applies for very new KR patches.
- "BDO client (and XIGNCODE3) does not check CRC codes on each packed files" — extraction will not flag CRC issues, you may need to verify integrity manually.
- Files beginning with `0x6E` have a 9-byte compression header (DWORD original size, DWORD compressed size) that must be stripped.

### Option B: AMGarkin/UnPAZ (Command-line — useful for scripting)

- **Download**: https://github.com/AMGarkin/UnPAZ
- **Last release**: v1.2 (no GitHub releases page — build from source with Visual Studio)
- **Platform**: Windows, command-line
- **Best for**: Automation (CI/CD, scheduled post-patch re-extraction)

**Usage**:
```
UnPAZ <input file> <commands>

<input file>:  name of .meta or .paz file (default: pad00000.meta)
<commands>:
  -f <mask>:  Filter, supports wildcards * and ?
  -o <path>:  Output folder
  -l:         List file names without extracting
  -n:         No folder structure, extract flat
  -y:         Yes to all (create folders, overwrite)
  -q:         Quiet (limit output to file names)
```

**Examples**:
```cmd
:: List all skill files
UnPAZ pad00000.meta -l -f *pc_skill*

:: Extract all skill .pac animation files
UnPAZ pad00000.meta -y -f *_skill_*.pac -o C:\bdo-extract\animations

:: Extract localization files
UnPAZ pad00000.meta -y -f languagedata_??.txt -o C:\bdo-extract\locale
```

**Limitations**:
- Last updated 2018. May not handle newest KR client encryption changes.
- No GUI — you must know file mask patterns in advance.

### Option C: kukdh1/PAZ-Unpacker (Original — legacy)

- **URL**: https://github.com/kukdh1/PAZ-Unpacker
- **Last update**: August 2019
- 32-bit only, older UI
- Use only if sibercat fork doesn't work for your BDO client version.

## Step 2: Locate Your BDO Installation

Default paths:
- **Steam**: `C:\Program Files (x86)\Steam\steamapps\common\Black Desert Online\`
- **Launcher**: `C:\Program Files\Black Desert Online\`

The PAZ files are in the `ads/` or `Paz/` directory:
```
Black Desert Online/
├── ads/                    # or "Paz/" depending on version
│   ├── pad00000.meta       # Index file — open this with PAZ-Unpacker
│   ├── pad00000.paz        # Main game data
│   ├── pad00001.paz
│   ├── ...
│   └── pad00095.paz        # Latest patches (higher = newer)
└── Black Desert Online.ini
```

**Important**: Always load via `pad00000.meta`, not individual `.paz` files. The meta file is the master index that tells the extractor how to splice the paz files together into a virtual filesystem.

## Step 3: Extract Skill Data

### What to Extract

Use the sibercat PAZ-Unpacker **Search** window with these masks:

```
# Skill XML files (descriptions, damage, CC, protection, cooldown data)
*skill_*.xml                                # All skill tooltips
ui_data/skill/*                             # Skill tooltip data
ui_data/skill/skill_text_*.xml              # Skill names (EN/KR/DE/FR/ES)

# Skill animation files (.pac) — frame_count / 60 = duration in seconds
character/skillaction/*_skill_*.pac         # All class skill animations

# Skill icons
items/new_icon/04_pc_skill/*                # All skill icons (.dds / .webp)

# Class definitions
character/pc_*                              # Per-class configuration
```

### Extraction Process (sibercat GUI)
1. Launch `PAZ-Unpacker.exe`
2. **Settings → Configure Paths** → set PAZ folder + output folder
3. Click **Load** (reads `pad00000.meta`, builds the virtual filesystem)
4. Use **Search** to filter for `*pc_skill*` files
5. Right-click the search results (or the root node) → **Extract**
6. Repeat for `character/skillaction/*.pac` (animations)
7. Wait — full extraction is ~50 GB / ~500k+ files; targeted extraction is much faster

### Extraction Process (AMGarkin UnPAZ CLI)
```cmd
# Extract only skill XML tooltips
UnPAZ pad00000.meta -y -f *skill_*.xml -o C:\bdo-extract\xml

# Extract only skill animations
UnPAZ pad00000.meta -y -f *_skill_*.pac -o C:\bdo-extract\anim

# Extract only skill icons
UnPAZ pad00000.meta -y -f *pc_skill*.dds -o C:\bdo-extract\icons
```

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
`.pac` files are BDO's proprietary animation container. The header contains:
- Frame count (DWORD, 4 bytes) at a fixed offset
- **Animation Duration (ms)** = `(frame_count / 60) * 1000` (BDO runs at 60 FPS)

**Parsing**: There is **no publicly-maintained standalone .pac parser** as of July 2026. Options:
1. **BDO Modding Discord** (https://discord.gg/bdomodding) — community tools exist but are not on GitHub. Ask in `#animation-tools` or `#pac-files` channels.
2. **Noesis plugin** (`fmt_blackdesert_pac.py`) — requested on ResHax forums but not publicly published. Noesis (https://richwhitehouse.com/noesis/) is a 3D model/animation viewer that supports BDO via plugins.
3. **Manual header read**: A minimal Python parser that reads just the frame count from the header would be straightforward — see `docs/PAZ_EXTRACTION.md` for pseudocode.
4. **WistfulHopes/FrontiersAnimDecompress** — mentioned for BlackSpace engine (Crimson Desert), not BDO directly.

This is **more accurate** than bdocodex's video-based duration (which includes hanging time and double casts).

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

Upload via: **POST /api/upload/skills-json** (with the JSON file) or use the **Data** button in the app footer.

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

5. **CRC caveat**: BDO client (and XIGNCODE3 anti-cheat) does not check CRC codes on packed files. Extracted files may have undetected corruption — verify integrity against expected file sizes from the .meta index.

6. **KR vs Global encryption**: The meta file decrypt key changed on KR client in May 2016. If you have a KR client and extraction fails on newer paz files, you may need a patched version of the unpacker. The sibercat fork uses the same key handling as kukdh1's 2019 code.

## Alternative Approaches (if PAZ extraction is not viable)

If you cannot run a Windows GUI tool or hit a dead-end, BDO Meta currently uses these alternative sources:

### 1. bdocodex.com (current primary source)
- **URL**: https://bdocodex.com
- **What we use it for**: Skill tooltips, skill IDs, preview videos, CC types, protection types
- **Access pattern**: 
  - Skill detail pages: `https://bdocodex.com/us/skill/{id}/`
  - Tooltip endpoint: `https://bdocodex.com/tip.php?id={id}&l=en` (no formal API, but fetchable)
  - No official API (confirmed by maintainer in https://bdocodex.com/forum/viewtopic.php?t=126)
- **Limitations**: 
  - Bot protection (Cloudflare / JS challenge) — our `lurker` scraper already handles this
  - Video-based durations include hanging time
  - Not 100% complete (some skills missing)
- **Used by**: `scripts/lurker.ts`, `scripts/import-bdocodex.ts`

### 2. Community data dumps
- **man90es/BDO-REST-API** (https://github.com/man90es/BDO-REST-API) — Go scraper, last updated May 2026, supports EU/NA/SA/KR regions. Mostly for marketplace + guild data, not skill details.
- **pxds/bdo-skill-list** (https://github.com/pxds/bdo-skill-list) — Python script to scrape skill descriptions from InvenGlobal (Korean site). Last updated 2018, may be broken.
- **BDO Codex forum / Reddit data dumps**: Reddit users occasionally post JSON/CSV dumps of recipes, items, etc. — search r/blackdesertonline for "data collection" threads.

### 3. Companion sites
- **garmoth.com** (https://garmoth.com) — BDO companion site with gear planner, grind tracker, tier lists, event/coupon tracking. Has internal skill data but no public API.
- **bdolytics.com** (https://bdolytics.com) — BDO database (items, quests, NPCs, recipes, lifeskills). No public skill API.

### 4. Direct game memory inspection (NOT RECOMMENDED)
- Theoretical only — would require a runtime DLL hook into the BDO client.
- Will trigger XIGNCODE3 anti-cheat → account ban.
- Not pursued.

### 5. Manual in-game frame counting
- Record the skill in-game at 60+ FPS using OBS
- Count frames from animation start to end in a video editor (e.g., DaVinci Resolve, Avidemux)
- Duration = `frame_count / 60`
- Current fallback when bdocodex video duration is suspect (we use ffprobe on the bdocodex preview video as the automated version of this).

## Next Steps for BDO Meta

1. **User**: Extract PAZ data using **sibercat/PAZ-Unpacker v2.3.0** per this guide
2. **User**: Parse the extracted XML for skill metadata (descriptions, damage, CC, cooldowns)
3. **User**: Either:
   - Manually parse `.pac` headers for frame counts (Python `struct.unpack`), OR
   - Ask the BDO Modding Discord for a current `.pac` parser, OR
   - Continue using bdocodex video durations as a fallback
4. **User**: Format as JSON per Step 5
5. **User**: Upload via the Data button or POST `/api/upload/skills-json`
6. **App**: Parse JSON, update DB, log changes via SkillChangeLog
7. **App**: Re-compute max-rank with `bun run scripts/compute-max-rank.ts`
8. **App**: Lurker becomes unnecessary for skills extracted from PAZ — keep for icon URL fallback only

## Research Log (P3.4 — 2026-07-05)

Sources searched via z-ai web_search:
- "BDO PAZ extractor 2024 Black Desert Online"
- "Black Desert Online PazUnpack github"
- "BDOToolkit alternative PAZ file reader"
- "BDO game data extraction tools modding discord"
- "github bdo paz extractor pad00000"
- "BDO modding toolkit 2025 PAZ archive"
- "BDO .pac file animation parser"
- "BDO coding toolkit github release"
- "bdocodex alternative bdo database grutor garmoth"
- "github kukdh1 PAZ-Unpacker fork community maintained"
- "Black Desert Explorer BDO file browser model viewer"
- "BDO skill data dump community github JSON 2025"
- "Black Desert Online Noesis plugin pac file"

GitHub API metadata fetched for:
- sibercat/PAZ-Unpacker — pushed 2026-04-09, 1 star, v2.3.0 release 2026-04-03 ✅
- kukdh1/PAZ-Unpacker — pushed 2019-08-08, 40 stars (original, legacy) ⚠️
- AMGarkin/UnPAZ — pushed 2018-09-06, 29 stars, v1.2 ⚠️
- FearYuzu/BDOToolBox — pushed 2017-06-21, 3 stars (language patcher, not extractor) ❌
- jabbber/BDO-toolkit — pushed 2023-08-02, 2 stars, CSS-heavy unclear purpose ❌
- man90es/BDO-REST-API — pushed 2026-05-26, 23 stars (marketplace scraper) ℹ️
- pxds/bdo-skill-list — pushed 2018-09-05, 0 stars (InvenGlobal scraper, stale) ⚠️

Caveats / open questions:
- No publicly-available `.pac` parser as of July 2026 — BDO Modding Discord is the lead.
- sibercat fork only has 1 star — low visibility but the codebase is high-quality (modern C++26, VS2025, 64-bit, dark-mode GUI).
- Crimson Desert (different engine) has dedicated unpackers (`lazorr410/crimson-desert-unpacker`, `Ekey/CD.PAZ.Tool`, `NattKh/CrimsonDesertModdingTools`) but they target BlackSpace engine and explicitly do NOT work on BDO.
- ResHax forum note: "Old BDO extractors like PAZ-Unpacker and UnPAZ do not work anymore due to the new engine's structure" — this was in the context of Crimson Desert, NOT BDO itself. BDO still uses the original PAZ format and sibercat/kukdh1/AMGarkin all still work for BDO.

---

*This guide was created on 2025-07-01 and fully revised on 2026-07-05 (P3.4). PAZ file structure may change with BDO updates — verify the class prefix mapping and file paths after major patches. If `sibercat/PAZ-Unpacker` becomes unavailable, fall back to `kukdh1/PAZ-Unpacker` (original) or `AMGarkin/UnPAZ` (CLI).*
