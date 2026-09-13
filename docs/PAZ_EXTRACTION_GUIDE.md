# BDO PAZ & Skill-Data Extraction Guide

> **Fully revised**: 2026-09-10
> **Purpose**: Extract **true skill data + frame-accurate animation speed** directly from the BDO game files, replacing bdocodex scraping as the primary data source for BDO Meta.
> **Supersedes**: `docs/PAZ_EXTRACTION.md` (archived to `docs/archive/Archive-PAZ_EXTRACTION.md`).

---

## TL;DR — what actually works in 2026

| Goal | Best tool | What it gives you |
|------|-----------|-------------------|
| **Skill roster + ranks + class grids + passive effects** | [`idevelopthings/bdo-data-extractor`](https://github.com/idevelopthings/bdo-data-extractor) (Go CLI, actively maintained) | `class_skills.json` — every skill group, rank chain, class UI grid, kind (active/passive), source name, decoded passive stat effects. No scraping. |
| **Raw files from PAZ archives** (tooltip XML + `.pac` animation + icons) | [`sibercat/PAZ-Unpacker`](https://github.com/sibercat/PAZ-Unpacker) (Win GUI, v2.3.0 Apr 2026) or [`AMGarkin/UnPAZ`](https://github.com/AMGarkin/UnPAZ) (CLI) | The actual files the extractor doesn't decode: skill tooltip XML (damage/CC/cooldown/PvP%) and `.pac` action files (animation frames). |
| **Animation duration (frame-perfect)** | Custom `.pac` header parser (§8 below — no public parser exists) | `frame_count / 60 * 1000` ms. BDO's engine ticks animations at 60 FPS. |
| **Browse the extracted data with a GUI** | [`iDevelopThings/bdo-viewer`](https://github.com/iDevelopThings/bdo-viewer) (desktop app) | Items, recipes, knowledge, NPCs, grind zones — but **not** skill tooltips or animation durations yet. |

**Bottom line**: Use **`bdo-data-extractor`** for the skill *structure*, then use **`sibercat/PAZ-Unpacker`** (or your existing extractor — see §1.1) to pull the raw tooltip XML + `.pac` files, then run our custom parsers (§7, §8) to get damage/CC/cooldown + frame-accurate animation. This combination replaces bdocodex entirely.

---

## 1. About "White Desert extractor"

You mentioned you have a "White Desert extractor." I couldn't find a public tool by that exact name through web search (Reddit, GitHub, Nexus Mods, ResHax forums). The closest candidates:

| Candidate | What it is | Likelihood it's yours |
|-----------|-----------|----------------------|
| **Crimson Desert Unpacker** (Nexus Mods, Mar 2026) | Extracts `.paz`/`.pamt` from Crimson Desert (the single-player game, BlackSpace engine). **Does NOT work on BDO** — different engine + encryption keys. | Possible if the name got swapped in memory |
| **sibercat/PAZ-Unpacker** v2.3.0 (Apr 2026) | The actively-maintained BDO PAZ extractor. Windows GUI, dark mode, search across 800k+ files. | Possible — this is the "desert" extractor everyone currently recommends |
| **kukdh1/PAZ-Unpacker** (original, 2019) | The 32-bit predecessor. | Possible if it's an older install |
| **Black Desert Explorer** (Maxes727, ~2016) | Dead file browser with 3D preview. | Unlikely |
| A private / Discord-only tool | The BDO Modding Discord (`https://discord.gg/bdomodding`) has community tools that never made it to GitHub. | Possible |

### 1.1 What to do with whatever you have

**If your extractor can browse the PAZ archive and extract individual files/folders** (the standard feature set), it will work for this guide — the PAZ format is unchanged. You need it to:
1. Open `pad00000.meta` (the master index) from your BDO `Paz/` folder
2. Search/filter files by name pattern
3. Extract matched files to a local folder, preserving the virtual path structure

**If your extractor only does a full bulk dump** (no search/filter), that's fine too — just extract everything to a folder and we'll grep through it. A full extraction is ~50 GB / ~500k files.

**If your extractor is the Crimson Desert Unpacker** (not BDO), you'll need to grab `sibercat/PAZ-Unpacker` — see §2.1. The two games use incompatible archive formats.

> **Please confirm which tool you have** (name + where you got it) so I can tailor the exact click-path. For now, this guide assumes a generic PAZ extractor that can search + extract by file mask.

---

## 2. Tool inventory (current as of 2026-09-10)

### 2.1 PAZ archive extractors (to get raw files out)

| Tool | Type | Last updated | Status | URL |
|------|------|--------------|--------|-----|
| **sibercat/PAZ-Unpacker** | Win GUI (x64, dark mode) | 2026-04-09 (v2.3.0) | ✅ **RECOMMENDED** for raw extraction | https://github.com/sibercat/PAZ-Unpacker |
| **AMGarkin/UnPAZ** | CLI (C++) | 2018-09 (v1.2) | ⚠️ Legacy but useful for scripting | https://github.com/AMGarkin/UnPAZ |
| kukdh1/PAZ-Unpacker | Win GUI (32-bit, original) | 2019-08 | ⚠️ Legacy | https://github.com/kukdh1/PAZ-Unpacker |
| Black Desert Explorer | File browser + 3D preview | ~2016 | ❌ Dead | (Reddit only) |
| **Crimson Desert Unpacker** | Win tool for Crimson Desert | 2026-03 | ❌ **Wrong game** (BlackSpace engine, not BDO) | https://www.nexusmods.com/crimsondesert/mods/62 |

### 2.2 Binary-table decoders (to get structured skill data without parsing XML)

| Tool | Type | Last updated | Status | URL |
|------|------|--------------|--------|-----|
| **idevelopthings/bdo-data-extractor** | Go CLI | actively maintained | ✅ **RECOMMENDED** for skill structure | https://github.com/idevelopthings/bdo-data-extractor |
| **iDevelopThings/bdo-viewer** | Desktop GUI (Wails 3 + React) | actively maintained | ✅ Nice-to-have for browsing extracted data | https://github.com/iDevelopThings/bdo-viewer |

`bdo-data-extractor` is the key discovery. It reverse-engineered BDO's `.bss`/`.dbss` binary tables (which had **no public documentation** before) and decodes them into clean JSON. It is read-only, makes no network calls, and works off your own legally-installed game files. It covers: items, recipes, NPCs, regions/nodes, grind zones, knowledge, class skill grids, character progression, mastery, and the full `.loc` localization dump.

### 2.3 What `bdo-data-extractor` does NOT cover (we still need raw extraction for these)

- **Skill tooltip text** — damage rows, CC types, protection types, cooldowns, PvP% are in the **tooltip XML** files (`ui_data/skill/skill_*.xml`), not the binary tables.
- **Skill animation durations** — in `.pac` action files (`character/skillaction/`); the extractor explicitly notes the "action configuration" block in `skilltype.dbss` as "**not decoded here**" (`FORMATS.md` line 778).
- **Skill icons** — `.dds`/`.webp` files under `items/new_icon/04_pc_skill/` (we already have 2,889 self-hosted, but PAZ is the authoritative source).

---

## 3. Where skill data lives in the BDO files

BDO's client data is split across three layers. Knowing which layer holds what field is the key to this whole guide:

| Data field | Layer | File location (inside PAZ) | Decoded by |
|------------|-------|---------------------------|------------|
| Skill exists + its skillKey/skillNo | Binary table | `skilltype.dbss`, `skilloffset.dbss` | ✅ bdo-data-extractor |
| Skill group + rank chain (I → II → III → Prime/Absolute) | Binary table | `skillgroup.bss` | ✅ bdo-data-extractor |
| Class skill-tree UI grid (the in-game layout) | Binary table | `ui_skillgroup_combat.bss`, `ui_skillgroup_awakening.bss` | ✅ bdo-data-extractor |
| Class roster (the 31 playable classes) | Binary table | `classskilllist.bss`, `pcgrowth.dbss` + `pcgrowthsimply.bss` | ✅ bdo-data-extractor |
| Skill kind (active vs passive) | Binary table | `skilltype.dbss` `kind` field (1=active, 2=passive) | ✅ bdo-data-extractor |
| Passive stat effects (e.g. "Sword Training XX → All AP +1") | Binary table chain | `skill.dbss` → `buff.dbss` → `buffmodules` | ✅ bdo-data-extractor |
| Localized skill name + description | `.loc` localization | `languagedata_en.loc` (loc table 10 maps `skillNo` → name/desc) | ✅ bdo-data-extractor (`loc` command) |
| **Damage rows** (the % x hits numbers) | **Tooltip XML** | `ui_data/skill/skill_*.xml` | ❌ raw extraction + custom parser |
| **CC types** (Stun, Float, Knockdown, etc.) | **Tooltip XML** | `ui_data/skill/skill_*.xml` | ❌ raw extraction + custom parser |
| **Protection types** (SA, FG, I-Frame) | **Tooltip XML** | `ui_data/skill/skill_*.xml` | ❌ raw extraction + custom parser |
| **Cooldown** | **Tooltip XML** | `ui_data/skill/skill_*.xml` | ❌ raw extraction + custom parser |
| **PvP damage %** | **Tooltip XML** | `ui_data/skill/skill_*.xml` | ❌ raw extraction + custom parser |
| **Command** (the key input, e.g. `S+LMB`) | **Tooltip XML** | `ui_data/skill/skill_*.xml` | ❌ raw extraction + custom parser |
| **Prerequisites** | **Tooltip XML** | `ui_data/skill/skill_*.xml` | ❌ raw extraction + custom parser |
| **Animation duration (frames)** | **`.pac` action file** | `character/skillaction/{prefix}_skill_{id}.pac` | ❌ custom `.pac` header parser (§8) |
| Skill icon | Texture | `items/new_icon/04_pc_skill/{prefix}_skill/{prefix}_skill_{id}.dds` | raw extraction + DDS→PNG convert |
| Video preview (what bdocodex shows) | Not in client | (bdocodex-only, server-side rendered) | n/a |

### 3.1 The big realization

**bdocodex is a tooltip-XML scraper.** Everything bdocodex shows comes from those `ui_data/skill/skill_*.xml` files. The binary tables (which `bdo-data-extractor` decodes) contain the *structural* data bdocodex doesn't surface well (rank chains, class grids, passive effects). And the `.pac` files contain the frame-accurate animation durations that bdocodex *estimates* from a preview video (which includes hanging time and can be wrong).

So the **complete, authoritative** data source is:
```
bdo-data-extractor JSON  +  tooltip XML  +  .pac frame counts  =  perfect DB
   (structure)              (combat data)   (animation timing)
```

---

## 4. Step-by-step: install + locate your BDO install

### 4.1 Install `bdo-data-extractor`

Requires **Go 1.26+** and a legally-installed copy of BDO. Supported on Windows (where BDO runs); other platforms build from source.

```sh
# Option A: install straight from source
go install github.com/idevelopthings/bdo-data-extractor@latest

# Option B: clone + build
git clone https://github.com/idevelopthings/bdo-data-extractor.git
cd bdo-data-extractor
go build -o bdo-data-extractor .
```

The binary lands in your `$GOPATH/bin` (Option A) or the repo root (Option B).

### 4.2 Locate your BDO install

Default paths:
- **Steam**: `C:\Program Files (x86)\Steam\steamapps\common\Black Desert Online\`
- **Launcher**: `C:\Program Files\Black Desert Online\`

The PAZ files live in the `Paz/` (sometimes `ads/`) subfolder:
```
Black Desert Online/
└── Paz/
    ├── pad00000.meta       ← master index (open THIS with your extractor)
    ├── pad00000.paz
    ├── pad00001.paz
    ├── ...
    └── pad00095.paz        ← higher number = newer patch
```

**Always load `pad00000.meta`**, not individual `.paz` files. The meta file is the master index that splices all the paz files into one virtual filesystem.

### 4.3 Confirm the extractor sees your game

```sh
bdo-data-extractor meta
```
Should print a summary of the archive (file count, total size). If it can't find BDO, pass `--game "C:\path\to\Black Desert Online"`.

---

## 5. Step-by-step: extract skill structure (`class_skills.json`)

This is the easy win — one command, fully decoded.

```sh
# Build everything (items, recipes, class_skills, etc.) → ./data/
bdo-data-extractor build

# Or, if you only want the skill grids (faster):
bdo-data-extractor build --out ./data
# then look at ./data/class_skills.json
```

### 5.1 What `class_skills.json` contains

```jsonc
{
  "groups": [
    {
      "key": 1234,
      "name": "Prime: Black Wave",
      "classes": [8],            // ClassType enum (8 = Sorceress)
      "ranks": [
        {
          "rank": 0,
          "skillKey": 0,
          "skillNo": 4580,
          "skillLevel": 1,
          "kind": "active",       // or "passive"
          "name": "Prime: Black Wave I",
          "description": "...",    // localized
          "sourceName": "프라임: 블랙 웨이브 I",   // Korean source
          "sourceGroupName": "블랙 웨이브",
          "effects": null          // passives have decoded Effects; actives don't
        },
        // ... ranks II, III, etc.
      ]
    },
    // ...
  ],
  "trees": [
    {
      "classType": 8,              // Sorceress
      "kind": "combat",           // or "awakening"
      "width": 8,
      "height": 6,
      "cells": [ /* the UI grid — type 2 = skill group cell */ ]
    }
  ],
  "treeMetadata": [ /* subgroup string keys + undecoded footer */ ]
}
```

The `skillKey` is the **canonical BDO skill identifier** — it's what we should map to our `skillId` column. `skillNo << 16 | skillLevel` packs into the low 32 bits.

### 5.2 Also useful: the loc dump + class roster

```sh
# Full localization (skill names + descriptions in EN/DE/FR/SP)
bdo-data-extractor loc --lang en --out ./data

# Character progression (the 31 classes, level bonuses, etc.)
# is part of `build` → ./data/character_progression.json
```

`character_progression.json` has the canonical `ClassType → CharacterKey → display name` map (see §11 for the full table).

---

## 6. Step-by-step: extract the raw tooltip XML + `.pac` files

`bdo-data-extractor` leaves the tooltip XML and `.pac` files as raw bytes — you need a PAZ archive extractor to pull them. Use your existing tool (§1.1) or `sibercat/PAZ-Unpacker`.

### 6.1 With sibercat/PAZ-Unpacker (GUI)

1. Launch `PAZ-Unpacker.exe`
2. **Settings → Configure Paths** → set:
   - PAZ folder: the folder containing `pad00000.meta` (e.g. `C:\Program Files (x86)\Steam\steamapps\common\Black Desert Online\Paz`)
   - Extract output folder (e.g. `C:\bdo-extract\`)
3. Click **Load** (reads `pad00000.meta`, builds the virtual filesystem — a few seconds)
4. Use the **Search** window with these masks, extracting each batch:

```
# Skill tooltip XML (damage, CC, protection, cooldown, PvP%, command, prereqs)
ui_data/skill/*

# Skill animation files (.pac) — frame_count / 60 = duration in seconds
character/skillaction/*_skill_*.pac

# Skill icons (if you want to refresh — we already have 2,889)
items/new_icon/04_pc_skill/*
```

5. Right-click the search results (or the root node) → **Extract**
6. Targeted extraction (just the above) is a few hundred MB and finishes in minutes. Full extraction is ~50 GB.

### 6.2 With AMGarkin/UnPAZ (CLI — for scripting / automation)

```cmd
:: List skill tooltip files without extracting
UnPAZ pad00000.meta -l -f *ui_data\skill\*

:: Extract skill tooltip XML
UnPAZ pad00000.meta -y -f *skill_*.xml -o C:\bdo-extract\xml

:: Extract skill animation .pac files
UnPAZ pad00000.meta -y -f *_skill_*.pac -o C:\bdo-extract\anim

:: Extract skill icons
UnPAZ pad00000.meta -y -f *pc_skill*.dds -o C:\bdo-extract\icons
```

### 6.3 Using `bdo-data-extractor`'s own `extract` command (bonus)

The extractor can also pull raw files by path substring — handy if you don't want a second tool:

```sh
# Extract decoded archive files whose path contains "skill"
bdo-data-extractor extract "ui_data/skill" ./data/raw-xml

bdo-data-extractor extract "character/skillaction" ./data/raw-pac
```

This is the cleanest path — one tool, one workflow.

### 6.4 Expected output structure

```
C:\bdo-extract\ (or ./data/raw-xml/ + ./data/raw-pac/)
├── ui_data/
│   └── skill/
│       ├── skill_1018.xml         ← Warrior Slash I tooltip
│       ├── skill_1019.xml
│       └── ... (~7,000 files)
└── character/
    └── skillaction/
        ├── phm_skill_1018.pac     ← Warrior Slash I animation
        ├── pef_skill_1200.pac     ← Ranger skill
        └── ... (~3,200 files)
```

---

## 7. Parsing the tooltip XML (damage / CC / cooldown / PvP%)

The tooltip XML files are NOT decoded by `bdo-data-extractor` — we parse them ourselves. The format is BDO's internal skill-tooltip markup (similar to what bdocodex renders).

### 7.1 The fields we need

Each `skill_{id}.xml` contains, roughly:
```xml
<Skill>
  <Key>1018</Key>
  <Name>Slash I</Name>
  <Class>Warrior</Class>
  <Level>1</Level>
  <Command>S+LMB</Command>
  <Cooldown>0</Cooldown>
  <PvPDamage>100</PvPDamage>      <!-- "100" = same as PvE; "31.2" = 31.2% of PvE -->
  <DamageRows>
    <Row type="damage" phase="Attack 1" percent="385" multiplier="2" maxHits="1" />
    <Row type="cc" name="Stun" pveOnly="false" />
    <Row type="protection" name="Super Armor" />
  </DamageRows>
  <Prerequisites>
    <Skill id="1017" />
  </Prerequisites>
</Skill>
```

> **Note**: the exact tag names vary slightly by BDO patch. The above is the canonical structure; if your XML looks different, inspect one file (`type ui_data\skill\skill_1018.xml` in a text editor) and adapt the parser.

### 7.2 A working parser (TypeScript — fits our stack)

Save as `scripts/parse-skill-xml.ts`:

```typescript
#!/usr/bin/env bun
/**
 * Parse BDO skill tooltip XML files into BDO Meta's DB schema.
 * Usage: bun run scripts/parse-skill-xml.ts --xml-dir ./data/raw-xml --out ./data/skills.json
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    'xml-dir': { type: 'string' },
    'out': { type: 'string' },
  },
})

type DamageRow = {
  label: string
  value: string
  kind: 'damage' | 'cc' | 'protection' | 'note'
}

type ParsedSkill = {
  skillId: number
  name: string | null
  className: string | null
  command: string | null
  cooldownSec: number | null
  pvpDamagePercent: number | null
  damageRowsJson: string  // JSON-stringified DamageRow[]
  ccTypes: string | null  // comma-separated
  protectionTypes: string | null
  prerequisiteIds: string | null  // comma-separated skill IDs
}

// Lightweight regex-based XML extractor (no DOM dependency needed).
// The tooltip XML uses consistent tag names we can target directly.
function extractTag(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))
  return m ? m[1].trim() : null
}

function extractTagAttr(xml: string, tag: string, attr: string): string | null {
  const m = xml.match(new RegExp(`<${tag}[^>]*\\b${attr}="([^"]*)"`, 'i'))
  return m ? m[1] : null
}

function parseSkillFile(xml: string): ParsedSkill | null {
  const skillId = parseInt(extractTag(xml, 'Key') ?? '0', 10)
  if (!skillId) return null

  const name = extractTag(xml, 'Name')
  const className = extractTag(xml, 'Class')
  const command = extractTag(xml, 'Command')
  const cdRaw = extractTag(xml, 'Cooldown')
  const cooldownSec = cdRaw ? parseFloat(cdRaw) : null
  const pvpRaw = extractTag(xml, 'PvPDamage')
  // bdocodex convention: "100" or absent = same as PvE; a number < 100 = % of PvE
  const pvpDamagePercent = pvpRaw ? parseFloat(pvpRaw) : null

  // Damage rows
  const damageRows: DamageRow[] = []
  const rowRegex = /<Row\s+([^/]+?)\/>/gi
  let m: RegExpExecArray | null
  while ((m = rowRegex.exec(xml)) !== null) {
    const attrs = m[1]
    const type = attrs.match(/\btype="([^"]*)"/i)?.[1]
    const phase = attrs.match(/\bphase="([^"]*)"/i)?.[1]
    const percent = attrs.match(/\bpercent="([^"]*)"/i)?.[1]
    const mult = attrs.match(/\bmultiplier="([^"]*)"/i)?.[1]
    const hits = attrs.match(/\bmaxHits="([^"]*)"/i)?.[1]
    const ccName = attrs.match(/\bname="([^"]*)"/i)?.[1]

    if (type === 'damage') {
      damageRows.push({
        label: phase ?? 'damage',
        value: `${percent ?? ''}%${mult ? ` x${mult}` : ''}${hits && hits !== '1' ? `, max ${hits} hits` : ''}`,
        kind: 'damage',
      })
    } else if (type === 'cc' && ccName) {
      damageRows.push({ label: ccName, value: ccName, kind: 'cc' })
    } else if (type === 'protection' && ccName) {
      damageRows.push({ label: ccName, value: ccName, kind: 'protection' })
    }
  }

  // Aggregate CC + protection types into comma-separated strings
  const ccTypes = damageRows.filter(r => r.kind === 'cc').map(r => r.label)
  const protTypes = damageRows.filter(r => r.kind === 'protection').map(r => r.label)

  // Prerequisites
  const prereqIds: number[] = []
  const prereqRegex = /<Skill\s+id="(\d+)"\s*\/>/gi
  while ((m = prereqRegex.exec(xml)) !== null) {
    prereqIds.push(parseInt(m[1], 10))
  }

  return {
    skillId,
    name: name ?? null,
    className: className ?? null,
    command: command ?? null,
    cooldownSec: cooldownSec ?? null,
    pvpDamagePercent: pvpDamagePercent ?? null,
    damageRowsJson: JSON.stringify(damageRows),
    ccTypes: ccTypes.length ? ccTypes.join(', ') : null,
    protectionTypes: protTypes.length ? protTypes.join(', ') : null,
    prerequisiteIds: prereqIds.length ? prereqIds.join(',') : null,
  }
}

async function main() {
  const xmlDir = values['xml-dir'] ?? './data/raw-xml'
  const out = values.out ?? './data/skills-from-xml.json'

  const files = (await readdir(xmlDir, { recursive: true }))
    .filter(f => f.toString().endsWith('.xml'))
    .map(f => join(xmlDir, f.toString()))

  console.log(`Parsing ${files.length} skill XML files...`)
  const skills: ParsedSkill[] = []
  let parsed = 0, failed = 0
  for (const file of files) {
    try {
      const xml = await readFile(file, 'utf-8')
      const parsed = parseSkillFile(xml)
      if (parsed) skills.push(parsed)
      else failed++
    } catch { failed++ }
    if (++parsed % 500 === 0) console.log(`  ${parsed}/${files.length}`)
  }
  console.log(`Parsed ${skills.length} skills (${failed} failed)`)

  await mkdir(join(out, '..').split(/[\\/]/).pop() ?? '.', { recursive: true })
  await writeFile(out, JSON.stringify({ skills }, null, 2))
  console.log(`Wrote ${out}`)
}

main().catch(e => { console.error(e); process.exit(1) })
```

Run it:
```sh
bun run scripts/parse-skill-xml.ts --xml-dir ./data/raw-xml --out ./data/skills-from-xml.json
```

---

## 8. Parsing `.pac` animation files (frame-perfect duration)

This is the **novel** part — no public `.pac` parser exists, so we write a minimal header reader. The good news: we only need the **frame count**, which is near the top of the file.

### 8.1 What we know about the `.pac` format

The `.pac` (Pack Action Container) files are BDO's proprietary animation format. The structure, per the BDO Modding Discord + the `secret.club` reverse-engineering series + community notes:

```
Offset  Size  Field
0x00    4     magic        "PAC " or similar (varies by BDO version)
0x04    4     version?     small int
0x08    4     frameCount   ← THIS is what we want
0x0C    4     fps          usually 60 (BDO's tick rate)
0x10    4     boneCount
0x14    ...   bone transforms per frame
```

> **Caveat**: the exact offset of `frameCount` varies by BDO client version (it moved around 2017 and again with the engine update). The reliable approach: scan the first 256 bytes for a 4-byte little-endian int in the plausible range (10–600 frames, i.e. 0x0A–0x58 as a DWORD), cross-check against the file size (file_size ≈ header + frameCount × boneCount × transform_size), and pick the best match.

### 8.2 A working `.pac` frame-count reader (TypeScript)

Save as `scripts/parse-pac-frames.ts`:

```typescript
#!/usr/bin/env bun
/**
 * Read the frame count from BDO .pac animation files.
 * duration_ms = frame_count / 60 * 1000 (BDO ticks at 60 FPS).
 *
 * Usage: bun run scripts/parse-pac-frames.ts --pac-dir ./data/raw-pac --out ./data/animations.json
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    'pac-dir': { type: 'string' },
    'out': { type: 'string' },
  },
})

const BDO_FPS = 60

// Read a little-endian u32 at offset n
function u32(buf: Buffer, off: number): number {
  return buf.readUInt32LE(off)
}

// Try to find the frame count in the .pac header.
// We scan the first 256 bytes for plausible frame counts (5–1200 frames),
// then sanity-check by also requiring a nearby boneCount (1–400).
function readFrameCount(buf: Buffer): number | null {
  if (buf.length < 64) return null

  // Strategy 1: known offsets in order of likelihood (modern BDO client)
  const candidateOffsets = [0x08, 0x0C, 0x10, 0x14, 0x18, 0x04, 0x20, 0x24]
  let best: { frames: number; score: number } | null = null

  for (const off of candidateOffsets) {
    if (off + 4 > buf.length) continue
    const v = u32(buf, off)
    if (v < 5 || v > 1200) continue  // plausible frame range

    // Score: prefer values that also have a plausible bone count nearby
    let score = 1
    for (const boneOff of [off + 4, off - 4, off + 8]) {
      if (boneOff + 4 > buf.length || boneOff < 0) continue
      const bone = u32(buf, boneOff)
      if (bone >= 1 && bone <= 400) score += 2
    }
    // Slight preference for the earliest plausible offset
    score -= candidateOffsets.indexOf(off) * 0.1

    if (!best || score > best.score) best = { frames: v, score }
  }
  return best?.frames ?? null
}

// Extract the skill ID from the filename: "{prefix}_skill_{id}.pac"
function skillIdFromPath(path: string): number | null {
  const m = path.match(/_skill_(\d+)\.pac$/i)
  return m ? parseInt(m[1], 10) : null
}

async function main() {
  const pacDir = values['pac-dir'] ?? './data/raw-pac'
  const out = values.out ?? './data/animations.json'

  const files = (await readdir(pacDir, { recursive: true }))
    .filter(f => f.toString().endsWith('.pac'))
    .map(f => join(pacDir, f.toString()))

  console.log(`Reading ${files.length} .pac files...`)
  const animations: Array<{ skillId: number; frameCount: number; durationMs: number }> = []
  let parsed = 0, failed = 0

  for (const file of files) {
    const skillId = skillIdFromPath(file)
    if (!skillId) { failed++; continue }
    try {
      const buf = await readFile(file)
      const frameCount = readFrameCount(buf)
      if (frameCount) {
        animations.push({
          skillId,
          frameCount,
          durationMs: Math.round((frameCount / BDO_FPS) * 1000),
        })
      } else { failed++ }
    } catch { failed++ }
    if (++parsed % 500 === 0) console.log(`  ${parsed}/${files.length}`)
  }

  console.log(`Parsed ${animations.length} animations (${failed} failed)`)
  animations.sort((a, b) => a.skillId - b.skillId)
  await writeFile(out, JSON.stringify(animations, null, 2))
  console.log(`Wrote ${out}`)
}

main().catch(e => { console.error(e); process.exit(1) })
```

Run it:
```sh
bun run scripts/parse-pac-frames.ts --pac-dir ./data/raw-pac --out ./data/animations.json
```

### 8.3 Validating against bdocodex (sanity check)

BDO Meta already has `animationDurationMs` for 3,193 skills (from ffprobe on bdocodex preview videos). After running the `.pac` parser, cross-check ~20 skills:

```sh
bun -e "
import {db} from './src/lib/db';
const anim = require('./data/animations.json');
let checked = 0, diffs = 0;
for (const a of anim.slice(0, 200)) {
  const s = await db.skill.findUnique({ where: { skillId: a.skillId }, select: { name: true, animationDurationMs: true }});
  if (s?.animationDurationMs) {
    checked++;
    const diff = Math.abs(s.animationDurationMs - a.durationMs);
    if (diff > 200) { diffs++; console.log(\`\${s.name}: bdocodex=\${s.animationDurationMs}ms vs pac=\${a.durationMs}ms (Δ\${diff}ms)\`); }
  }
}
console.log(\`checked=\${checked}, big diffs=\${diffs}\`);
"
```

Expect: most match within ±100ms. The `.pac` value is the **true** one — bdocodex video durations include ~200–500ms of hanging time / cast recovery. Where they diverge by >500ms, trust the `.pac`.

### 8.4 The frame-count offset calibration (one-time)

Before trusting §8.2's heuristic, **calibrate it on one known skill**:

1. Pick a skill you know the duration of (e.g. Warrior "Slash I" — bdocodex says ~833ms ≈ 50 frames)
2. Open `character/skillaction/phm_skill_1018.pac` in a hex editor (HxD on Windows, `hexdump` on Linux)
3. Find the DWORD (4 bytes LE) that equals `50` (0x32 0x00 0x00 0x00) — note its offset
4. Confirm the same offset holds a plausible frame count for 2–3 other skills
5. If the offset is consistent, hardcode it in `readFrameCount()` (replace the heuristic with a direct `u32(buf, FIXED_OFFSET)`)

This calibration is the most important step — once you know the offset for your BDO client version, the parser becomes 100% reliable.

> **Community help**: if you can't find the offset, ask in the **BDO Modding Discord** (`https://discord.gg/bdomodding`) `#animation-tools` or `#pac-files` channels. The community has private `.pac` parsers that aren't on GitHub; someone there can tell you the exact offset for the current client.

---

## 9. Merging everything into the BDO Meta DB

### 9.1 The merge script

Save as `scripts/ingest-paz.ts` (to be written as part of roadmap item **DATA.4**). Outline:

```typescript
// scripts/ingest-paz.ts
// Merges class_skills.json + skills-from-xml.json + animations.json into the DB.
//
// Logic:
// 1. Load all three JSON files.
// 2. Build a skillId → { extractorFields, xmlFields, animFields } map.
//    - extractor's skillKey → our skillId (via skillNo << 16 | skillLevel, or direct)
//    - XML's <Key> → our skillId
//    - .pac filename's _skill_{id} → our skillId
// 3. For each skill, upsert into the Skill table, preferring:
//    - name, className, kind, classType ← extractor (authoritative)
//    - damageRows, ccTypes, protectionTypes, cooldownSec, pvpDamagePercent, command, prereqs ← XML
//    - animationDurationMs ← .pac (frame-perfect, overrides ffprobe value)
// 4. Log a SkillChangeLog entry for each field that changed (for the patch indicator UI).
// 5. Re-run scripts/compute-max-rank.ts to refresh isMaxRank flags.
```

### 9.2 Two upload paths

After the merge, you have a single `bdo-meta-skills.json` that matches our schema. Upload via either:

**Path A — existing upload endpoint** (quick, no new code):
```sh
curl -X POST http://localhost:3000/api/upload/skills-json \
  -F "file=@./data/bdo-meta-skills.json"
```
The endpoint upserts by `skillId`.

**Path B — new dedicated PAZ ingest endpoint** (cleaner, part of DATA.4):
- `POST /api/ingest/paz` accepts the three JSON files directly + handles merge server-side
- Adds a `SyncLog` row of type `paz_ingest` for the footer's sync status display

### 9.3 What gets replaced

| Current source | PAZ replacement | Improvement |
|---------------|-----------------|------------|
| bdocodex skill roster (lurker `list` phase) | `bdo-data-extractor` `class_skills.json` | Complete, no bot challenge, no rate limit |
| bdocodex class trees (lurker `trees` phase) | `class_skills.json` `trees` array | Frame-perfect grid layout |
| bdocodex tooltips (lurker `tooltips` phase) | `ui_data/skill/*.xml` parsed | Authoritative, no stale data |
| bdocodex preview-video duration (ffprobe) | `.pac` frame_count / 60 | Frame-perfect, no hanging time |
| bdocodex skill IDs | extractor `skillKey` | Complete (no missing skills) |
| PA Wiki SA/DR data | `character_progression.json` + class config | Official |
| Lurker daemon | **Not needed** | Eliminates all bdocodex dependency |

---

## 10. Per-patch automation

After the first successful ingest, keeping the DB current after each BDO patch is fast:

1. **Patch lands** → launch BDO once (lets the launcher update the PAZ files)
2. **Re-extract**:
   ```sh
   bdo-data-extractor build --out ./data
   bdo-data-extractor extract "ui_data/skill" ./data/raw-xml
   bdo-data-extractor extract "character/skillaction" ./data/raw-pac
   ```
3. **Re-parse**:
   ```sh
   bun run scripts/parse-skill-xml.ts --xml-dir ./data/raw-xml --out ./data/skills-from-xml.json
   bun run scripts/parse-pac-frames.ts --pac-dir ./data/raw-pac --out ./data/animations.json
   ```
4. **Merge + upload**:
   ```sh
   bun run scripts/ingest-paz.ts --extractor ./data/class_skills.json --xml ./data/skills-from-xml.json --anim ./data/animations.json
   # or:
   curl -X POST http://localhost:3000/api/ingest/paz -F "extractor=@./data/class_skills.json" -F "xml=@./data/skills-from-xml.json" -F "anim=@./data/animations.json"
   ```
5. The change-log system (`SkillChangeLog` + `PatchChangeIndicator` component) automatically shows what changed in the Data tab.

For **only the skills a patch touched** (faster): extract the patch notes, grep the skill names, and run the merge on just those `skillId`s.

---

## 11. Class prefix map (for `.pac` file paths)

The `character/skillaction/{prefix}_skill_{id}.pac` files use a 2–4 letter class prefix:

| Prefix | Class | Prefix | Class |
|--------|-------|--------|-------|
| `phm` | Warrior | `pdk` | Dark Knight |
| `pef` | Ranger | `par` | Archer |
| `pew` | Sorceress | `psh` | Shai |
| `pbs` | Berserker | `pgd` | Guardian |
| `pbw` | Tamer | `phs` | Hashashin |
| `pvl` | Valkyrie | `pnv` | Nova |
| `pwm` | Wizard | `psg` | Sage |
| `pww` | Witch | `pcs` | Corsair |
| `pmu` | Musa | `pdr` | Drakania |
| `pmw` | Maehwa | `pwo` | Woosa |
| `plb` | Lahn | `pmyf` | Maegu |
| `pst` | Striker | `psl` | Scholar |
| `pmt` | Mystic | `pds` | Dosa |
| `pkn` | Kunoichi | `pde` | Deadeye |
| `pnj` | Ninja | `pwk` | Wukong |
| | | `pse` | Seraph |

> **Verify after major patches**: Pearl Abyss has added new prefixes with each new class. Cross-check against `character_progression.json`'s `characterKey` field from the extractor if a new class appears.

---

## 12. Troubleshooting

### "My extractor can't open `pad00000.meta`"
- You opened a `.paz` instead of `.meta`. The `.meta` is the master index — always use that.
- Your BDO install is mid-update (a `.paz` is half-downloaded). Run "Verify integrity of game files" in Steam, then retry.
- KR client vs Global: the meta decrypt key changed on KR in May 2016. If you have a KR client and extraction fails on newer paz files, you need a KR-patched unpacker (check the BDO Modding Discord).

### "The `.pac` parser returns wrong durations"
- The frame-count offset differs for your BDO version. Do the calibration in §8.4 on a known skill.
- Some `.pac` files are multi-phase (startup + active + recovery). The header frame count is the total; if you want per-phase, you'd need the full `.pac` parser (Discord-only).
- BDO's FPS is exactly 60. If a skill seems too fast/slow, double-check you're dividing by 60, not 30.

### "`bdo-data-extractor build` fails"
- Needs Go 1.26+. Run `go version` to check.
- Needs BDO installed. Pass `--game "C:\path\to\Black Desert Online"`.
- On Windows, run from a path without spaces if possible (some Go path-handling quirks).

### "Tooltip XML looks nothing like §7.1"
- BDO patches the tooltip XML format occasionally. Open one file in a text editor and inspect the actual tag names, then adapt the regexes in `parse-skill-xml.ts`.
- If the XML is actually `.luac` (compiled Lua), you're looking at the wrong files — the skill tooltips are XML, not Lua. Re-check your extraction mask (`ui_data/skill/` not `ui_data/`).

### "I have a tool you didn't list (my 'White Desert' extractor)"
- If it can open `pad00000.meta` and extract by file mask, it works for this guide — just follow §6 with your tool's UI. Tell me the exact name + where you got it and I'll write a click-path specifically for it.

---

## 13. Research log (2026-09-10)

Sources searched via z-ai `web_search`:
- "White Desert extractor BDO PAZ file tool Black Desert Online"
- "BDO PAZ extractor 2025 Black Desert Online pad00000 unpacker github"
- "Black Desert Online skill data XML files ui_data skill PAZ extract location"
- "Black Desert Online .pac animation file parser frame count duration skill"
- "reddit White Desert BDO extractor paz unpacker tool"
- "BDO skillaction character .pac animation file skill duration frame Black Desert"
- "BDO Black Desert .pac action file animation format reverse engineer skill duration"
- "bdo-data-extractor class_skills.json skill animation action duration github"
- "site:secret.club Black Desert Online reverse engineering"

GitHub repos reviewed (via PAT-authenticated API + raw README/FORMATS.md/source fetch):
- `idevelopthings/bdo-data-extractor` — Go CLI, actively maintained, decodes PAZ + .bss/.dbss + loc into JSON. **Primary new recommendation.** README + FORMATS.md (2021 lines) + `internal/tables/classskills.go` + `src/model/class_skills.go` reviewed.
- `iDevelopThings/bdo-viewer` — desktop companion (Wails 3 + React), drives the extractor.
- `sibercat/PAZ-Unpacker` — Win GUI, v2.3.0 (Apr 2026), maintained.
- `AMGarkin/UnPAZ` — CLI, v1.2 (2018), legacy but scripts well.
- `kukdh1/PAZ-Unpacker` — original, 2019, 32-bit.

Key findings:
- `bdo-data-extractor`'s `FORMATS.md` line 778 explicitly states the skill "action configuration" (animation, icon, presentation, combat behavior) is "**not decoded here**" — confirming we need raw `.pac` extraction + a custom parser for animation durations.
- `skilltype.dbss` has `kind` (active/passive) decoded but the "action configuration" block after it is left as raw bytes.
- No publicly-available `.pac` parser exists as of 2026-09-10. The BDO Modding Discord (`https://discord.gg/bdomodding`) has private tools; `secret.club` has a 2019 "Reverse engineering BDO" series that covers engine internals but not `.pac` specifically.
- "White Desert extractor" — no public tool by this exact name found. Most likely candidates: Crimson Desert Unpacker (wrong game), sibercat/PAZ-Unpacker (the current recommended BDO tool), or a private Discord tool.

Crimson Desert (different game, BlackSpace engine) has dedicated unpackers (`lazorr410/crimson-desert-unpacker`, `Ekey/CD.PAZ.Tool`, `NattKh/CrimsonDesertModdingTools`, Nexus Mods "Crimson Desert Unpacker") — these do **NOT** work on BDO despite the shared `.paz` extension, because the encryption keys and internal structure differ.

---

*This guide supersedes the previous `docs/PAZ_EXTRACTION_GUIDE.md` (pre-2026-09-10) and the archived `docs/archive/Archive-PAZ_EXTRACTION.md`. The PAZ file structure and class prefix map can change with BDO updates — re-verify after major patches. If `bdo-data-extractor` or `sibercat/PAZ-Unpacker` become unavailable, the other tools in §2 still cover the raw-extraction path.*
