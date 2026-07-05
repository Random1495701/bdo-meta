# Changelog — BDO Meta

All notable changes to BDO Meta are documented here.
Versions are git tags. See `git tag | sort -V` for all versions.

---
- chore: Sync version metadata to v5.6.2
- T3.3+T3.7+T3.15: Data provenance + patch archive API + session-specific OCR

## [v5.6.3] — 2026-07-05

- T2.8: Light theme polish — bdo-btn now uses CSS vars

## [v5.6.2] — 2026-07-05

- T2.12: Mobile touch swipe for class bar

## [v5.6.1] — 2026-07-05

- T2.3+T2.4: Collapsible filter sections + smart search verification

## [v5.6.0] — 2026-07-05

- T1.4+T2.11+T2.13: Sanity check + multi-class fix + keyboard activation

## [v5.5.9] — 2026-07-05

- chore: untrack runtime files (scripts/dev.pid, bun.lock, scripts/lurker.lock)

## [v5.5.8] — 2026-07-05

- T2.1: Filter persistence across reloads + project mgmt compliance

## [v5.5.7] — 2026-07-05

- v5.5.6: Project management compliance + rescue docs

## [v5.5.6] — 2026-07-05

- chore: untrack .env and .zscripts/dev.pid per ZAI guide

## [v5.5.5] — 2026-07-05

- v5.5.4: Stability + backup + skill filtering audit

## [v5.5.4] — 2026-07-05

- v5.5.2: Bump APP_VERSION to match tag
- P3.1: Restore /api/upload/skills-json endpoint from v5.1.0
- P1.1+P1.2: Light theme polish + stale doc cleanup
- P0 CRITICAL: Restore full DB from v3.9.0 export (7,189 skills, was 4,113)

## [v5.5.3] — 2026-07-05

- CRITICAL FIX: Restore PA Wiki data + fix import-pa-wiki script
- CRITICAL: Store DB in git + fix all missing features from session reset

## [v5.5.2] — 2026-07-04

- P1.1+P1.5: Archive 64 one-off scripts, improve Data tab contrast
- P1.2: Fix all TypeScript errors in src/ (0 remaining)

## [v5.5.1] — 2026-07-04

- P0.3: Grab spec assignment — exclude main skills replaced by awakening skills (prerequisite chain), e.g. Neck Impaler excluded from Guardian awakening (replaced by Chokeslam)
- v5.5.0: Restore + rebuild all lost work from session reset

## [v5.5.0] — 2026-07-04

- Fix: max-rank computation (pick highest Prime/Absolute rank not first), patches crash (normalize changes array), matchups JSX error, DB optimized (4111 skills, stubs deleted)
-  Bug fixes: max-rank, patches crash, matchups JSX, DB optimization

## [v5.4.1] — 2026-07-04

- Update CHAT_HISTORY.md with v5.3.0 session work
- Fix: Version mismatch — vault.sh now auto-updates APP_VERSION in version.ts. Updated to v5.3.0.
- v5.4.0: Session tracker (AoS/NW/WotR) with screenshot upload + VLM parsing, DB optimization (deleted 3,810 stubs), version fix (vault.sh auto-updates APP_VERSION)
-  Session tracker + DB optimization + version fix

## [v5.4.0] — 2026-07-03

- P1.1+P1.5: Arena of Solare redesign (SA DR heatmap, portraits, spec-colored chips, advantage notes) + Tiers portrait redesign (spec-specific portraits, bigger podium, score overlay)
- Fix: JSX > escaping in matchups page

## [v5.3.0] — 2026-07-03

- P0.2: Patch note → DB update pipeline — POST /api/patches/apply (dryRun support), GET /api/patches/changed (for visual indicators)

## [v5.2.1] — 2026-07-03

- P0.3: Grab spec assignment — exclude main skills replaced by awakening skills (prerequisite chain), e.g. Neck Impaler excluded from Guardian awakening (replaced by Chokeslam)
- Project management fixes: untrack .env/lock/pid files, add .env.example, create CHAT_HISTORY.md, rescue beacon, update .gitignore
- Audit: PAZ extraction guide, revised roadmap, project management fixes (.env untracked, .gitignore, CHAT_HISTORY.md, rescue beacon, .env.example)
- P0.3: Complete project management setup — health-check.sh, vault.sh, SESSION_HANDOFF.md, KNOWN_ISSUES.md, CHAT_HISTORY.md, untrack db/custom.db, update PAZ guide (repos gone)
- P0.3: Fix eslint config (ignore scripts), remove .eslintignore, health check 8/9 passing

## [v5.2.0] — 2026-07-03

- Chat history: v5.0.1 update with grapple investigation and damage calc spec
- Fix PA Wiki data: correct spec-to-group mapping (Pulverizer not Crusher), correct SA DR values, stop button always visible, group counter cycle fixed
- Add 7/1/2026 roadmap, fix PA Wiki data (Pulverizer not Crusher, spec-dependent groups), stop button always visible, damage formula validated, chat history updated
- Sync 3,564 missing skill IDs from bdocodex sitemap (7,675 total), fix Matchups to show spec-separated entries (50 rows with AWK/SUCC/ASC labels), fix PA Wiki data (Pulverizer + spec-dependent groups + SA DR)
- v5.1.0: DB-level max-rank filtering (isMaxRank column), damage calculator v2 with validated PvP formula, spec-separated matchups, 3,564 missing skills synced

## [v5.1.0] — 2026-07-01

- v4.3.1 STABLE: Fix false grab parsing — 'All CC Resistance (except Grapple)' now correctly stored as protection (Super Armor/Q-block), not as CC. 17 skills fixed. Classes with Q-block: Valkyrie, Warrior, Nova, Wizard, Witch, Seraph.

## [v4.3.1] — 2026-07-01

- Fix grab logic: filter false grabs (All CC Resistance except Grapple), exclude BS skills from grab count
- AUDIT-3: comprehensive feature audit (90 features, 60 EXISTS, 24 MISSING, 2 BROKEN)
- Fix: alphabetical classes, remove icon frames, table default view, remove CC chain, add DPC metric, fix false grabs (description check), remove addons UI, remove ccChainPotential from tier builder
- Add Matchups page: own top-level menu, merged specs, alphabetical per bracket, pin-to-compare ratios, vs-group columns
- v4.3.0: Fix false grabs (9 skills), fix damage display (multiplier not hits, Mode 1 label), add Matchups page, remove CC chain, add DPC, alphabetical classes, remove icon frames, table default, remove addons UI

## [v4.3.0] — 2026-07-01

- v4.2.0: STABLE — crash fixes (nested button, videoAutoplay, persist removal), version dropdown, error boundary, BSO occult logo, chat history tracking

## [v4.2.0] — 2026-07-01

- Fix: BS skills excluded from CC counter + tooltip, error boundary with reset button, spinning occult SVG logo
- Fix: patches API crash on undefined skillName
- Add: version tracking (v4.1.0 in header), version dropdown to switch between git vault versions, BDO occult logo, chat history saving to GitHub
- Chat history: crash analysis — 3 bugs found (nested button, persist race, compare button)
- Chat history: crash fixes applied (not committed to code), PA Wiki confirmed, grab logic explanation

## [v4.1.0] — 2026-07-01

- [Task 45] v4.0.0: Patch notes checker + Patches tab

## [v4.0.0] — 2026-06-30

- [Task 44] v3.9.0: Skill comparison tool + E1 forgotten tasks

## [v3.9.0] — 2026-06-30

- Fix: useIsMobile import name (was useMobile)
- [Task 43] v3.8.0: Smart effect search + D1 skill comparison

## [v3.8.0] — 2026-06-30

- [Task 42] v3.7.0: Phase B+C — Tier list, transparent icons, video autoplay fix

## [v3.7.0] — 2026-06-30

- [Task 41] v3.6.0: Fix damage calc (max hits as multiplier) + DPC + split modes

## [v3.6.0] — 2026-06-30

- [Task 40] v3.5.0: Fix damage calc — special mode separation + multiplier fix

## [v3.5.0] — 2026-06-30

- [Task 39] v3.4.0: Algorithm audit fixes — rank regex, Flow/Core typing, ascension flags

## [v3.4.0] — 2026-06-30

- [Task 38] v3.3.0: Fix damage calculation — max targets not a multiplier

## [v3.3.0] — 2026-06-30

- [Task 37] v3.2.0: Ratio UI redesign + roadmap Phase A tasks

## [v3.2.0] — 2026-06-30

- Roadmap v4: phased execution plan (5 phases, 11 tasks)
- [Task 36] v3.1.0: Grab count, core protection, class filter fix, ratio multi-select

## [v3.1.0] — 2026-06-30

- [Task 35] v3.0.0: PA Wiki data, class ratios, SA DR, card redesign

## [v3.0.0] — 2026-06-30

- [Task 34] v2.9.0: Card expand, Data button, alphabetical, remove chain/DPS, roadmap v3

## [v2.9.0] — 2026-06-30

- [Task 30-31] v2.7.0: Meta metrics (top skill, DPS, prot%) + audit + roadmap v2
- [Task 32] DB restored after reset, GitHub force-synced to local v2.7.0
- Turbo mode: reduce lurker delays 3x (0.3-0.8s, was 1.5-3.5s)
- [Task 33] v2.8.0: Roadmap execution — 8 tasks completed

## [v2.8.0] — 2026-06-30

- [Task 30-31] v2.7.0: Meta metrics (top skill, DPS, prot%) + audit + roadmap v2

## [v2.7.0] — 2026-06-30

- [Task 29] v2.6.0: Portrait background cards + spec color redesign

## [v2.6.0] — 2026-06-30

- [Task 28] v2.5.0: Official PA portraits, Documentation page, data/meta shared DB

## [v2.5.0] — 2026-06-30

- Fix lint error in ranges route (object → const result)
- [Task 27] v2.4.0: Split spec cards + class portraits

## [v2.4.0] — 2026-06-30

- [Task 25-26] v2.3.0: Fix ascension classes, self-host skill icons, Garmoth addons, API cache

## [v2.3.0] — 2026-06-30

- Update lurker state (1605 enriched, still running)
- [Task 21] DB restored again (reset), scripts committed, fresh export, GitHub synced
- [Task 22] Meta page: per-class stats with sorting, tab switcher, BDO theme
- [Task 23-24] v2.2.0: Ascension spec, Meta page redesign, roadmap

## [v2.2.0] — 2026-06-30

- [Task 18] Multi-spec S+A selection, class icon activates both, dedup fixes
- [Task 19] v2.1.0: Final vault backup — chat history, session handoff, DB export

## [v2.1.0] — 2026-06-29

- [Task 16] docs + changelog update
- Fix: re-apply cooldown ranges fix (was lost during filter-branch)
- [Task 17] v2.0.0: Succession/Awakening spec filtering with deduplication

## [v2.0.0] — 2026-06-29

- Remove large SQLite DB from git, export as JSON instead (GitHub 100MB limit)
- [Task 16] v1.9.0: Cooldown slider fix (240s + Black Spirit jump), PAZ extraction docs, GitHub backup

## [v1.9.0] — 2026-06-29

- [Task 14-15] v1.8.0: PvP CC filter, range fix, video parsing plan, garmoth API discovery

## [v1.8.0] — 2026-06-29

- [Task 13] v1.7.0: CC counter fix (0.7 values), X+Y display, PvE-only exclusion, detail redesign

## [v1.7.0] — 2026-06-29

- [Task 12] v1.6.0: CC counter system, protection icons, table sorting, column picker

## [v1.6.0] — 2026-06-29

- [Task 10-11] v1.5.0: Damage calc, multi-select filtering, new view modes, passive rank fix

## [v1.5.0] — 2026-06-29

- [Task 9] v1.4.0: Prime→Succession fix, self-hosted class icons, wheel scroll, unified scrollbars

## [v1.4.0] — 2026-06-29

- [Task 8] v1.3.0: BDO Meta redesign, filtering fixes, auto-refresh, documentation + versioning

## [v1.3.0] — 2026-06-29

- Initial commit

## [v1.0.0] — 2026-06-28

