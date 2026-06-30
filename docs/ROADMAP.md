# BDO Meta — Roadmap v2

> **Updated 2025-06-30 after comprehensive project audit (Task 30)**
> Replaces the previous `docs/ROADMAP.md`

## Current State (v2.6.0)

- **7,231 skills**, **4,019 enriched** (55%), **1,813 with video**, **1,753 with animation**
- 56 spec cards across 31 classes × 3 specs
- 87 official Pearl Abyss portraits
- 2,889 self-hosted skill icons
- 800 skills with Garmoth addon data
- 17 version tags (v1.0.0 → v2.6.0)

## Audit Findings (Task 30)

### Forgotten Tasks (7 found)
1. **Black Spirit cooldown button missing** from filter sidebar (was in v1.9.0, lost in refactor)
2. **Garmoth addon data invisible in UI** — 725 skills have addonsJson but detail drawer doesn't show it
3. **API caching only on /api/ranges** (promised for 4 endpoints)
4. **Spec colors inconsistent in detail drawer** — uses old amber/green instead of red/blue
5. **No "Asc" button on class chips** for ascension-only classes
6. **Worklog gaps** — Tasks 18, 20, 21, 22, 24 missing from worklog
7. **ROADMAP.md stale** — lists completed items as "not started"

### UX/UI Issues (16 found — top 5)
1. Tab switcher JSX duplicated 3× — needs extraction to component
2. S/A buttons missing onKeyDown for keyboard activation
3. Meta spec cards not clickable — no drill-down to Data tab
4. Video autoplays on drawer open — bandwidth-heavy on mobile
5. No keyboard navigation (/, Esc, arrows, Enter)

---

## Phase 1: Fix Forgotten Tasks (Priority: Critical)

### 1.1 Restore Black Spirit Cooldown Button
**Effort**: 30 min | **Status**: Not started
Add "Include Black Spirit (20m)" button back to filter sidebar cooldown section.

### 1.2 Fix Spec Colors in Detail Drawer
**Effort**: 15 min | **Status**: Not started
Update skill-detail-drawer.tsx flag badges to use SPEC_COLORS (red/blue/yellow) instead of hardcoded amber/green.

### 1.3 Expose Garmoth Addon Data in Detail Drawer
**Effort**: 2 hours | **Status**: Not started
Add "Skill Add-Ons" section to detail drawer showing addon popularity per slot from addonsJson.

### 1.4 Add "Asc" Button to Class Chips
**Effort**: 1 hour | **Status**: Not started
For ascension-only classes (Scholar, Archer, Wukong, Shai, Seraph, Deadeye), show an "Asc" button instead of S/A.

### 1.5 Apply API Caching to All Endpoints
**Effort**: 30 min | **Status**: Not started
Add getCached/setCached to /api/classes, /api/stats, /api/meta.

---

## Phase 2: Meta Page Enhancements (Priority: High)

### 2.1 Top PvP Damage Skill ✓ DONE
Added to Meta API + cards + table. Shows the highest PvP damage skill per spec.

### 2.2 DPS Estimate ✓ DONE
Added: avgPvpDamage / avgAnimationDuration. Shows damage-per-second estimate per spec.

### 2.3 Protected Coverage % ✓ DONE
Added: % of skills with any protection (SA/FG/IF) per spec.

### 2.4 Make Meta Cards Clickable
**Effort**: 1 hour | **Status**: Not started
Click a spec card → switches to Data tab with class + spec pre-filtered.

### 2.5 Awakening vs Succession Comparison
**Effort**: 3 hours | **Status**: Not started
Side-by-side diff view per class showing which spec wins on each stat.

### 2.6 CC Chain Potential
**Effort**: 30 min | **Status**: Not started
Count skills with 2+ PvP CC counters (can fill the immunity bar in one combo).

### 2.7 Addon Popularity Leaderboard
**Effort**: 2 hours | **Status**: Not started
Top 10 most popular addons per class from Garmoth data.

### 2.8 Tier List Generator
**Effort**: 2 hours | **Status**: Not started
Auto-generate S/A/B/C/D tier lists based on Meta stats.

---

## Phase 3: Data Page Enhancements (Priority: Medium)

### 3.1 Skill Build Calculator
**Effort**: 6 hours | **Status**: Not started
Select class + spec, allocate SP, see total, save/share builds.

### 3.2 Keyboard Navigation
**Effort**: 1 hour | **Status**: Not started
`/` focuses search, `Esc` closes drawer, arrows navigate, `Enter` opens skill.

### 3.3 Extract Tab Switcher Component
**Effort**: 30 min | **Status**: Not started
DRY the 3× duplicated tab switcher, add ARIA tab semantics.

### 3.4 Video Autoplay Toggle
**Effort**: 15 min | **Status**: Not started
Don't autoplay video on mobile; add play button instead.

### 3.5 Collapsible Filter Sections
**Effort**: 1 hour | **Status**: Not started
Make filter sections collapsible, remember state in localStorage.

---

## Phase 4: Data Quality (Priority: Medium)

### 4.1 Investigate Lurker Stall
**Effort**: 30 min | **Status**: Not started
Lurker at 55% with ~1 skill/min throughput. Check if bdocodex is throttling.

### 4.2 Multi-Class Skills
**Effort**: 30 min | **Status**: Not started
31 skills with "Musa, Dosa" etc. className — duplicate or fix class filter.

### 4.3 Flow/Core Skill Typing
**Effort**: 30 min | **Status**: Not started
429 "Flow:" and "Core:" skills untyped — add isFlow/isCore flags.

### 4.4 Video Parsing Implementation
**Effort**: 6 hours | **Status**: Plan written, not executed
Use ffmpeg scene detection for accurate animation durations.

---

## Phase 5: Infrastructure (Priority: Low)

### 5.1 Max-Rank Performance
**Effort**: 2 hours | **Status**: Not started
Add baseName + isMaxRank columns to DB (precomputed on sync).

### 5.2 Database Indexing
**Effort**: 15 min | **Status**: Not started
Add composite indexes for common filter combinations.

### 5.3 Automated DB Backup
**Effort**: 30 min | **Status**: Not started
Cron job that exports DB to JSON weekly and commits.

### 5.4 Lurker Health Monitoring
**Effort**: 1 hour | **Status**: Not started
Auto-restart lurker if heartbeat is stale >10 min.

---

## Phase 6: Polish (Priority: Low)

### 6.1 Mobile Touch Optimization
### 6.2 Dark/Light Theme Toggle
### 6.3 Internationalization (KR/DE/FR/ES)
### 6.4 Export/Import Builds

---

## Summary

| Phase | Items | Effort | Priority |
|-------|-------|--------|----------|
| P1 — Fix Forgotten Tasks | 5 | ~4h | Critical |
| P2 — Meta Enhancements | 8 | ~10h | High |
| P3 — Data Page Features | 5 | ~9h | Medium |
| P4 — Data Quality | 4 | ~7h | Medium |
| P5 — Infrastructure | 4 | ~4h | Low |
| P6 — Polish | 4 | ~7h | Low |
| **Total** | **30** | **~41h** | |

### Top 10 Next Tasks (Prioritized)
1. **P1.2**: Fix spec colors in detail drawer (15 min)
2. **P1.1**: Restore Black Spirit cooldown button (30 min)
3. **P1.5**: API caching for all endpoints (30 min)
4. **P1.4**: Add "Asc" button for ascension-only classes (1 hour)
5. **P2.4**: Make Meta cards clickable → Data tab (1 hour)
6. **P2.6**: CC chain potential metric (30 min)
7. **P3.3**: Extract Tab Switcher component (30 min)
8. **P1.3**: Expose Garmoth addon data in drawer (2 hours)
9. **P4.1**: Investigate lurker stall (30 min)
10. **P3.2**: Keyboard navigation (1 hour)
