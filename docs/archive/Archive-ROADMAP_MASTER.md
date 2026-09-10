# BDO Meta — Master Roadmap (3-Tier Priority)

> **Created**: 2026-07-05
> **Based on**: Comprehensive review of all 10 chat-history files, 3000-line worklog, 45 git tags, 4 prior roadmaps, CHANGELOG, and live code/DB audit
> **Current state**: v5.5.3 · 7,189 skills · 31 classes · 8 tabs · DB in git · lint clean · 0 TS errors

---

## Tier 1 — Critical (Data Integrity & Hygiene)

> These items prevent catastrophic data loss and fix stale metadata. Do these FIRST.

### T1.1: Regenerate `db/skills-export.json` from current 7,189-skill DB
**Why**: The export file is STALE (7.2MB / 4,113 skills from v4.1.0 era). If a session reset triggers `restore-db.ts`, the DB will SHRINK by 3,076 skills. This already happened once.
**What**: Run export script, verify 7,189 skills, commit to git. File should be ~16MB.
**Effort**: 30 min

### T1.2: Fix version metadata drift
**Why**: `APP_VERSION` says `v5.5.2` but git tag is `v5.5.3`. `GIT_TAGS` array stops at `v5.5.1` (missing v5.5.2, v5.5.3). Version dropdown is incomplete.
**What**: Update `APP_VERSION` to `v5.5.3`. Add `v5.5.2`, `v5.5.3` to `GIT_TAGS`.
**Effort**: 5 min

### T1.3: Auto-derive APP_VERSION from git describe
**Why**: Permanently eliminates the version-drift class of bug. No more manual updates.
**What**: Replace hardcoded `APP_VERSION` with `execSync('git describe --tags').trim()` at build time.
**Effort**: 30 min

### T1.4: DB-export-vs-DB sanity check
**Why**: The v4.1.0 truncation bug went undetected for weeks. Need automated detection.
**What**: Script that compares `db/skills-export.json` skill count vs live `db.skill.count()`. Log warning if mismatch >5%. Run on dev startup.
**Effort**: 1h

### T1.5: Session reset auto-detection banner
**Why**: User said "track when the version gets reset" — they want to KNOW when a reset happens, not discover it later from missing data.
**What**: On app boot, compare `APP_VERSION` in code vs latest git tag. If mismatch → red banner alert. Also detect if DB skill count differs from export count.
**Effort**: 1h

### T1.6: CHANGELOG backfill v2.1.0 → v5.5.3
**Why**: 35 versions undocumented. CHANGELOG stops at v2.0.0.
**What**: Mine from worklog Task IDs + git log + chat-history. Each entry: Added / Fixed / Changed.
**Effort**: 2h

### T1.7: Update stale docs
**Why**: `KNOWN_ISSUES.md` says "3,810 stub skills" (actually 10). `SESSION_HANDOFF.md` says v5.1.0 (actually v5.5.3). `PROJECT.md` API table may be stale.
**What**: Update all 3 docs to reflect current state.
**Effort**: 30 min

### T1.8: Prisma migrations instead of `db:push`
**Why**: DB is now in git (10MB). Using `db:push` is destructive and loses migration history. With DB version-controlled, migrations should be tracked too.
**What**: Run `prisma migrate init`, commit `prisma/migrations/` directory.
**Effort**: 1h

---

## Tier 2 — High-Value Polish & Missing Features

> These items address user-requested features that were lost or never built, plus code health.

### T2.1: Persist filter state across reloads
**Why**: User explicitly complained about this QoL loss. Currently only sort/viewMode persist (manual localStorage). Filter state (class, spec, type) resets on every reload.
**What**: Implement hydration-safe persistence using `skipHydration: true` + manual `rehydrate()` after mount.
**Effort**: 1h

### T2.2: Re-add Garmoth addon data + UI
**Why**: Addon data was a unique differentiator (927 skills × addon popularity). User wanted "lean app" but this removed real value. The data is free (single 312KB request, no rate limit).
**What**: Re-import from `api.garmoth.com/api/skill-addons`. Add `hasAddon` toggle to filter sidebar. Add "Skill Add-Ons" section to detail drawer.
**Effort**: 3h

### T2.3: Collapsible filter sidebar sections
**Why**: IMPROVEMENT_PLAN 2.3 — never built. 7 sections always visible makes sidebar long.
**What**: Use shadcn Collapsible, remember collapsed state per section in localStorage.
**Effort**: 1h

### T2.4: Smart effect search
**Why**: IMPROVEMENT_PLAN 4.3 — never built. User should be able to search "super armor knockdown" and get skills with both.
**What**: Extend `q` filter to OR-match against `ccTypes`, `protectionTypes`, `damageRowsJson`.
**Effort**: 30 min

### T2.5: Implement Video Parsing Plan
**Why**: Animation durations are currently preview-video length, not true skill animation. Over-counts for ~30% of skills with double casts or hanging time. Plan exists at `docs/VIDEO_PARSING_PLAN.md` but was never executed.
**What**: ffmpeg scene detection for double casts + hanging time. Apply correction algorithm.
**Effort**: 6h

### T2.6: Automated tests (vitest)
**Why**: Zero test coverage. Critical logic (`spec-dedup.ts`, `damage.ts`, `cc.ts`) has no tests. Session resets keep breaking these.
**What**: Add vitest. Write tests for spec-dedup (most complex), damage calculation (special modes), CC counters. Add GitHub Actions CI.
**Effort**: 6h

### T2.7: Lurker Turbo Mode + health monitoring
**Why**: Lurker is dead. Even when running, it's only ~24/min (target was 43/min). 10 stubs + 3,928 missing prerequisites + 2,643 missing PvP% need enrichment.
**What**: Add `--turbo` flag (0.3-0.8s delays). Add `/api/health` endpoint that checks lurker heartbeat. Auto-restart if stale >10 min.
**Effort**: 3h

### T2.8: Light theme polish verification
**Why**: Task 43 claimed BDO utility classes now use CSS vars, but need to verify all 8 tabs render correctly in light mode.
**What**: Test all 8 tabs in light mode. Fix any remaining hardcoded dark hex values.
**Effort**: 1h

### T2.9: Comprehensive crash-test suite
**Why**: User reported "App crashes: clicking succession sorc > prime: black wave III crashes. It does the same on so so many places." Need automated detection.
**What**: Script that iterates all class×spec combinations, clicks first 5 skills, logs crashes.
**Effort**: 2h

### T2.10: Verify and restore exclusion system
**Why**: User mentioned "We had an 'exclusion' system on double click in filtering" as a lost QoL feature. Current state unclear.
**What**: Verify if double-click-to-exclude exists. If missing, implement.
**Effort**: 30 min

### T2.11: Multi-class skills fix
**Why**: 31 skills like "Musa, Dosa" only filterable by first class. IMPROVEMENT_PLAN 1.3 — never fully resolved.
**What**: Change class filter to also match `className LIKE '%ClassName%'`.
**Effort**: 30 min

### T2.12: Mobile swipe-to-scroll class bar
**Why**: IMPROVEMENT_PLAN 2.2 — never built. Class bar uses wheel/drag but no touch swipe.
**What**: Add touch event handlers (touchstart/touchmove/touchend).
**Effort**: 30 min

### T2.13: S/A/Asc button keyboard activation
**Why**: AUDIT-2 §7.2 — accessibility gap. S/A/Asc spans lack `onKeyDown`.
**What**: Add Enter/Space key handlers.
**Effort**: 15 min

---

## Tier 3 — New Features & Exploration

> These are new features and enhancements that would elevate the app beyond its current scope.

### T3.1: Combo Extraction (Foundry guides)
**Why**: ROADMAP P2.1 — never built. Currently only a link to Foundry. Full combo notation per skill would be a major differentiator.
**What**: Scrape Foundry class guides for combo notation. Store in DB. Display in skill detail drawer + Meta page.
**Effort**: 6h

### T3.2: Patch note diff visualization
**Why**: User mentioned "not linking the logic of the skill changed with the logic of that skill in our database". Currently just up/down arrows.
**What**: Side-by-side before/after diff panel in skill detail drawer for changed fields. Pulls from `SkillChangeLog`.
**Effort**: 3h

### T3.3: Data source provenance display
**Why**: User frustration: "What website is the PA Wiki for you?" — they want to know where each data point comes from.
**What**: Small "source" badge on each data field in detail drawer. Tooltip: "From bdocodex tip.php" / "From PA Wiki wikiNo=225" / "From Garmoth API".
**Effort**: 1h

### T3.4: Session reset auto-detection (overlap with T1.5)
**Why**: User wants to know IMMEDIATELY when a reset happens, not discover it from missing data.
**What**: Boot-time check: code version vs git tag, DB count vs export count. Red banner if mismatch.
**Effort**: Included in T1.5

### T3.5: Tier visualization variety (radar/heatmap)
**Why**: User said "display them in a more fun way (with character portraits)". Currently 4 view modes.
**What**: Add radar chart view (one per class, axes = 13 score params). Add heatmap view (class×param grid).
**Effort**: 3h

### T3.6: Class group filter as primary navigation
**Why**: User: "filtering should be by class ratio group, not by classes". Currently class is primary, group is secondary.
**What**: Add "Filter by Group" toggle in matchups that swaps primary navigation to Vanguard/Pulverizer/Skirmisher.
**Effort**: 1h

### T3.7: Patch archive browser
**Why**: User said "List only the latest patch" (done) but also implied need to access history.
**What**: "View All Patches" button → archive page showing all historical patches with skill changes.
**Effort**: 1h

### T3.8: SVG logo redesign (proper BDO occult design)
**Why**: User complained "logo is just z.ai's logo". Current `public/logo.svg` exists but user unhappy.
**What**: Design proper BDO-themed SVG logo. Apply to header + favicon + Docs tab.
**Effort**: 3h

### T3.9: Internationalization (DE/FR/ES/KR)
**Why**: IMPROVEMENT_PLAN 4.5 — never built. bdocodex supports 5 languages.
**What**: Add next-intl. Extract UI strings. Sync DE/FR/ES descriptions via lurker.
**Effort**: 8h

### T3.10: PAZ extraction alternative tools research
**Why**: BDOToolkit/UnPAZ repos gone. User's "inject live databases as game updates" workflow blocked.
**What**: Research alternative PAZ extractors. Update `docs/PAZ_EXTRACTION_GUIDE.md` with working tools.
**Effort**: 4h research

### T3.11: Prerequisite chain backfill
**Why**: Only 3,261/7,189 skills have prerequisites. Limits build calculator accuracy and Awakening leak fix completeness.
**What**: Lurker re-enrich on the 3,928 skills with NULL prerequisites.
**Effort**: 1h script + lurker time

### T3.12: PvP % backfill
**Why**: 2,643 skills missing PvP multiplier (37%). Limits Damage Calculator accuracy.
**What**: Lurker re-enrich to backfill `pvpDamagePercent`.
**Effort**: Lurker time

### T3.13: Matchup accuracy validation
**Why**: User: "Meta > Matchup this just does nothing now. The classes arent in their correct categories". Was fixed but no validation tooling.
**What**: "Validate groups" button that fetches PA Wiki wikiNo=225 and diffs against DB. Surfaces drift.
**Effort**: 2h

### T3.14: Refresh CHAT_HISTORY.md root index
**Why**: Currently 80 lines, stops at 2025-07-01. Missing Tasks 41-43.
**What**: Full population from `docs/chat-history/session-*.md` files + worklog Tasks 34-43.
**Effort**: 1h

### T3.15: Sessions screenshot OCR with structured prompts per session type
**Why**: Currently 3-step paste-JSON flow uses generic prompt. Better extraction accuracy with type-specific prompts.
**What**: Session-type-specific prompts (AoS scoreboard, NW summary, WotR team comp).
**Effort**: 2h

---

## Summary

| Tier | Items | Total Effort | Focus |
|------|-------|-------------|-------|
| **Tier 1 — Critical** | 8 | ~7h | Data integrity, version hygiene, doc accuracy |
| **Tier 2 — High-Value Polish** | 13 | ~25h | Lost features, code health, UX gaps |
| **Tier 3 — New Features** | 15 | ~40h | Differentiators, exploration, data enrichment |
| **Total** | **36** | **~72h** | |

### Recommended Execution Order

**Phase 1 (immediate)**: T1.1 → T1.2 → T1.3 → T1.7 → T1.4 → T1.5
- Regenerate export, fix version, auto-derive version, update docs, add sanity check, add reset banner
- ~4h total, prevents catastrophic data loss

**Phase 2 (this session)**: T1.6 → T1.8 → T2.1 → T2.10 → T2.4 → T2.11 → T2.13
- CHANGELOG backfill, Prisma migrations, filter persistence, verify exclusion system, smart search, multi-class fix, keyboard activation
- ~5h total, addresses user-requested QoL

**Phase 3 (next sessions)**: T2.2 → T2.3 → T2.5 → T2.6 → T2.7
- Addon data, collapsible filters, video parsing, tests, lurker turbo
- ~17h total, high-value polish

**Phase 4 (as time permits)**: Tier 3 items in priority order
- Combo extraction, diff visualization, provenance, tier visualizations, i18n, PAZ research
- ~40h total, new features

### Key Insight

The app is **feature-complete for its original scope** but has accumulated tech debt from multiple session resets. The highest-value work is:
1. **Data integrity** (T1.1-T1.5) — prevent the next catastrophic data loss
2. **QoL restoration** (T2.1, T2.10) — filter persistence + exclusion system
3. **Test coverage** (T2.6) — prevent regressions from future resets

Everything else is enhancement. The app works; these items make it robust.
