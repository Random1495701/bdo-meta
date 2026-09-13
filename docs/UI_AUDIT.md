# BDO Meta — UI/UX/Branding/Optimization Audit

> **Task ID**: UI-AUDIT
> **Date**: 2026-07-06
> **Auditor**: ui-audit-agent
> **Method**: Source-code read + Agent Browser screenshots (8 tabs + skill drawer + mobile 375px) + VLM visual analysis
> **Scope**: All 8 main views (Data, Meta, Matchups, Tiers, Patches, Sessions, Dmg Calc, Docs) + header, tab-switcher, sync-footer, skill-card, skill-detail-drawer, globals.css, logo.svg

Screenshots: `docs/ui-audit-screenshots/` (01-data, 02-meta, 03-matchups, 04-tiers, 05-patches, 06-sessions, 07-dmgcalc, 08-docs, 09-skill-drawer, 10-mobile-data).

---

## Executive Summary

BDO Meta is a **visually rich, thematically cohesive** dark-gold BDO-styled skill database. The team has invested heavily in custom CSS (`globals.css` 396 lines of BDO-specific utilities: `bdo-frame`, `bdo-leather`, `bdo-title`, `bdo-chip`, `bdo-btn`, `bdo-input`, `bdo-icon-frame`, `bdo-stat-box`, `bdo-divider`, `bdo-pulse`, `bdo-loadbar`), the ornate SVG `logo.svg` (animated halo + ember + sword-as-B-monogram with `prefers-reduced-motion` fallback), and consistent amber/gold-on-ink palette (`#0a0908` bg, `#c8aa44` primary, `#f0d060` bright, `#9c7e2e` dim, `#d9c79a` parchment). The information architecture is solid: 8 clearly-labelled tabs, a sticky header, sticky filter sidebar, sticky tab bar, and a feature-rich sync footer.

**Top strengths**: theme cohesion, custom BDO visual language, comprehensive feature set across 8 views, keyboard shortcuts (1-7, /, ?, Esc, arrows), tri-state filter chips, scroll-synced portraits on Meta cards, the ornate logo.

**Top weaknesses (by impact)**:
1. **P0 — Mobile tab bar overflows at 375px**: the 8-tab tablist measures 890px wide in a 375px container, only ~7 tabs are visible, "Docs" is clipped, and there is no horizontal scroll affordance. Mobile users literally cannot reach Docs without knowing the `7` keyboard shortcut.
2. **P0 — No `next/image`**: 38 raw `<img loading="lazy">` tags across skill cards, meta cards, matchups, tier rows, docs, etc. Skill icons (3,069 files in `/public/icons`) and portraits (118 files) ship at native resolution with no responsive sizing, no AVIF/WebP, no blur placeholder. The Meta tab alone renders 31 portrait backgrounds at full size.
3. **P1 — Heavyweight dependencies**: `@mdxeditor/editor` (Docs), `recharts` (radar chart on Tiers), `react-syntax-highlighter`, `framer-motion`, `embla-carousel-react`, plus 25+ shadcn radix packages — many likely unused. No `next/dynamic` lazy-loading of tab contents, so all 8 tabs (Tier radar chart, MDX editor, Dmg Calc, Matchups, etc.) ship in the same client bundle.
4. **P1 — No "locked skills" / "main skills" filter**: user explicitly requested this. The schema has `isPassive`, `isFlow`, `isCore`, `isBlackSpirit`, `isAbsolute`, `isAwakening`, `isSuccession`, `isQuickSlot` flags but the FilterSidebar exposes only `types` (which mixes these) — there's no clean toggle to show "only main build skills" or "show locked skills separately".
5. **P2 — Inconsistent empty/error/loading patterns**: Meta uses `animate-pulse` skeleton cards, Patches has no skeleton, Sessions has a trophy-icon empty state, Matchups has no error state visible. No unified `<EmptyState>` / `<ErrorState>` component.

---

## 1. Strengths

### 1.1 Branding & Visual Identity (Excellent)
- **Logo** (`public/logo.svg`, 4.7KB): ornate occult seal — sword forming the spine of a B monogram, gold filigree ring, cardinal diamond ornaments, diagonal runic ticks, animated amber halo (`bdo-glow-pulse` 4.5s) + ember flicker (`bdo-ember-flicker` 3.2s). Has `prefers-reduced-motion` fallback that pins opacity. Reads on any backdrop via dark disc background. Title/desc tags present for AT users. Matches the in-game BDO aesthetic perfectly.
- **Color palette** (`globals.css` lines 46-55): 8-token palette (`bdo-ink #0a0908`, `bdo-leather #1a1612`, `bdo-leather-dark #0d0a08`, `bdo-gold #c8aa44`, `bdo-gold-bright #f0d060`, `bdo-gold-dim #9c7e2e`, `bdo-parchment #d9c79a`, `bdo-rust #6b4423`) — duplicated as shadcn tokens (`--primary`, `--accent`, `--ring`, `--chart-1..5`) so all shadcn components inherit the BDO theme. Both `:root` and `.dark` map to the same dark values, so the app is always-dark by design.
- **Custom utility classes** (16 utilities): `bdo-frame`, `bdo-frame-glow`, `bdo-recessed`, `bdo-leather`, `bdo-title`, `bdo-heading`, `bdo-divider`, `bdo-chip`/`bdo-chip-on`, `bdo-icon-frame`, `bdo-stat-box`, `bdo-btn`, `bdo-input`, `bdo-link`, `bdo-pulse`, `bdo-loadbar`, `bdo-fade-in`. Plus 3 keyframe animations. These give the entire app a consistent hand-crafted look that doesn't rely on Tailwind defaults.
- **Texture overlays** (`globals.css` lines 137-155): radial gold gradient at 20%/0% + radial rust gradient at 80%/100% + linear bg gradient + 4%-opacity SVG fractal-noise overlay = "worn leather" feel without impacting performance (pointer-events: none, fixed position).

### 1.2 Typography Hierarchy (Good)
- `font-serif` (BDO serif) for titles via `.bdo-title` (gold `#f0d060` with text-shadow glow).
- `font-sans` (Geist Sans) for body.
- `font-mono` (Geist Mono) for tabular numbers — used consistently in `StatPill`, `MiniStat`, sync-footer stats, tier scores.
- Hierarchy: `bdo-title text-xl` (h1, app name) → `bdo-title text-2xl` (page titles like "BDO Meta", "Class Matchups", "Patch Notes") → `bdo-heading text-[11px] uppercase tracking-widest` (section headers) → `text-xs` body → `text-[10px]` microcopy. Consistent across all 8 tabs.
- `tabular-nums` is applied everywhere numbers are shown — no jitter on stat refresh.

### 1.3 UX Interaction Patterns (Strong)
- **Keyboard shortcuts** (`page.tsx` lines 80-148): `/` focus search, `1-7` switch tabs, `Esc` close drawer/panel, `?` show help overlay, arrow keys + Enter for grid nav. Tree view has its own arrow handler (Q3.3). Skips when typing in input/textarea/contentEditable. Help overlay (`showHelp`) is a BDO-styled modal listing all shortcuts.
- **Optimistic UI**: `UpdatedIndicator` (`header.tsx` lines 130-175) subscribes to react-query cache, shows "Updated Ns ago" with a `bdo-fade-in` pulse on every fresh data fetch. Gold sparkles icon.
- **Toast notifications**: `sonner` toasts in sync-footer for sync triggers ("Lurker started (PID …)", "Full sync started", "Uploaded X skills imported, Y skipped").
- **Tri-state filter chips**: include / exclude / off, persisted in `localStorage` (`savedFilters`).
- **Collapsible filter sections** (`filter-sidebar.tsx`): each section has a ▾/▸ toggle persisted to `localStorage` via `filter-section-toggle` custom event for same-tab sync.
- **Mobile filters sheet**: shadcn `Sheet` side="left" with `FilterSidebar` reused.
- **Sticky elements**: tab bar `top-0 z-40`, header `top-0 z-30`, sidebar `top-[152px] h-[calc(100vh-152px)]`, meta sub-header `top-0 z-30`. All use `backdrop-blur` + `bg-bdo-ink/95` for the BDO frosted-glass look.
- **Skill card hover**: `whileHover={{ y: -3 }}` spring animation (framer-motion) + radial gold glow overlay.
- **BDO-themed scrollbar**: global webkit + Firefox `scrollbar-width: thin` + gold gradient thumb. Class bar uses thinner 6px variant.

### 1.4 Data Density & Feature Coverage (Excellent)
- 8 tabs each have substantial content: Data (grid/list/table/tree + 4 sort options + 11 sort fields + search + 4 view modes), Meta (cards/table + 10 sort keys + combo search/filter + spec comparison modal), Matchups (Arena 3v3 team builder + class matchup table + SA-DR heatmap), Tiers (custom weighted scoring with 12 params + 5 presets + radar chart + per-row expansion), Patches (per-class changes with search + buff/nerf filters), Sessions (screenshot upload + manual entry), Dmg Calc (multi-input calculator with formula breakdown), Docs (overview + data sources + spec explanations).
- Meta API exposes 15+ computed stats per spec (avgDpcPvP, protectedCoverage, saDr, grabCount, etc.) and the UI surfaces them all without overwhelming.

### 1.5 Accessibility Foundations (Mixed — see Weaknesses for gaps)
- Tabs use `role="tablist"` + `role="tab"` + `aria-selected`.
- Skill cards use `role="button"` + `tabIndex={0}` + `onKeyDown` for Enter/Space.
- Filter section toggles have `aria-label`.
- View-mode toggle has `role="group"` + `aria-label` + `aria-pressed`.
- Sheet uses `SheetTitle` with `sr-only` for screen readers.
- Logo has `<title>` and `<desc>` tags.

---

## 2. Weaknesses

### 2.1 Mobile / Responsive (P0 + P1)
- **P0 — Tab bar overflow at 375px**: measured via `agent-browser eval` — `[role=tablist]` scrollWidth=890px in 375px viewport. The 8 tabs (`Data`, `Meta`, `Matchups`, `Tiers`, `Patches`, `Sessions`, `Dmg Calc`, `Docs`) plus the version dropdown (`v5.9.5`) total 890px wide; only ~7 tabs + version dropdown are visible. **"Docs" tab is clipped** and there's no horizontal scroll affordance, no overflow indicator, no "more" menu. A mobile user cannot navigate to Docs without knowing the `7` keyboard shortcut. Confirmed by VLM analysis of the mobile screenshot. **File**: `src/components/skills/tab-switcher.tsx` lines 64-130.
- **P1 — Header wraps awkwardly on mobile**: the header has 2 rows (title+actions / search+stats). On 375px the search box, sort dropdown, sort-order button, refresh button, view-mode toggle, filters button, and 3 stat pills all compete for space. The stat pills wrap to a second row, pushing the search box down. No `min-w-0` on the title container causes the truncation to work, but the actions cluster needs review.
- **P1 — Sync footer wraps to 4+ rows on mobile**: total/enriched/video/anim stats + 2 progress bars + Stop Lurker button + Data/Lurker/Fast Sync dropdowns + attribution. On mobile this becomes a tall stack with no clear visual grouping. The "Stop Lurker" button is placed in the middle of the row, breaking the left-stats / right-actions convention.
- **P2 — Class bar (31 classes × 1-3 spec chips each) at 375px**: scrollable horizontally but no visible scroll affordance other than the thinner scrollbar. New users may not realize they can scroll.

### 2.2 Image Optimization (P0)
- **38 raw `<img loading="lazy">` tags** with no `next/image`. Skills icons (3,069 files), portraits (118 files), class icons (under `/icons/classes/`), spec portraits (under `/icons/portraits/specs/`) all ship at native resolution. No responsive `sizes`, no AVIF/WebP, no blur placeholder, no width/height attributes (causes CLS as images load).
- **Meta cards use full-size portrait as background** (line 138-149 of `meta-page.tsx`): `<img src={bgPortraitUrl} className="h-full w-full object-cover" loading="lazy" />` — 31 cards × ~150KB portrait = ~4.7MB downloaded on first paint. No thumbnail variant used.
- **SpecPortrait component** (`matchups-page.tsx` lines 60-81): tries 2-3 URL variants on error, but no `next/image` and no width/height.
- **Recommendation**: migrate to `next/image` with `fill` + `sizes` for backgrounds, explicit `width`/`height` for icons. Add `placeholder="blur"` for portraits. Configure `next.config.js` `images.formats = ['image/avif', 'image/webp']`. Consider generating 64px / 128px / 256px thumbnails for skill icons (currently the same full-res icon is used for the 48px card thumbnail and the 128px drawer thumbnail).

### 2.3 Bundle Size (P1)
- `package.json` deps include **heavyweights** that may be under-used:
  - `@mdxeditor/editor` (^3.39.1) — only used in Docs page (if at all — needs verification).
  - `recharts` (^2.15.4) — only used in `tier-radar-chart.tsx`.
  - `react-syntax-highlighter` (^15.6.1) — used in Docs.
  - `embla-carousel-react` (^8.6.0) — needs verification of usage.
  - `framer-motion` (^12.23.2) — used heavily across Meta, Tiers, Matchups, SkillCard.
  - 25+ `@radix-ui/*` packages — many shadcn primitives may be unused (e.g., `react-accordion`, `react-aspect-ratio`, `react-context-menu`, `react-menubar`, `react-navigation-menu`).
- **No `next/dynamic` lazy-loading of tab contents**: `page.tsx` statically imports all 8 page components (`MetaPage`, `MatchupsPage`, `TierListPage`, `PatchesPage`, `SessionTrackerPage`, `DamageCalculatorPage`, `DocsPage`) — all bundled into the initial client bundle even though only one is visible at a time. Each tab switch is instant (no SSR), but the initial download is large.
- **Recommendation**: audit unused radix packages with `depcheck`. Convert tab page imports to `next/dynamic(() => import(...), { ssr: false, loading: () => <Skeleton/> })` so the radar chart / MDX editor / syntax highlighter only load when their tab is opened. This should cut the initial bundle substantially.

### 2.4 "Locked Skills" / "Main Skills" Filter (P1 — user-requested feature)
- The Prisma schema already has `isPassive`, `isFlow`, `isCore`, `isBlackSpirit`, `isAbsolute`, `isAwakening`, `isSuccession`, `isQuickSlot`, `requiredLevel` flags.
- The FilterSidebar (`src/components/skills/filter-sidebar.tsx`, 831 lines) exposes `types` (which mixes these flags via the `SKILL_TYPE_META` enum — main / awakening / succession / blackspirit / passive / flow / core / rabam / absolute / prime / training / buff / etc.) — but there's no single toggle for "show only my main build skills" or "highlight locked skills separately".
- **The user wants** (per task description) a "locked skills" and "main skills" toggle. Reasonable interpretation:
  - **Main skills toggle**: filter to the player's main build path — Prime + Absolute + Awakening XOR Succession skills, excluding Flow:, Core:, Black Spirit, Passives, Training. This is the "what should I hotbar" view.
  - **Locked skills toggle**: highlight (or filter to) skills that require unlocking beyond level — i.e., Flow:, Core:, Black Spirit, Rabam, and skills with `requiredLevel > 60` (or some threshold). Visually grey them out (like in-game) when toggled off.
- **Files to modify**: `src/lib/skill-store.ts` (add `mainSkillsOnly?: boolean` and `hideLocked?: boolean` to `SkillFilters`), `src/components/skills/filter-sidebar.tsx` (add 2 switches under a new "Build Focus" section), `src/app/api/skills/route.ts` (apply the new filters server-side), `src/components/skills/skill-card.tsx` (visual treatment for locked skills).

### 2.5 Empty / Error / Loading State Inconsistency (P2)
- **Meta page** (`meta-page.tsx` lines 783-792): `isLoading` → 12 skeleton cards with `animate-pulse`. `isError` → "Failed to load meta data. Make sure the database is restored." (no retry button). `isSuccess` → grid. Good.
- **Patches page**: no skeleton visible — likely shows empty state during load.
- **Sessions page**: well-designed empty state (trophy icon + "No sessions logged yet" + guidance). Good pattern, but unique to this page.
- **Matchups page**: no visible error state. If `/api/meta` fails, the table just renders empty.
- **Tiers page**: same as Meta — depends on `/api/meta`.
- **Dmg Calc**: "No skills added yet" passive message — could be more inviting with a CTA.
- **Data tab**: relies on `useQuery(['skills'])` — empty results show "No skills match these filters" (need to verify). 
- **Recommendation**: build a shared `<EmptyState icon title description action?>` and `<ErrorState message onRetry>` component (in `src/components/ui/`). Apply uniformly across all 8 tabs. Replace the ad-hoc error text in Meta.

### 2.6 Visual Polish Issues (P2)
- **Next.js dev overlay badge** ("1 Issue" with red X) appears in bottom-left of every screenshot. This is dev-only and won't appear in production, but it's misleading during the audit and should be acknowledged. (No action required.)
- **Stat pill wrapping on mobile**: the 3 stat pills (skills/enriched/animation) wrap to multiple rows on narrow screens, breaking the search-box-on-same-line pattern.
- **Meta sort button cluster** (`meta-page.tsx` lines 757-777): 10 sort buttons in a single row. On tablet (~768px) these wrap to 2-3 rows. No visual grouping. Consider a `Select` dropdown for less-common sort keys.
- **Tiers sidebar sliders**: 12 parameter sliders all at value 50 in the "Balanced" preset. Hard to tell which slider is which without reading the tiny label. Mini bar charts next to each rank are color-coded by category (Damage=red, CC=yellow, Protection=blue, Defense=green) — but in the screenshot, "teal bars" appeared (per VLM) suggesting `iFrameCount` (color `#a78bfa` purple) may be rendering as teal due to monitor color. Worth verifying.
- **Dmg Calc "1/4" indicator** in Damage Scalars: VLM flagged this as unclear. It's actually the active scalar index ("1 of 4 active modifiers") but the affordance is weak.
- **Matchups "PIN" column** (`matchups-page.tsx`): the pin icon column on the right of the matchup table has no visible label or tooltip explaining its purpose (it's for pinning matchups to the top).
- **Skill card damage row** (`skill-card.tsx` lines 100-150): three values (PvE amber, PvP pink, DPC cyan) compete for space. The DPC value uses `text-[10px]` while PvE/PvP use `text-sm` — the hierarchy is correct but the row feels busy.
- **Compare button duplicated** in skill-card.tsx (lines 229-239 inline icon + lines 279-290 footer button) — both call `setCompareSkill` but the inline one doesn't open the drawer. Confusing duplicate.

### 2.7 Accessibility Gaps (P2)
- **Color contrast**: `text-amber-200/50` on `bg-bdo-ink` (very dark) — amber-200 is `#fde68a` at 50% opacity ≈ 4.5:1 contrast on `#0a0908`. Borderline AA for body text. `text-amber-200/40` and `text-amber-300/30` (used in microcopy) fall below AA.
- **`tabIndex` on tab bar**: the `role="tab"` buttons don't have explicit `tabIndex` management — by default all 8 are tabbable. For ARIA tabs pattern, only the active tab should be `tabIndex={0}` and arrow keys should move between them. Currently arrow keys navigate skill cards instead, which is confusing.
- **No `aria-live` regions**: toasts (sonner) are announced, but the `UpdatedIndicator` "Updated 3s ago" and the Lurker status badge are not — they're decorative, OK.
- **No `lang` attribute verification** — likely set in `app/layout.tsx` (not checked).
- **Search input** has `placeholder` but no `aria-label` — relies on placeholder text for AT users.
- **Skill card compare button**: `title` attribute present but no `aria-label`.
- **Dropdown menus** in sync-footer rely on `DropdownMenu` (radix) which is AT-accessible. Good.
- **Skip-to-main-content link**: not present. Add `<a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>` at the top of `page.tsx`.
- **Focus rings**: many custom `.bdo-btn` / `.bdo-chip` styles don't define a `:focus-visible` style. The default browser outline is removed by `* { @apply border-border outline-ring/50; }` — verify `outline-ring/50` actually shows on `bdo-btn` focus.

### 2.8 Performance Perception (P2)
- **No top loading bar on tab switch**: tab switches are instant (no async), so no bar needed — but `bdo-loadbar` CSS exists and is unused. Could be wired to react-query `isFetching` for the Meta/Matchups/Tiers/Patches APIs.
- **No skeleton on Patches/Sessions/Docs initial load**.
- **`react-query refetchInterval`** on `stats` (30s) and `sync-status` (5s) — fine, but the polling continues even when the tab is in the background. Consider `refetchIntervalInBackground: false`.
- **Framer-motion animations** on every Meta card (initial `opacity:0, y:10`) — for 31 cards this triggers 31 simultaneous layout animations on first paint. With `motion.div` on each, this is fine, but consider `LayoutGroup` or removing the initial animation for above-the-fold cards.
- **Skill grid**: no virtualization (24 cards per page, paginated — probably fine, but Q3.1 of v6 roadmap flagged tree virtualization).

### 2.9 API Response Sizes (P2)
- `/api/skills` returns up to 24 skills with full damage rows, tooltip raw HTML, etc. — could be 100KB+. Already flagged in v6 Q3.2 (gzip/brotli). Verify Next.js 16 default compression is on.
- `/api/meta` returns 31 classes × 3 specs × ~15 stats = ~1,400 numbers. Small payload.
- `/api/sync/status` polled every 5s — small payload.
- No field selection — clients receive the full Skill shape including `tooltipRawHtml` (which can be 5-20KB per skill). Consider a `?fields=` query param.

### 2.10 State Management (P3)
- `useSkillStore` (Zustand) is well-organized — filters, selected skill, compare skill, drawers, view mode. Persistence to localStorage via custom `savePersistedFilters` for q/classIds/specs/excludedClassIds. View mode persisted separately.
- No selectors for derived state — each component subscribes to the slices it needs via `useSkillStore((s) => s.x)`, which is the recommended Zustand pattern. No unnecessary re-renders observed in code.
- One concern: `useSkillStore.getState()` is called inside the `keydown` handler in `page.tsx` (line 99) — this is fine (no re-render), but worth noting that the handler captures `view` from React state via closure, so it's re-bound on every view change (line 148 `}, [view]`). Acceptable.

### 2.11 Branding Consistency (P3)
- "BDO Meta" branding is consistent across:
  - Header h1: `BDO Meta` + version
  - Tab bar: `BDO Meta` implicit (no explicit brand mark on the tab bar — only the header has the logo)
  - Footer attribution: "Data source: bdocodex.com · Animation durations via ffprobe · Lurker v2 solves JS challenge + endpoint rotation + PID lock"
  - Docs page h1: "BDO Meta Documentation"
  - HTML title (per browser tab): "BDO Meta — Black Desert Online Skill Database"
- **Voice/tone**: technical but casual — "Lurker v2 solves JS challenge", "Fast sync (may trigger bot challenge)", "Batch — next 100 skills". Consistent developer-friendly tone.
- **No tagline**: the subtitle "Black Desert Online skill database — synced from bdocodex.com" is functional but dry. Could lean more into the BDO theme (e.g., "The Adventurer's Codex").

---

## 3. Specific Recommendations

### P0 — Critical (do first)

#### P0.1 — Mobile tab bar overflow
**File**: `src/components/skills/tab-switcher.tsx`
**Fix**: At `lg` breakpoint keep the current row layout. Below `lg`, switch to a horizontally-scrollable flex container with `overflow-x-auto` + the `bdo-class-scroll` thin-scrollbar class (already in globals.css) + a subtle right-edge gradient fade to indicate more tabs. Optionally add `scroll-snap-type: x mandatory` so tabs snap into view. Move the version dropdown below the tab bar on mobile, or hide it behind the `?` help button. **Effort**: S (30 min).

#### P0.2 — Migrate to `next/image`
**Files**: all 38 `<img>` tags in `src/components/skills/*.tsx`; `next.config.js`.
**Fix**:
1. Configure `images.formats = ['image/avif', 'image/webp']` and `images.deviceSizes`/`images.imageSizes` in `next.config.js`.
2. Replace `<img src={iconUrl} loading="lazy" />` with `<Image src={iconUrl} width={48} height={48} alt={skill.name} className="..." />` for fixed-size icons (skill cards).
3. Replace portrait background `<img className="h-full w-full object-cover" />` with `<Image fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover" />`.
4. Add `placeholder="blur"` for portraits (generate blur placeholders via `sharp`).
5. Generate 64px / 128px / 256px thumbnail variants for skill icons (one-time script).
**Effort**: M (4 hours).

### P1 — High Priority

#### P1.1 — Lazy-load tab contents with `next/dynamic`
**File**: `src/app/page.tsx`.
**Fix**: Convert the static imports of `MetaPage`, `MatchupsPage`, `TierListPage`, `PatchesPage`, `SessionTrackerPage`, `DamageCalculatorPage`, `DocsPage` to `next/dynamic` with `ssr: false` and a BDO-themed `<Skeleton>`. Keep `DataPage` (default) static so the first paint is fast. This moves `recharts`, `@mdxeditor/editor`, `react-syntax-highlighter` out of the initial bundle. **Effort**: S (1 hour).

#### P1.2 — Audit unused dependencies
**Files**: `package.json`, all of `src/`.
**Fix**: Run `bunx depcheck`. Likely candidates for removal: `@radix-ui/react-accordion`, `react-aspect-ratio`, `react-context-menu`, `react-menubar`, `react-navigation-menu`, `react-day-picker`, `react-hook-form`, `@hookform/resolvers`, `input-otp`, `react-resizable-panels`, `cmdk` (unless used in Docs), `next-intl` (if no i18n). **Effort**: S (1 hour).

#### P1.3 — "Locked skills" / "Main skills" filter toggles
**Files**: `src/lib/skill-store.ts`, `src/components/skills/filter-sidebar.tsx`, `src/app/api/skills/route.ts`, `src/components/skills/skill-card.tsx`.
**Fix**:
1. Add to `SkillFilters`: `mainSkillsOnly?: boolean` (default false), `hideLocked?: boolean` (default false).
2. Add a new "Build Focus" section in FilterSidebar with two switches:
   - **Main Skills Only** — filters to `isAbsolute || isAwakening || isSuccession || isPrime` AND `!isPassive && !isFlow && !isCore && !isBlackSpirit && !isTraining`. The "what to hotbar" view.
   - **Hide Locked** — hides skills that require unlocking beyond the main path (Flow:, Core:, Rabam, Black Spirit) — useful for new players who haven't unlocked them yet.
3. Server-side, apply these in `route.ts` as additional Prisma `where` clauses.
4. Visually, when "Hide Locked" is OFF (default), show locked skills with a `Lock` icon overlay (lucide `Lock`) and reduced opacity (50%) in the skill card — mirroring the in-game skill tree aesthetic.
5. Persist both toggles in `savedFilters`.
**Effort**: M (3 hours).

#### P1.4 — Unified `<EmptyState>` / `<ErrorState>` / `<Skeleton>` components
**Files**: new `src/components/ui/empty-state.tsx`, `src/components/ui/error-state.tsx`; all 8 tab pages.
**Fix**:
1. `<EmptyState icon={Trophy} title="No sessions logged yet" description="..." action={<Button>Upload Screenshot</Button>} />` — already exists in Sessions, extract it.
2. `<ErrorState message="Failed to load meta data" onRetry={() => refetch()} />` — replace the ad-hoc text in Meta, apply to Matchups, Tiers, Patches.
3. `<Skeleton variant="card|table|list" count={12} />` — already used in Meta, extract & apply to all tabs.
**Effort**: S (2 hours).

### P2 — Medium Priority

#### P2.1 — Top loading bar on API fetches
**File**: new `src/components/ui/loading-bar.tsx`; integrate in `src/app/page.tsx` and tab pages.
**Fix**: A 2px gold bar at the top of the viewport that animates via the existing `bdo-loadbar` CSS keyframe whenever any react-query query is `isFetching`. Use `useIsFetching()` from `@tanstack/react-query`. **Effort**: S (30 min).

#### P2.2 — Skip-to-main-content link
**File**: `src/app/page.tsx`.
**Fix**: Add `<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] bdo-btn">Skip to content</a>` at the very top of the returned JSX. Add `id="main-content"` to the `<main>` element. **Effort**: S (15 min).

#### P2.3 — Skill card compare-button consolidation
**File**: `src/components/skills/skill-card.tsx`.
**Fix**: Remove the inline icon compare button (lines 229-239). Keep only the footer "Compare" button. Both currently call `setCompareSkill` but the inline one doesn't open the drawer — confusing duplicate. **Effort**: S (10 min).

#### P2.4 — Tab ARIA pattern fix
**File**: `src/components/skills/tab-switcher.tsx`.
**Fix**: Add `tabIndex={view === tab.id ? 0 : -1}` to each tab button (roving tabindex). Add `onKeyDown` for Arrow Left/Right to move focus between tabs. This decouples tab-keyboard-nav from the skill-card arrow nav (currently both use arrow keys, with the tab one only firing when not on a skill card). **Effort**: S (30 min).

#### P2.5 — Skill tree virtualization (Q3.1 from v6)
**File**: `src/components/skills/skill-tree.tsx` (984 lines).
**Fix**: Some classes have 90+ skill nodes. Use `@tanstack/react-virtual` (already have `@tanstack/react-query` and `react-table` — same family) to virtualize the flat-node list. The current `flatNodes` memo (Q3.3 work) makes this straightforward. **Effort**: M (2 hours).

#### P2.6 — Mobile filter sheet improvements (Q2.2 from v6)
**File**: `src/components/skills/filter-sidebar.tsx` (already in MobileFiltersSheet).
**Fix**: Add a visual legend at the top of the mobile sheet showing the 3 tri-state chip states (include / exclude / off) with example chips. Add a "Reset all filters" button at the bottom. **Effort**: S (30 min).

#### P2.7 — Field selection on `/api/skills`
**Files**: `src/app/api/skills/route.ts`, `src/lib/skills.ts`.
**Fix**: Add `?fields=id,name,iconUrl,damage,cooldown,...` query param. Default to the full shape (back-compat), but use a slim shape for the grid view (which doesn't need `tooltipRawHtml` or `damageRowsJson`). Cuts `/api/skills` response size by ~70%. **Effort**: M (2 hours).

### P3 — Low Priority

#### P3.1 — Tagline refresh
**File**: `src/components/skills/header.tsx` line 224.
**Fix**: Replace "Black Desert Online skill database — synced from bdocodex.com" with something more evocative: "The Adventurer's Codex — 7,038 skills · 31 classes · synced from bdocodex.com". **Effort**: S (10 min).

#### P3.2 — Sort button grouping on Meta
**File**: `src/components/skills/meta-page.tsx` lines 757-777.
**Fix**: Group the 10 sort buttons into 3 categories (Damage / CC / Protection) with subtle dividers, or move the less-common ones (Med PvP, IF, Prot %) into a `Select` dropdown. **Effort**: S (30 min).

#### P3.3 — Matchups PIN column header
**File**: `src/components/skills/matchups-page.tsx`.
**Fix**: Add a `<th>` with `<Pin>` icon + tooltip "Pin matchup to top" above the pin column. Currently unlabeled. **Effort**: S (10 min).

#### P3.4 — Dmg Calc scalar indicator
**File**: `src/components/skills/damage-calculator-page.tsx`.
**Fix**: Replace the "1/4" indicator with a clearer "1 of 4 active" label + a 4-dot progress indicator. **Effort**: S (15 min).

#### P3.5 — Polling in background
**Files**: `src/components/skills/header.tsx`, `src/components/skills/sync-footer.tsx`.
**Fix**: Add `refetchIntervalInBackground: false` to the `stats` and `sync-status` queries to reduce unnecessary polling when the tab is hidden. **Effort**: S (10 min).

#### P3.6 — Disable framer-motion initial animation on above-the-fold cards
**File**: `src/components/skills/meta-page.tsx`.
**Fix**: Replace `initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}` with `initial={false}` for the first 12 cards (above the fold), or use `whileInView` for cards below the fold. **Effort**: S (15 min).

---

## 4. Roadmap Cross-Reference

| v6 Item | Status | Action in v7 |
|---------|--------|--------------|
| Q1.1 Combo expansion (all 31 classes) | Not done | Carry over as v7 P2.L |
| Q1.2 Combo search/filter in Meta | **Done** (per worklog) | — |
| Q2.1 Mobile layout audit | Partially done (this audit) | Carry over as v7 P0.S (tab bar overflow) + P1.S (header/footer) |
| Q2.2 Mobile filter sheet improvements | Not done | Carry over as v7 P2.S |
| Q3.1 Skill tree virtualization | Not done | Carry over as v7 P2.M |
| Q3.2 API response compression | Not done | Carry over as v7 P2.M (field selection) |
| Q3.3 Keyboard nav in Skill Tree | **Done** (per worklog) | — |
| Q4.1 PvP% backfill | Partially done (152/1183 backfilled) | Carry over as v7 P2.M |
| Q4.2 Skill icon gap analysis | Not done | Carry over as v7 P2.S |

**New items from this audit**: P0.1 mobile tab bar, P0.2 next/image migration, P1.1 dynamic tab loading, P1.2 dep audit, P1.3 locked/main skills toggle (user-requested), P1.4 unified empty/error states, P2.1 loading bar, P2.2 skip link, P2.3 compare button dedup, P2.4 tab ARIA, P2.5 tree virtualization (was Q3.1), P2.6 mobile filter sheet (was Q2.2), P2.7 API field selection (was Q3.2), P3.1-P3.6 polish.

---

## 5. Conclusion

The BDO Meta app is **substantially complete and visually excellent** — the team has built a cohesive, theme-rich UI that genuinely evokes Black Desert Online's in-game aesthetic. The ornate SVG logo, the 16 BDO utility classes, the gold-on-ink palette, and the 8 feature-rich tabs all demonstrate careful craft.

The audit identifies **two P0 issues** that should be fixed before any new feature work: the mobile tab bar overflow (users literally can't reach Docs on iPhone SE) and the absence of `next/image` (4.7MB of portraits downloaded on the Meta tab alone). Both are well-scoped and have clear fixes.

The **P1 items** — dynamic tab loading, dependency audit, the user-requested "locked/main skills" toggle, and unified empty/error states — represent the next sprint's work. The user's "locked skills" / "main skills" feature is straightforward to implement because the Prisma schema already has all the necessary boolean flags (`isAbsolute`, `isFlow`, `isCore`, `isBlackSpirit`, `isPassive`, `isAwakening`, `isSuccession`, `isQuickSlot`).

The P2/P3 items are polish — they improve the experience incrementally but aren't blocking. They should be slotted in around the larger P0/P1 work.

The findings above are integrated into the prioritized, effort-tagged plan in `docs/ROADMAP.md` (the single final roadmap; the v7 audit roadmap is archived in `docs/archive/Archive-ROADMAP_v7.md`).
