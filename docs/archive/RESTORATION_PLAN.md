# Restoration Plan — v3.9.0 Feature Recovery

> **Created**: 2025-06-30, after comprehensive audit (Task AUDIT-1)
> **Goal**: Restore all features lost when the project reverted from v3.9.0 → v2.7.0
> **Total missing features**: ~40 (10 Critical/High-blocking, ~15 High, ~15 Medium/Low)

## Context

The project filesystem reverted to the v2.7.0 state. The git repo's latest tag is v2.7.0,
but the project had progressed to v3.9.0 in later sessions (whose commits were never pushed).
The session summary describes v3.9.0 with many features that are now gone.

The **Tier Builder is silently broken** — it references 28 fields (`combatType`, `successionGroup`,
`SaDr`, `ccChainPotential`, `grabCount`, `coreSaCount`, etc.) that `/api/meta` doesn't return.

---

## Phase 1: Critical Blockers (Tier Builder + Meta API) — ~3h

**Why first**: The Tier Builder UI is broken without these. Every other feature builds on the meta API.

### 1.1 PA Wiki Data Ingestion — `scripts/import-pa-wiki.ts` (MISSING)
- Scrape PA Wiki for each class: combat type (melee/ranged/magic), class group (Vanguard/Crusher/Skirmisher), SA damage reduction per spec (10–25%)
- Store as JSON in `data/pa-wiki-data.json`
- Import into BdoClass model (new fields: `combatType`, `successionGroup`, `awakeningGroup`, `ascensionGroup`, `successionSaDr`, `awakeningSaDr`, `ascensionSaDr`)
- **Blocks**: 1.2, 1.3, Phase 4

### 1.2 Extend `/api/meta` — Extended SpecStats + ClassStats
- Add to SpecStats: `ccChainPotential`, `grabCount`, `coreSaCount`, `coreFgCount`
- Add to ClassStats: `combatType`, `successionGroup`, `awakeningGroup`, `ascensionGroup`, `successionSaDr`, `awakeningSaDr`, `ascensionSaDr`
- Add API caching (getCached/setCached)
- **Blocks**: Tier Builder works correctly, Meta page advanced features

### 1.3 Schema Migration — PA Wiki fields on BdoClass
- Add columns to BdoClass: `combatType`, `successionGroup`, `awakeningGroup`, `ascensionGroup`, `successionSaDr`, `awakeningSaDr`, `ascensionSaDr`
- Also add `isAscension` boolean to BdoClass (replace hardcoded list)
- Run `bun run db:push`

---

## Phase 2: Missing UI Components — ~4h

### 2.1 Skill Compare Tool — `skill-compare-drawer.tsx` (MISSING)
- Side-by-side drawer comparing two skills
- Add `compareSkillId`, `compareOpen`, `setCompareSkill`, `setCompareOpen` to skill-store
- Add compare button to skill cards/detail drawer
- Wire into page.tsx

### 2.2 Upload Endpoint — `POST /api/upload/skills-json` (MISSING)
- Accepts JSON body of skills, upserts into DB
- Used by sync-footer "Import" button (currently 404s)
- Logs changes via change-log system

### 2.3 Skill Add-Ons in Detail Drawer (MISSING)
- API already returns `addons` field (from addonsJson)
- Add "Skill Add-Ons" section to skill-detail-drawer.tsx showing addon popularity per slot
- Show addon name, effect, and popularity votes

### 2.4 Spec Color Consistency in Detail Drawer (PARTIAL)
- Flag badges use amber/green instead of SPEC_COLORS (red/blue/yellow)
- Fix in skill-detail-drawer.tsx — use `SPEC_COLORS.awakening` etc.

---

## Phase 3: Data Page Features — ~3h

### 3.1 "Include Black Spirit (20m)" Cooldown Button (MISSING)
- Add to filter-sidebar.tsx cooldown section
- Sets maxCd to 1200 (20m) — API already supports `blackSpiritMax` in /api/ranges
- Jump button (not a smooth slider range)

### 3.2 "Asc" Button for Ascension-Only Classes (MISSING)
- For Scholar, Archer, Wukong, Shai, Seraph, Deadeye: show "Asc" button instead of S/A
- Update class-bar.tsx ClassChip component
- Use `isAscension` flag from BdoClass (after Phase 1.3)

### 3.3 Smart Effect Search (MISSING)
- Search not just skill names but also effects (damage rows, CC types, protection types, descriptions)
- Already partially works via API `q` param — verify and enhance UI hint

### 3.4 Has-Addon Toggle in Filter Sidebar (MISSING)
- Add `hasAddon` filter toggle
- API already supports `hasAddon` param
- Shows only skills with Garmoth addon data

---

## Phase 4: Meta Page Features — ~4h

### 4.1 Class Matchup Ratios (MISSING)
- Multi-select classes → show damage advantage (+5% per group counter)
- Vanguard > Crusher > Skirmisher > Vanguard (rock-paper-scissors)
- UI: multi-select class chips, show matchup matrix or ratios

### 4.2 Auto S/A/B/C/D Tier Table (MISSING)
- Auto-generate tier lists based on Meta stats per metric
- Could be a view mode in Tier Builder, or a section on Meta page
- Percentile-based: S (top 10%), A (top 30%), B (top 60%), C (top 85%), D (rest)

### 4.3 CC Chain Potential Display (MISSING after API fix)
- After Phase 1.2 adds `ccChainPotential` to API, display it on Meta cards
- Shows skills with 2+ PvP CC counters (burst-CC classes)

### 4.4 Grab Count + Core SA/FG Display (MISSING after API fix)
- After Phase 1.2, display `grabCount`, `coreSaCount`, `coreFgCount` on Meta cards
- Grabs bypass Super Armor — key PvP metric

---

## Phase 5: Calculation/Algorithm Restores — ~3h

### 5.1 Damage Special-Mode Separation (MISSING)
- Current: sums ALL damage phases
- v3.9.0: separates special modes, only counts the first damage group
- Fix in `src/lib/damage.ts` calculateDamage()
- Prevents inflated damage numbers for skills with multiple damage modes

### 5.2 Class Filter: classId + className Double Matching (MISSING)
- Current: filters by classId only
- v3.9.0: also matches className (fixes Corsair showing Kunoichi skills bug)
- Fix in `/api/skills` route

### 5.3 Lurker Turbo Mode (MISSING)
- Current: ~24 skills/min
- v3.9.0: 43 skills/min with turbo mode
- Restore in `scripts/sync-lurker.ts` — parallel requests, shorter delays

---

## Phase 6: Infrastructure — ~2h

### 6.1 API Caching (PARTIAL)
- Only `/api/ranges` has caching
- Add getCached/setCached to `/api/classes`, `/api/stats`, `/api/meta`
- Cache module already exists at `src/lib/cache.ts`

### 6.2 Documentation Gaps
- CHANGELOG.md stops at v2.0.0 — add v2.1.0 → v3.9.0 entries
- docs-page.tsx stops at v3.1.0 — add v3.2.0 → v3.9.0
- SESSION_HANDOFF.md is stale (says v2.0.0+)

### 6.3 DB Indexes (LOW)
- Add composite indexes for common filter combos
- Add baseName + isMaxRank precomputed columns (performance)

---

## Execution Order

1. **Phase 1** (Critical) → unblocks Tier Builder
2. **Phase 2** (High) → restore missing components
3. **Phase 3** (Medium) → data page polish
4. **Phase 4** (Medium) → meta page features (depends on Phase 1)
5. **Phase 5** (Medium) → calculation accuracy
6. **Phase 6** (Low) → infrastructure

**Total estimated effort**: ~19h
