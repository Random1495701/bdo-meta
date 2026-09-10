# STARTUP PROMPT — BDO Meta

**Copy-paste this as your first message in a new z.ai session.**

---

**STOP. Read this entire message before doing anything else. Do NOT make any assumptions. Do NOT load any tools or skills yet. Do NOT start editing code. Follow these steps in exact order.**

## Step 1: Read these files FIRST (in this exact order)

1. **`/home/z/my-project/download/SESSION_RECOVERY.md`** — The single source of truth for restore.
2. **`/home/z/my-project/download/README.md`** — Rescue beacon.
3. **`/home/z/my-project/CHAT_HISTORY.md`** — Chat session index.
4. **`/home/z/my-project/worklog.md`** — Read the TAIL (last 200 lines) for recent work.
5. **`/home/z/my-project/docs/SESSION_HANDOFF.md`** — Current project state.
6. **`/home/z/my-project/docs/ROADMAP_MASTER.md`** — 3-tier roadmap.
7. **`/home/z/my-project/next.config.ts`** — Verify it contains `output: "standalone"`. MANDATORY.
8. **`/home/z/my-project/package.json`** — Verify build script has `cp` commands and start uses `bun .next/standalone/server.js`.

## Step 2: Verify project state

```bash
cd /home/z/my-project
git status --short                    # Should be empty
git tag | sort -V | tail -3           # Show latest 3 tags
LATEST=$(git tag | sort -V | tail -1)
[ "$(git rev-parse HEAD)" = "$(git rev-parse "$LATEST")" ] && echo "✅ main == $LATEST" || echo "❌ ROLLBACK RISK"
```

**Do NOT trust version numbers written in any doc.** Always find the current version dynamically with `git tag | sort -V | tail -1`.

## Step 3: Wait for my GitHub token

I will provide a GitHub PAT. When I do:
- `echo "https://Random1495701:TOKEN@github.com" > ~/.git-credentials && chmod 600 ~/.git-credentials`
- `git config credential.helper store`
- Test with `git fetch origin`
- Do NOT store the token anywhere else
- Do NOT commit the token

## Step 4: Verify GitHub sync

```bash
git fetch origin --tags
LOCAL=$(git tag | wc -l)
REMOTE=$(git ls-remote --tags origin | wc -l)
echo "Local: $LOCAL  Remote: $REMOTE"
git rev-list --count origin/main..HEAD  # Should be 0
```

## Step 5: Build and verify

```bash
cd /home/z/my-project
bun install
bun run db:push
bun run lint
curl -s http://localhost:3000/api/stats | head -c 100  # Should return JSON
```

## Step 6: Critical rules — DO NOT BREAK THESE

1. **NEVER remove `output: "standalone"` from next.config.ts.**
2. **NEVER simplify the package.json build script.** The `cp -r` commands are REQUIRED.
3. **NEVER use `next start` instead of `bun .next/standalone/server.js`.**
4. **NEVER paste tokens into any committed file.** Token goes in `~/.git-credentials` ONLY.
5. **NEVER force-push to main.**
6. **NEVER delete git tags.**
7. **ALWAYS commit + tag after meaningful changes.** Don't leave work uncommitted.
8. **ALWAYS restore from a git TAG, never from `main`.**
9. **ALWAYS find the latest tag dynamically** (`git tag | sort -V | tail -1`).
10. **ALWAYS tell me if something is broken before trying to fix it.**

## Step 7: Confirm you've read everything

Reply with:
- ✅ "I've read SESSION_RECOVERY.md, README.md, CHAT_HISTORY.md, worklog.md (tail), SESSION_HANDOFF.md, ROADMAP_MASTER.md"
- ✅ "I've verified next.config.ts has output: 'standalone'"
- ✅ "I've verified package.json has the correct build/start scripts"
- ✅ "Current state: [report git status, tag count, latest tag]"

Then wait for my response. Do NOT start working until I confirm.
