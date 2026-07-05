# Z.ai Project Management Guide v2

**The complete, corrected guide for running long-lived projects on z.ai's platform.**
**Updated with lessons from the Araya project (9 vault tags, 1 allowedDevOrigins break, 1 dev-server death).**
**Supersedes the original ZAI_PROJECT_MANAGEMENT guide (which was missing `allowedDevOrigins`).**

---

## The 12 Hard Truths About Z.ai

| # | Truth | Implication | Fix |
|---|-------|-------------|-----|
| 1 | **Preview URLs are NOT durable.** z.ai recycles them. | Never hardcode a preview URL. Derive from session ID. | Use `session_id` from IM gateway metadata. |
| 2 | **Local `.git` can be wiped** — not just the working tree. | GitHub is the ONLY durable storage. | Auto-push after every vault. |
| 3 | **Credentials vanish mid-session.** `~/.git-credentials` disappears. | Keep your PAT re-pasteable. | Auto-push immediately. |
| 4 | **Platform auto-commits with UUID messages** on `main`. | Never restore from `main`. | Always restore from `vault/v*` tags. |
| 5 | **Runtime files get tracked.** `.env`, `dev.pid`, `*.log`. | Pollute git, cause stray commits. | `.gitignore` BEFORE first commit. `git rm --cached` if already tracked. |
| 6 | **`output: "standalone"` is MANDATORY** for deployment. | Without it: "Sorry, there was a problem deploying." | Never remove. Add a comment. |
| 7 | **`allowedDevOrigins` is MANDATORY** for z.ai preview. ⚠️ NEW | Without it: Z logo loading forever (JS/CSS blocked). | `allowedDevOrigins: ["*.space-z.ai"]` in next.config.ts. |
| 8 | **The build script's `cp` commands are MANDATORY.** | Static files won't be in standalone. | Never simplify `next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/`. |
| 9 | **`next start` does NOT work.** z.ai runs `bun .next/standalone/server.js`. | Start script must use bun + standalone. | `NODE_ENV=production bun .next/standalone/server.js`. |
| 10 | **`download/` is the only user-accessible directory.** | Recovery docs go there. | Make `download/README.md` a rescue beacon. |
| 11 | **Version numbers in docs go stale.** | "Restore to v1.9" causes rollback when latest is v2.1. | Use `git tag --list "vault/v*" | sort -V | tail -1`. |
| 12 | **Dev server dies if started with `bun run dev &`.** ⚠️ NEW | Background process gets killed. | Always use `.zscripts/dev.sh`. |

---

## Part A — For NEW Projects

### Step 1: `.gitignore` (BEFORE first commit)

```gitignore
# Environment
.env
.env.*
!.env.example

# Runtime
.zscripts/dev.pid
*.log
dev.log
server.log

# Build
.next/
out/
dist/
build/

# Dependencies
node_modules/

# OS
.DS_Store
*.pem
```

### Step 2: `next.config.ts` (MANDATORY settings)

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // REQUIRED by z.ai's build pipeline
  output: "standalone",

  // REQUIRED for z.ai preview to work (Next.js 16 blocks cross-origin by default)
  allowedDevOrigins: ["*.space-z.ai"],
};

export default nextConfig;
```

### Step 3: `package.json` scripts (MANDATORY)

```json
{
  "scripts": {
    "dev": "next dev -p 3000 2>&1 | tee dev.log",
    "build": "next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/",
    "start": "NODE_ENV=production bun .next/standalone/server.js 2>&1 | tee server.log"
  }
}
```

### Step 4: `.env.example` (tracked, for recovery)

Create `.env.example` with the structure (no secrets):
```
DATABASE_URL=file:/home/z/my-project/db/custom.db
```

### Step 5: GitHub credentials + remote

```bash
echo "https://USERNAME:YOUR_PAT@github.com" > ~/.git-credentials
chmod 600 ~/.git-credentials
git config --global credential.helper store
git remote add origin https://github.com/USERNAME/REPO.git
```

### Step 6: Vault system

Create `scripts/vault.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
VERSION="${1:?Usage: vault.sh <version> [message]}"
MSG="${2:-Snapshot $VERSION}"
NO_PUSH=0; SKIP_GATE=0
for arg in "$@"; do case "$arg" in --no-push) NO_PUSH=1;; --skip-gate) SKIP_GATE=1;; esac; done

# Pre-vault gate
if [[ "$SKIP_GATE" -eq 0 ]]; then
  npx tsc --noEmit || { echo "❌ tsc failed"; exit 1; }
  bun run lint || { echo "❌ lint failed"; exit 1; }
  bun run build || { echo "❌ build failed"; exit 1; }
fi

git add -A && git commit -m "$MSG" 2>/dev/null || true
git tag "vault/$VERSION"

if [[ "$NO_PUSH" -eq 0 ]]; then
  git push origin main
  git push origin "vault/$VERSION"
fi

LATEST=$(git tag --list "vault/v*" | grep -v baseline | sort -V | tail -1)
[ "$(git rev-parse HEAD)" = "$(git rev-parse "$LATEST")" ] && echo "✅ main == $LATEST" || echo "⚠️ drift"
```

### Step 7: Recovery docs in `download/`

Create these files:
- `download/README.md` — rescue beacon pointing to SESSION_RECOVERY.md
- `download/SESSION_RECOVERY.md` — restore instructions (use dynamic version lookup, never hardcoded)
- `download/FLAGGED-ISSUES.md` — this file (the known issues + fixes)

### Step 8: First vault + push

```bash
git add -A && git commit -m "Initial project setup"
bash scripts/vault.sh v1.0 "Initial release"
```

---

## Part B — For EXISTING Projects (Audit Checklist)

### Audit 1: Check `allowedDevOrigins` ⚠️ MOST CRITICAL

```bash
grep 'allowedDevOrigins' next.config.ts && echo "✅ present" || echo "❌ MISSING — preview will show Z logo forever"
```

If missing, add it:
```bash
sed -i 's/output: "standalone",/output: "standalone",\n  allowedDevOrigins: ["*.space-z.ai"],/' next.config.ts
```

### Audit 2: Check `output: "standalone"`

```bash
grep 'output.*standalone' next.config.ts && echo "✅" || echo "❌ MISSING"
```

### Audit 3: Check build script has `cp` commands

```bash
grep '"build"' package.json | grep -q 'cp -r .next/static' && echo "✅" || echo "❌ MISSING"
```

### Audit 4: Check `.env` is NOT tracked

```bash
git ls-files --error-unmatch .env 2>/dev/null && echo "❌ .env TRACKED — run: git rm --cached .env" || echo "✅"
```

### Audit 5: Check `dev.pid` is NOT tracked

```bash
git ls-files --error-unmatch .zscripts/dev.pid 2>/dev/null && echo "❌ TRACKED" || echo "✅"
```

### Audit 6: Check main == latest tag

```bash
LATEST=$(git tag --list "vault/v*" | grep -v baseline | sort -V | tail -1)
[ "$(git rev-parse HEAD)" = "$(git rev-parse "$LATEST")" ] && echo "✅ main == $LATEST" || echo "❌ ROLLBACK RISK"
```

### Audit 7: Check GitHub is in sync

```bash
git fetch origin --tags
LOCAL=$(git tag --list "vault/v*" | wc -l)
REMOTE=$(git ls-remote --tags origin | grep "vault/v" | wc -l)
[ "$LOCAL" = "$REMOTE" ] && echo "✅ in sync" || echo "❌ OUT OF SYNC — git push origin --tags"
```

### Audit 8: Check `download/README.md` is a rescue beacon

```bash
grep -q "SESSION_RECOVERY" download/README.md && echo "✅" || echo "❌ Rewrite as rescue beacon"
```

### Audit 9: Check vault.sh auto-pushes

```bash
grep -q 'git push origin main' scripts/vault.sh && echo "✅" || echo "❌ No auto-push"
```

---

## Part C — Ongoing Due Diligence (Every Session)

### At session start

```bash
cd /home/z/my-project

# 1. Find ACTUAL current version (NEVER trust docs)
LATEST=$(git tag --list "vault/v*" | grep -v baseline | sort -V | tail -1)
echo "Latest: $LATEST"

# 2. Verify main == latest (no rollback)
[ "$(git rev-parse HEAD)" = "$(git rev-parse "$LATEST")" ] && echo "✅" || echo "❌ ROLLBACK RISK"

# 3. Verify GitHub reachable
git ls-remote --tags origin >/dev/null 2>&1 && echo "✅ GitHub" || echo "⚠️ Re-add PAT"

# 4. Check allowedDevOrigins (the #1 cause of broken previews)
grep 'allowedDevOrigins' next.config.ts && echo "✅" || echo "❌ ADD IT NOW"

# 5. Start dev server (ALWAYS use dev.sh, never bun run dev &)
bash .zscripts/dev.sh
```

### Before every vault

```bash
# 1. Verify changes don't break
bun run lint

# 2. Vault (auto-pushes)
bash scripts/vault.sh vX.Y "description"

# 3. Verify
bash scripts/health-check.sh
```

### At session end

```bash
git status              # should be clean
git log --oneline -1    # should match latest tag
```

---

## The 8 Rules (updated from 7)

1. **ALWAYS restore from a `vault/v*` TAG**, never from `main`.
2. **ALWAYS find the latest tag dynamically** (`git tag --list "vault/v*" | sort -V | tail -1`).
3. **ALWAYS verify `main == latest tag`** after restoring + after vaulting.
4. **ALWAYS run `vault.sh`** after meaningful changes (auto-pushes).
5. **ALWAYS start the dev server with `.zscripts/dev.sh`** (never `bun run dev &`).
6. **NEVER remove `output: "standalone"`** from next.config.ts.
7. **NEVER remove `allowedDevOrigins`** from next.config.ts. ⚠️ NEW
8. **NEVER hardcode preview URLs or version numbers** in docs.

---

## Quick Reference: 5-Command Survival Kit

```bash
# 1. Find current version
git tag --list "vault/v*" | grep -v baseline | sort -V | tail -1

# 2. Restore from latest tag (NEVER from main)
git reset --hard $(git tag --list "vault/v*" | grep -v baseline | sort -V | tail -1)

# 3. Vault (auto-pushes)
bash scripts/vault.sh vX.Y "description"

# 4. Start dev server (ALWAYS use dev.sh)
bash .zscripts/dev.sh

# 5. If preview shows Z logo forever, check:
grep allowedDevOrigins next.config.ts
# If missing: add allowedDevOrigins: ["*.space-z.ai"] to next.config.ts
```

---

*Guide v2 — written from the Araya project's experience (github.com/Random1495701/arrya). 9 vault tags, 1 allowedDevOrigins break, 1 dev-server death. The original guide's 10 Hard Truths are now 12 — the 2 new ones (allowedDevOrigins + dev server management) were both discovered the hard way.*
