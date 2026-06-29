# Session Handoff — READ THIS FIRST

> **If you are a new AI session starting work on this project, read this file
> and `worklog.md` BEFORE doing anything else.**

## Project: BDO Meta

A Black Desert Online skill database tool with live data synced from
bdocodex.com, including animation durations extracted via ffprobe.

## Current State (as of last commit — v2.0.0+)

- **Version**: 2.0.0+ (see `CHANGELOG.md`)
- **Database**: 7,231 skills ingested, 1,605 enriched with descriptions/damage/CC
- **Lurker**: Running in background (PID in `scripts/lurker.lock`), enriching remaining skills
- **Dev server**: Running on port 3000 (started via `node scripts/start-dev.mjs`)
- **Lint**: Clean (0 errors)
- **GitHub**: https://github.com/Random1495701/bdo-meta (token revoked, need new one to push)

## CRITICAL: Dev Server Must Use Node spawn

The dev server dies when started with `nohup`, `setsid`, or `&`. It MUST be
started using `node scripts/start-dev.mjs` which uses `spawn` with `detached: true`
and `child.unref()`. This is the only reliable way to keep it alive.

```bash
node scripts/start-dev.mjs
```

## CRITICAL: Lurker Has PID Lock

The lurker uses `scripts/lurker.lock` to prevent multiple instances. If the lurker
dies, restart it via the API:
```bash
curl -X POST http://localhost:3000/api/sync/trigger \
  -H "Content-Type: application/json" \
  -d '{"script":"lurker","phase":"daemon"}'
```

## What to Read First

1. **`CHANGELOG.md`** — Versioned history (v1.0.0 → v2.0.0+). Check `[Unreleased]`.
2. **`docs/PROJECT.md`** — Architecture, API, database schema, data sources.
3. **`worklog.md`** — Per-task agent work log (18+ tasks, 1122+ lines). Read last 3 sections.
4. **`docs/chat-history/`** — Full transcripts of all sessions (9 sessions).

## Key Features Implemented

### Data Layer
- 7,231 skills from bdocodex.com (query.php + ajax.php + tip.php)
- Animation durations via ffprobe on preview videos
- Lurker v2 with JS challenge solver (get_jhash port)
- Self-hosted class icons (31 webp files in `public/icons/classes/`)
- Garmoth API discovered: `api.garmoth.com/api/skill-addons` (open, no rate limit)

### Filtering
- Multi-select: classes, skill types, protections, CC types
- Spec filtering: S (Succession) / A (Awakening) buttons on class chips
  - Clicking class icon activates BOTH specs
  - S and A can be toggled independently
  - Spec-aware deduplication (Prime replaces Main/Absolute, Absolute replaces Main)
- "PvP CC only" filter (first in CC types)
- Max-rank filtering (only highest rank per skill shown)
- Evasion filtering (excluded by default)
- Dynamic slider ranges (percentile-based, with Black Spirit 20m jump button)

### Damage Calculation
- Per-phase breakdown (Attack 1, Attack 2, etc.)
- Total PvE damage + Total PvP damage
- X+Y CC counter display (e.g., "1+1" for Stun+Knockdown)
- PvE-only CCs excluded from PvP counter

### UI
- BDO in-game theme (dark leather + gold + serif)
- Three view modes: Grid, List, Table (sortable columns + column picker)
- 15-second auto-refresh (no flicker, preserves user state)
- Skill detail drawer: Damage → Cooldown → Protection → CC → Animation
- Protection icons: 💪 SA, 🛡 FG, ✦ IF
- CC symbols: ⚡ Stun, ✦ Stiffness, ❄ Freeze, ↓↓ Knockdown, ↑↑ Float, ⬇ Bound, ✊ Grapple, ← Knockback

### CC System (from foundry + garmoth guides)
- 8 real CCs: Stun(1), Stiffness(0.7), Freeze(1), Knockdown(1), Float(1), Bound(1), Grapple(1), Knockback(0.7)
- At 2 counters, target is CC-immune. Stiffness + 2 CCs can reach 2.7 (bypasses cap)
- Non-CC effects: displacements, DoTs, smashes (shown separately)

## How to Continue Work

### 1. Check the Lurker
```bash
cat scripts/lurker.state.json    # current progress
ps aux | grep sync-lurker        # is it running?
```

### 2. Check the Dev Server
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/  # should be 200
tail -20 dev.log  # check for errors
```

### 3. Check the Database
```bash
bun run scripts/count.ts  # total/enriched/video/animation counts
```

### 4. Before Making Changes
- Read `CHANGELOG.md` and `worklog.md` (last 3 sections)
- Run `bun run lint` to verify clean state
- **Do NOT kill the lurker process**

### 5. After Making Changes
- Update `CHANGELOG.md` under `[Unreleased]`
- Append work to `worklog.md` with next Task ID
- Commit to git
- Export fresh DB snapshot: `curl -s http://localhost:3000/api/export?enriched=true -o db/skills-export.json`

## Important Files

| File | Purpose |
|------|---------|
| `CHANGELOG.md` | Versioned changelog (v1.0.0 → v2.0.0+) |
| `docs/PROJECT.md` | Full project documentation |
| `docs/SESSION_HANDOFF.md` | This file — read first |
| `docs/IMPROVEMENT_PLAN.md` | 20 prioritized improvement items |
| `docs/VIDEO_PARSING_PLAN.md` | Plan for video duration correction (not executed) |
| `docs/PAZ_EXTRACTION.md` | Guide for extracting data from BDO game files |
| `docs/chat-history/` | 9 session transcripts |
| `worklog.md` | 18+ task work logs (1122+ lines) |
| `prisma/schema.prisma` | Database schema |
| `scripts/sync-lurker.ts` | Lurker v2 daemon (JS challenge solver) |
| `scripts/sync-skills.ts` | Fast sync script |
| `scripts/start-dev.mjs` | Dev server launcher (MUST use this) |
| `scripts/lurker.state.json` | Lurker heartbeat (committed) |
| `scripts/lurker.lock` | Single-instance PID lock |
| `db/skills-export.json` | JSON export of enriched skills (2.2MB, committed) |
| `db/custom.db` | SQLite DB (102MB, NOT committed — in .gitignore) |

## GitHub Backup

- **Repo**: https://github.com/Random1495701/bdo-meta
- **Token**: REVOKED by user. Need new token to push.
- **Remote URL**: `https://github.com/Random1495701/bdo-meta.git` (clean, no token)
- All version tags (v1.0.0 through v2.0.0) are pushed
- DB is exported as JSON (`db/skills-export.json`) since SQLite is too large for GitHub

## Common Pitfalls

1. **Don't kill the lurker** — it's enriching skills in the background
2. **Use `node scripts/start-dev.mjs`** to start dev server (not `bun run dev &`)
3. **Don't use `bun run build`** — only `bun run dev` (port 3000 only)
4. **Don't create new routes** — only `/` is user-visible
5. **Don't use indigo/blue colors** — BDO theme is dark + gold
6. **Always commit the JSON export** — it's the enriched skill data backup
7. **Check `CHANGELOG.md` before starting** — avoid redoing completed work
8. **Append to `worklog.md`, don't overwrite**
9. **Don't commit `db/custom.db`** — it's 102MB, exceeds GitHub limit
10. **Token hygiene** — never save GitHub tokens to files
