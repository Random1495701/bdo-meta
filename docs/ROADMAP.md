# BDO Meta — Roadmap v4 (Phased)

> **Updated 2025-06-30. Phased into chunks suitable for single-session execution.**

## Current State (v3.0.0)

- **7,231 skills**, **7,189 enriched** (99.4%!) — lurker nearly complete
- 56 spec cards with PA Wiki data (combat type, class group, SA DR)
- Class vs class ratio feature (click 2 classes)
- 3-tab UI: Data | Meta | Docs
- 21 version tags on GitHub

---

## Phase A: Data Completion & Accuracy (1 session each)

### A1: Finish Lurker + Animation Duration Fix
- [ ] Wait for lurker to hit 100% (~100 skills remaining)
- [ ] Implement video parsing plan (ffmpeg scene detection) OR
- [ ] Document PAZ extraction workflow for user to provide frame-accurate durations
- [ ] Re-enable DPS estimate once durations are accurate
**Deliverable**: 100% enriched DB with accurate animation durations

### A2: Validation Lurker (Patch Note Checker)
- [ ] Build `scripts/patch-checker.ts` that uses agent-browser to:
  1. Visit `naeu.playblackdesert.com` news/notice pages weekly
  2. Parse patch notes for class/skill changes
  3. Compare flagged values against DB
  4. Log mismatches to a `PatchDiscrepancy` table (don't auto-change)
- [ ] Add UI banner showing pending discrepancies for review
- [ ] Add batch review/change interface in Data page
**Deliverable**: Automated patch monitoring with manual review queue

### A3: Multi-Class Skills + Flow/Core Typing
- [ ] Fix 31 multi-class skills (duplicate or fix class filter)
- [ ] Type 429 "Flow:"/"Core:" skills (add isFlow/isCore flags)
- [ ] Update filters to include Flow/Core
**Deliverable**: Complete skill classification

---

## Phase B: Meta Enhancements (1 session each)

### B1: Combo Extraction
- [ ] Use agent-browser to scrape all 31 Foundry class guide pages
- [ ] Extract PvP and PvE combo sections (may need AI parsing for embedded text)
- [ ] Store as `combosJson` field in BdoClass table
- [ ] Display in expanded meta cards (replace placeholder)
- [ ] Show separate PvP and PvE combo sections
**Deliverable**: Real combo data for all classes in Meta cards

### B2: Tier List Generator
- [ ] Auto-generate S/A/B/C/D tier lists from Meta stats
- [ ] Weighted composite score (damage + CC + protection + SA DR)
- [ ] Separate tier lists for Awakening/Succession/Ascension
- [ ] Visual tier list display with class portraits
**Deliverable**: Auto-generated tier lists per spec

### B3: Awakening vs Succession Comparison
- [ ] Side-by-side diff view per class
- [ ] Highlight which spec wins on each stat
- [ ] Show in expanded card or as a separate comparison page
**Deliverable**: Direct spec comparison tool

---

## Phase C: UI/UX Polish (1 session for all)

### C1: Icon Transparency + UI Fixes
- [ ] Batch process class icons to make backgrounds transparent (sharp/imagemagick)
- [ ] Fix video autoplay on mobile (add play button)
- [ ] Add onKeyDown to S/A/Asc buttons for keyboard activation
- [ ] Extract TabSwitcher ARIA improvements
- [ ] Collapsible filter sections with localStorage
**Deliverable**: Polished UI with transparent icons

---

## Phase D: Advanced Features (1 session each)

### D1: Skill Comparison Tool
- [ ] "Compare" button on skill cards
- [ ] Side-by-side drawer showing 2 skills with diff highlighting
**Deliverable**: Skill vs skill comparison

### D2: Search by Effect
- [ ] Unified search across CC, protection, damage, description
- [ ] Smart query parsing (e.g., "super armor knockdown" → skills with both)
**Deliverable**: Effect-based skill search

### D3: Export/Import Builds
- [ ] Allow users to import skill builds from bdocodex URLs
- [ ] Share builds via URL parameters
**Deliverable**: Build sharing system

---

## Phase E: Infrastructure (1 session for all)

### E1: Performance + Monitoring
- [ ] Add baseName + isMaxRank columns (precomputed, eliminates JS grouping)
- [ ] Composite DB indexes for common filter combos
- [ ] Lurker health monitoring (auto-restart if heartbeat stale)
- [ ] Automated weekly DB backup to JSON
**Deliverable**: Faster queries + self-healing lurker

---

## Forgotten Tasks (from audit)

| # | Task | Status | Phase |
|---|------|--------|-------|
| 1 | API caching for /api/stats (3 of 4 done) | Not started | E1 |
| 2 | Worklog gaps (Tasks 18, 20, 21, 22, 24) | Not started | — |
| 3 | Cooldown range comment stale (says 240s, actual 450s) | Not started | A3 |
| 4 | Meta disclaimer says "BS excluded" but only from damage | Not started | A3 |
| 5 | Hardcoded ascension class list in meta API (should be DB-derived) | Not started | A3 |

---

## Execution Order (Recommended)

1. **A1** — Finish lurker + fix durations (critical for data accuracy)
2. **A3** — Fix multi-class + Flow/Core (quick data quality wins)
3. **B1** — Combo extraction (high player value)
4. **C1** — UI polish (transparent icons + mobile fixes)
5. **B2** — Tier list generator (visual impact)
6. **A2** — Validation lurker (patch monitoring)
7. **B3** — Spec comparison tool
8. **D1-D3** — Advanced features (as time permits)
9. **E1** — Infrastructure (when performance becomes an issue)
