# SESSION RECOVERY — Read This First

**You are a new z.ai session starting work on the Gamut project.** This file is the single source of truth for picking up where the last session left off.

---

## ⚠️ FIND THE CURRENT VERSION FIRST — DO NOT TRUST VERSION NUMBERS IN THIS DOC

**Version numbers in this document go stale.** They are written as examples only. Before running ANY restore command, find the ACTUAL current version from git itself:

```bash
cd /home/z/my-project
LATEST_TAG=$(git tag --list "vault/v*" | grep -v baseline | sort -V | tail -1)
echo "Latest vault tag: $LATEST_TAG"          # e.g. vault/v11.9.8
git tag --list "vault/v*" | wc -l             # e.g. 96
git log -1 --oneline "$LATEST_TAG"           # show the commit it points to
```

**Use `$LATEST_TAG` in every `git reset --hard` command below.** Wherever this doc says `vault/v<LATEST>`, substitute the output of the command above.

**The golden rule:** git is the source of truth, not this document. If this doc says "v11.9.6" but git says the latest tag is `vault/v11.9.8`, **git wins.**

---

## ⚠️ CRITICAL: Read This Before Anything Else

**The previous z.ai session's preview deployment was RECYCLED by z.ai's platform.** The preview URL `https://preview-bac3d774-36a0-492e-b901-86ac2f5e3e7c.space-z.ai/` returns **404 Not Found**. The bare domain returns **410 Gone — "Project expired and recycled"**. This is NOT a code issue — the code builds and runs perfectly. The deployment target itself was recycled.

**This means:**
1. The user deleted the old z.ai session and started this new one to get a fresh preview URL
2. All work is safe on GitHub: https://github.com/Random1495701/gamut (all vault tags, full history)
3. You need to restore the project from GitHub (see Step 2 below)
4. The new session's preview URL will be different — use whatever z.ai assigns

**Do NOT trust any hardcoded preview URLs in old docs.** The URL above is dead. The new session gets a fresh URL from z.ai.

**CRITICAL — also do NOT trust hardcoded version numbers in old docs.** This file previously said "restore to v11.9.6" when the actual latest was v11.9.8. Always find the current version from git (see the callout at the top of this file). Restoring to a stale version number causes a silent version rollback.

---

## MANDATORY: Preview Link After Every Response

**Every response you give MUST end with the preview link** so the user can view the app. The format is:

```
🔗 **Preview**: https://preview-<NEW-SESSION-ID>.space-z.ai/
```

Replace `<NEW-SESSION-ID>` with this session's actual ID (from the IM gateway metadata at the top of each user message — it's the `session_id` field, e.g. `bac3d774-36a0-492e-b901-86ac2f5e3e7c`).

If the preview isn't working:
1. Verify `output: "standalone"` is in `next.config.ts` (z.ai's `.zscripts/build.sh` REQUIRES this — it copies `.next/standalone/server.js` and runs it with `bun server.js`)
2. Verify the build script in `package.json` is: `next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/`
3. Call the `Complete` tool to trigger z.ai's deployment
4. If preview still returns 404 after 5 minutes, the session's container may be recycled — tell the user to start a new z.ai project
5. If the user reports the preview is blank, test the URL directly with `curl -sI <url>` to see the HTTP status code

---

## 30-Second Orientation

**Gamut** is a Next.js artwork → pigment matching studio. The user uploads a painting, the app extracts its palette via k-means in CIE Lab space, and matches each swatch against a curated database of **2,248 artist pigments** from **20 manufacturers** across **9 mediums**. Nine mixing algorithms, seven ΔE engines, four export formats (HTML, ASE, PDF, CSV), PWA installable, mobile tab layout, camera color picker, gamut comparison, batch processing, MixPreview engine, substitute finder, spectral analysis, and more.

**Current state:** v11.9.6 — all planned features shipped. Database expanded from 1,271 → 2,248 pigments across v10.9-v11.6. Deployment pipeline verified working (11-step simulation passes, HTTP 200).

**Platform-reset history:** This project has been wiped 5+ times by platform resets between sessions. The git vault system + GitHub backup were built specifically to survive these. **Git history + GitHub are the only durable mechanisms** — filesystem-only backups (even with chmod 444) were destroyed along with the working tree.

---

## Step 1 — Restore Project from GitHub (DO THIS FIRST)

Since the old session was deleted, you need to restore the full project from GitHub:

```bash
cd /home/z/my-project

# 1. Set up GitHub credentials
# The user will provide a fresh GitHub PAT (the old one was revoked).
# Store it securely:
echo "https://Random1495701:USER_PROVIDES_TOKEN@github.com" > ~/.git-credentials
chmod 600 ~/.git-credentials
git config credential.helper store
git config user.email "z@container"
git config user.name "Z User"

# 2. Add remote and fetch everything
git remote add origin https://github.com/Random1495701/gamut.git 2>/dev/null || true
git fetch origin
git fetch origin --tags

# 3. Restore to the LATEST version (find it first — see callout at top of file)
LATEST=$(git tag --list "vault/v*" | grep -v baseline | sort -V | tail -1)
echo "Restoring to: $LATEST"
git reset --hard "$LATEST"
# Do NOT use 'git reset --hard origin/main' — local main may have stray
# auto-save commits from the platform. ALWAYS restore from the vault TAG,
# not from the main branch. The tag is the immutable source of truth.

# 4. Install dependencies
bun install

# 5. Set up database
bun run db:push

# 6. Verify everything works
npx tsc --noEmit                    # should be clean (no output)
npx vitest run                      # should be 285/285 passing
bun run build                       # should produce .next/standalone/server.js

# 7. Start dev server
bash .zscripts/dev.sh
```

**If `bun install` fails**, the lockfile may be stale — run `bun install --no-save` or delete `node_modules` and retry.

**If the build fails**, check that `next.config.ts` has `output: "standalone"` — this is REQUIRED by z.ai's deployment pipeline.

---

## Step 2 — Verify Project State

```bash
cd /home/z/my-project
git status --short                                    # should be empty
git tag --list "vault/v*" | grep -v baseline | sort -V | tail -3  # show latest 3 tags
git fsck --full 2>&1 | tail -3                        # should be empty (no errors)
ls .next/standalone/server.js                         # should exist after build
npx vitest run --reporter=dot 2>&1 | tail -3          # should show 285 passing
# CRITICAL: verify local main == latest vault tag (prevents rollback)
LATEST=$(git tag --list "vault/v*" | grep -v baseline | sort -V | tail -1)
[ "$(git rev-parse HEAD)" = "$(git rev-parse "$LATEST")" ] && echo "✅ main == $LATEST" || echo "❌ main != $LATEST — ROLLBACK RISK"
```

---

## Step 3 — Current Project Stats

**Find the actual current version:** `git tag --list "vault/v*" | grep -v baseline | sort -V | tail -1`
**Find the actual tag count:** `git tag --list "vault/v*" | wc -l`

- **Pigments:** 2,248 across 20 manufacturers, 9 mediums
- **Spectral coverage:** 56.4% (100% of all real CII codes covered)
- **Mixing algorithms:** 9 (linear-rgb, subtractive-cmy, kubelka-munk, ryb, weighted-harmonic, chemistry-aware, munsell, hybrid, custom-hybrid)
- **ΔE engines:** 7 (CIEDE2000, CIEDE94, CMC, DIN99, CIE76, hybrid, custom-hybrid)
- **Tests:** 285 passing across 12 test files
- **Vault tags:** run `git tag --list "vault/v*" | wc -l` for the current count (range: `vault/v2.3-baseline` → latest)
- **Changelog entries:** 95+ (`v1.1` → latest)
- **GitHub:** https://github.com/Random1495701/gamut (private, all tags pushed)
- **Sample images:** 4 local (Mononoke, Pomegranates, Fehérlófia, Ghost in the Shell) + 9 remote (Wikimedia classics)

---

## Step 4 — Key Files

| File | Purpose |
|------|---------|
| `CHAT_HISTORY.md` | Full conversation transcript (in git, survives resets) — READ THE TAIL for latest context |
| `worklog.md` | Multi-agent work log (in git) — READ THE TAIL for recent work |
| `download/ROADMAP.md` | Project roadmap (NOTE: written at v10.4, some items now done) |
| `download/SESSION_RECOVERY.md` | This file — read first in any new session |
| `download/BACKUP_PROTOCOL.md` | Recovery protocol for 3 scenarios |
| `download/MATERIALS_CATALOG.md` | 42-manufacturer taxonomy with priority phases |
| `download/PLANS.md` | 4 future improvement plans |
| `download/MOBILE_AUDIT.md` | Mobile-specific issues + redesign proposal |
| `download/UI_UX_AUDIT_v10.8.md` | UI/UX audit findings |
| `download/FULL_FEATURE_AUDIT_v11.8.md` | 80 features audited, all working |
| `download/MISSING_FEATURES_AUDIT.md` | Audit of missing features (NOTE: some items now done — verify against code) |
| `.zscripts/dev.sh` | Platform dev server startup script (use this, not npx directly) |
| `.zscripts/build.sh` | z.ai's build pipeline — REQUIRES `output: "standalone"` |
| `.zscripts/start.sh` | z.ai's server startup — runs `bun server.js` from `.next/standalone/` |
| `scripts/vault.sh` | Version snapshot tool |
| `scripts/make-backup.sh` | Creates downloadable zips (src + vault + git bundle) |
| `scripts/simulate-deploy.sh` | Simulates z.ai's full deployment pipeline (11 steps) |

---

## Step 5 — How to Make Changes

1. Read `worklog.md` (tail) and `CHAT_HISTORY.md` (tail) for recent context
2. Make changes
3. Verify: `npx tsc --noEmit && npx vitest run && bun run build`
4. Update `ChangelogDialog.tsx` with new entry
5. Update `DocumentationDialog.tsx` version string (line ~30)
6. Update the version badge in `src/app/page.tsx` (search for `v11.9.5` — it's in the header)
7. Run `bash scripts/vault.sh vX.Y "commit message"`
8. Run `bash scripts/make-backup.sh` to create downloadable zips
9. `git push origin main && git push origin vault/vX.Y`
10. Append to `worklog.md` and `CHAT_HISTORY.md`
11. Call the `Complete` tool to trigger z.ai deployment
12. Include the preview link in your response

---

## ⚠️ Deployment Configuration (DO NOT CHANGE)

z.ai's deployment pipeline (`.zscripts/build.sh` + `.zscripts/start.sh`) requires:

1. **`next.config.ts`** MUST have `output: "standalone"` — without it, `.next/standalone/server.js` doesn't exist and deployment fails with "Sorry, there was a problem deploying the code"

2. **`package.json` build script** MUST be:
   ```
   next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/
   ```
   This copies static files and public assets into the standalone directory.

3. **`package.json` start script** MUST be:
   ```
   NODE_ENV=production bun .next/standalone/server.js
   ```
   z.ai runs this with `bun`, not `node`.

4. **`db/custom.db`** MUST exist — `build.sh` copies it to the deployment package and runs `db:push` on it.

**DO NOT remove `output: "standalone"`** — this was tried in v11.9 and broke the deployment. It was restored in v11.9.3.

---

## 60-Second TL;DR

Gamut: 2,248 pigments, 20 manufacturers, 9 mediums, 9 mixing algorithms, 7 ΔE engines, 285 tests. Find the current version + tag count from git (do NOT trust numbers written in docs — they go stale). GitHub backup at github.com/Random1495701/gamut. Previous z.ai session's preview was recycled (404/410) — user started this new session for a fresh URL. To recover: set credentials → `git fetch origin` → find latest tag with `git tag --list "vault/v*" | sort -V | tail -1` → `git reset --hard <THAT_TAG>` (NEVER reset to `main` — it may have stray auto-save commits) → `bun install` → `bash .zscripts/dev.sh`. All features shipped. The `Complete` tool triggers z.ai deployment. Always include the preview link (with the NEW session ID) in every response.

**Three rules that prevent version rollbacks:**
1. Always restore from a `vault/v*` TAG, never from `main`.
2. Always find the latest tag dynamically (`git tag --list "vault/v*" | sort -V | tail -1`), never trust a version number written in a doc.
3. After restoring, verify `main == latest tag`: `[ "$(git rev-parse HEAD)" = "$(git rev-parse "$(git tag --list 'vault/v*' | sort -V | tail -1)")" ] && echo OK`.
