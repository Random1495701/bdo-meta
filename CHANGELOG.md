# Changelog — BDO Meta

All notable changes to this project are documented in this file. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Each version is committed to git with a tag (`vX.Y.Z`) so any state can be
recovered with `git checkout vX.Y.Z`.

---

## [Unreleased]

### In Progress
- Lurker v2 daemon running in background, enriching remaining ~5,600 skills
- ~1,500 / 7,231 skills enriched as of last commit

---

## [1.4.0] — 2025-06-29 (Prime Fix + Class Icons + Scroll UX)

### Added
- **Self-hosted class icons**: Downloaded all 31 BDO class icons from bdocodex
  (`/images/skillcalc/class_{id}.webp`) to `public/icons/classes/{slug}.webp`.
  Self-hosting eliminates bot-challenge issues when bdocodex rate-limits our IP.
  All 31 icons verified unique (640b–3,214b each).
- **Wheel-scroll on class bar**: Hovering over the class bar and scrolling the
  mouse wheel now scrolls horizontally. Shift+wheel also works.
- **Drag-to-scroll on class bar**: Click and drag on the class bar to scroll
  horizontally (grab cursor feedback).
- **Unified BDO scrollbar styling**: All scrollbars now match the BDO gold-on-dark
  theme — gold gradient thumbs (`#c8aa44` → `#9c7e2e`), dark tracks (`#0a0908`),
  with hover state (`#f0d060`). Firefox `scrollbar-color` also set.
- **Thinner class bar scrollbar**: 6px height with rounded gold gradient thumb.
- **Improvement plan**: `docs/IMPROVEMENT_PLAN.md` with 20 prioritized improvement
  items across data quality, UI/UX, performance, features, and infrastructure.

### Fixed
- **"Prime:" skills now flagged as Succession**: 867 skills with "Prime:" name
  prefix were missing the `isSuccession` flag. bdocodex uses "Prime:" for
  awakening-rank succession skills. Fixed via `scripts/fix-prime.ts`. Succession
  filter now returns 465 max-rank skills (was 91).
- **"Awakening:" prefix skills flagged**: 26 skills with "Awakening:" prefix
  now have `isAwakening = true`.
- **Class icons not displaying**: The old URL pattern
  (`/items/new_icon/00_icon/pc_class_{slug}.png`) was returning bdocodex's
  bot-challenge loading page (HTML instead of PNG) when our IP was rate-limited.
  Fixed by self-hosting icons locally.

### Changed
- `classIconUrl()` in `src/lib/skills.ts` now returns `/icons/classes/{slug}.webp`
  (local path) instead of bdocodex CDN URL.
- Class bar scroll container now has `bdo-class-scroll` CSS class for themed
  scrollbar + wheel/drag event handlers.
- Dev server Prisma client refreshes on restart to pick up DB changes.

---

## [1.3.0] — 2025-06-29 (BDO Meta Redesign)

### Added
- **Max-rank auto-filtering**: Only the highest rank of each skill is shown by
  default (e.g., "Bolt Wave IV" without I/II/III). Reduces 7,231 skills to
  ~2,400 unique max-rank skills.
- **Evasion auto-filtering**: 40 evasion skills are excluded by default.
- **`GET /api/ranges` endpoint**: Returns actual min/max values for slider
  fields from the database (level 0–62, cooldown 0–1200s, animation 0–25000ms).
- **Dynamic slider ranges**: Filter sidebar sliders now use real data ranges
  from `/api/ranges` instead of hardcoded values.
- **Class icons**: Each BDO class now shows its character portrait icon from
  the bdocodex CDN (`pc_class_{slug}.png`). All 31 icons verified loading.
- **Auto-refresh**: Skill grid and detail drawer auto-refresh every 15 seconds
  with `placeholderData` for zero-flicker updates. User state (filters, scroll,
  open drawer) is fully preserved.
- **"Updated Ns ago" indicator** in the header showing last refresh time.
- **2px gold loading bar** at top of grid during refetches.
- **BDO-themed UI redesign**: Dark leather backgrounds (`#0a0908`, `#1a1612`),
  gold ornate accents (`#c8aa44`, `#f0d060`), EB Garamond serif font for
  headings, ornate gold-framed skill icons, BDO-style tooltip panel for the
  detail drawer.
- **13 BDO utility classes** in `globals.css`: `.bdo-frame`, `.bdo-leather`,
  `.bdo-title`, `.bdo-chip`, `.bdo-icon-frame`, `.bdo-btn`, `.bdo-input`,
  `.bdo-pulse`, `.bdo-loadbar`, etc.
- **Project renamed** from "BDO Skills Codex" to "BDO Meta".

### Fixed
- **Warrior classId=0 bug**: The `filtersToQuery()` function used a truthiness
  check (`if (classId && ...)`) which treated `classId=0` (Warrior) as falsy,
  so the Warrior filter was never sent to the API. Fixed with `!= null` check.
- **Succession/Absolute flags = 0**: The tree parser never set these flags.
  Re-detected from skill name prefixes: 98 succession, 537 absolute, 653
  black spirit skills now properly flagged.
- **Warrior count showed "1"**: A data error had 1 Valkyrie skill tagged with
  `classId=0`. The stats endpoint now groups by classId and takes the majority
  className as canonical.
- **Cooldown parser**: Now handles bdocodex's "5s"/"20m" format (was only
  matching "5 sec"/"20 min").
- **German locale leak**: 1 skill with className "Schwarzmagierin" → "Sorceress".
- **NEW_CLASS placeholders**: Now excluded from all queries.

### Changed
- `GET /api/skills` endpoint completely rewritten with max-rank filtering,
  evasion filtering, NEW_CLASS exclusion, and proper classId=0 handling.
- `GET /api/stats` endpoint now groups classBreakdown by classId.
- Class bar merge logic prefers `/api/stats` counts (more reliable).
- Sync footer lurker indicator uses gold `bdo-pulse` instead of emerald.
- Header title changed to "BDO Meta" in serif gold with glow.

---

## [1.2.0] — 2025-06-29 (Lurker v2 + Upload/Export)

### Added
- **JS challenge solver**: Ported bdocodex's `get_jhash()` function (1.68M-
  iteration CPU hash) to TypeScript. The lurker now detects the "loading page"
  bot challenge, computes the hash, sets `__jhash_` + `__jua_` cookies, and
  re-requests — bypassing the challenge without a headless browser.
- **Single-instance PID lock** (`scripts/lurker.lock`): Prevents multiple lurker
  processes from running simultaneously (root cause of the previous stall).
- **Adaptive backoff**: If challenge can't be solved after 3 retries, endpoint
  cools down for 5 minutes. If all endpoints down, deep-sleeps 5 minutes.
- **`POST /api/upload/skills-json` endpoint**: Accepts JSON file uploads for
  instant DB enrichment. Supports plain JSON arrays, `{skills: [...]}`,
  bdocodex `query.php` format.
- **`GET /api/export` endpoint**: Exports current DB as downloadable JSON.
  Supports `enriched=true` and `format=compact` query params.
- **Data dialog** in sync footer with Import/Export/BDO-game-files sections.
- **BDO game file extraction instructions** in the Data dialog (UnPAZ + PAZ
  archive paths).
- **Lurker modes**: `--kr-names` (Korean name enrichment), `--re-enrich`
  (refresh all), `--batch N`, `--videos`, `--once`.

### Fixed
- **Lurker stalling**: Root cause was 3 competing lurker processes (from
  multiple button clicks) triggering bdocodex's anti-bot rate limit. Fixed
  with single-instance PID lock + JS challenge solver.
- **Parser card-extraction regex**: Was stopping at card header (239 bytes),
  missing description/damage data. Fixed to parse full HTML directly.
- **Cooldown parser**: Now handles "5s"/"20m" format.
- 8 skills with non-English locale data cleared and re-fetched.

---

## [1.1.0] — 2025-06-28 (Lurker v1 + Endpoint Rotation)

### Added
- **Lurker v1** (`scripts/sync-lurker.ts`): Polite background sync daemon with
  endpoint rotation (2 English endpoints), session cookies, jittered delays
  (1.5–3.5s + 10% long pauses), single concurrency, random skill order.
- **Per-endpoint cooldown** (30 min) on bot-challenge detection.
- **Heartbeat state file** (`scripts/lurker.state.json`) for real-time UI
  monitoring.
- **Lurker UI**: Emerald "Lurker" button with dropdown (daemon, batch, videos,
  kr-names, re-enrich) + real-time "Lurker active" status indicator.
- **`POST /api/sync/trigger`** with `script: 'sync' | 'lurker'` support.
- **`GET /api/sync/trigger`** returns current lurker state.
- **`GET /api/sync/status`** includes lurker state + `withKrName` count.

### Fixed
- Cooldown parser (handles "5s"/"20m" format).
- 8 skills with non-English locale data cleared.

---

## [1.0.0] — 2025-06-28 (Initial Release)

### Added
- **Database schema** (Prisma + SQLite): `BdoClass`, `Skill`, `SyncLog` models
  with 30+ fields per skill including animation duration, damage rows, CC types,
  protection types, prerequisites, and raw tooltip HTML.
- **Data ingestion pipeline** (`scripts/sync-skills.ts`): 4-phase sync from
  bdocodex.com — list, trees, tooltips, videos.
  - Phase 1: `query.php` — 7,231 skills upserted (1 request).
  - Phase 2: `ajax.php?a=skill_list2` — 3,261 enrichments across 35 class slots.
  - Phase 3: `tip.php` — per-skill tooltip parsing (name, description, damage,
    CC, protection, cooldown, command, video URL).
  - Phase 4: `ffprobe` — animation duration extraction from preview videos.
- **API endpoints**:
  - `GET /api/skills` — paginated filtered list (10+ filter dimensions).
  - `GET /api/skills/[id]` — full detail with prerequisites + related ranks.
  - `GET /api/stats` — aggregate counts, class breakdown, type breakdown.
  - `GET /api/classes` — all BDO classes with skill counts.
  - `GET /api/sync/status` — sync progress.
  - `POST /api/sync/trigger` — trigger background sync.
- **Frontend UI** (9 components): header, class-bar, filter-sidebar, skill-card,
  skill-grid, skill-detail-drawer, sync-footer, pagination, providers.
  - Dark theme with amber accents, sticky header + class bar + filter sidebar.
  - Responsive grid (1–5 cols), framer-motion hover effects.
  - Right-side detail drawer with video preview, damage breakdown, CC/protection
    chips, clickable prerequisites + related ranks.
  - Sticky sync footer with progress bars + sync trigger dropdown.
- **Animation duration extraction** via ffprobe on bdocodex preview videos — a
  novel approach since bdocodex doesn't expose durations directly.
- **7,231 skills ingested**, 122 fully enriched, 15 with animation durations
  at initial release.

### Research
- Confirmed bdocodex.com data sources: `query.php`, `ajax.php`, `tip.php`.
- Confirmed no viable alternative BDO skill databases (garmoth, grumpygreen,
  bdolytics, bddatabase all Cloudflare-locked).
- Confirmed animation duration data is NOT publicly extractable from game files
  without PAZ extraction + `.pac` parsing; ffprobe on preview videos is the
  practical solution.

---

## Versioning Notes

- **Major version**: Breaking changes to API or database schema.
- **Minor version**: New features, new API endpoints, UI redesigns.
- **Patch version**: Bug fixes, data corrections, lurker enrichment progress.

Each version is tagged in git. To restore any version:
```bash
git tag                    # list all versions
git checkout v1.3.0        # restore v1.3.0 code
git log --oneline          # view commit history
```

The SQLite database (`db/custom.db`) is committed to git so the enriched skill
data is always recoverable. The lurker state (`scripts/lurker.state.json`) is
also committed for continuity.

---

## [1.5.0] — 2025-06-29 (Damage Calc + Multi-Select + New Views)

### Added
- **Damage calculation**: Every skill now includes a computed `damage` field with
  per-phase breakdown, total PvE damage, and total PvP damage. Parser handles both
  structured `[damage]` rows ("Attack 1 damage = 8246% x1") and unstructured
  `[note]` rows ("Standing attack damage 938% x1, max 3 hits").
- **Multi-select filtering**: Classes, skill types, and protection types all
  support selecting multiple values simultaneously. API accepts comma-separated
  params (`class=0,4,8`, `type=succession,absolute`, `protection=Super Armor,Forward Guard`).
- **Three view modes**: Grid (existing ornate cards), List (compact rows with
  inline stats), Table (sortable columns with all skill data). View toggle in header.
- **New filters**: SP cost range (0–20), Damage range (0–100K), Has Prerequisites toggle.
- **Damage display on cards**: Total PvE damage (amber) and PvP damage (pink)
  shown on every skill card that has damage data.
- **Damage summary in detail drawer**: Two large stat cards (Total PvE / Total PvP)
  plus per-phase breakdown table showing percent, hits, max hits, and total per phase.
- **Damage sort option**: Sort skills by total PvE damage.
- **`src/lib/damage.ts`**: Damage calculator utility with `calculateDamage()` and
  `formatDamage()` functions.
- **`src/components/skills/skill-list-row.tsx`**: Compact list view component.
- **`src/components/skills/skill-table.tsx`**: Full table view with sortable columns.

### Fixed
- **Passive max-rank filtering**: Extended roman numeral support from XVIII (18)
  to XXX (30). Regex reordered longest-first to ensure correct matching. Passives
  like "Dark Maneuver XXX" now correctly show only the highest rank.
- **Skill icon URL**: Fixed to use `iconUrl()` helper consistently in detail route.

### Changed
- `SkillFilters` interface: `classId` → `classIds: number[]`, `type` → `types: SkillType[]`,
  `protection` → `protections: string[]`.
- Zustand store: `toggleClass()`, `toggleType()`, `toggleProtection()` replace
  single-select setters. Added `clearClasses()`, `clearTypes()`, `clearProtections()`.
- `filtersToQuery()`: Emits comma-separated values for multi-select params.
- `serializeSkill()`: Now includes `damage` field computed by `calculateDamage()`.
- Skill detail API: Includes `damage` field with per-phase breakdown.

---

## [1.6.0] — 2025-06-29 (CC System + Protection Icons + Table Sort + Column Picker)

### Added
- **BDO CC counter system**: Researched and implemented the real BDO PvP CC system.
  8 CC types (Stun, Stiffness, Freeze, Knockdown, Float, Bound, Grapple, Knockback)
  each fill 1 CC counter. At 2 counters, target becomes CC-immune. Non-CC effects
  (displacements, DoTs, smashes) pruned from the CC list and shown separately.
- **CC metadata** (`src/lib/cc.ts`): Each CC type has a symbol (⚡🛡↓↓ etc.), color,
  shortName, counterValue, and description. Protection types have symbols too
  (🛡 SA, ⬛ FG, ✦ IF).
- **CC counters on cards**: Skills with CC show a "⚡ CC: 2" badge.
- **CC counters in table**: Sortable column showing total CC counter value.
- **Column picker for table view**: Dropdown with checkboxes to toggle columns.
  Selection saved to localStorage.
- **Sortable table columns**: All table columns are now sortable (click header).
- **Compact symbols in table**: CC types show symbols (⚡↓↓), protection shows
  symbols (🛡⬛), class shows 3-letter abbreviations.
- **Protection icons in detail drawer**: Uses PROTECTION_META symbols with
  tooltips showing descriptions.
- **Split CC section in detail drawer**: Real CCs (with counter values) shown
  separately from non-CC effects (displacements, DoTs, smashes).

### Fixed
- **Card damage clipping**: Removed "DAMAGE" label text. Now uses compact icons:
  ⚔ (Swords) for PvE + ☠ (Skull) for PvP, both fitting on one line.
- **Passive max-rank**: Extended roman numeral support to XXX (30) in v1.5.0.

### Changed
- **SP cost removed**: Skill points cost removed from cards, table, and detail
  drawer (it's the cost to learn, not per-use — irrelevant per user).
- **CC_TYPES pruned**: From 24 entries to 8 real CCs. Non-CC effects moved to
  `NON_CC_TYPES` constant and shown in separate "Other Effects" filter section.
- **Filter sidebar**: CC Types section shows 8 real CCs. New "Other Effects"
  section for displacements, DoTs, and smashes.

### Notes
- **Stamina cost**: Not available from bdocodex data. bdocodex doesn't expose
  stamina cost as a structured field — it only appears in passive descriptions
  as buffs ("Max Stamina +5"). The lurker cannot pull this data because it
  doesn't exist in the tooltip structure.

---

## [1.7.0] — 2025-06-29 (CC Counter Fix + Detail Redesign + Slider Ranges)

### Fixed
- **CC counter values corrected**: Stiffness and Knockback now have CC count 0.7
  (was 1). Sourced from blackdesertfoundry.com and garmoth.com guides. Stun,
  Float, Bound, Freeze, Grapple, Knockdown remain at 1. Stiffness + 2 other CCs
  can reach 2.7 (bypasses the 2-counter cap).
- **PvE-only CCs excluded from counter**: CCs flagged "PvE only" in the tooltip
  data are no longer counted toward the PvP CC counter. The API now returns
  `pveOnlyCCs` array listing which CCs are PvE-only.
- **Slider ranges**: All filter sliders now use actual DB max values instead of
  hardcoded guesses. Damage slider max is now 544,962 (was 100,000).

### Added
- **X+Y CC counter display**: Skills with multiple CCs show "1+1" or "0.7+1"
  instead of a total. Each CC's individual counter value is shown.
- **PvE-only warning banner**: Detail drawer shows an orange alert when a skill
  has PvE-only CCs: "PvE only: [CC names] — does not count toward PvP CC counter".
- **Dynamic damage range**: `/api/ranges` now includes damage max (544,962) and
  skillPoints max (50), computed from actual DB data.

### Changed
- **Detail drawer stat cards reordered** by relevance:
  1. PvE Damage (⚔ amber)
  2. PvP Damage (☠ pink)
  3. Cooldown
  4. Protection (with symbols)
  5. CC Count (PvP) — X+Y format
  6. Animation Duration
  7. Required Level (secondary)
- **Protection icons changed**: Super Armor = 💪 (flexing muscles, was 🛡),
  Forward Guard = 🛡 (shield, was ⬛).
- **`ccCounterDisplay` field** added to all skill API responses (string like
  "1+1" or "—" if no PvP CCs).

---

## [1.8.0] — 2025-06-29 (PvP CC Filter + Range Fix + Video Plan + Garmoth API)

### Added
- **"PvP CC only" filter**: First option in the CC Types section. Filters for
  skills that have at least one PvP CC (excludes PvE-only CCs). Returns 482
  max-rank skills with PvP CCs.
- **`docs/VIDEO_PARSING_PLAN.md`**: Detailed plan for detecting double casts
  and hanging time in bdocodex preview videos. Uses ffmpeg scene detection
  and motion curve analysis. Not yet implemented.
- **Garmoth API discovery**: `api.garmoth.com/api/skill-addons` is completely
  open (no anti-bot, no Cloudflare). Returns 927 skills with addon popularity
  data, matching bdocodex IDs. Single 312KB request.

### Fixed
- **Cooldown slider range**: Now uses 90th percentile (60s) instead of absolute
  max (1200s). The 1200s max was caused by Black Spirit rage skills with 20m
  cooldowns — real but impractical for the slider. 90% of skills have ≤60s.
- **Damage slider range**: Now uses 99th percentile (163K) instead of absolute
  max (544K). The 544K was a single outlier skill.

### Changed
- `/api/ranges` now returns `absoluteMax` alongside `max` for reference.
- CC filter handling: special value `__pvp_only__` triggers both a DB-level
  filter (`ccTypes IS NOT NULL`) and a post-query filter (`ccCounters > 0`
  after excluding PvE-only CCs).

---

## [1.9.0] — 2025-06-29 (Cooldown Slider Fix + PAZ Docs + GitHub Backup)

### Added
- **Cooldown slider with Black Spirit jump**: Slider goes 0-240s smoothly (covers
  all non-Black-Spirit skills), with an "Include Black Spirit (20m)" button that
  jumps the max to 1200s, skipping all values in between. Black Spirit rage skills
  are the only ones at 1200s.
- **`docs/PAZ_EXTRACTION.md`**: Complete guide for extracting skill data directly
  from BDO's PAZ game files. Includes:
  - File locations for skill XML, .pac animation files, and icons
  - How to parse .pac files for frame-accurate animation duration (frame_count / 60)
  - Class prefix mapping (phm=Warrior, pef=Ranger, pwk=Sorceress, etc.)
  - Live database injection workflow for patch updates
  - Comparison: bdocodex (video-based) vs PAZ extraction (frame-accurate)
- **GitHub backup**: Repo at https://github.com/Random1495701/bdo-meta with all
  code + 10 version tags (v1.0.0 through v1.9.0).

### Fixed
- **db/custom.db removed from git**: Was 102MB (exceeds GitHub's 100MB limit).
  Used git filter-branch to remove from all history. DB exported as JSON (2.2MB)
  at `db/skills-export.json` instead.
- **Cooldown range**: Changed from 60s (90th percentile) to 240s (actual max
  before Black Spirit skills). Now covers 3-5 minute cooldown skills.

### Security
- **⚠️ Token hygiene**: GitHub token was shared in chat. User should revoke at
  https://github.com/settings/tokens after this session. Token was NOT saved to
  any file in the repo. Remote URL is clean (no embedded token).
