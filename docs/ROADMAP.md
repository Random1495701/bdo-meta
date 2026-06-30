# BDO Meta — Roadmap v3

> **Updated 2025-06-30 after comprehensive audit of all past conversations**
> Replaces all previous roadmaps. This is the master document.

## Current State (v2.8.0)

- **7,231 skills**, **6,781 enriched** (94%), **3,100 with video**, **3,021 with animation**
- 56 spec cards (31 classes × available specs)
- 87 official Pearl Abyss portraits (31 main + 31 awakening + 25 succession)
- 2,889 self-hosted skill icons
- 3-tab UI: Data | Meta | Docs
- Keyboard navigation, API caching, auto-refresh
- Lurker v2 with JS challenge solver + turbo mode

## What We've Built (Complete Feature List)

### Data Page
- Multi-select filtering: classes, skill types, protections, CC types
- Spec filtering: S (blue), A (red), Asc (yellow) buttons on class chips
- Max-rank filtering (only highest rank per skill shown)
- Evasion filtering (excluded by default)
- Dynamic slider ranges (percentile-based, with Black Spirit 20m jump button)
- "PvP CC only" filter
- 3 view modes: Grid (cards), List (compact rows), Table (sortable + column picker)
- Damage calculation: per-phase, total PvE + PvP, X+Y CC counter display
- PvE-only CC exclusion with warning banner
- Skill detail drawer: damage → cooldown → protection → CC → animation
- Protection icons: 💪 SA, 🛡 FG, ✦ IF
- Auto-refresh every 15s (no flicker)
- Keyboard nav: `/` search, `Esc` close, `1/2/3` switch tabs

### Meta Page
- 56 spec cards (each class×spec = separate card)
- Portrait background cards with spec-colored borders
- Stats: Avg/median PvP damage, CC skills, SA/FG/IF counts, protected %, top skill
- Sortable by all stats
- Table view with all specs side-by-side
- Cards expandable to full view with big class image + detailed stats
- "Data" button on each card → switches to Data tab with class+spec filtered
- Classes sorted alphabetically

### Docs Page
- Full version history (18+ versions)
- Data sources, overview stats
- All features documented

### Infrastructure
- Lurker v2 with JS challenge solver (get_jhash port)
- Turbo mode (43 skills/min)
- Single-instance PID lock
- API caching (/api/ranges, /api/classes, /api/meta)
- JSON DB export for backup continuity
- GitHub backup with 19 version tags
- Self-hosted icons (no bdocodex dependency for images)

---

## Phase 1: Data Accuracy (Priority: Critical)

### 1.1 Video Parsing — Animation Duration Correction
**Status**: Plan written (`docs/VIDEO_PARSING_PLAN.md`), not executed
**Problem**: Current animation durations from ffprobe include hanging time and double casts
**Solution**: Use ffmpeg scene detection to detect motion curves, identify hanging time, and detect loop points
**Effort**: 6 hours
**Alternative**: Extract from PAZ files (frame-accurate, documented in `docs/PAZ_EXTRACTION.md`)

### 1.2 PAZ File Import Support
**Status**: Documentation written, not automated
**Description**: Allow user to extract skill data from BDO game files and upload via `/api/upload/skills-json`
**Effort**: User-driven (extraction is manual), upload is automated
**Value**: Frame-accurate durations, instant updates after patches

### 1.3 Validation Lurker — Patch Note Checker
**Status**: Not started — design needed
**Description**: Automated bot that checks BDO official patch notes after each patch and flags skill changes for review
**Approach**:
1. Monitor `naeu.playblackdesert.com` for new patch notes (check weekly/after patch days)
2. Parse patch notes for class/skill changes (regex for skill names + numbers)
3. Compare flagged values against our database
4. If mismatch: log to a "review queue" (don't auto-change, let user review)
5. Notify user via UI banner
**Challenge**: BDO official site behind Incapsula bot protection — need agent-browser or headless browser
**Effort**: 8 hours

### 1.4 Multi-Class Skills Fix
**Status**: Known issue
**Description**: 31 skills with "Musa, Dosa" etc. className — duplicate or fix class filter
**Effort**: 30 min

### 1.5 Flow/Core Skill Typing
**Status**: Known issue
**Description**: 429 "Flow:" and "Core:" skills untyped
**Effort**: 30 min

---

## Phase 2: Meta Enhancements (Priority: High)

### 2.1 PvP/PvE Combos
**Status**: Research done (Foundry guides have combo notation), not integrated
**Description**: Extract combo sequences from public guides and display in expanded meta cards
**Approach**: Scrape blackdesertfoundry.com class guides, extract combo sections
**Challenge**: Combos are human-readable notation (`[SHIFT]+[F] > [S]+[LMB]`), need manual or AI parsing
**Effort**: 4 hours (31 class guides)

### 2.2 Class vs Class Ratios
**Status**: Not started — data source needed
**Problem**: BDO does not publish official class vs class matchup data. This data would need to be:
- Crowdsourced from community (requires user input system)
- Extracted from PvP tournament data (not publicly available in structured form)
- Estimated from theoretical analysis (damage + CC + protection stats)
**Approach**: Create a "Matchup Matrix" that estimates class advantages based on our existing stats:
- Damage ratio (class A avg PvP damage / class B avg PvP damage)
- CC advantage (class A CC count - class B CC count)
- Protection advantage (class A protection - class B protection)
- Composite "advantage score"
**Effort**: 4 hours for theoretical model, 8+ hours for crowdsourced system

### 2.3 Damage Resistance During Super Armor
**Status**: Not started — data source needed
**Problem**: BDO does not publish DR percentages per class. DR during SA is:
- A flat percentage based on the skill (not the class)
- Varies per skill, not per class
- Not available in bdocodex tooltips
- Only available in game files (PAZ extraction)
**Approach**: Add a `drPercent` field to the Skill schema. When user extracts PAZ data, include DR values. Display in skill detail drawer + compute class averages for Meta.
**Effort**: Schema change (30 min) + data entry (user-driven)

### 2.4 Tier List Generator
**Status**: Not started
**Description**: Auto-generate S/A/B/C/D tier lists based on Meta stats
**Effort**: 2 hours

### 2.5 Awakening vs Succession Comparison
**Status**: Not started
**Description**: Side-by-side diff view per class
**Effort**: 3 hours

---

## Phase 3: UI/UX Polish (Priority: Medium)

### 3.1 SVG Logo Conversion
**Status**: Not started
**Description**: Convert class icons (currently webp) to SVG for easier manipulation and transparency
**Challenge**: The 31 class icons are from bdocodex (59×59 webp). Converting to SVG requires either:
- Finding official SVG versions (unlikely — PA uses raster)
- Auto-tracing with tools like potrace/inkscape (quality loss)
- Manual recreation (too labor-intensive)
**Alternative**: Use the webp icons as-is but ensure transparent backgrounds (remove black bg via image processing)
**Effort**: 2 hours (batch process with sharp/imagemagick to make transparent)

### 3.2 Mobile Touch Optimization
**Status**: Partial (wheel scroll works, no touch swipe)
**Effort**: 30 min

### 3.3 Video Autoplay Toggle
**Status**: Not started
**Description**: Don't autoplay video on mobile, add play button
**Effort**: 15 min

### 3.4 Collapsible Filter Sections
**Status**: Not started
**Effort**: 1 hour

### 3.5 S/A Button Keyboard Activation
**Status**: Not started (missing onKeyDown)
**Effort**: 15 min

---

## Phase 4: Features (Priority: Low)

### 4.1 Skill Comparison Tool
**Description**: Compare two skills side-by-side
**Effort**: 2 hours

### 4.2 Search by Effect
**Description**: Unified search across CC, protection, damage, description
**Effort**: 30 min

### 4.3 Export/Import Builds
**Description**: Allow users to import skill builds from bdocodex URLs
**Effort**: 1 hour

### 4.4 Internationalization
**Description**: Language toggle (KR/DE/FR/ES)
**Effort**: 3 hours

---

## Phase 5: Infrastructure (Priority: Low)

### 5.1 Max-Rank Performance
**Description**: Add baseName + isMaxRank columns to DB
**Effort**: 2 hours

### 5.2 Database Indexing
**Effort**: 15 min

### 5.3 Automated DB Backup
**Effort**: 30 min

### 5.4 Lurker Health Monitoring
**Description**: Auto-restart lurker if heartbeat stale >10 min
**Effort**: 1 hour

---

## Forgotten Tasks from Past Conversations

1. **Session 3**: Video parsing plan written but never executed
2. **Session 4**: "Flow:"/"Core:" skills mentioned but never typed
3. **Session 7**: Multi-class skills (31) mentioned but never fixed
4. **Session 8**: API caching promised for 4 endpoints, only 3 done (missing /api/stats)
5. **Session 9**: Worklog gaps (Tasks 18, 20, 21, 22, 24 never appended)
6. **Session 10**: Cooldown range comment is stale (says 240s, actual is 450s)
7. **Session 11**: Meta page disclaimer says "BS excluded" but BS only excluded from damage, not CC/protection counts

---

## Top 10 Next Tasks (Prioritized)

| # | Task | Effort | Priority |
|---|------|--------|----------|
| 1 | **P1.1**: Video parsing (fix animation durations) | 6h | Critical |
| 2 | **P1.3**: Validation lurker (patch note checker) | 8h | Critical |
| 3 | **P2.1**: PvP/PvE combos from Foundry guides | 4h | High |
| 4 | **P2.2**: Class vs class ratio (theoretical model) | 4h | High |
| 5 | **P2.4**: Tier list generator | 2h | High |
| 6 | **P3.1**: SVG/transparent icon conversion | 2h | Medium |
| 7 | **P1.4**: Fix multi-class skills | 30m | Medium |
| 8 | **P1.5**: Type Flow/Core skills | 30m | Medium |
| 9 | **P3.3**: Video autoplay toggle | 15m | Medium |
| 10 | **P5.4**: Lurker health monitoring | 1h | Low |
