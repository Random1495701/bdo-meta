# BDO Meta — Chat History

## 👤 USER (2025-07-01)
> Go

## 🤖 AI Actions (v5.1.0: P0.2 + P0.3 + P0.4)
### P0.2: DB-level max-rank filtering
- Added `baseName` and `isMaxRank` columns to Skill model
- Created `scripts/compute-max-rank.ts` — computes max-rank for all skills
- 2,557 skills marked as maxRank
- Updated `/api/skills` and `/api/meta` to use `isMaxRank: true` DB filter
- Eliminated slow JS-level baseName/rank grouping

### P0.3: Grab spec assignment
- Added prerequisite-based exclusion for awakening spec
- Main skills that are prerequisites for awakening skills excluded from awakening spec
- Example: Guardian's Neck Impaler excluded from awakening grabs (replaced by Chokeslam)

### P0.4: Damage Calculator v2
- Completely rewritten with validated PvP formula from bdo-tools.net/@gpw
- Formula: `[(AP - DR) × (1 - DR_Rate%)] × Crit × (PvP% × Skill% × Hits) × Group × (1 - SA_DR%)`
- Input: Total AP, Enemy DR, DR Rate%, 4 scalar toggles, group selectors, SA DR, advanced mode
- Results: Sortable table with per-scalar columns, expandable formula breakdown

### Project management fixes
- Untracked .env, lurker.lock, dev.pid, bun.lock, db/custom.db
- Added .env.example, GITHUB_PAT to .env
- Created CHAT_HISTORY.md, rescue beacon at /home/user_skills/RESCUE.md
- Created health-check.sh, vault.sh
- Created SESSION_HANDOFF.md, KNOWN_ISSUES.md

## 👤 USER (2025-07-01)
> Verify with Github, verify with ZAI_PROJECT_MANAGEMENT file, verify state, review planned next steps, PAZ extractor guide in DATA

## 🤖 AI Actions (Project Management Audit)
- Fetched latest from GitHub, verified v5.1.0
- Restored DB (7,921 skills), PA Wiki data, false grab fixes, max-rank computation
- Audited against ZAI guide: untracked .env, created .env.example, rescue beacon
- Created PAZ extraction guide at docs/PAZ_EXTRACTION_GUIDE.md
- Created revised roadmap at docs/ROADMAP_2026-07-01_v2.md
- Note: BDOToolkit and UnPAZ repos are gone — PAZ guide needs update

## 👤 USER (2025-07-01)
> Do P0.3. PAZ tools repos gone. Do next steps on roadmap. Filter to only spec-relevant skills. Skip P2.4.

## 🤖 AI Actions (v5.3.0: P0.3 + P0.2 + P1.1 + P1.5)
### P0.3: Project management setup
- Created scripts/health-check.sh (9-point check)
- Created scripts/vault.sh (commit + tag + auto-push)
- Untracked db/custom.db, .env, lurker.lock, dev.pid, bun.lock
- Created .env.example with GITHUB_PAT template
- Created docs/SESSION_HANDOFF.md (current state)
- Created docs/KNOWN_ISSUES.md (living tech-debt doc)
- Populated CHAT_HISTORY.md with session history
- Updated PAZ guide (BDOToolkit and UnPAZ repos are gone)
- Fixed eslint config (ignore scripts directory)
- Rescue beacon at /home/user_skills/RESCUE.md

### P0.2: Patch note → DB update pipeline
- POST /api/patches/apply — applies patch changes to DB (dryRun support)
- GET /api/patches/changed — returns changed skill IDs for visual indicators
- Handles: cooldown changes, protection additions, CC additions
- Damage changes flagged for manual review (too complex to auto-parse)
- All changes logged via SkillChangeLog

### P1.1: Arena of Solare redesign
- SA DR heatmap on class chips (amber→green based on 10-25% SA DR)
- ↑ arrows for above-average SA DR (>10%)
- Class portraits in team display (spec-specific)
- SA advantage notes (avg SA DR comparison between teams)
- Spec-colored borders (red/blue/yellow)
- Spec badges (AWK/SUCC/ASC) on chips
- Fixed team state from string[] to spec-qualified entries

### P1.5: Tiers portrait redesign
- Spec-specific portraits (awakening/succession/ascension)
- Spec-color borders on portrait cards
- Bigger podium (rank 1=280px, rank 2=240px, rank 3=220px)
- Score overlay on portrait (large number with semi-transparent background)
- Portrait URL fallback chain (spec-specific → main → png)
