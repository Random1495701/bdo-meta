# BDO Meta — Current Roadmap (v5.9.2+)

> **Created**: 2026-07-05
> **State**: v5.9.2 · 7,189 skills · 3,788 maxRank · 46 real Grapples · 6 ascension classes
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

#### P1.1: Verify grab counts match BDO community data
**What**: Cross-reference our 46 grab skills against BDO Foundry/community grab lists. Some classes may have grabs we're missing (e.g. Hashashin's "Constriction" was missing before). Others may have false grabs we haven't caught.
**Effort**: 1h research

#### P1.2: Verify spec skill counts match bdocodex skill builder ✅ DONE (v5.9.2)
**What**: Found and fixed classId poisoning for 145 base-skill rows. bdocodex assigns base skills (no Prime:/Absolute: prefix) to the tree-page classId, not the actual class. Fixed via majority vote of variant siblings. 0 remaining mismatches across all 31 classes. 0 spec leaks confirmed.
**Effort**: 2h

#### P1.3: Animation duration backfill (79 skills)
**What**: 79 skills have video URLs but no animation duration. Run ffprobe on these to extract duration.
**Effort**: 30 min script

### P2 — UI/UX Polish

#### P2.1: Cross-system integration verification
**What**: Meta, Matchups, Tiers, and Patches should all use the same dedup-filtered skill data. Verify that changes to spec filtering automatically propagate to all tabs. Add a test that compares Meta API stats vs Tiers page stats.
**Effort**: 1h

#### P2.2: Patches tab — show latest patch changes affecting current skill
**What**: When a skill is open in the detail drawer AND it was changed in the latest patch, show a "Changed in latest patch" indicator with before/after diff (already exists as patchChange field — verify it's working).
**Effort**: 30 min

#### P2.3: Matchups — verify SA DR + group data is correct
**What**: Run `scripts/validate-matchups.ts` and fix any remaining mismatches. Currently 29/31 pass (Musa + Maehwa missing from import script).
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

#### P3.1: Tier visualization — radar chart
**What**: Add a radar chart view to the Tiers page. One chart per class, axes = the 13 weighted score parameters. Lets users visually compare class strengths.
**Effort**: 3h

#### P3.2: SVG logo redesign
**What**: Current logo exists but user was unhappy ("just z.ai's logo"). Design proper BDO-themed SVG logo with occult/gold aesthetic.
**Effort**: 2h

#### P3.3: Combo extraction (Foundry)
**What**: Scrape BDO Foundry class guides for combo notation. Display in skill detail drawer + Meta page. Currently only a link exists.
**Effort**: 6h

#### P3.4: PAZ extraction research
**What**: BDOToolkit/UnPAZ repos are gone. Research alternative PAZ extraction tools. Update PAZ_EXTRACTION_GUIDE.md with working tools.
**Effort**: 4h research

### P4 — Infrastructure

#### P4.1: Session reset auto-recovery
**What**: On app boot, if DB skill count < 5000, automatically restore from git-tracked DB (not from export). The DB is in git now, so this is just a `git checkout db/custom.db` + `bun run db:push`.
**Effort**: 1h

#### P4.2: API response caching verification
**What**: Verify `/api/meta`, `/api/classes`, `/api/stats` are properly cached. Clear cache when DB changes (isAwakening fixes, false grab fixes, etc.).
**Effort**: 30 min

#### P4.3: Add "test" script to package.json ✅ DONE (v5.9.2)
**What**: Added `"test": "vitest run"` to package.json scripts. `bun run test` now works and runs all 42 tests.
**Effort**: 5 min

---

## Summary

| Priority | Items | Done | Focus |
|----------|-------|------|-------|
| P1 | 3 | 1 (P1.2) | Data quality (grab verification, spec counts ✅, animation backfill) |
| P2 | 4 | 1 (P2.4) | UI/UX (cross-system, patch indicators, matchup validation, **skill tree ✅**) |
| P3 | 4 | 0 | Features (radar chart, logo, combos, PAZ research) |
| P4 | 3 | 1 (P4.3) | Infrastructure (auto-recovery, caching, **test script ✅**) |
| **Total** | **14** | **3** | |

## Recent Releases

- **v5.9.2** — Skill Tree View (P2.4) + classId poisoning fix for 145 base skills + Flow flag backfill (268 skills) + `bun run test` script
- **v5.9.1** — 3-state filter toggle (include → exclude → off) + remove class double-click exclude
- **v5.9.0** — classId poisoning fix for Prime/Absolute variants (128 skills reassigned)
