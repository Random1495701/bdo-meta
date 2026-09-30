# BDO Meta Roadmap — 7/1/2026 (Revised)

> Created after comprehensive audit against ZAI_PROJECT_MANAGEMENT guide, GitHub versions v1-v5.1, and full chat history.
> Previous roadmap: docs/ROADMAP_2026-07-01.md (superseded)

## Current State: v5.1.0
- **Code**: v5.1.0 on GitHub (tagged, verified)
- **DB**: 7,921 skills (4,111 enriched, 3,810 stubs needing enrichment)
- **Features**: 7 tabs (Data, Meta, Matchups, Tiers, Patches, Dmg Calc, Docs)
- **PA Wiki**: Correct spec-dependent groups (Pulverizer, not Crusher) + SA DR
- **Max-rank**: DB-level isMaxRank column (2,557 max-rank skills)
- **Grab logic**: Prerequisite-based replacement for awakening spec
- **False grabs**: 17 Q-block skills correctly classified as protection
- **Project management**: .env untracked, .gitignore updated, CHAT_HISTORY.md created, rescue beacon at /home/user_skills/RESCUE.md

## Project Management Compliance (audited against ZAI guide)

| Check | Status | Notes |
|-------|--------|-------|
| .env untracked | ✅ Fixed | Was tracked, now gitignored |
| .env.example exists | ✅ Created | Template for new sessions |
| GITHUB_PAT in .env | ✅ Added | Persists across resets |
| Token at ~/.config/bdo-meta/ | ✅ Created | chmod 600 |
| Rescue beacon | ✅ Created | /home/user_skills/RESCUE.md |
| CHAT_HISTORY.md (root) | ✅ Created | Empty, needs population |
| worklog.md | ✅ Exists | 280K, comprehensive |
| docs/chat-history/ | ✅ 10 files | Session transcripts |
| output: "standalone" | ✅ Present | next.config.ts |
| Build script has cp commands | ✅ Present | package.json |
| health-check.sh | ❌ Missing | Need to create |
| vault.sh | ❌ Missing | Need to create |
| db/custom.db untracked | ❌ Tracked | Need to untrack |
| SESSION_HANDOFF.md | ⚠️ Stale | Needs rewrite |
| KNOWN_ISSUES.md | ❌ Missing | Need to create |

## P0 — Critical (Do First)

### P0.1: Enrich 3,810 Stub Skills
- 3,810 skills have name="Skill {id}" with no data
- Includes: Neck Impaler (5178), Chokeslam variants, Greatsword Defense, etc.
- **Approach**: Use PAZ extraction (see docs/PAZ_EXTRACTION_GUIDE.md) or restart lurker
- **Patch update strategy**: Only enrich skills mentioned in patch notes, not all 3,810
- **Effort**: User provides PAZ data → app imports. OR restart lurker (slow, risk of bdocodex block)

### P0.2: Patch Note → DB Update Pipeline
- PA does updates every Thursday. We need to:
  1. Scrape patch notes (Thursday lurker already built)
  2. Parse skill changes from patch notes (structured parser already built)
  3. **NEW**: Apply changes to DB (update damage values, CC types, etc.)
  4. **NEW**: Show up/down arrows in Data tab for changed skills until next patch
- This replaces re-downloading all of bdocodex — just apply the diff
- **Effort**: 4h

### P0.3: Complete Project Management Setup
- Create health-check.sh (from ZAI guide template)
- Create vault.sh (from ZAI guide template)
- Untrack db/custom.db
- Create SESSION_HANDOFF.md (current state)
- Create KNOWN_ISSUES.md (living tech-debt doc)
- Populate CHAT_HISTORY.md with this session
- **Effort**: 1h

## P1 — High Priority

### P1.1: Arena of Solare Redesign
- Add spec selection per class (groups change per spec — already done in matchups table)
- SA DR heatmap (green=high 25%, red=low 10%)
- Class portraits in the UI
- SA advantage notes in Arena comparison
- Arrow indicators for SA DR (↑ = above average)
- **Effort**: 4h

### P1.2: Hashashin & Scholar Grab Mystery
- 0 grabs in DB and bdocodex for both classes
- User says they have grabs — may use different CC label
- Check BDO Foundry guides or community resources
- **Effort**: 1h research

### P1.3: Lurker Investigation & Restart
- Lurker died (PID 2885, last heartbeat 2026-06-30T13:45)
- Need to investigate: bdocodex blocking? Challenge solver broken?
- May need to update lurker for new anti-bot measures
- Turbo mode is in the code (0.3-0.8s delays) but needs verification
- **Effort**: 2h

### P1.4: Q-Block Investigation (More Classes)
- Current: 6 classes (Valkyrie, Warrior, Nova, Wizard, Witch, Seraph)
- Missing skills may reveal more Q-block classes
- Also check: Striker, Mystic, Guardian, Berserker, Corsair, Drakania, Woosa, Maegu, Dosa, Deadeye, Wukong, Scholar, Shai, Archer, Tamer, Kunoichi, Ninja, Dark Knight, Musa, Maehwa, Lahn, Sage, Hashashin
- **Depends on**: P0.1 (missing skills enrichment)
- **Effort**: 1h after P0.1

### P1.5: Tiers Portrait Redesign
- Use character portraits in tier list visualization
- Podium layout for top 3
- **Effort**: 3h

## P2 — Medium Priority

### P2.1: Combo Extraction (Foundry)
- Scrape Foundry class guides for combo notation
- Store in DB, display in skill detail drawer
- **Effort**: 6h

### P2.2: Self-Host All Skill Icons
- 2,889 self-hosted, need to verify all 7,921 skills have icons
- Missing icons fall back to nothing (broken image)
- **Effort**: 1h

### P2.3: Documentation Gaps
- CHANGELOG.md stops at v2.0.0
- docs-page.tsx missing v2.6-v5.1
- SESSION_HANDOFF.md stale
- **Effort**: 2h

### P2.4: Video Parsing (ffmpeg scene detection)
- Detect double casts and hanging time in preview videos
- Plan exists in docs/VIDEO_PARSING_PLAN.md
- **Effort**: 6h

## P3 — Low Priority

### P3.1: PAZ Data Extraction (Future)
- User extracts PAZ files using docs/PAZ_EXTRACTION_GUIDE.md
- Upload via /api/upload/skills-json
- Replaces bdocodex entirely
- **Effort**: User-side extraction + 2h import script

### P3.2: DB Performance (baseName/isMaxRank indexes)
- Already have isMaxRank column — add composite indexes
- **Effort**: 1h

### P3.3: Dark/Light Theme Toggle
- next-themes installed but only sonner uses it
- **Effort**: 2h

## Summary

| Priority | Items | Effort | Depends On |
|----------|-------|--------|------------|
| P0 — Critical | 3 | 5h + user PAZ | None |
| P1 — High | 5 | 11h | P0.1 for P1.4 |
| P2 — Medium | 4 | 15h | None |
| P3 — Low | 3 | 5h | None |
| **Total** | **15** | **36h** + user | |

### Key Insight: Patch-Based Updates
Instead of re-downloading all of bdocodex after a patch, the strategy is:
1. **Thursday lurker** scrapes patch notes (already built)
2. **Structured parser** extracts skill changes (already built)
3. **NEW: Patch applier** updates DB with changed values (needs building)
4. **NEW: Visual indicators** show up/down arrows for changed skills (needs building)
5. **PAZ extraction** (future) provides the initial complete dataset, patches just apply diffs

This is much more efficient than re-scraping 7,921 skills from bdocodex every patch.
