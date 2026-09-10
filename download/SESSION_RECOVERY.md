# SESSION RECOVERY — BDO Meta

**You are a new z.ai session starting work on the BDO Meta project.** This file is the single source of truth for picking up where the last session left off.

---

## ⚠️ FIND THE CURRENT VERSION FIRST — DO NOT TRUST VERSION NUMBERS IN THIS DOC

**Version numbers in this document go stale.** Always find the ACTUAL current version from git:

```bash
cd /home/z/my-project
LATEST_TAG=$(git tag | sort -V | tail -1)
echo "Latest tag: $LATEST_TAG"
git tag | wc -l
git log -1 --oneline "$LATEST_TAG"
```

**Use `$LATEST_TAG` in every `git reset --hard` command.** Git is the source of truth, not this document.

---

## 30-Second Orientation

**BDO Meta** is a Next.js 16 skill database for Black Desert Online. It ingests ~7,189 skills from bdocodex.com, stores them in SQLite via Prisma, and surfaces them through an 8-tab UI (Data, Meta, Matchups, Tiers, Patches, Sessions, Dmg Calc, Docs). Features include spec-aware skill deduplication, PvP damage calculator, tier builder, Arena of Solare 3v3 selector, patch note tracking, and session tracking.

**Current state:** v5.5.5 — all core features shipped. 7,189 skills, 31 classes, 3,471 maxRank skills, 82 real Grapple skills, 6 ascension classes.

**Platform-reset history:** This project has been wiped multiple times by platform resets. The DB is now in git (10MB) to survive these. GitHub is the durable backup layer.

---

## Step 1 — Restore Project from GitHub

```bash
cd /home/z/my-project

# 1. Set up GitHub credentials (user provides PAT)
echo "https://Random1495701:USER_PROVIDES_TOKEN@github.com" > ~/.git-credentials
chmod 600 ~/.git-credentials
git config credential.helper store
git config user.email "z@container"
git config user.name "Z User"

# 2. Add remote and fetch everything
git remote add origin https://github.com/Random1495701/bdo-meta.git 2>/dev/null || true
git fetch origin
git fetch origin --tags

# 3. Restore to the LATEST version (find it first)
LATEST=$(git tag | sort -V | tail -1)
echo "Restoring to: $LATEST"
git reset --hard "$LATEST"
# Do NOT use 'git reset --hard origin/main' — local main may have stray
# auto-save commits from the platform. ALWAYS restore from a TAG.

# 4. Install dependencies
bun install

# 5. Push DB schema
bun run db:push

# 6. Verify everything works
bun run lint                          # should be clean
curl -s http://localhost:3000/api/stats | head -c 100  # should return JSON

# 7. Start dev server
bash .zscripts/dev.sh
```

---

## Step 2 — Verify Project State

```bash
cd /home/z/my-project
git status --short                    # should be empty
git tag | sort -V | tail -3           # show latest 3 tags
LATEST=$(git tag | sort -V | tail -1)
[ "$(git rev-parse HEAD)" = "$(git rev-parse "$LATEST")" ] && echo "✅ main == $LATEST" || echo "❌ ROLLBACK RISK"
```

---

## Step 3 — Current Project Stats

- **Skills:** 7,189 (3,471 maxRank)
- **Classes:** 31 (6 ascension: Archer, Shai, Scholar, Deadeye, Wukong, Seraph)
- **Grapple skills:** 82 real (15 false grabs fixed)
- **Tabs:** 8 (Data, Meta, Matchups, Tiers, Patches, Sessions, Dmg Calc, Docs)
- **GitHub:** https://github.com/Random1495701/bdo-meta

---

## Step 4 — Key Files

| File | Purpose |
|------|---------|
| `docs/SESSION_HANDOFF.md` | Current project state |
| `docs/ROADMAP_MASTER.md` | 3-tier roadmap (36 items) |
| `docs/KNOWN_ISSUES.md` | Open + resolved issues |
| `docs/SPEC_DEDUP_LOGIC.md` | How skill spec deduplication works |
| `docs/OCR_VLM_PLAN.md` | Lean OCR approach (no internal LLM) |
| `CHAT_HISTORY.md` | Chat session index |
| `worklog.md` | Agent work log (3000+ lines) |
| `src/lib/spec-dedup.ts` | Shared dedup module (Data/Meta/Tiers all use this) |
| `src/lib/version.ts` | Auto-derived version from git tags |
| `scripts/restore-db.ts` | Restores DB + auto-runs PA Wiki import + compute-max-rank |
| `scripts/sync-version.ts` | Syncs version.ts with git tags |
| `scripts/vault.sh` | Version snapshot tool (auto-pushes to GitHub) |
| `scripts/health-check.sh` | One-command verification |

---

## Step 5 — How to Make Changes

1. Read `worklog.md` (tail) and `CHAT_HISTORY.md` for recent context
2. Make changes
3. Verify: `bun run lint`
4. Commit: `git add -A && git commit -m "description"`
5. Tag: `git tag vX.Y.Z`
6. Push: `git push origin main && git push origin vX.Y.Z`
7. Append to `worklog.md`
8. Run `bash scripts/health-check.sh` to verify

---

## ⚠️ Deployment Configuration (DO NOT CHANGE)

1. **`next.config.ts`** MUST have `output: "standalone"`
2. **`package.json` build script** MUST include the `cp -r` commands
3. **`package.json` start script** MUST use `bun .next/standalone/server.js`
4. **`db/custom.db`** MUST exist (it's in git, 10MB)

---

## Three rules that prevent version rollbacks

1. **Always restore from a git TAG, never from `main`.**
2. **Always find the latest tag dynamically** (`git tag | sort -V | tail -1`), never trust a version number written in a doc.
3. **After restoring, verify `main == latest tag`.**
