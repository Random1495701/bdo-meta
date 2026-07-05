# BDO Meta — Rescue Beacon

> **If you're a new z.ai session with no context, read this first.**

This is the **BDO Meta** project — a Black Desert Online skill database tool.
All work is backed up to GitHub: https://github.com/Random1495701/bdo-meta

## How to recover

1. **Find the latest version** (NEVER trust version numbers in docs):
   ```bash
   cd /home/z/my-project
   git tag | sort -V | tail -1
   ```

2. **Restore from the latest tag** (NEVER from main — it may have stray auto-save commits):
   ```bash
   LATEST=$(git tag | sort -V | tail -1)
   git reset --hard "$LATEST"
   ```

3. **Set up GitHub credentials** (you'll need a PAT from the user):
   ```bash
   echo "https://Random1495701:TOKEN@github.com" > ~/.git-credentials
   chmod 600 ~/.git-credentials
   git config credential.helper store
   ```

4. **Install + build + start**:
   ```bash
   bun install
   bun run db:push
   bash .zscripts/dev.sh
   ```

5. **Verify**:
   ```bash
   curl -s http://localhost:3000/api/stats | head -c 100  # Should return JSON
   ```

## Key files

| File | Purpose |
|------|---------|
| `docs/SESSION_HANDOFF.md` | Current project state |
| `docs/ROADMAP_MASTER.md` | 3-tier roadmap (36 items) |
| `docs/KNOWN_ISSUES.md` | Open + resolved issues |
| `CHAT_HISTORY.md` | Chat session index |
| `worklog.md` | Agent work log (3000+ lines) |
| `docs/SPEC_DEDUP_LOGIC.md` | How skill spec deduplication works |

## Critical rules

1. **NEVER remove `output: "standalone"` from next.config.ts**
2. **NEVER simplify the build script's `cp` commands**
3. **NEVER use `next start` instead of `bun .next/standalone/server.js`**
4. **NEVER commit `.env` or `.zscripts/dev.pid`**
5. **ALWAYS restore from a git TAG, never from `main`**
6. **ALWAYS find the latest tag dynamically** (`git tag | sort -V | tail -1`)
7. **ALWAYS verify `main == latest tag`** after restoring
8. **ALWAYS commit + tag after meaningful changes** — don't leave work uncommitted

## DB is in git

The SQLite DB (`db/custom.db`, ~10MB) is committed to git. This ensures it survives session resets. The `scripts/restore-db.ts` script auto-runs PA Wiki import + compute-max-rank after restoring from the JSON export.
