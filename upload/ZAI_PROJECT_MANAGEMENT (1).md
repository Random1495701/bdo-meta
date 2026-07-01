# Z.ai Project Management Guide

**Lessons learned from the Gamut project (100 vault tags, 5+ platform resets, 1 preview recycle, 1 full `.git` wipe, 1 PolarFS persistence discovery).**

This guide captures every hard-won lesson about running a long-lived project on z.ai's platform — how to set one up, how to keep it alive across session resets, how to avoid silent version rollbacks, and how to make sure no work is ever lost.

**Audience:** You (the user) starting or maintaining any z.ai project. Also: any AI session that inherits this doc.

---

## Table of Contents

- [The 11 Hard Truths About Z.ai](#the-11-hard-truths-about-zai)
- [Part A — For NEW Projects (Start Here)](#part-a--for-new-projects-start-here)
- [Part B — For EXISTING Projects (Audit & Fix)](#part-b--for-existing-projects-audit--fix)
- [Part C — Ongoing Due Diligence (Every Session)](#part-c--ongoing-due-diligence-every-session)
- [Appendix: Persistence Map (What Survives Resets)](#appendix-persistence-map-what-survives-resets)
- [Appendix: Script Templates](#appendix-script-templates)
- [Appendix: Troubleshooting](#appendix-troubleshooting)
- [Appendix: The Complete Lessons Learned](#appendix-the-complete-lessons-learned)

---

## The 11 Hard Truths About Z.ai

These are the platform behaviors that will bite you if you don't design for them.

| # | Truth | Implication |
|---|-------|-------------|
| 1 | **Preview URLs are NOT durable.** z.ai recycles them. A preview that works today may return 404/410 tomorrow. | Never hardcode a preview URL in any doc. Always derive it from the current session ID. |
| 2 | **Local `.git` can be wiped** — not just the working tree. A full session recycle can destroy both. | GitHub is the ONLY durable storage layer. Local git history is a convenience, not a guarantee. |
| 3 | **Credentials vanish mid-session.** `~/.git-credentials` and `git config --global` can disappear without warning. | Store the PAT in `.env` (project dir, persists) — not `~/.git-credentials` (home dir, gets wiped). Use `scripts/setup-github-creds.sh` to auto-restore. |
| 4 | **The platform auto-commits with UUID messages** (e.g., `fa5666a 76ac1b4e-ef07-427f-a8be-c289a9b6fbc3`). These land on `main`, ahead of your latest tag. | Never restore from `main`. Always restore from a `vault/v*` TAG. Verify `main == latest tag` after every vault. |
| 5 | **Runtime files get tracked if you're not careful.** `.zscripts/dev.pid`, `.env`, `dev.log` — these change constantly and pollute git. | Audit tracked files. Untrack anything that isn't source. `.gitignore` only protects files that aren't already tracked. |
| 6 | **`output: "standalone"` is MANDATORY** for z.ai deployment. Removing it produces "Sorry, there was a problem deploying the code." | Never remove it. Add a comment explaining why it's there so a future AI session doesn't "clean it up." |
| 7 | **The build script's `cp` commands are MANDATORY.** z.ai's `build.sh` copies `.next/standalone/` and runs `bun server.js`. | Never simplify `next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/`. |
| 8 | **`next start` does NOT work.** z.ai runs `bun .next/standalone/server.js`, not `next start`. | The start script must be `NODE_ENV=production bun .next/standalone/server.js`. |
| 9 | **`download/` is the only directory the user can access.** Everything else is behind the AI. | Put recovery docs and backups in `download/`. Make `download/README.md` a rescue beacon. |
| 10 | **Version numbers written in docs go stale.** "Restore to v11.9.6" in a doc will cause a rollback when the real latest is v11.9.9. | Never hardcode version numbers in recovery docs. Always use `git tag --list "vault/v*" \| sort -V \| tail -1` to find the current version dynamically. |
| 11 | **PolarFS persistent mounts exist** at `/home/user_skills/` and `/tmp/my-project/`. These survive session resets. | Write rescue beacons to `/home/user_skills/RESCUE.md` — the safe deposit box. See [Persistence Map](#appendix-persistence-map-what-survives-resets). |

---

## Part A — For NEW Projects (Start Here)

If you're starting a fresh z.ai project, do these steps in order. Each one prevents a specific failure mode.

### Step 1: Configure `.gitignore` correctly (BEFORE first commit)

The default z.ai template `.gitignore` is missing critical entries. Add these **before** your first `git add`:

```gitignore
# Environment files (NEVER commit these)
.env
.env.*
!.env.example

# Runtime artifacts (z.ai creates these — they must never be tracked)
.zscripts/dev.pid
*.log
dev.log
server.log

# Build output
.next/
out/
dist/
build/

# Dependencies
node_modules/

# OS files
.DS_Store
*.pem

# Downloadable backups (large, regenerated)
download/gamut-*.zip
download/gamut-*.bundle
download/BACKUP-*.txt
download/backups/
```

**Why this matters:** If a file gets committed before its `.gitignore` rule exists, git keeps tracking it forever (until you `git rm --cached`). The `.env` landmine in the Gamut project existed for 96 versions because of this.

### Step 2: Verify deployment config invariants

These three settings are REQUIRED by z.ai's deployment pipeline (`.zscripts/build.sh` + `.zscripts/start.sh`). Get them right on day 1:

**`next.config.ts`** — must contain `output: "standalone"`:
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // REQUIRED by z.ai's build pipeline. DO NOT REMOVE.
  // build.sh copies .next/standalone/server.js and runs it with `bun server.js`.
  // Without this, deployment fails with "Sorry, there was a problem deploying the code."
  output: "standalone",
};

export default nextConfig;
```

**`package.json` build script** — must include the `cp` commands:
```json
{
  "scripts": {
    "build": "next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/",
    "start": "NODE_ENV=production bun .next/standalone/server.js"
  }
}
```

**`db/custom.db`** — must exist (z.ai's build.sh copies it into the deployment package).

### Step 3: Set up GitHub credentials + remote

```bash
# 1. Create a GitHub PAT (Personal Access Token) at:
#    https://github.com/settings/tokens
#    Scope: repo (full control of private repositories)

# 2. Store the PAT in .env (NOT ~/.git-credentials)
#    .env is in the project directory, which persists across resets.
#    ~/.git-credentials is in the home directory, which gets wiped.
echo 'GITHUB_PAT=github_pat_YOUR_TOKEN_HERE' >> .env
echo 'GITHUB_USER=YOUR_GITHUB_USERNAME' >> .env

# 3. Regenerate ~/.git-credentials from .env
bash scripts/setup-github-creds.sh

# 4. Create the repo on GitHub (private recommended)
#    Then add the remote (clean URL, NEVER embed the token):
git remote add origin https://github.com/USERNAME/REPO.git

# 5. Test access
git fetch origin 2>&1 || echo "(empty repo, expected on first push)"
```

**⚠️ PAT Security:**
- The PAT goes in `.env` (which is gitignored + untracked). NEVER in any tracked file.
- `.env` persists in the project directory across session resets. `~/.git-credentials` does NOT.
- `scripts/setup-github-creds.sh` reads `.env` and regenerates `~/.git-credentials` whenever it vanishes.
- Never embed the PAT in the remote URL (`git remote add origin https://USER:TOKEN@...`) — it would leak via `git remote -v`.
- Revoke the PAT at github.com/settings/tokens when the project is done.
- Keep the PAT somewhere you can re-paste it — credentials can vanish mid-session (Hard Truth #3).
- Create a `.env.example` (tracked) as a template showing what variables are needed.

### Step 3b: Write a rescue beacon to the PolarFS safe deposit box

`/home/user_skills/` is a persistent PolarFS mount that survives session resets. Write a rescue beacon there:

```bash
cat > /home/user_skills/RESCUE.md <<'EOF'
# RESCUE BEACON - NEW Z.AI SESSION
If you can read this, the project directory may have been wiped.
1. Check: ls /home/z/my-project/package.json
2. If wiped: restore from GitHub (see instructions in this file)
3. Restore creds: bash scripts/setup-github-creds.sh (reads PAT from .env)
EOF
```

See [Persistence Map](#appendix-persistence-map-what-survives-resets) for the full hierarchy.

### Step 4: Create the vault system

The vault system is how you create recoverable snapshots. Copy these two scripts into `scripts/`:

**`scripts/vault.sh`** — see [Appendix: Script Templates](#appendix-script-templates) for the full version with:
- Pre-vault gate (tsc + vitest + build must pass before tagging)
- Auto-push to GitHub (so tags are never stranded locally)
- `--no-push` escape hatch for offline work
- `--skip-gate` escape hatch for test-fix commits
- Post-vault verification that `main == latest tag`

**`scripts/health-check.sh`** — one-command verification of:
- Git working tree clean
- Local tags == remote tags
- main == latest vault tag
- `output: "standalone"` present
- Build script has `cp` commands
- `.env` and runtime files NOT tracked
- tsc clean, tests pass, build produces server.js

Make both executable: `chmod +x scripts/vault.sh scripts/health-check.sh`

### Step 5: Create recovery documentation

Create these files in `download/` (the only user-accessible directory):

| File | Purpose |
|------|---------|
| `download/README.md` | **Rescue beacon.** First file a blind session finds. Points to the other docs. |
| `download/SESSION_RECOVERY.md` | Single source of truth for restore. Uses DYNAMIC version lookup (never hardcoded). |
| `download/BACKUP_PROTOCOL.md` | The backup layer architecture + recovery scenarios. |
| `download/STARTUP_PROMPT.md` | Copy-paste prompt for starting a new session. |
| `download/PRE_FLIGHT_CHECKLIST.md` | Human-readable 10-point health check. Run at session start. |
| `download/PERSISTENCE_MAP.md` | What survives session resets (PolarFS vs overlay vs tmpfs). |
| `download/SESSION_HANDOFF.md` | **Current state doc.** Updated at END of every session. First doc a new session reads for context. |
| `download/CHANGELOG.md` | Markdown version of the in-app changelog (for offline reading). |
| `download/KNOWN_ISSUES.md` | **Living tech-debt doc.** What's broken, what's fixed, what to watch. Updated every session. |
| `download/DECISIONS.md` | Architecture Decision Records — the "why" behind each major decision. |

**Critical rule for all recovery docs:** NEVER hardcode version numbers or tag counts. Always use:
```bash
LATEST=$(git tag --list "vault/v*" | grep -v baseline | sort -V | tail -1)
echo "Latest: $LATEST"
```

See the Gamut project's `download/` directory for working examples of all these files.

### Step 5b: Set up the continuity documentation system

**This is critical.** A z.ai session has no memory between resets. You MUST save the conversation + work state to files every session, or the next session starts blind.

Create these root-level files (tracked in git, survive via GitHub):

| File | Purpose | When to update |
|------|---------|-----------------|
| `CHAT_HISTORY.md` | **Full conversation transcript.** Append every user message + AI action summary. | After every meaningful user interaction |
| `worklog.md` | **Multi-agent work log.** Append a Task ID section for each task completed. | After every task (use the format in your agent instructions) |
| `download/SESSION_HANDOFF.md` | **Current state doc.** "What's done, what's next, what's broken." | At the END of every session (the last thing you do) |
| `download/KNOWN_ISSUES.md` | **Living tech-debt doc.** Top = currently broken. Bottom = resolved. | After every session (add new issues, move fixed ones down) |

**Why this matters:** Without these files, a new session has to read the entire git log + guess at context. With them, a new session reads `SESSION_HANDOFF.md` first (5 minutes of context) instead of reading 3,000+ lines of chat history.

**The continuity loop (every session):**
```
Session start:
  1. Read download/SESSION_HANDOFF.md (current state)
  2. Read download/KNOWN_ISSUES.md (what's broken)
  3. Read tail of CHAT_HISTORY.md (recent context)
  4. Read tail of worklog.md (recent work)

Session end:
  1. Append this session's conversation to CHAT_HISTORY.md
  2. Append this session's tasks to worklog.md
  3. Rewrite download/SESSION_HANDOFF.md with current state
  4. Update download/KNOWN_ISSUES.md (new issues, fixed issues)
  5. Vault + push (so it all reaches GitHub)
```

**Format for CHAT_HISTORY.md entries:**
```markdown
## 👤 USER (date)
> <user message>

## 🤖 AI Actions (vX.Y: <short title>)
### <step>
- <bullet>
- <bullet>
```

**Format for worklog.md entries:**
```markdown
---
Task ID: <task id>
Agent: <agent name>
Task: <the task>

Work Log:
- <step 1>
- <step 2>

Stage Summary:
- <key results>
```

**Format for SESSION_HANDOFF.md:**
```markdown
# Session Handoff — Current State
## Current Version (find dynamically, don't hardcode)
## What's working
## Known issues (link to KNOWN_ISSUES.md)
## What was done this session
## What's next
## How to verify this doc isn't lying (commands to run)
```

### Step 6: First vault + push

```bash
# Make your first commit
git add -A
git commit -m "Initial project setup"

# Vault it (this runs the pre-gate, commits, tags, and auto-pushes)
bash scripts/vault.sh v1.0 "Initial release"

# Verify
git tag --list "vault/v*"
git ls-remote --tags origin | grep "vault/v"
# Both should show vault/v1.0
```

### Step 7: Create the first backup

```bash
bash scripts/make-backup.sh
# Produces in download/:
#   gamut-src-<ts>-v1.0.zip      (source code)
#   gamut-vault-<ts>-v1.0.zip    (vault snapshots)
#   gamut-git-<ts>-v1.0.bundle   (full git history — cloneable)
```

Download these to your machine. The `.bundle` is the most durable — it's a single-file clone of the entire repo.

---

## Part B — For EXISTING Projects (Audit & Fix)

If you've inherited an existing z.ai project (or are auditing one), run this checklist. Each item fixes a real failure mode observed in the field.

### Audit Step 1: Run the health check

```bash
cd /home/z/my-project
bash scripts/health-check.sh
```

If `health-check.sh` doesn't exist, create it from the template in the Appendix. It checks 9 things in one command. Fix every ❌ before proceeding.

### Audit Step 2: Check for tracked files that shouldn't be

```bash
cd /home/z/my-project
echo "=== Files tracked that probably shouldn't be ==="
git ls-files | grep -E '\.(env|pid|log|lock|tmp)$' 2>/dev/null
git ls-files --error-unmatch .env 2>/dev/null && echo "⚠️ .env is TRACKED"
git ls-files --error-unmatch .zscripts/dev.pid 2>/dev/null && echo "⚠️ dev.pid is TRACKED"
```

**To untrack (keeps the file on disk):**
```bash
git rm --cached .env
git rm --cached .zscripts/dev.pid
# Add to .gitignore if not already there
echo ".zscripts/dev.pid" >> .gitignore
echo "*.log" >> .gitignore
git commit -m "chore: untrack runtime files (.env, dev.pid, logs)"
```

### Audit Step 3: Check for version-number rot in docs

```bash
cd /home/z/my-project
echo "=== Hardcoded version numbers in download/ docs ==="
grep -rn "v[0-9]\+\.[0-9]\+\.[0-9]\+" download/*.md 2>/dev/null | grep -v "example\|e.g.\|such as"
echo ""
echo "=== Hardcoded tag counts ==="
grep -rn "[0-9]\+ vault tags\|[0-9]\+ tags" download/*.md 2>/dev/null
```

Every hardcoded version number is a future rollback. Replace them with dynamic git commands:
```bash
# Bad:
"Restore to v11.9.8"
"96 vault tags"

# Good:
"Restore to the latest tag: git tag --list 'vault/v*' | sort -V | tail -1"
"Tag count: git tag --list 'vault/v*' | wc -l"
```

### Audit Step 4: Check for the main/tag drift rollback vector

```bash
cd /home/z/my-project
LATEST=$(git tag --list "vault/v*" | grep -v baseline | sort -V | tail -1)
HEAD_SHA=$(git rev-parse HEAD)
TAG_SHA=$(git rev-parse "$LATEST")

if [ "$HEAD_SHA" = "$TAG_SHA" ]; then
  echo "✅ main == $LATEST (no drift)"
else
  echo "❌ ROLLBACK RISK: HEAD is $(git rev-parse --short HEAD), $LATEST is $(git rev-parse --short "$LATEST")"
  echo "   Stray commits between tag and HEAD:"
  git log --oneline "$LATEST"..HEAD
  echo ""
  echo "   Fix: git reset --hard $LATEST"
fi
```

**What this catches:** The platform's auto-save feature creates commits with UUID messages (e.g., `76ac1b4e-ef07-427f-a8be-c289a9b6fbc3`). These land on `main` but aren't tagged. If a future session restores from `main` instead of a tag, they get these junk commits — a silent rollback.

### Audit Step 5: Verify GitHub is in sync

```bash
cd /home/z/my-project
git fetch origin --tags 2>&1

LOCAL=$(git tag --list "vault/v*" | wc -l)
REMOTE=$(git ls-remote --tags origin | grep "vault/v" | wc -l)
echo "Local tags: $LOCAL"
echo "Remote tags: $REMOTE"

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "✅ in sync"
else
  echo "❌ OUT OF SYNC"
  echo "   Push missing tags: git push origin --tags"
fi

# Check for unpushed commits on main
UNPUSHED=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo "?")
echo "Unpushed commits on main: $UNPUSHED"
```

### Audit Step 6: Verify deployment config invariants

```bash
cd /home/z/my-project
echo "=== output: standalone ==="
grep 'output.*standalone' next.config.ts && echo "✅ present" || echo "❌ MISSING — deployment will fail"

echo ""
echo "=== build script has cp commands ==="
grep '"build"' package.json | grep -q 'cp -r .next/static' && \
grep '"build"' package.json | grep -q 'cp -r public' && \
echo "✅ present" || echo "❌ MISSING — static files won't be in standalone"

echo ""
echo "=== start script uses bun + standalone ==="
grep '"start"' package.json | grep -q 'bun .next/standalone/server.js' && \
echo "✅ correct" || echo "❌ WRONG — must be: NODE_ENV=production bun .next/standalone/server.js"

echo ""
echo "=== db/custom.db exists ==="
[ -f db/custom.db ] && echo "✅ exists ($(du -h db/custom.db | cut -f1))" || echo "❌ MISSING — build.sh will exit 1"
```

### Audit Step 7: Check `download/README.md` is a rescue beacon

```bash
cat download/README.md
```

If it says something like "Here are all the generated files." — it's useless. Rewrite it as a rescue beacon that points to `SESSION_RECOVERY.md`. See the Gamut project's `download/README.md` for a working example.

### Audit Step 8: Check that vault.sh auto-pushes

```bash
grep -q 'git push origin main' scripts/vault.sh && \
grep -q 'git push origin' scripts/vault.sh && \
echo "✅ vault.sh auto-pushes" || echo "❌ vault.sh does NOT auto-push — tags can be stranded locally"
```

If it doesn't auto-push, replace it with the version in the Appendix (or add the push commands yourself).

### Audit Step 9: Check for the pre-vault gate

```bash
grep -q 'tsc --noEmit' scripts/vault.sh && \
grep -q 'vitest run' scripts/vault.sh && \
grep -q 'bun run build' scripts/vault.sh && \
echo "✅ pre-vault gate exists" || echo "❌ No pre-vault gate — broken code can be tagged"
```

---

## Part C — Ongoing Due Diligence (Every Session)

Run this checklist at the start of every session and before vaulting any change.

### At session start

```bash
cd /home/z/my-project

# 0. Run the persistence check FIRST (what survived the reset?)
bash scripts/persistence-check.sh

# 1. Restore credentials if they vanished (reads PAT from .env)
bash scripts/setup-github-creds.sh --check || bash scripts/setup-github-creds.sh

# 2. Find the ACTUAL current version (never trust docs)
LATEST=$(git tag --list "vault/v*" | grep -v baseline | sort -V | tail -1)
echo "Latest vault tag: $LATEST"

# 3. Verify main == latest tag (no rollback)
[ "$(git rev-parse HEAD)" = "$(git rev-parse "$LATEST")" ] && \
echo "✅ main == $LATEST" || \
echo "❌ ROLLBACK RISK — run: git reset --hard $LATEST"

# 4. Run the health check
bash scripts/health-check.sh
```

### Before every vault

```bash
# 1. Verify your changes don't break anything
npx tsc --noEmit         # must be clean
npx vitest run           # must pass
bun run build            # must produce .next/standalone/server.js

# 2. Verify standalone output (deployment-critical)
ls .next/standalone/server.js  # must exist

# 3. Vault (the script runs the gate + auto-pushes)
bash scripts/vault.sh vX.Y "description of changes"

# 4. Create downloadable backup
bash scripts/make-backup.sh
```

### At session end

**The continuity loop — do this EVERY session or the next session starts blind:**

```bash
# 1. Append this session's conversation to CHAT_HISTORY.md
#    (every user message + AI action summary, in the format from Step 5b)

# 2. Append this session's tasks to worklog.md
#    (one section per task, with Task ID + Work Log + Stage Summary)

# 3. Rewrite download/SESSION_HANDOFF.md with current state
#    - What's working, what's broken, what was done, what's next
#    - This is the FIRST doc the next session reads

# 4. Update download/KNOWN_ISSUES.md
#    - Add new issues discovered this session
#    - Move fixed issues to the "resolved" section

# 5. Vault + push (so all the above reaches GitHub)
bash scripts/vault.sh vX.Y "description of changes"

# 6. Make sure everything is pushed
git status                    # should be clean
git log --oneline -1          # should match latest tag
git ls-remote --tags origin | grep "vault/v" | wc -l  # should match local

# 7. Create downloadable backup
bash scripts/make-backup.sh

# 8. Security audit on backups (before sharing any zip)
unzip -l download/gamut-src-*.zip | grep -iE "\.env$|\.git-credentials"
# Should show NOTHING (only .env.example is safe). If .env appears, the PAT leaked.

# 9. Download the latest backup to your machine
#    (the .bundle file in download/ is the most durable)

# 10. Revoke the GitHub PAT if the project is done
#     https://github.com/settings/tokens
```

### The 10 rules that prevent every failure we've seen

1. **ALWAYS restore from a `vault/v*` TAG, never from `main`.** Tags are immutable; main can have stray auto-save commits.
2. **ALWAYS find the latest tag dynamically** (`git tag --list "vault/v*" | sort -V | tail -1`), never trust a version number written in a doc.
3. **ALWAYS verify `main == latest tag`** after restoring and after vaulting.
4. **ALWAYS run `vault.sh`** (which auto-pushes) after meaningful changes. Never leave tags local-only.
5. **ALWAYS run `make-backup.sh`** after vaulting, and download the `.bundle` to your machine.
6. **NEVER remove `output: "standalone"`** from next.config.ts.
7. **NEVER simplify the build script's `cp` commands** or change `bun .next/standalone/server.js` to `next start`.
8. **NEVER include `.env` in backup zips.** Use `.env.example` (the safe template) instead. Audit with: `unzip -l backup.zip | grep -i env` — should show only `.env.example`.
9. **ALWAYS save chat history + worklog at session end.** Append this session's conversation to `CHAT_HISTORY.md` and tasks to `worklog.md` before vaulting. Without these, the next session has no context.
10. **ALWAYS update `SESSION_HANDOFF.md` + `KNOWN_ISSUES.md` at session end.** These are the first docs the next session reads. Stale handoff docs = blind next session.

---

## Appendix: Script Templates

### `scripts/vault.sh` (with pre-gate + auto-push)

Key features (full version is in the Gamut repo at `scripts/vault.sh`):

```bash
#!/usr/bin/env bash
# Usage: ./scripts/vault.sh <version-tag> [commit-message] [--no-push] [--skip-gate]

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

# Parse args (VERSION, MSG, --no-push, --skip-gate)
# ...

# PRE-VAULT GATE: refuse to tag broken code
if [[ "$SKIP_GATE" -eq 0 ]]; then
  npx tsc --noEmit || { echo "❌ tsc failed"; exit 1; }
  npx vitest run || { echo "❌ tests failed"; exit 1; }
  bun run build || { echo "❌ build failed"; exit 1; }
  [ -f ".next/standalone/server.js" ] || { echo "❌ no standalone output"; exit 1; }
fi

# Create snapshot in vault/snapshots/<version>/
# Update vault/MANIFEST.md
# git add -A && git commit
# git tag vault/<version>

# AUTO-PUSH (the critical fix)
if [[ "$NO_PUSH" -eq 0 ]]; then
  git push origin main
  git push origin "vault/${VERSION}"
fi

# Verify main == latest tag
LATEST=$(git tag --list "vault/v*" | grep -v baseline | sort -V | tail -1)
[ "$(git rev-parse HEAD)" = "$(git rev-parse "$LATEST")" ] && \
  echo "✅ main == $LATEST" || echo "⚠️ drift detected"
```

### `scripts/health-check.sh`

Runs 9 checks: git-clean, tag-sync, main==tag, standalone-present, build-script-cp, env-untracked, dev.pid-untracked, tsc, vitest, build.

```bash
bash scripts/health-check.sh
# Exits 0 if all pass, 1 if any fail
```

### `scripts/simulate-deploy.sh`

Simulates z.ai's full deployment pipeline (`.zscripts/build.sh`) in 11 steps. Run this before trusting that a deployment will work.

```bash
bash scripts/simulate-deploy.sh
# Steps: clean .next → bun install → bun run build → verify standalone →
#        verify static copied → verify public copied → verify db →
#        create build dir → db:push → server starts HTTP 200 → cleanup
# All 11 must pass or deployment will fail.
```

### `scripts/backup-everything.sh` (legacy)

Older backup script. Use `make-backup.sh` instead (it produces the canonical 3-artifact set: src zip, vault zip, git bundle). `backup-everything.sh` is kept for backward compatibility but may be removed in a future cleanup.

### `scripts/make-backup.sh`

Produces three artifacts in `download/`:
- `gamut-src-<ts>-v<ver>.zip` — source code (~11MB)
- `gamut-vault-<ts>-v<ver>.zip` — all vault snapshots (~32MB)
- `gamut-git-<ts>-v<ver>.bundle` — full git history, cloneable (~142MB)

**⚠️ SECURITY: Never include `.env` in the src zip.** The src zip is downloadable by the user. If `.env` contains secrets (like `GITHUB_PAT`), they leak. The script must include `.env.example` (the safe template) instead of `.env`:

```bash
# WRONG — leaks the PAT:
for f in CHAT_HISTORY.md worklog.md dev.log .env; do

# CORRECT — includes the safe template:
for f in CHAT_HISTORY.md worklog.md dev.log .env.example; do
```

See Lesson 12 for the full story.

### `scripts/setup-github-creds.sh`

Regenerates `~/.git-credentials` from `.env` (which persists in the project directory). Run whenever credentials vanish (Hard Truth #3).

```bash
# Usage:
bash scripts/setup-github-creds.sh          # reads GITHUB_PAT from .env, regenerates ~/.git-credentials
bash scripts/setup-github-creds.sh --check  # exits 0 if creds work, 1 if not
bash scripts/setup-github-creds.sh --force  # recreate even if .git-credentials exists
```

### `scripts/persistence-check.sh`

Verifies what survived the session reset across all 4 storage tiers (PolarFS, OSS, overlay, tmpfs). Run at the start of every session.

```bash
bash scripts/persistence-check.sh
# Checks: /home/user_skills/RESCUE.md, /tmp/my-project/, /home/sync/repo.tar,
# /home/z/my-project/, ~/.git-credentials, .env with GITHUB_PAT
```

---

## Appendix: Persistence Map (What Survives Resets)

**This is the most important discovery for long-term project survival on z.ai.**

The platform has 4 tiers of storage with different persistence characteristics:

### Tier 1 — PolarFS (persistent, writable)

| Path | Writable | Survives Resets? | What to use it for |
|------|----------|-------------------|--------------------|
| `/home/user_skills/` | YES | YES | **Safe deposit box.** Write rescue beacons here. Outside sync mechanism. |
| `/tmp/my-project/` | YES | YES | Live mirror of project (synced FROM /home/z/my-project/). Gitignored files NOT synced. |

PolarFS is a distributed filesystem (64 petabytes). Files here survive container restarts and session resets.

### Tier 2 — OSS (persistent, read-only)

| Path | Writable | Survives Resets? | What's there |
|------|----------|-------------------|--------------|
| `/home/sync/repo.tar` | NO | YES | 179MB tarball of `.git/` directory. Platform-managed git history backup. |
| `/home/official_skills/` | NO | YES | Platform skill zips (ASR, LLM, TTS, VLM, etc.) |

### Tier 3 — Overlay rootfs (sometimes persists)

| Path | Writable | Survives Resets? | Notes |
|------|----------|-------------------|-------|
| `/home/z/my-project/` | YES | SOMETIMES | The project. Survives soft resets, wiped on full recycles. |
| `/home/z/` (home dir) | YES | RARELY | `.git-credentials`, `.gitconfig`, `.cache/`. Gets wiped often. |

### Tier 4 — tmpfs (RAM only, always wiped)

| Path | Writable | Survives Resets? |
|------|----------|-------------------|
| `/home/z/my-project/upload/` | YES | NO |
| `/dev/shm/` | YES | NO |

### The safe deposit box: `/home/user_skills/`

This is the **most important discovery**. It's:
- Persistent (PolarFS)
- Writable
- Outside the project sync mechanism (won't be overwritten)

**Write rescue beacons here.** A `RESCUE.md` in `/home/user_skills/` survives even if `/home/z/my-project/` is wiped.

### How the project sync works

```
/home/z/my-project/  ---- one-way sync ---->  /tmp/my-project/  (PolarFS, persistent)
     (overlay)                                       ^
     (sometimes wiped)                               |
                                        Gitignored files NOT synced
                                        (.env with PAT stays in overlay only)
```

**Key behaviors:**
1. The sync is one-way: `/home/z/my-project/` to `/tmp/my-project/`
2. Gitignored files are NOT synced (`.env` with `GITHUB_PAT` stays in overlay only — good for security)
3. Files written directly to `/tmp/my-project/` (bypassing sync) appear to persist
4. `/home/sync/repo.tar` is a platform-managed backup of `.git/` — git history has a platform-level backup beyond GitHub

---

## Appendix: Troubleshooting

### "Preview returns 404 / 410"

The z.ai preview deployment was recycled. This is NOT a code issue.

1. Test the URL: `curl -sI "https://preview-<SESSION-ID>.space-z.ai/"` — check the HTTP status
2. 404 or 410 → preview recycled. Start a new z.ai project to get a fresh URL.
3. 502 → dev server not running. Start it: `bash .zscripts/dev.sh`
4. 200 but blank → check build output for errors

**Never hardcode preview URLs in docs.** Always derive from the current session ID (from the IM gateway metadata `session_id` field).

### "git fetch fails with 'could not read Username'"

Credentials vanished (Hard Truth #3). The home directory (`/home/z/`) gets wiped, taking `~/.git-credentials` with it. But `.env` (in the project directory) persists.

**The fix (if `.env` has `GITHUB_PAT`):**
```bash
bash scripts/setup-github-creds.sh    # reads .env, regenerates ~/.git-credentials
```

**If `.env` is also missing (full wipe):**
```bash
# Ask the user for a new PAT, then:
echo 'GITHUB_PAT=github_pat_NEW_TOKEN' >> .env
echo 'GITHUB_USER=Random1495701' >> .env
bash scripts/setup-github-creds.sh
```

**To check if credentials are working:**
```bash
bash scripts/setup-github-creds.sh --check
# exits 0 if working, 1 if not
```

This is expected behavior, not an error. The platform wipes the home directory on resets. The PAT in `.env` is the permanent fix.

### "Deployment fails: 'Sorry, there was a problem deploying the code'"

Check the 4 deployment invariants:

1. `next.config.ts` has `output: "standalone"`
2. `package.json` build script has the `cp -r` commands
3. `package.json` start script uses `bun .next/standalone/server.js`
4. `db/custom.db` exists

Run `bash scripts/health-check.sh` to verify all four at once.

### "Version rolled back after session restart"

Three possible causes:

1. **Restored from `main` instead of a tag** → main had stray auto-save commits. Fix: always restore from `vault/v*` tags.
2. **Trusted a hardcoded version in docs** → the doc said "v11.9.6" but the real latest was v11.9.9. Fix: use dynamic version lookup.
3. **Tag was local-only, not pushed** → `.git` was wiped, the tag was lost. Fix: vault.sh auto-pushes.

### "Tests pass locally but deployment is broken"

You're probably missing the `cp` commands in the build script. Local `next build` works, but z.ai's `build.sh` needs the static files copied into `.next/standalone/`. Verify:

```bash
grep '"build"' package.json
# Must be: next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/
```

### "AI session can't find the project docs"

The `download/README.md` is the rescue beacon. If it says "Here are all the generated files." — it's useless. Rewrite it to urgently point to `SESSION_RECOVERY.md`.

### "PAT leaked in a backup zip"

`make-backup.sh` was including `.env` (which contains the PAT) in the src zip. The zip is in `download/` (user-accessible), so the PAT leaked.

**Fix:**
1. Edit `make-backup.sh` — change `.env` to `.env.example` in the include list
2. Delete all existing zips: `rm download/gamut-src-*.zip download/gamut-vault-*.zip download/gamut-git-*.bundle download/BACKUP-*.txt`
3. Rebuild clean: `bash scripts/make-backup.sh`
4. Verify: `unzip -l download/gamut-src-*.zip | grep -i env` — should show only `.env.example`
5. Revoke the leaked PAT at github.com/settings/tokens
6. Generate a new PAT, update `.env`: `GITHUB_PAT=github_pat_NEW_TOKEN`
7. Run `bash scripts/setup-github-creds.sh` to restore credentials

**Prevention:** Audit backup scripts before running. The rule: `.env` is never a backup file. `.env.example` is the template. See Lesson 12.

---

## Appendix: The Complete Lessons Learned

Every lesson from the Gamut project, ordered by how painful the discovery was.

### Lesson 1: Preview URLs are not durable (v11.9.4)
z.ai recycles preview deployments. The URL `https://preview-bac3d774-...space-z.ai/` returned 404. The bare domain returned 410 Gone ("Project expired and recycled"). The code was perfect; the deployment target was deleted.

**Fix:** Never hardcode preview URLs. Derive from session ID every response.

### Lesson 2: `output: "standalone"` is mandatory (v11.9)
A session removed `output: "standalone"` from next.config.ts "to clean up." Deployment broke for the entire session. z.ai's `build.sh` copies `.next/standalone/server.js` and runs it with `bun server.js` — without standalone output, there's no server.js.

**Fix:** Added a comment explaining why it's there. Added a health-check that verifies it. Added a pre-vault gate that refuses to tag if it's missing.

### Lesson 3: Version numbers in docs go stale (v11.9.6 → v11.9.8)
SESSION_RECOVERY.md said "restore to v11.9.6" when the actual latest was v11.9.8. A session following the docs literally would have rolled back 2 versions.

**Fix:** Replaced all hardcoded version numbers with dynamic git commands. The docs now say "find the latest tag with `git tag --list 'vault/v*' | sort -V | tail -1`" instead of naming a specific version.

### Lesson 4: vault.sh didn't auto-push (v11.9.8)
The vault script committed and tagged locally but never pushed. When the platform wiped `.git`, local-only tags were lost. The project survived only because earlier sessions had manually pushed.

**Fix:** vault.sh now auto-pushes to GitHub after tagging. `--no-push` escape hatch for offline work.

### Lesson 5: Local `.git` can be wiped (Jul 3, 2026)
BACKUP_PROTOCOL.md claimed "the platform preserves the `.git` directory." This session proved that false — a full session recycle wiped both the working tree AND `.git`. Only GitHub survived.

**Fix:** Corrected the doc. GitHub is now documented as the ONLY durable layer. Auto-push ensures tags reach GitHub immediately.

### Lesson 6: Credentials vanish mid-session (Jul 3, 2026)
`~/.git-credentials` and `git config --global credential.helper` both disappeared between two commands in the same session. No warning, no error — just gone.

**Fix:** Keep your PAT somewhere you can re-paste. Auto-push immediately after vaulting — don't let tags sit local-only waiting for a manual push that might never happen.

### Lesson 7: Platform auto-commits with UUID messages (Jul 3, 2026)
Found a stray commit `fa5666a` with message `76ac1b4e-ef07-427f-a8be-c289a9b6fbc3` (a UUID). It was 1 commit ahead of `vault/v11.9.8` on `main`. If a future session restored from `main` instead of the tag, they'd get this junk commit.

**Fix:** Added the "main == latest tag" invariant. vault.sh verifies it after every vault. Health-check verifies it on every run. Recovery docs say "NEVER restore from main."

### Lesson 8: `.env` tracked despite `.gitignore` (Jul 3, 2026)
`.env` was committed in the initial commit, before the `.gitignore` rule existed. Git kept tracking it. If anyone later added a real secret to `.env`, it would get committed automatically.

**Fix:** `git rm --cached .env` (keeps on disk, untracks from git). `.gitignore` rule now takes effect.

### Lesson 9: `.zscripts/dev.pid` tracked — caused stray commits (Jul 3, 2026)
The dev server's PID file was tracked in git. It changes every restart. The platform's auto-save picked up these changes, creating the UUID-message commits (Lesson 7).

**Fix:** `git rm --cached .zscripts/dev.pid`. Added to `.gitignore`.

### Lesson 10: `download/README.md` was useless (Jul 3, 2026)
The only user-accessible directory had a README that said "Here are all the generated files." A blind session landing with no startup prompt would find nothing useful.

**Fix:** Rewrote as a rescue beacon that urgently points to SESSION_RECOVERY.md, BACKUP_PROTOCOL.md, and STARTUP_PROMPT.md.

### Lesson 11: PolarFS persistent mounts exist (Jul 3, 2026)
The platform has persistent writable storage at `/home/user_skills/` and `/tmp/my-project/` (both PolarFS). These survive session resets, unlike the overlay rootfs (`/home/z/`) which gets wiped.

**Discovery:** By analyzing mount points, found that `/home/user_skills/` is PolarFS (64 PB distributed filesystem), writable, and outside the project sync mechanism. It's the "safe deposit box" — the perfect place for rescue beacons.

**Fix:**
- Wrote `RESCUE.md` to `/home/user_skills/` (survives even if project dir is wiped)
- Wrote `.RESCUE_BEACON.md` to `/tmp/my-project/` (PolarFS mirror, backup rescue)
- Created `scripts/persistence-check.sh` to verify what survived at session start
- Created `download/PERSISTENCE_MAP.md` documenting the 4-tier hierarchy
- The PAT is now stored in `.env` (project dir, overlay, persists) instead of `~/.git-credentials` (home dir, overlay, gets wiped)

**The persistence hierarchy:**
1. **Tier 1 (PolarFS):** `/home/user_skills/`, `/tmp/my-project/` — always survive
2. **Tier 2 (OSS, read-only):** `/home/sync/repo.tar` — platform git backup
3. **Tier 3 (overlay):** `/home/z/my-project/` (sometimes), `/home/z/` (rarely)
4. **Tier 4 (tmpfs):** `/home/z/my-project/upload/` — never survives

### Lesson 12: Backup scripts can leak secrets (Jul 3, 2026)
`make-backup.sh` was explicitly including `.env` in the src zip (line 70: `for f in CHAT_HISTORY.md worklog.md dev.log .env`). Since the src zip is in `download/` (the user-accessible directory), every zip contained the real `GITHUB_PAT`.

**Discovery:** During a PAT security audit, found that while `.env` was correctly untracked + gitignored + not in git history + not in vault snapshots + not in the PolarFS mirror, it WAS in the downloadable src zips. The script had been written to include "untracked-but-important files" and `.env` was on that list.

**Fix:**
- Changed `make-backup.sh` to include `.env.example` (safe template) instead of `.env`
- Deleted all 12 existing backup artifacts (3 versions × 4 files) that contained the PAT
- Rebuilt clean backups — verified `.env` is NOT in the new zips
- Vaulted as v11.9.14

**The lesson:** When a script collects "important files" for backup, audit what it includes. Secrets live in `.env`. Templates live in `.env.example`. Never confuse the two. The backup script is a delivery vector — whatever it includes goes into the user-accessible `download/` directory.

**Audit checklist for backup scripts:**
- Does the script include `.env`? → Remove it, use `.env.example` instead
- Does the script include `~/.git-credentials`? → Remove it
- Does the script include any file with `PAT`, `TOKEN`, `SECRET`, `KEY` in the name or content? → Remove it
- After creating a backup, verify: `unzip -l backup.zip | grep -i env` — should show only `.env.example`

### Lesson 13: Continuity docs are the project's memory (Jul 3, 2026)
A z.ai session has no memory between resets. Without continuity docs, every new session starts blind — reading git logs, guessing at context, re-discovering known issues.

**The problem:** The original docs (SESSION_RECOVERY, BACKUP_PROTOCOL, STARTUP_PROMPT) covered *how to restore* but not *what the current state is*. A new session could restore the code but had no idea what was recently done, what's broken, or what to work on next.

**The fix — the continuity documentation system:**
- `CHAT_HISTORY.md` (root) — full conversation transcript, appended every session
- `worklog.md` (root) — task-level work log, appended every task
- `download/SESSION_HANDOFF.md` — current state doc, rewritten every session end
- `download/KNOWN_ISSUES.md` — living tech-debt doc, updated every session
- `download/CHANGELOG.md` — markdown version of the in-app changelog
- `download/DECISIONS.md` — Architecture Decision Records (the "why")
- `download/PRE_FLIGHT_CHECKLIST.md` — human-readable health check

**The continuity loop:**
- Session start: read SESSION_HANDOFF → KNOWN_ISSUES → CHAT_HISTORY tail → worklog tail
- Session end: append to CHAT_HISTORY + worklog → rewrite SESSION_HANDOFF → update KNOWN_ISSUES → vault + push

**The lesson:** Code recovery is necessary but not sufficient. Context recovery is equally important. Without SESSION_HANDOFF.md, a new session spends 30 minutes reading 3,000 lines of chat history to understand what happened last session. With it, they spend 5 minutes.

---

## Quick Reference: The 7-Command Survival Kit

If you remember nothing else, remember these 7 commands:

```bash
# 0. Check what survived the session reset
bash scripts/persistence-check.sh

# 1. Restore GitHub credentials if they vanished (reads PAT from .env)
bash scripts/setup-github-creds.sh

# 2. Find the current version (NEVER trust docs)
git tag --list "vault/v*" | grep -v baseline | sort -V | tail -1

# 3. Restore from the latest tag (NEVER from main)
git reset --hard $(git tag --list "vault/v*" | grep -v baseline | sort -V | tail -1)

# 4. Vault a new version (auto-pushes to GitHub)
bash scripts/vault.sh vX.Y "description"

# 5. Create downloadable backups
bash scripts/make-backup.sh

# 6. Verify everything is healthy
bash scripts/health-check.sh
```

---

*This guide was written from the Gamut project's experience (github.com/Random1495701/gamut). 103 vault tags, 5+ platform resets, 1 preview recycle, 1 full `.git` wipe, 1 PolarFS persistence discovery, 1 backup-script secret leak, 1 continuity-doc gap. Every lesson here was learned the hard way.*

*Last updated: v11.9.16, Jul 3, 2026.*
