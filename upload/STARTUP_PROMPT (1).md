# STARTUP PROMPT — Copy-paste this as your first message in the new z.ai session

---

**STOP. Read this entire message before doing anything else. Do NOT make any assumptions. Do NOT load any tools or skills yet. Do NOT start editing code. Follow these steps in exact order.**

## Step 1: Read these files FIRST (in this exact order)

Before you write a single line of code or run any commands, read these files completely. Each one contains critical context that will prevent you from making the same mistakes that broke deployments in previous sessions.

1. **`/home/z/my-project/download/SESSION_RECOVERY.md`** — The single source of truth. Contains the critical warning about the recycled preview, GitHub restore instructions, and deployment config requirements.

2. **`/home/z/my-project/CHAT_HISTORY.md`** — Read the TAIL (last 400 lines) for the most recent conversation. The full file is 3,255 lines — you don't need to read all of it, but you MUST read the tail to understand what happened in the last session (v11.8 through v11.9.7).

3. **`/home/z/my-project/worklog.md`** — Read the TAIL (last 200 lines) for the most recent work entries.

4. **`/home/z/my-project/download/BACKUP_PROTOCOL.md`** — Contains the backup layers, recovery scenarios (including the NEW "Scenario A2: z.ai preview recycled"), and restore instructions.

5. **`/home/z/my-project/next.config.ts`** — Verify it contains `output: "standalone"`. This is MANDATORY for z.ai deployment. DO NOT remove it. A previous session (v11.9) removed it and broke the deployment.

6. **`/home/z/my-project/package.json`** — Verify the build script is: `next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/` and the start script is: `NODE_ENV=production bun .next/standalone/server.js`. These are REQUIRED by z.ai's `.zscripts/build.sh` and `.zscripts/start.sh`. DO NOT simplify them.

7. **`/home/z/my-project/.zscripts/build.sh`** — Read this to understand z.ai's deployment pipeline. It copies `.next/standalone/` to the deployment package and runs `bun server.js`. Without `output: "standalone"`, this fails.

8. **`/home/z/my-project/.zscripts/start.sh`** — Read this to understand how z.ai starts the server. It runs `bun server.js` from `next-service-dist/`.

## Step 2: Verify project state

After reading the files above, run these commands and report the results to me before making any changes:

```bash
cd /home/z/my-project
git status --short                    # Should be empty (clean working tree)
git tag --list "vault/v*" | grep -v baseline | sort -V | tail -3  # Show latest 3 tags
git tag --list "vault/v*" | wc -l     # Tag count (compare to GitHub in Step 4)
ls .next/standalone/server.js         # May not exist yet (needs build)
npx tsc --noEmit                      # Should be clean (no output = no errors)
# CRITICAL: verify main == latest vault tag (prevents silent rollback)
LATEST=$(git tag --list "vault/v*" | grep -v baseline | sort -V | tail -1)
[ "$(git rev-parse HEAD)" = "$(git rev-parse "$LATEST")" ] && echo "✅ main == $LATEST" || echo "❌ main != $LATEST — ROLLBACK RISK"
```

**Do NOT trust version numbers written in any doc.** Always find the current version dynamically with `git tag --list "vault/v*" | sort -V | tail -1`. Docs go stale; git is the source of truth.

If any of these fail, STOP and tell me what's wrong before continuing. Do NOT attempt to fix things by guessing.

## Step 3: Wait for my GitHub token

I will provide a GitHub Personal Access Token (PAT) in this chat. When I do:
- Write it to `~/.git-credentials` with: `echo "https://Random1495701:TOKEN@github.com" > ~/.git-credentials && chmod 600 ~/.git-credentials`
- Run `git config credential.helper store` if not already set
- Test access with `git fetch origin`
- Do NOT store the token anywhere else
- Do NOT commit the token to any file
- I will revoke this token at the end of the session

**Do NOT proceed to push anything to GitHub until I've given you the token.**

## Step 4: Verify GitHub sync

Once credentials are set up:
```bash
git fetch origin && git fetch origin --tags
LOCAL_COUNT=$(git tag --list "vault/v*" | wc -l)
REMOTE_COUNT=$(git ls-remote --tags origin | grep "vault/v" | wc -l)
echo "Local tags: $LOCAL_COUNT  Remote tags: $REMOTE_COUNT"
# Both should be the same number. If not, push: git push origin --tags
git rev-list --count origin/main..HEAD               # Should be 0 (nothing unpushed)
git rev-list --count HEAD..origin/main               # Should be 0 (nothing unpulled)
```

If local and remote are out of sync, tell me before doing anything.

## Step 5: Build and verify

```bash
cd /home/z/my-project
bun install
bun run db:push
bun run build
# Verify build output:
ls .next/standalone/server.js         # Must exist
ls .next/standalone/.next/static/     # Must contain chunks + media
ls .next/standalone/public/sample-*   # Must show 4 sample images
npx vitest run                        # Must show 285/285 passing
```

If the build fails or tests fail, STOP and tell me. Do NOT attempt to "fix" the build by removing `output: "standalone"` — that will break z.ai's deployment pipeline.

## Step 6: Preview link requirement

**Every response you give me MUST end with this line:**

```
🔗 **Preview**: https://preview-<THIS-SESSION-ID>.space-z.ai/
```

Replace `<THIS-SESSION-ID>` with this session's ID from the IM gateway metadata at the top of each of my messages. The session_id field looks like `bac3d774-36a0-492e-b901-86ac2f5e3e7c` — use that value (without the `web-` prefix if present).

**The previous session's preview URL is DEAD** (it was recycled by z.ai). Do NOT use `https://preview-bac3d774-36a0-492e-b901-86ac2f5e3e7c.space-z.ai/` — that returns 404. Use THIS session's ID.

## Step 7: Critical rules — DO NOT BREAK THESE

1. **NEVER remove `output: "standalone"` from next.config.ts.** A previous session did this (v11.9) and broke the deployment for the entire session.

2. **NEVER simplify the package.json build script.** The `cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/` part is REQUIRED — it copies static files and public assets into the standalone directory.

3. **NEVER use `next start` instead of `bun .next/standalone/server.js`.** z.ai's start.sh uses bun, not node, and it runs from the standalone directory.

4. **NEVER paste tokens or secrets into any file that gets committed to git.** The token goes in `~/.git-credentials` ONLY (which is gitignored).

5. **NEVER force-push (`git push --force`) to main.** If there's a conflict, tell me and I'll decide.

6. **NEVER delete git tags.** Tags are permanent history markers.

7. **ALWAYS run `bash scripts/vault.sh vX.Y "message"` after making changes.** This creates a recoverable snapshot AND auto-pushes to GitHub (use `--no-push` only if offline). The script runs tsc + vitest + build as a pre-vault gate — if any fail, it refuses to tag.

8. **ALWAYS run `bash scripts/make-backup.sh` after vaulting.** This creates downloadable zips in `download/`.

9b. **NEVER restore from `main` — always restore from a `vault/v*` TAG.** Local `main` can have stray auto-save commits from the platform. Tags are immutable. Before restoring, find the latest: `git tag --list "vault/v*" | grep -v baseline | sort -V | tail -1`.

9. **ALWAYS include the preview link at the end of every response.**

10. **ALWAYS tell me if something is broken before trying to fix it.** Don't silently "fix" things — I need to know what went wrong.

## Step 8: If the preview doesn't load

If I tell you the preview is blank or showing an error:

1. Test the preview URL directly: `curl -sI "https://preview-<SESSION-ID>.space-z.ai/"` and tell me the HTTP status code
2. If it returns 404 or 410, the session's preview was recycled — tell me immediately, I need to start a new project
3. If it returns 502, the dev server isn't running — start it with `bash .zscripts/dev.sh`
4. If it returns 200 but the page is blank, check the build output for errors
5. Do NOT spend more than 2 attempts fixing a broken preview — if it doesn't work after the first fix, tell me and I'll restart

## Step 9: Confirm you've read everything

Before doing anything else, reply to me with:
- ✅ "I've read SESSION_RECOVERY.md, CHAT_HISTORY.md (tail), worklog.md (tail), BACKUP_PROTOCOL.md"
- ✅ "I've verified next.config.ts has output: 'standalone'"
- ✅ "I've verified package.json has the correct build/start scripts"
- ✅ "I've read .zscripts/build.sh and .zscripts/start.sh"
- ✅ "I understand the preview link must be in every response"
- ✅ "I'm waiting for the GitHub token before proceeding"
- ✅ "Current state: [report git status, tag count, latest commit]"

Then wait for my response. Do NOT start working until I confirm.

---

**Paste everything above this line into the new z.ai session as your first message.**
