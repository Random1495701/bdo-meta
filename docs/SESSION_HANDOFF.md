# Session Handoff — BDO Meta Current State

> Last updated: 2026-07-05

## Current Version
v5.5.3 (auto-derived from git tags via `src/lib/version.ts`)

## What's Working
- 8 tabs: Data, Meta, Matchups, Tiers, Patches, Sessions, Dmg Calc, Docs
- 7,189 skills in DB (all enriched, 0 stubs except 10)
- 3,471 maxRank skills
- 31 classes with correct PA Wiki data (spec-dependent groups, SA DR)
- 6 ascension classes (Archer, Shai, Scholar, Deadeye, Wukong, Seraph)
- Shared dedup module (`src/lib/spec-dedup.ts`) used by Data/Meta/Tiers
- DB-level max-rank filtering (isMaxRank column)
- Grab logic with prerequisite-based replacement
- False grab fix (15 block skills corrected, Q-block filter in meta route)
- 82 real Grapple skills across 20 classes
- Damage Calculator v2 with validated PvP formula
- Spec-separated matchups (31 rows with pin + group filter)
- Arena of Solare 3v3 selector
- Tier list with 4 view modes + 13 weighted parameters
- Version dropdown (auto-derived from git tags)
- Error boundary with reset button
- Video autoplay OFF (no bdocodex sniping)
- Lurker stop button (always visible)
- Sort + filter persistence via localStorage (sort/viewMode only — filter state needs T2.1)
- PvP DPC as primary metric (PvE DPC kept in API)
- Theme toggle (dark/light)
- Patch change arrows in Data tab
- Spec comparison modal (AWK vs SUCC)
- Session reset auto-detection banner
- DB in git (survives session resets)
- DB export regenerated (7,189 skills, 21.9MB)
- Lean app: No internal LLM — session screenshot parsing uses external free AI paste-JSON flow

## Known Issues
1. **10 stub skills** need enrichment
2. **PvP % missing for 37%** of skills (2,643)
3. **Prerequisite chain incomplete** (3,928 skills missing prereqs)
4. **PAZ tools unavailable** (BDOToolkit/UnPAZ repos gone)
5. **Lurker not running** (needed for future patches + backfill)
6. **No automated tests**
7. **Filter state lost on reload** (only sort/viewMode persist)

## Key Files
- `src/lib/spec-dedup.ts` — Shared dedup module (Data/Meta/Tiers all use this)
- `src/lib/version.ts` — Auto-derived version from git tags
- `src/components/skills/session-reset-banner.tsx` — Auto-detects session resets
- `scripts/sync-version.ts` — Syncs version.ts with git tags
- `scripts/restore-db.ts` — Auto-runs PA Wiki import + compute-max-rank after restore
- `docs/ROADMAP_MASTER.md` — 3-tier roadmap (36 items)
- `docs/SPEC_DEDUP_LOGIC.md` — Spec logic documentation
- `docs/OCR_VLM_PLAN.md` — Lean OCR approach

## How to Verify This Doc Isn't Lying
```bash
git tag | sort -V | tail -1          # Should show v5.5.3 or higher
bun -e "const{db}=require('./src/lib/db');db.skill.count().then(c=>console.log(c))"  # Should show ~7189
curl -s http://localhost:3000/api/stats | head -c 100  # Should return JSON
```
