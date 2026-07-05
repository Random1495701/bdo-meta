# BDO Meta — Roadmap & Improvements (Post-v5.7.4)

> **Current state**: v5.7.4 · 7,189 skills · 3,043 maxRank · 82 Grapples · 6 ascension classes
> **Server**: HTTP 200 · **GitHub**: in sync · **Lint**: clean · **0 TS errors in src/**

---

## What's Been Done (v5.5.0 → v5.7.4)

- DB stored in git (survives resets)
- Export regenerated + sanity check script
- Version auto-derived from git tags
- Session reset auto-detection banner
- Filter persistence (classIds, specs, q, excludedClassIds → localStorage)
- Collapsible filter sidebar sections
- Mobile touch swipe for class bar
- Theme toggle (dark/light) with CSS var BDO utility classes
- Data provenance badges in detail drawer
- Patch diff visualization (before/after)
- Patch archive API (?all=true)
- Session-specific OCR prompts (AoS/NW/WotR)
- Matchup validation script
- Crash-test suite
- CHANGELOG backfilled (64 versions)
- Combo Guide link (Foundry)
- Spec comparison modal (AWK vs SUCC)
- /api/upload/skills-json restored
- BSR skills max-rank fix (only highest rank shows)
- BSR spec filtering (BS Prime→Succ, BS Abs→Awk, BS Awk-weapon→Awk only)
- Damage calculation fix (sums all hits, detects real special modes by value comparison)
- isAwakening flag fixes (716+318+122 skills corrected)
- className/classId mismatch fix (1058 skills)
- 15 false grabs fixed (block/guard skills)
- 0 Awakening leaks in Succession across all classes
- Stamina cost extracted + displayed in detail drawer

---

## Tier 1 — Critical Stability (do first)

### T1.1: `.env` survival on git reset
**Status**: ✅ Fixed this session — `start-dev.mjs` now auto-creates `.env` if missing
**Lesson**: Any file in `.gitignore` is lost on `git reset --hard`. The `.env` file needs to be auto-created by the startup script.

### T1.2: Health check script updates
**What**: Update `scripts/health-check.sh` to verify `.env` exists and `DATABASE_URL` is set. Add to `start-dev.mjs` as a pre-flight check.
**Effort**: 30 min

### T1.3: DB-export regeneration after DB changes
**What**: After any DB modification (isAwakening fix, className fix, etc.), the export must be regenerated. Currently this is manual. Add a post-DB-change hook or reminder.
**Effort**: 1h

---

## Tier 2 — Damage & Skill Data Accuracy

### T2.1: Deadeye special mode toggle in UI
**What**: The damage calculation now correctly detects real special modes (different damage values). The API returns `modes[]` with each mode's data. Add a toggle button in the skill detail drawer that lets users switch between "Normal" and "Special" mode display.
**Why**: Deadeye has regular bullets vs Marni bullets. User should see both options.
**Effort**: 2h

### T2.2: Verify damage calculation across all classes
**What**: Run a comprehensive audit: for each class×spec, fetch the top 5 skills by damage and manually verify the total matches bdocodex. Log any discrepancies.
**Effort**: 2h

### T2.3: Prerequisite chain backfill
**What**: Only 1,056/7,189 skills have `prerequisiteIds`. The dedup module uses prereqs for Awakening-weapon skill replacement. Missing prereqs = incomplete dedup.
**Approach**: Re-scrape bdocodex tooltips for prereq data, or extract from `tooltipRawHtml` field.
**Effort**: 1h script + lurker time

### T2.4: PvP % backfill
**What**: 4,546/7,189 (63%) skills have `pvpDamagePercent`. 2,643 skills missing it. Limits Damage Calculator accuracy.
**Approach**: Lurker re-enrich on missing skills.
**Effort**: Lurker time

---

## Tier 3 — UI/UX Improvements

### T3.1: Skill table type column accuracy
**What**: The type column shows 'Main' for pre-56 skills in Awakening spec. This is CORRECT (they are main-weapon skills), but could be confusing. Add a tooltip: "Main-weapon skill usable in Awakening spec (no Absolute version exists)".
**Effort**: 30 min

### T3.2: Meta page — verify stat accuracy after all fixes
**What**: After the isAwakening, BSR, and damage calculation fixes, the meta stats (skillCount, avgPvpDamage, grabCount, etc.) may have changed. Run `scripts/validate-matchups.ts` + `scripts/crash-test.ts` to verify all is correct.
**Effort**: 1h

### T3.3: Tier Builder — verify scoring after damage fix
**What**: The damage calculation change (sum all hits vs first mode) affects tier scores. Re-verify the tier rankings make sense.
**Effort**: 30 min

### T3.4: Matchups page — verify after isAwakening fix
**What**: The isAwakening fix changed which skills appear in each spec. The matchups SA DR + group data should be verified against PA Wiki.
**Effort**: 30 min

### T3.5: Loading state for stats
**What**: When the page loads, stats show "offline / failed to load" briefly before the API responds. Add a proper loading skeleton or retry logic.
**Effort**: 1h

---

## Tier 4 — New Features

### T4.1: Automated tests (vitest)
**What**: Write tests for `spec-dedup.ts`, `damage.ts`, `cc.ts` — the most critical logic that keeps breaking across resets.
**Effort**: 6h

### T4.2: Prisma migrations
**What**: Switch from `db:push` to `prisma migrate dev` for proper migration history now that DB is in git.
**Effort**: 1h

### T4.3: Lurker restart + health monitoring
**What**: Restart the lurker for future patch enrichment. Add `/api/health` endpoint that checks lurker heartbeat. Auto-restart if stale >10 min.
**Effort**: 3h

### T4.4: Tier visualization variety (radar/heatmap)
**What**: Add radar chart view (one per class, axes = 13 score params) and heatmap view (class×param grid).
**Effort**: 3h

### T4.5: i18n (DE/FR/ES/KR)
**What**: Add next-intl for multi-language support. bdocodex supports 5 languages.
**Effort**: 8h

### T4.6: SVG logo redesign
**What**: Design proper BDO-themed SVG logo. Current one exists but user was unhappy.
**Effort**: 3h

### T4.7: Combo extraction (Foundry scraping)
**What**: Scrape Foundry class guides for per-skill combo notation. Currently only a link exists.
**Effort**: 6h

### T4.8: PAZ extraction research
**What**: BDOToolkit/UnPAZ repos are gone. Research alternative PAZ extraction tools.
**Effort**: 4h research

---

## Suggested Improvements (not in any prior roadmap)

### S1: API response time caching
**What**: `/api/meta` takes ~500ms. Cache for 5 min (already has `getCached/setCached` but verify it's working after DB changes).
**Effort**: 30 min

### S2: DB change log viewer
**What**: The `SkillChangeLog` table exists but has no UI. Add a simple viewer in the Docs or Patches tab showing recent DB changes (isAwakening fixes, className fixes, etc.).
**Effort**: 2h

### S3: Skill search by effect (enhanced)
**What**: The smart effect search exists but could be enhanced: "grab super armor" → skills with both Grapple CC AND Super Armor protection. Currently requires exact keyword match.
**Effort**: 1h

### S4: Export/Import builds
**What**: Let users export their filter state + view mode as a shareable URL. Similar to bdocodex's skill builder share feature.
**Effort**: 2h

### S5: Dark mode default + system preference
**What**: Currently defaults to dark. Add `enableSystem` to ThemeProvider so it respects OS preference.
**Effort**: 15 min

### S6: API rate limiting
**What**: No rate limiting on API endpoints. A single user could hammer `/api/skills` with rapid filter changes. Add simple in-memory rate limiting.
**Effort**: 1h

### S7: Favicon
**What**: No custom favicon exists. Use the SVG logo as favicon.
**Effort**: 15 min

### S8: PWA manifest
**What**: Add a `manifest.json` for PWA installability. Users could "Add to Home Screen" on mobile.
**Effort**: 30 min

### S9: Keyboard shortcut help overlay
**What**: Press `?` to show all keyboard shortcuts (1-8 for tabs, / for search, Esc to close, arrow keys for navigation).
**Effort**: 1h

### S10: Session reset auto-recovery
**What**: On app boot, if DB skill count < 5000 (indicating a reset with stale export), automatically run `restore-db.ts` + `import-pa-wiki.ts` + `compute-max-rank.ts`.
**Effort**: 2h

---

## Summary

| Tier | Items | Focus |
|------|-------|-------|
| Tier 1 | 3 | Stability (`.env` survival, health checks, export sync) |
| Tier 2 | 4 | Data accuracy (Deadeye toggle, damage audit, prereq/PvP backfill) |
| Tier 3 | 5 | UI/UX (type tooltips, meta/tier/matchup verification, loading states) |
| Tier 4 | 8 | New features (tests, migrations, lurker, visualizations, i18n, logo, combos, PAZ) |
| Suggested | 10 | Improvements (caching, change log viewer, enhanced search, share URLs, PWA, etc.) |
| **Total** | **30** | |
