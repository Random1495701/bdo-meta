# BDO Meta — Project Documentation

> **Black Desert Online skill database tool** with live data synced from
> bdocodex.com, including animation durations extracted via ffprobe.

## Quick Start

```bash
bun run dev          # start dev server on port 3000
bun run lint         # check code quality
bun run db:push      # push Prisma schema to SQLite
```

The app runs at `http://localhost:3000/` (only the `/` route is user-visible).

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js 16 App Router                    │
│                                                               │
│  src/app/page.tsx          ← Main UI (only user route)       │
│  src/app/layout.tsx        ← Root layout + Providers         │
│  src/app/api/              ← API routes (see below)          │
│                                                               │
│  src/components/skills/    ← UI components                   │
│    header.tsx              ← Title + search + sort           │
│    class-bar.tsx           ← Class icon selector             │
│    filter-sidebar.tsx      ← Advanced filters                │
│    skill-grid.tsx          ← Responsive skill grid           │
│    skill-card.tsx          ← Ornate skill card               │
│    skill-detail-drawer.tsx ← Right-side detail panel         │
│    sync-footer.tsx         ← Sticky footer + sync controls   │
│    pagination.tsx          ← Page navigation                 │
│    providers.tsx           ← TanStack Query provider         │
│                                                               │
│  src/lib/                                                    │
│    db.ts                   ← Prisma client                   │
│    skills.ts               ← Types + API helpers + constants │
│    skill-store.ts          ← Zustand filter state            │
│    utils.ts                ← cn() helper                     │
│                                                               │
│  prisma/schema.prisma      ← Database schema                 │
│  db/custom.db              ← SQLite database (committed)     │
│                                                               │
│  scripts/                                                    │
│    sync-skills.ts          ← Fast aggressive sync (v1)       │
│    sync-lurker.ts          ← Polite lurker daemon (v2)       │
│    lurker.state.json       ← Lurker heartbeat (committed)    │
│    lurker.lock             ← Single-instance PID lock        │
│                                                               │
│  docs/                    ← This documentation               │
│  CHANGELOG.md             ← Versioned changelog              │
│  worklog.md               ← Agent work log (per-task)        │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/skills` | Paginated filtered skill list (max-rank + evasion filtered by default) |
| GET | `/api/skills/[id]` | Full skill detail with prerequisites + related ranks |
| GET | `/api/stats` | Aggregate counts, class breakdown, type breakdown, sync logs |
| GET | `/api/classes` | All BDO classes with skill counts |
| GET | `/api/ranges` | Min/max values for slider fields |
| GET | `/api/sync/status` | Sync progress + lurker state |
| POST | `/api/sync/trigger` | Trigger sync (sync or lurker script) |
| GET | `/api/export` | Export DB as JSON (enriched-only or all) |
| POST | `/api/upload/skills-json` | Import JSON to enrich DB |

### Skill Filter Parameters (`GET /api/skills`)

| Param | Values | Default |
|-------|--------|---------|
| `q` | Search string (name, KR name, description, command, or skill ID) | — |
| `class` | Class ID (0–34) or `all` | `all` |
| `type` | `main` \| `awakening` \| `succession` \| `absolute` \| `blackspirit` \| `passive` \| `all` | `all` |
| `protection` | `Super Armor` \| `Forward Guard` \| `I-Frame` \| `Crouching` \| `none` | — |
| `cc` | Comma-separated CC types (Knockback, Stun, Float, ...) | — |
| `minLvl` / `maxLvl` | Required level range | — |
| `minCd` / `maxCd` | Cooldown range (seconds) | — |
| `minAnim` / `maxAnim` | Animation duration range (ms) | — |
| `hasVideo` | `true` \| `false` | — |
| `hasAnim` | `true` \| `false` | — |
| `quickslot` | `true` \| `false` | — |
| `sort` | `skillId` \| `name` \| `level` \| `cooldown` \| `anim` \| `class` \| `sp` | `skillId` |
| `order` | `asc` \| `desc` | `asc` |
| `page` | Page number | `1` |
| `pageSize` | Items per page (max 100) | `24` |
| `maxRank` | `true` \| `false` — show only highest rank per skill | `true` |
| `filterEvasion` | `true` \| `false` — exclude evasion skills | `true` |

## Database Schema

### `BdoClass`
- `id` (Int, PK) — bdocodex class ID (0–34)
- `name`, `slug`, `iconPath`, `awakened`, `mainWeapon`, `awakeningWeapon`

### `Skill`
- `skillId` (Int, unique) — bdocodex skill ID
- `groupId` — skill group (links rank variants I/II/III/...)
- `name`, `krName`, `className`, `classId`
- `iconPath`, `requiredLevel`, `maxLevel`, `skillPoints`
- `command`, `cooldown`, `cooldownSec`
- `description`, `damageRowsJson` (JSON array of damage/effect rows)
- `ccTypes`, `protectionTypes` (comma-separated)
- `pvpDamagePercent`
- `isQuickSlot`, `isAbsolute`, `isAwakening`, `isSuccession`, `isBlackSpirit`, `isPassive`
- `prerequisiteIds` (comma-separated skill IDs)
- `videoUrl`, `animationDurationMs` (extracted via ffprobe)
- `tooltipRawHtml`, `addonsJson`
- `syncedAt`

### `SyncLog`
- `type`, `status`, `count`, `total`, `message`, `createdAt`

## Data Sources

### bdocodex.com (Primary)
bdocodex mirrors BDO's PAZ game files and exposes three endpoints:

1. **`query.php?a=skills&type=skillbuilder&id=1&l=us`** — full skill roster
   (DataTables JSON, ~7,231 rows). Single request.

2. **`ajax.php?a=skill_list2&class_id=N&l=us`** — per-class skill tree HTML
   with group IDs, SP costs, prerequisites, and skill-type flags. 35 requests.

3. **`tip.php?id=skill--<id>&l=us&nf=on`** — per-skill tooltip HTML with
   description, damage rows, CC, protection, cooldown, command, video URL.
   7,231 requests (rate-limited).

### Animation Durations
bdocodex doesn't expose animation durations. We extract them from preview
videos using ffprobe:
```bash
ffprobe -v error -show_entries format=duration -of csv=p=0 \
  "https://bdocodex.com/ui_movie/movie_pc_skill/.../<skill>.webm"
```
The video duration IS the skill animation duration.

### BDO Game Files (Alternative)
Users can extract skill data directly from BDO game files using
[UnPAZ](https://github.com/AngeloCairo/BDO-UnPAZ):
1. Extract PAZ archives from BDO installation
2. Look for `ui_data/skill/skill*.xml`
3. Upload via the Data dialog in the footer

## Sync System

### Fast Sync (`scripts/sync-skills.ts`)
Aggressive concurrent sync. May trigger bdocodex bot detection after ~150
requests. Use for initial bulk loads.

```bash
bun run scripts/sync-skills.ts --phase list      # skill roster
bun run scripts/sync-skills.ts --phase trees     # class trees
bun run scripts/sync-skills.ts --phase tooltips  # tooltips (rate-limited)
bun run scripts/sync-skills.ts --phase videos    # animation durations
bun run scripts/sync-skills.ts --phase all       # everything
```

### Lurker v2 (`scripts/sync-lurker.ts`)
Polite background daemon that avoids bot detection:

1. **JS challenge solver** — ports bdocodex's `get_jhash()` to TypeScript
2. **Single-instance PID lock** — prevents competing processes
3. **Endpoint rotation** — alternates `/us/skill/<id>/` and `tip.php`
4. **Session cookies** — reuses `__js_p_`, `__jhash_`, `__jua_` cookies
5. **Jittered delays** — 1.5–3.5s + 10% chance of 5–12s pause
6. **Single concurrency** — one request at a time
7. **Random skill order** — shuffles queue to avoid sequential ID patterns
8. **Per-endpoint cooldown** — 5 min on bot-challenge
9. **Deep sleep** — 5 min when all endpoints blocked

```bash
bun run scripts/sync-lurker.ts                  # daemon (run until done)
bun run scripts/sync-lurker.ts --batch 100      # process 100 skills
bun run scripts/sync-lurker.ts --videos         # animation durations only
bun run scripts/sync-lurker.ts --kr-names       # Korean names only
bun run scripts/sync-lurker.ts --re-enrich      # re-fetch all skills
bun run scripts/sync-lurker.ts --once 1119      # single skill
```

## UI/UX Design

### BDO In-Game Theme
- **Colors**: Dark leather (`#0a0908`, `#1a1612`) + gold accents (`#c8aa44`,
  `#f0d060`, `#9c7e2e`)
- **Typography**: EB Garamond serif for headings, sans-serif for body
- **Components**: Ornate gold-framed skill icons, dark recessed inputs,
  BDO-style tooltip panel for detail drawer
- **Utility classes**: `.bdo-frame`, `.bdo-leather`, `.bdo-title`, `.bdo-chip`,
  `.bdo-icon-frame`, `.bdo-btn`, `.bdo-input`, `.bdo-pulse`, `.bdo-loadbar`

### Auto-Refresh
- Skill grid: `refetchInterval: 15000` with `placeholderData: (prev) => prev`
- Skill detail drawer: `refetchInterval: 15000`
- User state (filters, scroll, open drawer) is preserved across refreshes
- "Updated Ns ago" indicator in header
- 2px gold loading bar during refetches

### Sticky Footer
- Sync progress bars (tooltips + animations)
- Lurker status indicator (gold pulse when active)
- Lurker dropdown (daemon, batch, videos, kr-names, re-enrich)
- Fast Sync dropdown (list, trees, tooltips, videos, full)
- Data dialog (import JSON, export JSON, BDO game file instructions)

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui (New York)
- **Database**: Prisma ORM + SQLite
- **State**: Zustand (client) + TanStack Query v5 (server)
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **Fonts**: EB Garamond (serif) + system sans-serif

## Development Notes

- The dev server runs on port 3000 only. Never use `bun run build`.
- `bun run dev` outputs to `dev.log` — check it for errors.
- The lurker daemon runs in the background via `POST /api/sync/trigger`.
- The SQLite DB is committed to git for backup continuity.
- The worklog.md tracks all agent work per task ID.
