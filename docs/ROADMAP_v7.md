# BDO Meta — Roadmap v7.0 (Post-Audit Sprint Plan)

> **Created**: 2026-07-06
> **State**: v5.9.5 · 7,038 skills · 3,193 w/ animation · 38 real Grapples · 6 ascension classes
> **Tests**: 42/42 passing · **Lint**: clean · **GitHub**: in sync · **Server**: HTTP 200
> **Previous**: ROADMAP_v6.md (Q1.2 done, Q3.3 done, Q4.1 partial; remainder carried over)
> **Audit**: docs/UI_AUDIT.md (full UI/UX/Branding/Optimization audit)

---

## How to Read This Roadmap

Items are tagged with **Priority** (P0-P3) and **Effort** (S/M/L):
- **P0** = critical, blocks users / performance / accessibility — fix first
- **P1** = high, should ship in the next 2-week sprint
- **P2** = medium, ship in the following sprint
- **P3** = low, polish as time allows
- **S** = ≤1 hour · **M** = 1-4 hours · **L** = ≥4 hours

Items are grouped by priority; within a priority, ordered by impact/effort ratio.

---

## P0 — Critical (do first)

### P0.1 — Mobile tab bar overflow fix
**Source**: UI_AUDIT §2.1
**What**: At 375px viewport, the 8-tab tablist measures 890px wide and "Docs" is clipped — no scroll affordance, no overflow indicator. Mobile users cannot reach Docs without the `7` keyboard shortcut.
**File**: `src/components/skills/tab-switcher.tsx`
**Approach**:
- Below `lg` breakpoint, switch the tab container to `flex overflow-x-auto bdo-class-scroll` (reuse the existing thin-scrollbar class from globals.css).
- Add `scroll-snap-type: x mandatory` + `scroll-snap-align: start` on each tab for snap-to behavior.
- Add a subtle right-edge gradient fade (`bg-gradient-to-l from-bdo-ink to-transparent w-8 pointer-events-none`) to indicate more tabs exist.
- Move the version dropdown below the tab bar on mobile (or hide behind the `?` help button).
**Effort**: S (30 min)
**Acceptance**: At 375px, all 8 tabs are reachable via horizontal swipe/scroll. No tab is permanently clipped. Version dropdown still accessible.

### P0.2 — Migrate to `next/image`
**Source**: UI_AUDIT §2.2
**What**: 38 raw `<img loading="lazy">` tags ship skill icons (3,069 files) and portraits (118 files) at native resolution. The Meta tab downloads ~4.7MB of portraits on first paint. No AVIF/WebP, no responsive sizing, no blur placeholder, no width/height (CLS).
**Files**: all 38 `<img>` in `src/components/skills/*.tsx`; `next.config.js`; one-time script to generate thumbnails.
**Approach**:
1. Configure `images.formats = ['image/avif', 'image/webp']`, `images.deviceSizes = [320, 375, 414, 640, 768, 1024, 1280, 1536]`, `images.imageSizes = [16, 32, 48, 64, 96, 128, 256, 384]` in `next.config.js`.
2. Replace fixed-size skill icons `<img src={iconUrl} width={48} height={48} />` with `<Image src={iconUrl} width={48} height={48} alt={skill.name} className="object-cover" />`.
3. Replace portrait backgrounds with `<Image fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover" />`.
4. Add `placeholder="blur"` + `blurDataURL` for the top 31 portraits (one-time `sharp` script to generate tiny base64 blur placeholders).
5. Generate 64/128/256px thumbnail variants for skill icons (one-time script in `scripts/generate-thumbnails.ts`).
6. Add `width` and `height` attributes (or `fill`) to all images to eliminate CLS.
**Effort**: M (4 hours)
**Acceptance**: Lighthouse "Image formats" audit passes. Meta tab downloads <500KB of images on first paint (vs 4.7MB today). No CLS during image load.

---

## P1 — High Priority (next sprint)

### P1.1 — Lazy-load tab contents with `next/dynamic`
**Source**: UI_AUDIT §2.3
**What**: All 8 tab pages are statically imported in `page.tsx` and bundled into the initial client bundle. `recharts`, `@mdxeditor/editor`, `react-syntax-highlighter` ship even if the user never opens Tiers / Docs.
**File**: `src/app/page.tsx`
**Approach**:
- Convert `MetaPage`, `MatchupsPage`, `TierListPage`, `PatchesPage`, `SessionTrackerPage`, `DamageCalculatorPage`, `DocsPage` to `next/dynamic(() => import('@/components/skills/...'), { ssr: false, loading: () => <TabSkeleton /> })`.
- Keep the default Data tab static for fast first paint.
- Create a `TabSkeleton` component that renders 12 BDO-themed pulse cards.
- Verify that framer-motion animations on dynamically-loaded pages still work (they should — `motion` is bundled with the chunk).
**Effort**: S (1 hour)
**Acceptance**: Initial JS bundle drops by ~40-60%. Tiers tab still works (radar chart loads on demand). Docs tab still works.

### P1.2 — Audit unused dependencies
**Source**: UI_AUDIT §2.3
**What**: `package.json` includes 25+ `@radix-ui/*` packages, plus `embla-carousel-react`, `react-day-picker`, `react-hook-form`, `@hookform/resolvers`, `input-otp`, `react-resizable-panels`, `cmdk`, `next-intl`, `next-auth` — some may be unused.
**Approach**:
- Run `bunx depcheck --json > depcheck.json` and review.
- Remove confirmed-unused packages.
- For each remaining heavyweight (`@mdxeditor/editor`, `recharts`, `react-syntax-highlighter`), verify it's actually imported and worth its bundle cost. Consider lighter alternatives if not (e.g., `shiki` for syntax highlighting, custom SVG for radar chart).
**Effort**: S (1 hour)
**Acceptance**: `bun run build` succeeds. Bundle size drops. No runtime regressions on any tab.

### P1.3 — "Locked skills" / "Main skills" filter toggles (USER-REQUESTED)
**Source**: User feedback in task description; UI_AUDIT §2.4
**What**: User wants a "locked skills" and "main skills" toggle in the FilterSidebar. The Prisma schema already has `isPassive`, `isFlow`, `isCore`, `isBlackSpirit`, `isAbsolute`, `isAwakening`, `isSuccession`, `isQuickSlot`, `requiredLevel` flags — the data is there, just no clean UI for it.
**Files**: `src/lib/skill-store.ts`, `src/components/skills/filter-sidebar.tsx`, `src/app/api/skills/route.ts`, `src/components/skills/skill-card.tsx`, `src/components/skills/skill-tree.tsx`, `src/components/skills/skill-list-row.tsx`, `src/components/skills/skill-table.tsx`.
**Approach**:
1. **Schema additions** in `skill-store.ts`:
   ```ts
   interface SkillFilters {
     // ... existing
     mainSkillsOnly?: boolean  // default false
     hideLocked?: boolean      // default false
   }
   ```
   Persist both in `savedFilters`.
2. **FilterSidebar**: add a new "Build Focus" section (between "Specs" and "Skill Type") with two `Switch` toggles:
   - **Main Skills Only** — `onChange={toggleMainSkillsOnly}`. Hint: "Show only Prime + Absolute + Awakening/Succession main path skills. Hides Flow:, Core:, Black Spirit, Passives, Training."
   - **Hide Locked** — `onChange={toggleHideLocked}`. Hint: "Hide skills that require unlocking (Flow:, Core:, Rabam, Black Spirit). Useful for new players."
3. **API** (`route.ts`): apply server-side:
   ```ts
   if (filters.mainSkillsOnly) {
     where.AND = [
       { OR: [{ isAbsolute: true }, { isAwakening: true }, { isSuccession: true }, { name: { startsWith: 'Prime: ' } }] },
       { isPassive: false }, { isFlow: false }, { isCore: false }, { isBlackSpirit: false },
       { NOT: [{ name: { startsWith: 'Training:' } }] },
     ]
   }
   if (filters.hideLocked) {
     where.AND = [...(where.AND ?? []), { isFlow: false }, { isCore: false }, { isBlackSpirit: false }, { NOT: [{ name: { startsWith: 'Rabam:' } }] }]
   }
   ```
4. **Visual treatment** (`skill-card.tsx`, `skill-list-row.tsx`, `skill-table.tsx`, `skill-tree.tsx`): when `hideLocked` is OFF (default), render locked skills (Flow:, Core:, Rabam, Black Spirit) with:
   - A `Lock` lucide icon (size 3) in the top-right corner of the icon frame.
   - Reduced opacity (`opacity-60` on the whole card, `opacity-100` on the icon to keep it readable).
   - A subtle "LOCKED" tag in the badge row (only on hover, to avoid clutter).
   This mirrors the in-game skill tree aesthetic where locked skills appear greyed out.
5. **Default state**: both toggles OFF (current behavior preserved).
**Effort**: M (3 hours)
**Acceptance**:
- "Main Skills Only" reduces a 90-skill class to ~20-30 hotbar-able skills.
- "Hide Locked" removes the noise for new players.
- Locked skills have a clear visual distinction (lock icon + reduced opacity).
- Both toggles persist across reloads.

### P1.4 — Unified `<EmptyState>` / `<ErrorState>` / `<Skeleton>` components
**Source**: UI_AUDIT §2.5
**What**: Each tab has its own ad-hoc empty/error/loading pattern. Meta has 12 skeleton cards. Sessions has a trophy-icon empty state. Patches/Matchups/Tiers have no visible error state. No consistency.
**Files**: new `src/components/ui/empty-state.tsx`, `src/components/ui/error-state.tsx`, `src/components/ui/tab-skeleton.tsx`; update all 8 tab pages.
**Approach**:
1. `<EmptyState icon={LucideIcon} title={string} description={string} action?: ReactNode />` — extract from Sessions.
2. `<ErrorState message={string} onRetry?: () => void} error?: Error />` — replace Meta's ad-hoc text, apply to Matchups, Tiers, Patches.
3. `<TabSkeleton variant="card|table|list" count={12} />` — extract from Meta, apply to all tabs.
4. Each tab page's `useQuery` consumer renders `{isLoading ? <TabSkeleton/> : isError ? <ErrorState/> : isEmpty ? <EmptyState/> : <Content/>}`.
**Effort**: S (2 hours)
**Acceptance**: All 8 tabs have consistent loading/empty/error UX. Error states always have a retry button.

---

## P2 — Medium Priority (following sprint)

### P2.1 — Top loading bar on API fetches
**Source**: UI_AUDIT §2.8
**What**: The `bdo-loadbar` CSS keyframe exists in globals.css (lines 313-332) but is unused. No visible feedback when `/api/meta`, `/api/skills`, etc. are fetching in the background.
**Files**: new `src/components/ui/loading-bar.tsx`; integrate in `src/app/page.tsx`.
**Approach**:
- `useIsFetching()` from `@tanstack/react-query` returns a count of in-flight queries.
- Render a 2px gold bar at the top of the viewport (z-50) using `bdo-loadbar` when `isFetching > 0`.
- Hide with `opacity-0 transition-opacity` when count returns to 0.
**Effort**: S (30 min)

### P2.2 — Skip-to-main-content link
**Source**: UI_AUDIT §2.7
**What**: No skip link for keyboard / screen-reader users — they must tab through the entire tab bar + header + filter sidebar before reaching the main content.
**File**: `src/app/page.tsx`.
**Approach**:
- Add `<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] bdo-btn">Skip to content</a>` at the very top of each returned JSX branch (or extract into a `<SkipLink/>` component).
- Add `id="main-content"` to the `<main>` element in the Data tab branch (and equivalent in each tab branch).
**Effort**: S (15 min)

### P2.3 — Skill card compare-button consolidation
**Source**: UI_AUDIT §2.6
**What**: `skill-card.tsx` has TWO compare buttons — an inline icon (lines 229-239) that calls `setCompareSkill` but doesn't open the drawer, and a footer "Compare" button (lines 279-290) that calls both `setCompareSkill` and `setCompareOpen(true)`. Confusing duplicate.
**File**: `src/components/skills/skill-card.tsx`.
**Approach**: Remove the inline icon compare button (lines 229-239). Keep only the footer button. If the footer button's visibility is a concern (currently `ml-auto`), promote it to be always-visible on hover instead of opacity-0.
**Effort**: S (10 min)

### P2.4 — Tab ARIA pattern fix (roving tabindex)
**Source**: UI_AUDIT §2.7
**What**: The 8 tab buttons all have default `tabIndex={0}`. ARIA tabs pattern requires only the active tab be tabbable, with Arrow Left/Right moving focus between tabs. Currently arrow keys navigate skill cards, which conflicts conceptually with tab-arrow-nav.
**File**: `src/components/skills/tab-switcher.tsx`.
**Approach**:
- Add `tabIndex={view === tab.id ? 0 : -1}` to each tab button.
- Add `onKeyDown` handler on the tablist: Arrow Right → focus next tab; Arrow Left → focus previous tab; Home → first; End → last. (Don't auto-switch tabs on focus — let the user press Enter or Space to switch.)
- This decouples from the existing `1-7` number-key shortcut (which switches tabs directly).
**Effort**: S (30 min)

### P2.5 — Skill tree virtualization (was v6 Q3.1)
**Source**: ROADMAP_v6 Q3.1; UI_AUDIT §2.8
**What**: Some classes have 90+ skills in the tree view. Without virtualization, the DOM has 90+ nodes rendered simultaneously. The Q3.3 keyboard-nav work already created a `flatNodes` memo — perfect input for virtualization.
**File**: `src/components/skills/skill-tree.tsx`.
**Approach**:
- Install `@tanstack/react-virtual` (same family as react-query, ~3KB gzipped).
- Wrap the `flatNodes.map()` render in `useVirtualizer({ count: flatNodes.length, getScrollElement: () => scrollRef.current, estimateSize: () => 36 })`.
- Keep the section grouping intact by computing section start indices from `flatNodes`.
- Verify keyboard nav still works (the `nodeRefs` map keyed by skillId is unaffected by virtualization — only visible nodes have refs, but the focused node is always visible due to `scrollIntoView`).
**Effort**: M (2 hours)

### P2.6 — Mobile filter sheet improvements (was v6 Q2.2)
**Source**: ROADMAP_v6 Q2.2; UI_AUDIT §2.1
**What**: The right-side filter sidebar becomes a left-side Sheet on mobile. Tri-state chips (include/exclude/off) need clearer differentiation on small screens. No "Reset all" button.
**File**: `src/components/skills/filter-sidebar.tsx`.
**Approach**:
- Add a sticky header inside the Sheet with a "Filters" title + a "Reset all" button (calls `clearClasses`, `clearTypes`, `clearProtections`, `clearCc`, resets level/cd/anim/sp/damage ranges, clears `q`).
- Add a 3-chip legend at the top showing the 3 tri-state states (Include = gold border + check, Exclude = red border + X, Off = dim border).
- Add a sticky footer with "Show N skills" button that closes the sheet.
**Effort**: S (30 min)

### P2.7 — Field selection on `/api/skills` (was v6 Q3.2)
**Source**: ROADMAP_v6 Q3.2; UI_AUDIT §2.9
**What**: `/api/skills` returns the full Skill shape including `tooltipRawHtml` (5-20KB per skill). The grid view only needs ~10 fields. Default response is ~100KB+ for 24 skills.
**Files**: `src/app/api/skills/route.ts`, `src/lib/skills.ts`, all consumers.
**Approach**:
- Add `?fields=id,name,iconUrl,damage,cooldownSec,...` query param.
- Default: full shape (back-compat).
- Grid view: `fields=id,name,krName,iconUrl,className,command,cooldownSec,animationDurationMs,damage,damagePerCooldown,damagePerCooldownPvP,ccCounters,ccCounterDisplay,isQuickSlot,requiredLevel,patchChange,isCore,isFlow,isBlackSpirit,isPassive` (no tooltipRawHtml, no damageRowsJson).
- Verify Next.js 16 compression is enabled (it is by default in production).
**Effort**: M (2 hours)

### P2.8 — PvP% backfill completion (was v6 Q4.1)
**Source**: ROADMAP_v6 Q4.1; worklog Q4.1 entry (152/1183 done)
**What**: 1,183 max-rank skills still missing `pvpDamagePercent`. ~677 are "active-looking"; only ~4% (~27) expected to have PvP% on bdocodex. The Phase 2 script exists at `scripts/backfill-pvp-percent.ts` — just needs to run to completion in foreground (~4 min).
**File**: `scripts/backfill-pvp-percent.ts` (no code changes).
**Approach**:
- Run `bun run scripts/backfill-pvp-percent.ts --phase2` in foreground.
- Patch `scripts/sync-skills.ts` line 460 and `scripts/sync-lurker.ts` line 445 with the improved regex `/^(\d+(?:\.\d+)?)%[^]*?\bdamage in PvP/i` so future syncs capture PvP% correctly.
- Patch the description-block parser in both sync scripts to use a global regex (handle Ultimate/Prime dual-description tooltips).
**Effort**: M (2 hours including verification)

### P2.9 — Skill icon gap analysis (was v6 Q4.2)
**Source**: ROADMAP_v6 Q4.2
**What**: Some skills may have broken/missing icons (404s). Run a script to check all 3,069 icon URLs and identify gaps.
**File**: new `scripts/check-skill-icons.ts`.
**Approach**:
- For each skill in DB, HEAD the icon URL, record 404s.
- For 404s, attempt re-download from bdocodex (`https://bdocodex.com/ui_data/skill/icon/{skillId}.png`).
- Log unrecoverable gaps; the skill card fallback (first-letter-in-colored-square) already handles missing icons gracefully.
**Effort**: S (1 hour)

### P2.10 — Combo expansion to remaining 23 classes (was v6 Q1.1)
**Source**: ROADMAP_v6 Q1.1
**What**: Only 8 of 31 classes have curated combo data. Add curated PvP/PvE combos for the remaining 23 (Ranger, Tamer, Valkyrie, Kunoichi, Witch, Dark Knight, Mystic, Archer, Shai, Guardian, Hashashin, Nova, Sage, Corsair, Drakania, Woosa, Maegu, Scholar, Dosa, Deadeye, Wukong, Seraph, Maehwa).
**File**: `src/lib/combo-data.ts`.
**Approach**:
- Research community-known PvP/PvE combos per class (reddit, youtube, official forums).
- Add 4-8 combos per class (mix of PvP/PvE/Both).
- Verify the new "Search combos" bar on Meta page works with the expanded data.
**Effort**: L (3 hours research + data entry)

---

## P3 — Low Priority (polish)

### P3.1 — Tagline refresh
**File**: `src/components/skills/header.tsx` line 224.
**Change**: Replace "Black Desert Online skill database — synced from bdocodex.com" with "The Adventurer's Codex — {total} skills · {classCount} classes · synced from bdocodex.com".
**Effort**: S (10 min)

### P3.2 — Sort button grouping on Meta
**File**: `src/components/skills/meta-page.tsx` lines 757-777.
**What**: 10 sort buttons in one row wrap awkwardly on tablet.
**Approach**: Group into 3 categories (Damage / CC / Protection) with subtle dividers, or move less-common ones (Med PvP, IF, Prot %) into a `Select` dropdown.
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
**Files**: `src/components/skills/header.tsx` (stats query, 30s), `src/components/skills/sync-footer.tsx` (sync-status query, 5s).
**What**: Polling continues when the browser tab is hidden, wasting requests.
**Approach**: Add `refetchIntervalInBackground: false` to both `useQuery` calls.
**Effort**: S (10 min)

### P3.6 — Disable framer-motion initial animation on above-the-fold cards
**File**: `src/components/skills/meta-page.tsx`.
**What**: 31 Meta cards each animate `initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}` on first paint — 31 simultaneous layout animations.
**Approach**: Use `whileInView` for cards below the fold, `initial={false}` for above-the-fold cards. Or just remove the initial animation entirely — the cards appearing instantly is fine.
**Effort**: S (15 min)

### P3.7 — Focus-visible styling audit
**Files**: `src/app/globals.css` (BDO utility classes), all interactive components.
**What**: The global `* { @apply border-border outline-ring/50; }` may not produce visible focus rings on `.bdo-btn` and `.bdo-chip` because their box-shadows override the outline.
**Approach**: Add explicit `:focus-visible` styles to `.bdo-btn`, `.bdo-chip`, `.bdo-input`, `.bdo-icon-frame` in globals.css — a 2px gold ring (`outline: 2px solid var(--color-bdo-gold-bright); outline-offset: 1px;`).
**Effort**: S (30 min)

### P3.8 — Color contrast pass
**Files**: various Tailwind classes throughout `src/components/`.
**What**: `text-amber-200/40`, `text-amber-300/30` fall below WCAG AA on `bg-bdo-ink`. Used in microcopy, stat labels, footer attribution.
**Approach**: Audit with Lighthouse or axe-core. Bump the lowest-contrast text to `/60` minimum. Trade-off: some microcopy will be slightly more prominent.
**Effort**: S (1 hour)

---

## Summary

| Priority | Items | Total Effort | Themes |
|----------|-------|--------------|--------|
| **P0** | 2 | M (4.5h) | Mobile tab overflow + next/image migration |
| **P1** | 4 | M (7h) | Dynamic loading + dep audit + locked/main skills + empty/error states |
| **P2** | 10 | L (12h) | Loading bar + a11y + tree virtualization + mobile sheet + API fields + PvP% backfill + icon gap + combo expansion + dedup |
| **P3** | 8 | M (3.5h) | Polish: tagline, sort grouping, PIN header, Dmg Calc, polling, animations, focus rings, contrast |
| **Total** | **24** | **~27h** | |

---

## Cross-Reference to v6

| v6 Item | v7 Status |
|---------|-----------|
| Q1.1 Combo expansion (all 31 classes) | → P2.10 (L) |
| Q1.2 Combo search/filter in Meta | ✅ Done (carry forward as-is) |
| Q2.1 Mobile layout audit | → P0.1 (tab bar) + P2.6 (filter sheet) + P3.7 (focus rings) |
| Q2.2 Mobile filter sheet improvements | → P2.6 (S) |
| Q3.1 Skill tree virtualization | → P2.5 (M) |
| Q3.2 API response compression | → P2.7 (M — field selection) |
| Q3.3 Keyboard nav in Skill Tree | ✅ Done (Q3.3 worklog entry) |
| Q4.1 PvP% backfill | → P2.8 (M — finish Phase 2 + patch sync scripts) |
| Q4.2 Skill icon gap analysis | → P2.9 (S) |

**New in v7** (from UI_AUDIT):
- P0.2 next/image migration (new)
- P1.1 dynamic tab loading (new)
- P1.2 dep audit (new)
- P1.3 locked/main skills toggle (new, user-requested)
- P1.4 unified empty/error states (new)
- P2.1 loading bar (new)
- P2.2 skip link (new)
- P2.3 compare button dedup (new)
- P2.4 tab ARIA pattern (new)
- P3.1 tagline (new)
- P3.2 sort grouping (new)
- P3.3 PIN header (new)
- P3.4 Dmg Calc indicator (new)
- P3.5 polling in background (new)
- P3.6 framer-motion initial animation (new)
- P3.7 focus-visible styling (new)
- P3.8 color contrast pass (new)

---

## Recommended Sprint Plan

### Sprint 1 (Week 1) — P0 + P1 quick wins
- P0.1 Mobile tab bar overflow (S, 30 min)
- P1.1 Dynamic tab loading (S, 1h)
- P1.2 Dep audit (S, 1h)
- P2.3 Compare button dedup (S, 10 min)
- P2.2 Skip link (S, 15 min)
- P3.5 Polling in background (S, 10 min)
- P3.1 Tagline (S, 10 min)

**Subtotal**: ~3.5h. Plenty of room for P0.2 next/image migration (M, 4h) in the same sprint.

### Sprint 2 (Week 2) — P1 user-facing
- P1.3 Locked/main skills toggle (M, 3h) ← user-requested, prioritize
- P1.4 Unified empty/error states (S, 2h)
- P2.1 Loading bar (S, 30 min)
- P2.4 Tab ARIA pattern (S, 30 min)
- P3.7 Focus-visible styling (S, 30 min)

**Subtotal**: ~6.5h.

### Sprint 3 (Week 3) — P2 performance + accessibility
- P2.5 Skill tree virtualization (M, 2h)
- P2.7 API field selection (M, 2h)
- P2.6 Mobile filter sheet improvements (S, 30 min)
- P3.6 Framer-motion initial animation (S, 15 min)
- P3.8 Color contrast pass (S, 1h)

**Subtotal**: ~6h.

### Sprint 4 (Week 4) — P2 content + polish
- P2.8 PvP% backfill completion (M, 2h)
- P2.9 Skill icon gap analysis (S, 1h)
- P2.10 Combo expansion to 23 classes (L, 3h)
- P3.2 Sort grouping (S, 30 min)
- P3.3 PIN header (S, 10 min)
- P3.4 Dmg Calc indicator (S, 15 min)

**Subtotal**: ~7h.

---

## Notes

- All P0/P1 items are scoped for one engineer. P2.10 (combo expansion) is the only item requiring non-engineering work (community research).
- The "locked/main skills" toggle (P1.3) is the user's explicit request and should be prioritized accordingly.
- The mobile tab bar overflow (P0.1) is the most embarrassing bug — fix it first.
- The next/image migration (P0.2) is the highest-impact performance fix — schedule it before any new feature work.
- No database migrations required for any item (P1.3 uses existing schema fields).
- No API breaking changes (P2.7 adds optional `?fields=` query param with back-compat default).
