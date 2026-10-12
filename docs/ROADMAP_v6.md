# BDO Meta — Roadmap v6.0 (Post-Completion Polish)

> **Created**: 2026-07-06
> **State**: v5.9.5 · 7,038 skills · 3,193 w/ animation · 38 real Grapples · 6 ascension classes
> **Tests**: 42/42 passing · **Lint**: clean · **GitHub**: in sync · **Server**: HTTP 200
> **Previous Roadmap**: 14/14 items complete (see ROADMAP_CURRENT.md history)

---

## Focus Areas

All core roadmap items (P1-P4) are complete. This roadmap focuses on **content expansion**, **UX polish**, and **quality-of-life** improvements.

---

### Q1 — Combo Data Expansion

#### Q1.1: Expand curated combos to all 31 classes
**What**: Currently only 8 classes have curated combo data (Warrior, Sorceress, Berserker, Musa, Ninja, Lahn, Striker, Wizard). Add curated PvP/PvE combos for the remaining 23 classes based on community-known patterns.
**Classes needed**: Ranger, Tamer, Valkyrie, Kunoichi, Witch, Dark Knight, Mystic, Archer, Shai, Guardian, Hashashin, Nova, Sage, Corsair, Drakania, Woosa, Maegu, Scholar, Dosa, Deadeye, Wukong, Seraph, Maehwa
**Effort**: 3h (research + data entry)

#### Q1.2: Combo search/filter in Meta page
**What**: Add a search box and spec filter (PvP/PvE/Both) above the combo section in the Meta page so users can find specific combos quickly.
**Effort**: 1h

---

### Q2 — Mobile UX

#### Q2.1: Audit mobile layout for new features
**What**: Verify that the Skill Tree view, Radar Chart, and Combo Display all render correctly on mobile (375px width). Fix any overflow, readability, or touch-target issues.
**Effort**: 1h

#### Q2.2: Mobile filter sheet improvements
**What**: The right-side filter sidebar becomes a bottom sheet on mobile. Verify tri-state filter chips (include/exclude/off) are clearly distinguishable on small screens. Add visual legend if needed.
**Effort**: 30 min

---

### Q3 — Performance & Polish

#### Q3.1: Skill tree virtualization for large classes
**What**: Some classes have 90+ skills in the tree view. Consider virtualizing the tree sections (only render visible nodes) if performance is an issue on slower devices.
**Effort**: 2h (only if needed)

#### Q3.2: API response compression
**What**: The /api/skills response can be large (100 skills with full damage rows). Enable gzip/brotli compression at the Next.js level if not already active.
**Effort**: 30 min

#### Q3.3: Keyboard navigation in Skill Tree
**What**: Add arrow-key navigation between tree nodes (up/down to move between skills, Enter to open detail drawer). Matches the existing keyboard nav in grid/table views.
**Effort**: 1h

---

### Q4 — Data Quality (ongoing)

#### Q4.1: PvP% backfill for missing skills
**What**: 37% of skills are missing pvpDamagePercent. Most are passives/training, but ~10 active damage skills are missing PvP%. Research and backfill these from bdocodex tooltips.
**Effort**: 2h

#### Q4.2: Skill icon gap analysis
**What**: Some skills may have broken/missing icons (404s). Run a script to check all icon URLs and identify gaps. Re-download from bdocodex if possible.
**Effort**: 1h

---

## Summary

| Priority | Items | Focus |
|----------|-------|-------|
| Q1 | 2 | Combo expansion (all classes + search) |
| Q2 | 2 | Mobile UX (audit + filter improvements) |
| Q3 | 3 | Performance (virtualization + compression + keyboard nav) |
| Q4 | 2 | Data quality (PvP% + icons) |
| **Total** | **9** | |
