# Session Handoff — READ THIS FIRST

> **If you are a new AI session starting work on this project, read this file
> and `worklog.md` BEFORE doing anything else.**

## Project: BDO Meta

A Black Desert Online skill database tool with live data synced from
bdocodex.com, including animation durations extracted via ffprobe.

## Current State (as of last commit)

- **Version**: 1.3.0 (see `CHANGELOG.md`)
- **Database**: 7,231 skills ingested, ~1,200+ enriched with descriptions/damage/CC/protection
- **Lurker**: Running in background (PID in `scripts/lurker.lock`), enriching remaining skills
- **Dev server**: Running on port 3000
- **Lint**: Clean (0 errors)

## What to Read First

1. **`CHANGELOG.md`** — Versioned history of all changes. Check the `[Unreleased]` section for in-progress work.
2. **`docs/PROJECT.md`** — Comprehensive project documentation (architecture, API, database schema, data sources).
3. **`worklog.md`** — Per-task agent work log. Each section has a Task ID, agent name, work log, and stage summary. Read the last few sections to understand recent work.
4. **`docs/chat-history/`** — Full transcripts of previous user-AI sessions.

## How to Continue Work

### 1. Check the Lurker
```bash
cat scripts/lurker.state.json    # current progress
ps aux | grep sync-lurker        # is it running?
```
If the lurker died, restart it via the API:
```bash
curl -X POST http://localhost:3000/api/sync/trigger \
  -H "Content-Type: application/json" \
  -d '{"script":"lurker","phase":"daemon"}'
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
- Read `CHANGELOG.md` to understand what's been done
- Read the relevant sections of `worklog.md`
- Run `bun run lint` to verify clean state
- **Do NOT kill the lurker process** — it runs in the background and enriches skills continuously

### 5. After Making Changes
- Update `CHANGELOG.md` with your changes under `[Unreleased]`
- Append your work to `worklog.md` with a new Task ID (use the next sequential number)
- Commit to git with a descriptive message
- When ready to release, move `[Unreleased]` to a new versioned section and tag it

## Conventions

### Worklog Format
Each task in `worklog.md` uses this template:
```markdown
---
Task ID: <number>
Agent: <agent name>
Task: <what you were asked to do>

Work Log:
- <step 1>
- <step 2>

Stage Summary:
- <key results>
```

### Git Commits
- Commit messages should reference the Task ID: `[Task N] description`
- The SQLite database (`db/custom.db`) is committed for backup continuity
- The lurker state (`scripts/lurker.state.json`) is committed for continuity

### Versioning
- **Major**: Breaking API or schema changes
- **Minor**: New features, endpoints, UI redesigns
- **Patch**: Bug fixes, data corrections
- Tag each release: `git tag vX.Y.Z`

## Chat History Backups

Each session's full conversation is saved in `docs/chat-history/` as:
- `session-YYYY-MM-DD-HHMM.md` — the user-AI conversation transcript

These are committed to git so they're never lost. To create a new backup at the
end of a session, save the conversation to `docs/chat-history/session-<date>.md`.

## Important Files

| File | Purpose |
|------|---------|
| `CHANGELOG.md` | Versioned changelog |
| `docs/PROJECT.md` | Full project documentation |
| `docs/SESSION_HANDOFF.md` | This file — read first |
| `docs/chat-history/` | Session transcripts |
| `worklog.md` | Per-task agent work log |
| `prisma/schema.prisma` | Database schema |
| `scripts/sync-lurker.ts` | Lurker v2 daemon (challenge solver) |
| `scripts/sync-skills.ts` | Fast sync script |
| `scripts/lurker.state.json` | Lurker heartbeat (committed) |
| `scripts/lurker.lock` | Single-instance PID lock |
| `db/custom.db` | SQLite database (committed) |

## Common Pitfalls

1. **Don't kill the lurker** — it's enriching skills in the background.
2. **Don't use `bun run build`** — only `bun run dev` (port 3000 only).
3. **Don't create new routes** — only `/` is user-visible.
4. **Don't use indigo/blue colors** — BDO theme is dark + gold.
5. **Always commit the database** — it's the enriched skill data backup.
6. **Check `CHANGELOG.md` before starting** — avoid redoing completed work.
7. **Append to `worklog.md`, don't overwrite** — use the template above.
