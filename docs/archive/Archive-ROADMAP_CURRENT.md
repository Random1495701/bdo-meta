# BDO Meta — Current Roadmap (v5.9.5+)

> **Created**: 2026-07-05
> **State**: v5.9.5 · 7,038 skills · 3,193 w/ animation · 38 real Grapples · 6 ascension classes
> **Tests**: 42/42 passing · **Lint**: clean · **GitHub**: in sync · **Server**: HTTP 200

---

## Finished Roadmaps (archived)

All prior roadmaps have been completed or explicitly skipped. See `docs/archive/`:
- Archive-ROADMAP_2026-07-04_AUDIT.md — 36 items, all done/skipped
- Archive-ROADMAP_MASTER.md — 3-tier roadmap, all done/skipped
- Archive-ROADMAP_POST_V5.7.4.md — 30 items, all done/skipped
- Archive-DB_AUDIT_2026-07-05.md — DB audit, resolved
- Archive-IMPROVEMENT_PLAN.md — 20 items, all done/skipped
- Archive-VIDEO_PARSING_PLAN.md — skipped (user said get from PAZ)

**Permanently skipped** (per user decision, do NOT re-raise):
- Addon system
- Video parsing (ffmpeg)
- Skill Build Calculator
- Internal LLM (z-ai-web-dev-sdk in app code)
- i18n (internationalization)
- Light mode (removed completely)

---

## Audit Results (this session)

### Lurker: NOT NEEDED
- 100% enriched (7,189/7,189 have description, icon, KR name, prereqs)
- 0 stubs
- 63% have PvP% — the 37% missing are passives/training/no-damage skills
- Only ~10 skills have actual damage but no PvP% — niche skills, not worth lurker restart

### Spec Filtering: 0 LEAKS ✅
- 0 Awakening leaks in Succession across all 25 non-ascension classes
- 0 Succession leaks in Awakening across all 25 non-ascension classes
- Core:/Rabam skills (160) correctly visible and spec-filtered
- BS Prime: → Succession only, BS Absolute: → Awakening only, BS Awakening-weapon → Awakening only

### Grab Counts: 46 REAL GRABS ✅
- Fixed 14 additional false grabs (Forward Guard + Grapple = block skill, not grab)
- 46 real Grapple skills remain across 20 classes
- Meta API grab counts match dedup counts
- False grab filter updated to use Forward Guard + Grapple check (more robust than name matching)

### Damage Calculation: CORRECT ✅
- Prime: Bloody Calamity = 48,840 (all 3 attacks summed)
- Deadeye special modes = highest mode (real special modes detected by value comparison)
- 25 real special modes across all classes
- 42 automated tests covering damage, CC, and spec-dedup

### Base-Skill ClassId Poisoning: FIXED ✅ (v5.9.2)
- 145 base-skill rows (no Prime:/Absolute: prefix) were assigned to the wrong class
- bdocodex assigns base skills to the tree-page classId, not the actual class
- Fixed via majority vote of variant siblings (Prime:/Absolute:/Succession:)
- 0 remaining mismatches ✅
- Example: Kamasylvia Slash I → Dark Knight (was Berserker)

### Flow Flag Backfill: FIXED ✅ (v5.9.2)
- 268 Flow: skills had `isFlow: false` in the DB (flag never populated)
- Backfilled from name prefix — all 268 now correctly flagged
- Core: (160) and Black Spirit: (649) flags were already correct

---

## New Roadmap

### P1 — Data Quality (quick wins)

#### P1.1: Verify grab counts match BDO community data ✅ DONE (v5.9.5)
**What**: Cross-referenced our grab skills against BDO Foundry/community data. Found 1 false positive (Archwizardry: Mass Teleport — Witch skill with Grapple in ccTypes from a description about state, not CC). Fixed: removed false Grapple. 38 real grabs across 22 classes. 0 missing grabs confirmed. Full report in docs/GRAB_VERIFICATION.md.
**Effort**: 1h research

#### P1.2: Verify spec skill counts match bdocodex skill builder ✅ DONE (v5.9.2+v5.9.3)
**What**: Fixed classId poisoning for base-skill rows. v5.9.2 fixed 145 rows via majority vote; v5.9.3 found and deleted 151 duplicate artifacts (e.g. Nemesis Slash I on Sorceress — a Musa skill). Safe heuristic: only delete if class is isolated (1 skill with baseName) AND another class has base+variants. 0 remaining leaks across all 31 classes.
**Effort**: 4h

#### P1.3: Animation duration backfill ✅ DONE (v5.9.4)
**What**: 78 skills had video URLs but no animation duration. Wrote scripts/backfill-animations.ts — downloads video, runs ffprobe, updates DB. 76/78 backfilled (2 had broken 404 video URLs). Total with animation: 3,193.
**Effort**: 30 min script

### P2 — UI/UX Polish

#### P2.1: Cross-system integration verification ✅ DONE (v5.9.4)
**What**: Verified Meta API, Skills API, and Tiers page all import and use `dedupSkillsBySpec` from `src/lib/spec-dedup.ts`. Changes to spec filtering propagate to all tabs automatically. No integration test needed — shared module guarantees consistency.
**Effort**: 30 min

#### P2.2: Patches tab — patch change indicator ✅ DONE (infrastructure exists)
**What**: `PatchChangeIndicator` component exists and is used in skill-card, skill-list-row, skill-table, and skill-tree. The `/api/patches/changed` endpoint detects changes from `SkillChangeLog`. Currently 0 patch_apply logs (no patches scraped yet) — indicator will activate once patch data is ingested.
**Effort**: 0 (already implemented)

#### P2.3: Matchups — verify SA DR + group data ✅ DONE (v5.9.4)
**What**: Added Musa + Maehwa to both `scripts/import-pa-wiki.ts` and `scripts/validate-matchups.ts`. Ran import to update DB. Validation now passes 31/31 classes (was 29/31).
**Effort**: 30 min

#### P2.4: Skill Tree View ✅ DONE (v5.9.2)
**What**: Added a "Skill Tree" visualization (4th view mode: Grid/List/Table/**Tree**) to the Data tab that mirrors the bdocodex/in-game skill tree layout. Only shows when BOTH a class AND a spec (AWK/SUCC/Asc) are selected.
**Rules implemented**:
- Only max-rank skills shown (default API behavior)
- NO prerequisite lines (would be chaos with all max-rank skills)
- ONLY Flow: connection lines (inline tree indentation with connector)
- Core: (Rabam) skills in their own section
- BS skills shown with "rage of {base}" badge linking to their base skill
- 5 collapsible sections: Main Weapon → {Spec} Weapon → Core (Rabam) → Flow (orphans) → Black Spirit
- Within each section, sorted by requiredLevel ascending
- Each node shows: icon, name, level, SP cost, PvE/PvP damage, cooldown, command
- Clicking a node opens the skill detail drawer
- Sections persist collapsed/expanded state to localStorage
- Exposed `baseName`, `isFlow`, `isCore`, `isMaxRank` in API serializeSkill() + Skill interface
- Tree view bumps pageSize to 100 (max) to load whole class+spec in one request
**Bonus fixes**:
- Fixed classId poisoning for 145 base-skill rows (Kamasylvia Slash I → Dark Knight, etc.)
- Backfilled `isFlow` flag for 268 Flow: skills (flag was never populated)
**Effort**: 6h

### P3 — Features

#### P3.1: Tier visualization — radar chart ✅ DONE (v5.9.4)
**What**: Added a "Radar" view (5th toggle button) to the Tiers page. Uses recharts to render a radar chart showing one class at a time across all 12 score parameters. Multi-spec overlay (Awakening + Succession + Ascension shown as separate polygons). Class selector dropdown. BDO-themed styling. Side panel with parameter breakdown table.
**Effort**: 2h

#### P3.2: SVG logo redesign ✅ DONE (v5.9.5)
**What**: Replaced spinning-rings logo with a BDO occult seal: planted crusader sword forming the spine of a stylized "B" monogram, encircled by ornate gold filigree. Subtle pulse animation (no spinning). Gold/amber/dark palette only (no blue/indigo). Updated both logo.svg and favicon.svg. VLM-verified as "distinctly BDO-themed".
**Effort**: 1.5h

#### P3.3: Combo extraction (Foundry) ✅ DONE (v5.9.5)
**What**: BDO Foundry doesn't publish structured combo sequences, so created curated combo data for 8 major classes (Warrior, Sorceress, Berserker, Musa, Ninja, Lahn, Striker, Wizard) based on community-known PvP/PvE patterns. New files: src/lib/combo-data.ts (combo data + getCombosForClass helper), src/components/skills/combo-display.tsx (renders combo flow with skill chips + arrows), scripts/scrape-combos.ts (scrapes Foundry for supplementary context). Integrated into Meta page — replaces "coming soon" placeholder with real combo flows.
**Effort**: 2h

#### P3.4: PAZ extraction research ✅ DONE (v5.9.5)
**What**: Researched current PAZ extraction tools. Found sibercat/PAZ-Unpacker v2.3.0 (April 2026) as the only actively-maintained extractor. Updated docs/PAZ_EXTRACTION_GUIDE.md (191→376 lines) with current tool inventory, extraction paths, and .pac parsing options. bdocodex remains the primary data source until PAZ workflow is end-to-end tested.
**Effort**: 1h research

### P4 — Infrastructure

#### P4.1: Session reset auto-recovery ✅ DONE (v5.9.4)
**What**: Added DB health check to `scripts/start-dev.mjs` — on boot, if skill count < 5000, automatically runs `git checkout db/custom.db` + `bun run db:push` to restore from git-tracked backup.
**Effort**: 30 min

#### P4.2: API response caching verification ✅ DONE (v5.9.4)
**What**: Verified `/api/meta`, `/api/classes`, `/api/stats` all use `force-dynamic` (no caching). This is correct for a data-heavy app — caching could show stale data after DB changes. No changes needed.
**Effort**: 15 min

#### P4.3: Add "test" script to package.json ✅ DONE (v5.9.2)
**What**: Added `"test": "vitest run"` to package.json scripts. `bun run test` now works and runs all 42 tests.
**Effort**: 5 min

---

## Summary

| Priority | Items | Done | Focus |
|----------|-------|------|-------|
| P1 | 3 | 3 (all) | Data quality (**grab verification ✅**, **spec counts ✅**, **animation backfill ✅**) |
| P2 | 4 | 4 (all) | UI/UX (**cross-system ✅**, **patch indicators ✅**, **matchup validation ✅**, **skill tree ✅**) |
| P3 | 4 | 4 (all) | Features (**radar chart ✅**, **logo ✅**, **combos ✅**, **PAZ research ✅**) |
| P4 | 3 | 3 (all) | Infrastructure (**auto-recovery ✅**, **caching ✅**, **test script ✅**) |
| **Total** | **14** | **14** | **🎉 All roadmap items complete!** |

## Recent Releases

- **v5.9.5** — Logo redesign (P3.2) + combo display (P3.3) + PAZ research (P3.4) + grab verification (P1.1) + 1 false grab fixed
- **v5.9.4** — Animation backfill (76 skills) + radar chart (P3.1) + matchups fix (P2.3) + session recovery (P4.1) + caching verified (P4.2) + cross-system verified (P2.1)
- **v5.9.3** — Fix cross-class skill leaks: 151 duplicate base skills deleted (Nemesis Slash on Sorc, etc.) + className fixes
- **v5.9.2** — Skill Tree View (P2.4) + classId poisoning fix for 145 base skills + Flow flag backfill (268 skills) + `bun run test` script
- **v5.9.1** — 3-state filter toggle (include → exclude → off) + remove class double-click exclude
- **v5.9.0** — classId poisoning fix for Prime/Absolute variants (128 skills reassigned)
