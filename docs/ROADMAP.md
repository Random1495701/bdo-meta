# BDO Meta — Final Roadmap

> **Created**: 2026-09-10 (consolidation of all prior roadmaps)
> **State**: v5.9.12 · 7,038 skills · 3,193 w/ animation · 31 classes · 6 ascension
> **Tests**: 42/42 · **Lint**: clean · **GitHub**: in sync · **Server**: HTTP 200
> **Status**: This is the **single source of truth** for remaining work.
> All previous roadmaps are archived in `docs/archive/` — see "Archive Index" below.

---

## How to read this roadmap

- **Priority**: P0 (critical) → P3 (polish). Within a priority, ordered by impact/effort.
- **Effort**: S (≤1h) · M (1–4h) · L (≥4h)
- Items marked ✅ are **done** (kept for history, not re-doable).
- Items marked 🚫 are **permanently skipped** per user decision — do NOT re-raise.
- Everything else is **remaining** and fair game.

---

## Archive Index (do not edit — historical only)

All prior roadmaps moved to `docs/archive/`:

| File | When | Items | Outcome |
|------|------|-------|---------|
| `Archive-ROADMAP_2026-07-01.md` | 2026-07-01 | early post-reset | all done/skipped |
| `Archive-ROADMAP_2026-07-01_v2.md` | 2026-07-01 | v2 of that week | all done/skipped |
| `Archive-ROADMAP_POST_V5.7.4.md` | ~v5.7.4 | 30 items | all done/skipped |
| `Archive-ROADMAP_MASTER.md` | mid | 3-tier, 36 items | all done/skipped |
| `Archive-ROADMAP_2026-07-04_AUDIT.md` | 2026-07-04 | 36 audit items | all done/skipped |
| `Archive-DB_AUDIT_2026-07-05.md` | 2026-07-05 | DB audit | resolved |
| `Archive-IMPROVEMENT_PLAN.md` | mid | 20 items | all done/skipped |
| `Archive-VIDEO_PARSING_PLAN.md` | mid | video parsing | 🚫 skipped (PAZ instead) |
| `Archive-ROADMAP_v6.md` | 2026-07-06 | 9 polish items | Q1.1/Q1.2/Q3.3 done, rest carried here |
| `Archive-ROADMAP_v7.md` | 2026-07-06 | 24 audit items | 1 done (P2.10), 23 carried here |
| `Archive-ROADMAP_CURRENT.md` | 2026-07-05 | 14 items | all 14 done |

---

## 🚫 Permanently Skipped (user decision — do NOT re-raise)

- Addon system
- Video parsing via ffmpeg (PAZ extraction is the replacement — see DATA initiative below)
- Skill Build Calculator
- Internal LLM (z-ai-web-dev-sdk in app code; external paste-JSON flow only)
- i18n / internationalization
- Light mode (removed completely)

---

## ✅ Recently Completed (for context — not re-doable)

| Item | Version | Notes |
|------|---------|-------|
| Combo expansion to all 31 classes | v5.9.6 | 85 combos across 31/31 classes (was v6 Q1.1 / v7 P2.10) |
| Combo search/filter in Meta page | v5.9.11 | global search + 4 type chips (was v6 Q1.2) |
| Keyboard nav in Skill Tree | v5.9.11 | Arrow/Enter/Right/Left across sections (was v6 Q3.3) |
| PvP% backfill (partial) | v5.9.11 | 152 done, 1,031 still missing → P2.8 below (was v6 Q4.1) |
| Granular CC breakdown | v5.9.12 | spec-inherited / weapon-only / main-abso CC counts |
| UI/UX audit | v5.9.12 | produced `docs/UI_AUDIT.md` + the v7 roadmap |
| Matchups redesign (Arena of Solare) | v5.9.12 | DnD class cards + visual advantage bars |
| Discord class links | v5.9.9 | `docs/CLASS_DISCORDS.md` |
| Damage calc audit | v5.9.9 | PvP% double-count bug fixed |
| CC inflation audit | v5.9.10 | false grab filter made robust |

---

# REMAINING WORK

---

## P0 — Critical (do first)

### P0.DATA — PAZ-based true skill data + animation speed ⭐ (user priority)
**Source**: User request 2026-09-10. Replaces bdocodex scraping with frame-accurate data from the BDO game files.
**Why P0**: The user explicitly wants this. It eliminates the bdocodex dependency (bot challenges, stale data, ~37% missing PvP%) and gives us **frame-perfect** animation durations instead of video-based ones.
**Guide**: See `docs/PAZ_EXTRACTION_GUIDE.md` (fully rewritten 2026-09-10).
**Sub-items**:
- **DATA.1** Run `bdo-data-extractor` to produce `class_skills.json` (skill groups, ranks, class grids, kind, passive effects) — replaces bdocodex skill roster + class trees. Effort: S (1h, one-time per patch).
- **DATA.2** Extract `.pac` action files from `character/skillaction/{prefix}_skill_*.pac` and parse frame count from header → `animationDurationMs = frame_count / 60 * 1000`. No public parser; write a minimal TS header reader (frame count is at a fixed offset). Effort: M (3h).
- **DATA.3** Extract skill tooltip XML (`ui_data/skill/skill_*.xml`) and parse damage rows, CC types, protection types, cooldowns, PvP% — these are NOT in the binary tables, only in the tooltip XML. Effort: M (3h).
- **DATA.4** Build `scripts/ingest-paz.ts` that merges extractor JSON + parsed XML + parsed .pac durations into our DB schema, upserting by `skillId`. Wire to the existing `POST /api/upload/skills-json` or a new `POST /api/ingest/paz`. Effort: M (3h).
- **DATA.5** After first successful PAZ ingest, retire the lurker (keep `scripts/sync-lurker.ts` as icon-URL fallback only). Effort: S (30min).
**Total effort**: L (~10h one-time, then ~1h per BDO patch).
**Acceptance**: DB skill roster matches `class_skills.json`. Animation durations come from `.pac` frame counts (not ffprobe video). Damage/CC/cooldown come from tooltip XML. Lurker is NOT running. `/api/stats` reports the new totals.

### P0.1 — Mobile tab bar overflow fix
**Source**: UI_AUDIT §2.1 · `Archive-ROADMAP_v7.md` P0.1
**What**: At 375px viewport, the 8-tab tablist is 890px wide and "Docs" is clipped — no scroll affordance, no overflow indicator. Mobile users cannot reach Docs without the `7` keyboard shortcut.
**File**: `src/components/skills/tab-switcher.tsx`
**Approach**: Below `lg`, switch the tab container to `flex overflow-x-auto` + `scroll-snap-type: x mandatory`. Add a right-edge gradient fade to indicate more tabs. Move the version dropdown below the tab bar on mobile.
**Effort**: S (30 min)
**Acceptance**: At 375px, all 8 tabs are reachable via horizontal swipe/scroll. No tab permanently clipped.

### P0.2 — Migrate to `next/image`
**Source**: UI_AUDIT §2.2 · `Archive-ROADMAP_v7.md` P0.2
**What**: 14 raw `<img loading="lazy">` tags ship skill icons (3,069 files) and portraits (118 files) at native resolution. Meta tab downloads ~4.7MB of portraits on first paint. No AVIF/WebP, no responsive sizing, no blur placeholder, no width/height (CLS).
**Files**: all `<img>` in `src/components/skills/*.tsx`; `next.config.ts`; one-time script to generate thumbnails.
**Approach**: Configure `images.formats`/`deviceSizes`/`imageSizes` in `next.config.ts`. Replace `<img>` with `<Image>` (fixed for icons, `fill` for portraits). Generate 64/128/256px thumbnail variants via a one-time `sharp` script. Add `placeholder="blur"` for top 31 portraits.
**Effort**: M (4h)
**Acceptance**: Lighthouse "Image formats" audit passes. Meta tab downloads <500KB on first paint. No CLS during image load.

---

## P1 — High Priority (next sprint)

### P1.1 — Lazy-load tab contents with `next/dynamic`
**Source**: UI_AUDIT §2.3 · `Archive-ROADMAP_v7.md` P1.1
**What**: All 8 tab pages are statically imported in `page.tsx` and bundled into the initial client bundle. `recharts`, `@mdxeditor/editor`, `react-syntax-highlighter` ship even if the user never opens Tiers / Docs.
**File**: `src/app/page.tsx`
**Approach**: Convert the 7 non-default tab pages to `next/dynamic(() => import(...), { ssr: false, loading: () => <TabSkeleton /> })`. Keep Data tab static for fast first paint.
**Effort**: S (1h)
**Acceptance**: Initial JS bundle drops ~40–60%. Tiers + Docs still work on demand.

### P1.2 — Audit unused dependencies
**Source**: UI_AUDIT §2.3 · `Archive-ROADMAP_v7.md` P1.2
**What**: 25+ `@radix-ui/*` packages, plus `embla-carousel-react`, `react-day-picker`, `react-hook-form`, `@hookform/resolvers`, `input-otp`, `react-resizable-panels`, `cmdk`, `next-intl`, `next-auth` — some unused.
**Approach**: Run `bunx depcheck --json`. Remove confirmed-unused. For remaining heavyweights (`@mdxeditor/editor`, `recharts`, `react-syntax-highlighter`), verify worth the bundle cost.
**Effort**: S (1h)
**Acceptance**: `bun run lint` clean. Bundle size drops. No runtime regressions.

### P1.3 — "Locked skills" / "Main skills" filter toggles ⭐ (user-requested)
**Source**: User feedback · UI_AUDIT §2.4 · `Archive-ROADMAP_v7.md` P1.3
**What**: The Prisma schema already has `isPassive`, `isFlow`, `isCore`, `isBlackSpirit`, `isAbsolute`, `isAwakening`, `isSuccession`, `isQuickSlot`, `requiredLevel` — the data is there, just no clean UI for it.
**Files**: `src/lib/skill-store.ts`, `src/components/skills/filter-sidebar.tsx`, `src/app/api/skills/route.ts`, `src/components/skills/skill-card.tsx`, `skill-list-row.tsx`, `skill-table.tsx`, `skill-tree.tsx`
**Approach**:
1. Add `mainSkillsOnly?: boolean` + `hideLocked?: boolean` to `SkillFilters` in `skill-store.ts`, persist in `savedFilters`.
2. FilterSidebar: new "Build Focus" section with 2 `Switch` toggles — "Main Skills Only" (Prime + Absolute + Awakening/Succession main path) and "Hide Locked" (Flow:/Core:/Rabam/Black Spirit).
3. API: apply server-side via `where.AND`.
4. Visual: when `hideLocked` is OFF, render locked skills with a `Lock` lucide icon + `opacity-60` + hover "LOCKED" tag.
5. Default: both OFF.
**Effort**: M (3h)
**Acceptance**: "Main Skills Only" reduces a 90-skill class to ~20–30 hotbar-able skills. "Hide Locked" removes noise for new players. Both persist across reloads.

### P1.4 — Unified `<EmptyState>` / `<ErrorState>` / `<Skeleton>` components
**Source**: UI_AUDIT §2.5 · `Archive-ROADMAP_v7.md` P1.4
**What**: Each tab has its own ad-hoc empty/error/loading pattern. Meta has 12 skeleton cards. Sessions has a trophy empty state. Patches/Matchups/Tiers have no visible error state. No consistency.
**Files**: new `src/components/ui/empty-state.tsx`, `error-state.tsx`, `tab-skeleton.tsx`; update all 8 tab pages.
**Approach**: `<EmptyState icon title description action?/>`, `<ErrorState message onRetry? error?/>`, `<TabSkeleton variant="card|table|list" count=12/>`. Each tab's `useQuery` renders `isLoading ? Skeleton : isError ? Error : isEmpty ? Empty : Content`.
**Effort**: S (2h)
**Acceptance**: All 8 tabs have consistent loading/empty/error UX. Error states always have retry.

---

## P2 — Medium Priority (following sprints)

### P2.1 — Top loading bar on API fetches
**Source**: UI_AUDIT §2.8 · `Archive-ROADMAP_v7.md` P2.1
**What**: `bdo-loadbar` CSS keyframe exists in `globals.css` but is unused. No visible feedback when `/api/meta`, `/api/skills` etc. are fetching in background.
**Files**: new `src/components/ui/loading-bar.tsx`; integrate in `src/app/page.tsx`.
**Approach**: `useIsFetching()` from `@tanstack/react-query`. Render a 2px gold bar at viewport top (z-50) using `bdo-loadbar` when `isFetching > 0`. Fade out when 0.
**Effort**: S (30 min)

### P2.2 — Skip-to-main-content link
**Source**: UI_AUDIT §2.7 · `Archive-ROADMAP_v7.md` P2.2
**What**: No skip link for keyboard / screen-reader users — they must tab through the entire tab bar + header + filter sidebar before reaching main content.
**File**: `src/app/page.tsx`.
**Approach**: `<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] bdo-btn">Skip to content</a>` at top of each JSX branch. Add `id="main-content"` to `<main>`.
**Effort**: S (15 min)

### P2.3 — Skill card compare-button consolidation
**Source**: UI_AUDIT §2.6 · `Archive-ROADMAP_v7.md` P2.3
**What**: `skill-card.tsx` has TWO compare buttons — an inline icon that calls `setCompareSkill` but doesn't open the drawer, and a footer button that calls both. Confusing duplicate.
**File**: `src/components/skills/skill-card.tsx`.
**Approach**: Remove the inline icon compare button. Keep the footer button, promote to always-visible on hover.
**Effort**: S (10 min)

### P2.4 — Tab ARIA pattern fix (roving tabindex)
**Source**: UI_AUDIT §2.7 · `Archive-ROADMAP_v7.md` P2.4
**What**: The 8 tab buttons all have default `tabIndex={0}`. ARIA tabs pattern requires only the active tab be tabbable, with Arrow Left/Right moving focus between tabs.
**File**: `src/components/skills/tab-switcher.tsx`.
**Approach**: `tabIndex={view === tab.id ? 0 : -1}` on each tab. `onKeyDown` on tablist: Arrow Right/Left/Home/End move focus; Enter/Space switches. Decouple from the existing `1-7` number-key shortcut.
**Effort**: S (30 min)

### P2.5 — Skill tree virtualization
**Source**: `Archive-ROADMAP_v6.md` Q3.1 · UI_AUDIT §2.8 · `Archive-ROADMAP_v7.md` P2.5
**What**: Some classes have 90+ skills in the tree view. Without virtualization, 90+ DOM nodes render simultaneously. The Q3.3 keyboard-nav work already created a `flatNodes` memo — perfect input for virtualization.
**File**: `src/components/skills/skill-tree.tsx`.
**Approach**: Install `@tanstack/react-virtual` (~3KB gz). Wrap `flatNodes.map()` in `useVirtualizer({ count, getScrollElement, estimateSize: () => 36 })`. Keep section grouping via computed start indices. Verify keyboard nav still works (focused node always visible via `scrollIntoView`).
**Effort**: M (2h)

### P2.6 — Mobile filter sheet improvements
**Source**: `Archive-ROADMAP_v6.md` Q2.2 · UI_AUDIT §2.1 · `Archive-ROADMAP_v7.md` P2.6
**What**: The right-side filter sidebar becomes a left-side Sheet on mobile. Tri-state chips (include/exclude/off) need clearer differentiation on small screens. No "Reset all" button.
**File**: `src/components/skills/filter-sidebar.tsx`.
**Approach**: Sticky header with "Filters" title + "Reset all" button (calls all clear* actions). 3-chip legend at top (Include=gold+check, Exclude=red+X, Off=dim). Sticky footer with "Show N skills" button that closes the sheet.
**Effort**: S (30 min)

### P2.7 — Field selection on `/api/skills`
**Source**: `Archive-ROADMAP_v6.md` Q3.2 · UI_AUDIT §2.9 · `Archive-ROADMAP_v7.md` P2.7
**What**: `/api/skills` returns the full Skill shape including `tooltipRawHtml` (5–20KB per skill). Grid view only needs ~10 fields. Default response is ~100KB+ for 24 skills.
**Files**: `src/app/api/skills/route.ts`, `src/lib/skills.ts`, all consumers.
**Approach**: Add `?fields=id,name,iconUrl,...` query param. Default: full shape (back-compat). Grid view: `fields=id,name,krName,iconUrl,className,command,cooldownSec,animationDurationMs,damage,damagePerCooldown,damagePerCooldownPvP,ccCounters,ccCounterDisplay,isQuickSlot,requiredLevel,patchChange,isCore,isFlow,isBlackSpirit,isPassive` (no tooltipRawHtml, no damageRowsJson).
**Effort**: M (2h)

### P2.8 — PvP% backfill completion
**Source**: `Archive-ROADMAP_v6.md` Q4.1 · worklog Q4.1 (152/1183 done) · `Archive-ROADMAP_v7.md` P2.8
**What**: 1,031 max-rank skills still missing `pvpDamagePercent`. ~677 are "active-looking"; only ~4% (~27) expected to have PvP% on bdocodex. The Phase 2 script exists at `scripts/backfill-pvp-percent.ts` — needs to run to completion (~4 min) OR be replaced by PAZ tooltip XML parsing (see DATA.3).
**Files**: `scripts/backfill-pvp-percent.ts`; patch `scripts/sync-skills.ts` line 460 + `scripts/sync-lurker.ts` line 445 with the improved regex `/^(\d+(?:\.\d+)?)%[^]*?\bdamage in PvP/i`.
**Approach**: If DATA.3 lands first, this becomes moot (PAZ XML has authoritative PvP%). Otherwise run `bun run scripts/backfill-pvp-percent.ts --phase2` to completion + patch the sync regexes.
**Effort**: M (2h, or 0 if DATA.3 lands first)

### P2.9 — Skill icon gap analysis
**Source**: `Archive-ROADMAP_v6.md` Q4.2 · `Archive-ROADMAP_v7.md` P2.9
**What**: Some skills may have broken/missing icons (404s). Run a script to check all 3,069 icon URLs and identify gaps.
**File**: new `scripts/check-skill-icons.ts`.
**Approach**: HEAD each icon URL, record 404s. For 404s, attempt re-download from bdocodex. Log unrecoverable gaps (skill card fallback handles missing icons gracefully).
**Effort**: S (1h)

---

## P3 — Low Priority (polish)

### P3.1 — Tagline refresh
**File**: `src/components/skills/header.tsx` line 224.
**Change**: "Black Desert Online skill database — synced from bdocodex.com" → "The Adventurer's Codex — {total} skills · {classCount} classes · synced from bdocodex.com".
**Effort**: S (10 min)

### P3.2 — Sort button grouping on Meta
**File**: `src/components/skills/meta-page.tsx` lines 757–777.
**What**: 10 sort buttons in one row wrap awkwardly on tablet.
**Approach**: Group into 3 categories (Damage / CC / Protection) with dividers, or move less-common ones into a `Select` dropdown.
**Effort**: S (30 min)

### P3.3 — Matchups PIN column header
**File**: `src/components/skills/matchups-page.tsx`.
**What**: The PIN column on the right has no header label or tooltip.
**Approach**: Add `<th>` with `<Pin>` icon + tooltip "Pin matchup to top".
**Effort**: S (10 min)

### P3.4 — Dmg Calc scalar indicator
**File**: `src/components/skills/damage-calculator-page.tsx`.
**What**: The "1/4" indicator is unclear (means "1 of 4 active modifiers").
**Approach**: Replace with "1 of 4 active" label + a 4-dot progress indicator (filled dots = active).
**Effort**: S (15 min)

### P3.5 — Disable react-query polling in background
**Files**: `src/components/skills/header.tsx` (stats, 30s), `src/components/skills/sync-footer.tsx` (sync-status, 5s).
**What**: Polling continues when the browser tab is hidden, wasting requests.
**Approach**: Add `refetchIntervalInBackground: false` to both `useQuery` calls.
**Effort**: S (10 min)

### P3.6 — Disable framer-motion initial animation on above-the-fold cards
**File**: `src/components/skills/meta-page.tsx`.
**What**: 31 Meta cards each animate `initial={{opacity:0,y:10}}` on first paint — 31 simultaneous layout animations.
**Approach**: Use `whileInView` for cards below the fold, `initial={false}` for above-the-fold. Or remove the initial animation entirely.
**Effort**: S (15 min)

### P3.7 — Focus-visible styling audit
**Files**: `src/app/globals.css` (BDO utility classes), all interactive components.
**What**: The global `* { @apply border-border outline-ring/50; }` may not produce visible focus rings on `.bdo-btn` and `.bdo-chip` because their box-shadows override the outline.
**Approach**: Add explicit `:focus-visible` styles to `.bdo-btn`, `.bdo-chip`, `.bdo-input`, `.bdo-icon-frame` — 2px gold ring (`outline: 2px solid var(--color-bdo-gold-bright); outline-offset: 1px;`).
**Effort**: S (30 min)

### P3.8 — Color contrast pass
**Files**: various Tailwind classes throughout `src/components/`.
**What**: `text-amber-200/40`, `text-amber-300/30` fall below WCAG AA on `bg-bdo-ink`. Used in microcopy, stat labels, footer attribution.
**Approach**: Audit with Lighthouse or axe-core. Bump the lowest-contrast text to `/60` minimum.
**Effort**: S (1h)

---

## Summary

| Priority | Items | Effort | Themes |
|----------|-------|--------|--------|
| **P0** | 3 (DATA initiative + P0.1 + P0.2) | L (~14h) | True game-file data source · mobile tabs · next/image |
| **P1** | 4 | M (~7h) | Dynamic loading · dep audit · locked/main skills (⭐ user) · empty/error states |
| **P2** | 9 | L (~10h) | Loading bar · a11y · tree virtualization · mobile sheet · API fields · PvP% · icons |
| **P3** | 8 | M (~3.5h) | Polish: tagline · sort grouping · PIN header · Dmg Calc · polling · animations · focus rings · contrast |
| **Total** | **24** | **~35h** | |

> **Note**: P2.10 (combo expansion to 23 classes) from the v7 roadmap is **done** — 31/31 classes covered with 85 combos (verified 2026-09-10). Excluded from this roadmap.

---

## Recommended sprint plan

### Sprint 1 — PAZ true-data initiative (this session's focus)
- P0.DATA.1–DATA.5 — PAZ extraction + .pac parsing + tooltip XML + ingest pipeline + lurker retirement
- P2.8 (PvP% backfill) — likely moot after DATA.3

### Sprint 2 — P0 + P1 quick wins
- P0.1 Mobile tab overflow (S, 30min)
- P1.1 Dynamic tab loading (S, 1h)
- P1.2 Dep audit (S, 1h)
- P2.3 Compare button dedup (S, 10min)
- P2.2 Skip link (S, 15min)
- P3.5 Polling in background (S, 10min)
- P3.1 Tagline (S, 10min)
- P0.2 next/image migration (M, 4h)

### Sprint 3 — P1 user-facing
- P1.3 Locked/main skills toggle (M, 3h) ⭐ user-requested
- P1.4 Unified empty/error states (S, 2h)
- P2.1 Loading bar (S, 30min)
- P2.4 Tab ARIA pattern (S, 30min)
- P3.7 Focus-visible styling (S, 30min)

### Sprint 4 — P2 perf + a11y
- P2.5 Skill tree virtualization (M, 2h)
- P2.7 API field selection (M, 2h)
- P2.6 Mobile filter sheet (S, 30min)
- P3.6 Framer-motion initial animation (S, 15min)
- P3.8 Color contrast pass (S, 1h)

### Sprint 5 — P2 content + polish
- P2.9 Skill icon gap analysis (S, 1h)
- P3.2 Sort grouping (S, 30min)
- P3.3 PIN header (S, 10min)
- P3.4 Dmg Calc indicator (S, 15min)

---

## Notes

- No database migrations required for any P1–P3 item (P1.3 uses existing schema fields).
- P0.DATA may add new columns for PAZ-sourced fields (e.g. `pazSkillKey`, `frameCount`) — a `prisma db push` will be needed.
- No API breaking changes (P2.7 adds optional `?fields=` with back-compat default).
- The PAZ initiative (P0.DATA) is the user's current focus and should be worked before the rest of the backlog.
