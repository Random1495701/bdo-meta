# Session Handoff — BDO Meta Current State

## Current Version
Find dynamically: `git tag | sort -V | tail -1`
Last known: v5.1.0

## What's Working
- 7 tabs: Data, Meta, Matchups, Tiers, Patches, Dmg Calc, Docs
- 7,921 skills in DB (4,111 enriched, 3,810 stubs)
- 31 classes with correct PA Wiki data (spec-dependent groups, SA DR)
- DB-level max-rank filtering (isMaxRank column)
- Grab logic with prerequisite-based replacement
- False grab / Q-block fix (17 skills corrected)
- Damage Calculator v2 with validated PvP formula
- Spec-separated matchups (50 rows with AWK/SUCC/ASC)
- Arena of Solare 3v3 selector
- Version dropdown (switch between git tags)
- Error boundary with reset button
- Video autoplay OFF (no bdocodex sniping)
- Lurker stop button (always visible)
- Sort persistence via localStorage
- Exclusion system (double-click class chip)
- GitHub token at ~/.config/bdo-meta/github-token
- Rescue beacon at /home/user_skills/RESCUE.md

## Known Issues
1. 3,810 stub skills need enrichment (name="Skill {id}")
2. Hashashin & Scholar have 0 grabs in DB (may use different CC label)
3. CHAT_HISTORY.md is empty (needs population)
4. db/custom.db still tracked in some old commits (untracked going forward)
5. Lurker not running (died, needs investigation)
6. BDOToolkit and UnPAZ GitHub repos are gone (PAZ guide needs update)

## What Was Done This Session
- P0.2: DB-level max-rank filtering (isMaxRank column, compute script)
- P0.3: Grab spec assignment (prerequisite-based exclusion)
- P0.4: Damage Calculator v2 (validated formula from bdo-tools.net/@gpw)
- PA Wiki data fixed (Pulverizer not Crusher, spec-dependent groups)
- Spec-separated matchups (50 rows)
- 3,810 missing skill IDs synced from bdocodex sitemap
- Project management fixes (.env untracked, .gitignore, rescue beacon)
- PAZ extraction guide created
- Revised roadmap created

## What's Next (see docs/ROADMAP_2026-07-01_v2.md)
1. P0.1: Enrich 3,810 stub skills (PAZ extraction or lurker restart)
2. P0.2: Patch note → DB update pipeline (apply diffs, not re-download)
3. P1.1: Arena of Solare redesign with portraits + SA heatmap
4. P1.3: Lurker investigation & restart
5. P1.5: Tiers portrait redesign
6. P3.2: DB size optimization (filter to only spec-relevant skills)

## How to Verify This Doc Isn't Lying
```bash
git tag | sort -V | tail -1          # Should show v5.1.0 or higher
bun -e "const{db}=require('./src/lib/db');db.skill.count().then(c=>console.log(c))"  # Should show ~7921
curl -s http://localhost:3000/api/stats | head -c 100  # Should return JSON
bash scripts/health-check.sh          # Should pass all checks
```
