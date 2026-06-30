# BDO Meta — Roadmap

> **Improvement plan and feature roadmap for BDO Meta.**
> Last updated: 2025-06-30

## Current State (v2.1.0)

### What Works
- **Data page**: 7,231 skills browsable with multi-select filters, 3 view modes (grid/list/table), spec filtering (S/A/Asc), damage calculation, CC counters, animation durations
- **Meta page**: Per-class stats for all 3 specs (Awakening/Succession/Ascension), sortable cards + table view, class icons
- **Lurker**: Background sync daemon with JS challenge solver, enriching ~1,700/7,231 skills
- **GitHub backup**: https://github.com/Random1495701/bdo-meta with 12 version tags
- **Self-hosted assets**: 31 class icons, BDO-themed UI

### What's Missing
- Only 1,700/7,231 skills enriched (23%) — lurker still running
- No combo data from guides
- No skill build calculator
- No character portraits (using small class icons)
- No mobile touch optimization for class bar

---

## Phase 1: Data Completeness (Priority: High)

### 1.1 Finish Lurker Enrichment
**Status**: In progress (1,700/7,231 = 23%)
**ETA**: ~8 hours of lurker runtime
**Blocker**: bdocodex rate limiting (JS challenge solver works but slows throughput)

### 1.2 Import Garmoth Addon Data
**Status**: Not started
**Description**: `api.garmoth.com/api/skill-addons` is fully open and returns 927 skills with addon popularity data. Single 312KB request, no rate limit.
**Effort**: 1 hour
**Value**: Addon popularity per skill — shows what real players pick

### 1.3 Discover Missing Skill IDs
**Status**: Not started
**Description**: bdocodex sitemap has 29,005 skill URLs vs our 7,231. The missing ~21,774 are event/life/mount skills.
**Effort**: 30 min (download sitemap + insert IDs)
**Value**: Complete skill coverage

### 1.4 PAZ File Import
**Status**: Documentation written (`docs/PAZ_EXTRACTION.md`), not implemented
**Description**: User can extract skill data from BDO game files and upload via `/api/upload/skills-json`
**Effort**: User-driven (extraction is manual, upload is automated)
**Value**: Frame-accurate animation durations, instant updates after patches

---

## Phase 2: Meta Page Enhancements (Priority: High)

### 2.1 Class Portraits
**Status**: Not started
**Description**: Download full character class portraits from Pearl Abyss/bdocodex. Currently using 32x32 class icons.
**Plan**: Download from bdocodex skillbuilder page (larger class images)
**Effort**: 1 hour
**Value**: Better visual presentation in Meta cards

### 2.2 Combo Integration
**Status**: Research done (Foundry guides have combo notation)
**Description**: Extract PvP/PvE combos from blackdesertfoundry.com class guides and display in Meta page
**Challenge**: Combos are human-readable notation (`[SHIFT]+[F] > [S]+[LMB]`), not structured data
**Plan**: Parse Foundry guide pages, extract combo sections, store as text with class association
**Effort**: 3 hours (31 class guides to scrape)
**Value**: Players can see recommended combos per class

### 2.3 Tier List Generator
**Status**: Not started
**Description**: Auto-generate tier lists based on Meta stats (damage, CC, protection)
**Plan**: Rank classes by each stat, show S/A/B/C/D tiers
**Effort**: 2 hours
**Value**: Quick visual comparison

### 2.4 Spec Comparison Tool
**Status**: Not started
**Description**: Side-by-side comparison of Awakening vs Succession vs Ascension for a single class
**Plan**: Click a class card → opens detail view with all 3 specs compared skill-by-skill
**Effort**: 3 hours
**Value**: Players deciding which spec to play

---

## Phase 3: Data Page Enhancements (Priority: Medium)

### 3.1 Skill Build Calculator
**Status**: Not started
**Description**: Select a class + spec, allocate skill points, see total SP used, save/share builds
**Effort**: 6 hours
**Value**: Highest-requested feature from BDO players

### 3.2 Skill Comparison Tool
**Status**: Not started
**Description**: Compare two skills side-by-side with diff highlighting
**Effort**: 2 hours

### 3.3 Search by Effect
**Status**: Not started
**Description**: Unified search across CC, protection, damage rows, and description
**Effort**: 30 min

### 3.4 Keyboard Navigation
**Status**: Not started
**Description**: `/` focuses search, `Esc` closes drawer, arrows navigate, `Enter` opens skill
**Effort**: 1 hour

### 3.5 Collapsible Filter Sections
**Status**: Not started
**Description**: Make filter sidebar sections collapsible, remember state in localStorage
**Effort**: 1 hour

---

## Phase 4: Video/Animation Improvements (Priority: Medium)

### 4.1 Video Parsing Implementation
**Status**: Plan written (`docs/VIDEO_PARSING_PLAN.md`), not executed
**Description**: Use ffmpeg scene detection to detect double casts and hanging time in preview videos
**Effort**: 6 hours
**Value**: More accurate animation durations

### 4.2 Skill Icon Caching
**Status**: Not started
**Description**: Self-host ~3,000 skill icons (like we did for class icons) to avoid bdocodex dependency
**Effort**: 1 hour (via lurker)
**Value**: Icons always load, even when bdocodex is rate-limiting

---

## Phase 5: Infrastructure (Priority: Low)

### 5.1 API Caching
**Status**: Not started
**Description**: Add in-memory caching for `/api/classes`, `/api/ranges`, `/api/stats`, `/api/meta`
**Effort**: 30 min
**Value**: Faster page loads

### 5.2 Max-Rank Performance
**Status**: Working but slow for large result sets
**Description**: Add `baseName` + `isMaxRank` columns to DB (precomputed on sync)
**Effort**: 2 hours (schema change + migration)
**Value**: Eliminates JS grouping, faster queries

### 5.3 Database Indexing
**Status**: Basic indexes exist
**Description**: Add composite indexes for common filter combinations
**Effort**: 15 min

### 5.4 Lurker Health Monitoring
**Status**: Manual (check footer)
**Description**: Auto-restart lurker if heartbeat is stale >10 min
**Effort**: 1 hour

### 5.5 Automated DB Backup
**Status**: Manual (git commits)
**Description**: Cron job that exports DB to JSON weekly and commits
**Effort**: 30 min

---

## Phase 6: Polish (Priority: Low)

### 6.1 Mobile Touch Optimization
**Status**: Partial (wheel scroll works, no touch swipe)
**Description**: Add touch event handlers for class bar swipe scrolling
**Effort**: 30 min

### 6.2 Dark/Light Theme Toggle
**Status**: Dark only
**Description**: Add a "parchment" light theme for accessibility
**Effort**: 2 hours

### 6.3 Internationalization
**Status**: English only
**Description**: Add language toggle (KR/DE/FR/ES) using bdocodex locale endpoints
**Effort**: 3 hours

### 6.4 Export/Import Builds
**Status**: Export exists, no import
**Description**: Allow users to import skill builds from bdocodex URLs
**Effort**: 1 hour

---

## Summary

| Phase | Items | Effort | Priority |
|-------|-------|--------|----------|
| P1 — Data Completeness | 4 | ~10h | High |
| P2 — Meta Enhancements | 4 | ~10h | High |
| P3 — Data Page Features | 5 | ~10h | Medium |
| P4 — Video/Icons | 2 | ~7h | Medium |
| P5 — Infrastructure | 5 | ~5h | Low |
| P6 — Polish | 4 | ~7h | Low |
| **Total** | **24** | **~49h** | |

### Top 5 Recommended Next Steps
1. **P1.2**: Import Garmoth addon data (1h, high value, easy)
2. **P2.1**: Download class portraits (1h, visual improvement)
3. **P2.2**: Extract Foundry combos (3h, high player value)
4. **P3.1**: Skill build calculator (6h, most requested feature)
5. **P4.2**: Self-host skill icons (1h, fixes broken icons)
