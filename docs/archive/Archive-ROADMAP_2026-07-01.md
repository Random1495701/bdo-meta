# BDO Meta Roadmap — 7/1/2026

> Created after comprehensive audit of all chat history, worklog, and codebase state.
> Replaces all previous roadmaps.

## Current State: v5.0.0
- 4,111 skills in DB (missing ~5,900 skill IDs — bdocodex has more)
- 31 classes with correct PA Wiki data (spec-dependent groups, SA DR)
- 6 tabs: Data, Meta, Matchups, Tiers, Patches, Dmg Calc, Docs
- Grapple parsing fixed (17 false grabs corrected)
- Q-block identified for 6 classes (Valkyrie, Warrior, Nova, Wizard, Witch, Seraph)
- Video autoplay OFF (no bdocodex sniping)
- Lurker stopped (PID dead, lock cleaned)
- Stop button always visible

## Critical Issues (P0 — Fix First)

### P0.1: Missing Skills (5,900+ skill IDs missing)
- DB has 4,111 skills, bdocodex has ~10,000+
- Missing: Neck Impaler, Chokeslam II/III/Absolute, Greatsword Defense, etc.
- **Cause**: Original sync used `query.php?a=skills&type=skillbuilder` which only returns skills visible in the skill calculator (not all ranks/variants)
- **Fix**: Use bdocodex sitemap (`sitemap_2_us.txt`) to discover ALL skill IDs, then sync missing ones
- **Effort**: 4h (sitemap parse + targeted sync)

### P0.2: Max-Rank Filtering Logic
- Current: JS-level grouping by base name, picks highest rank
- Problem: Doesn't handle Absolute replacing Main, Prime replacing Main/Absolute
- Missing skills compound the problem (e.g., only Chokeslam I exists, no Absolute)
- **Fix**: Once all skills are synced, fix max-rank logic:
  - If Prime:/Succession: exists → use it (Succession spec)
  - If Absolute: exists → use it (Awakening spec, replaces Main)
  - Otherwise → use highest rank of Main
- **Effort**: 2h

### P0.3: Grab Spec Assignment Logic
- Current: All skills with Grapple CC counted in both specs
- Correct (per user explanation):
  - Main weapon grabs → count in Succession spec
  - For Awakening: main grab is REPLACED by the awakening skill that lists it as prerequisite
  - Awakening-specific grabs → count in Awakening spec only
  - Prime:/Succession: grabs → count in Succession only
  - Absolute: grabs → count in both (replaces Main for Awakening)
- **Fix**: Use prerequisiteIds to determine replacement chains
- **Depends on**: P0.1 (need complete skill data including prerequisites)
- **Effort**: 3h

### P0.4: Damage Calculator Rewrite
- Current: Basic formula, not matching community-validated math
- Correct formula (from bdo-tools.net/@gpw):
  1. AP = Total AP (user input)
  2. Base Damage = AP + Species AP - Enemy DR
  3. Damage after DR Rate = Base × (1 - DR%)
  4. Critical Hit = Damage × (Crit Multiplier) [assume 100% crit, 2.25x]
  5. Final Multipliers = Damage × PvP% × Skill Damage% × Hit Count
  6. Class Group Multiplier = ×1.05 if counter advantage
  7. SA Damage Reduction = × (1 - SA DR%)
- UI needs: Total AP, Total DR, spec selection (for group + SA DR), crit/back/down/air toggles
- Advanced mode: pick specific class to read their SA DR%
- **Effort**: 4h

## High Priority (P1)

### P1.1: Arena of Solare Redesign
- Add spec selection (Awa/Succ) per class (groups change per spec)
- SA DR heatmap (green=high, red=low)
- SA advantage notes in comparison
- Class portraits in the UI
- Better visualization overall
- **Effort**: 4h

### P1.2: Hashashin & Scholar Grab Mystery
- Both classes have 0 grabs in DB and on bdocodex
- User says they have grabs — may use different CC label
- Need to check Foundry guides or community resources
- **Effort**: 1h research

### P1.3: Q-Block Investigation (More Classes)
- Current: 6 classes (Valkyrie, Warrior, Nova, Wizard, Witch, Seraph)
- Missing skills may reveal more Q-block classes
- **Depends on**: P0.1 (missing skills sync)
- **Effort**: 1h after P0.1

### P1.4: Lurker Investigation & Restart
- Lurker died (PID 2885 dead, last heartbeat 2026-06-30T13:45)
- Need to investigate why it stopped (bdocodex blocking?)
- May need to update lurker to handle new anti-bot measures
- **Effort**: 2h

## Medium Priority (P2)

### P2.1: Tiers Portrait Redesign
- Use character portraits in tier list visualization
- **Effort**: 3h

### P2.2: Combo Extraction (Foundry)
- Scrape Foundry class guides for combo notation
- Store in DB, display in skill detail drawer
- **Effort**: 6h

### P2.3: Self-Host All Skill Icons
- Currently 2,889 self-hosted — need to verify all 4,111 skills have icons
- Missing icons may fall back to bdocodex URLs
- **Effort**: 1h

### P2.4: Documentation Gaps
- CHANGELOG.md stops at v2.0.0
- docs-page.tsx missing v2.6-v5.0
- **Effort**: 2h

## Low Priority (P3)

### P3.1: Video Parsing (ffmpeg scene detection)
- Detect double casts and hanging time in preview videos
- Plan exists in docs/VIDEO_PARSING_PLAN.md
- **Effort**: 6h

### P3.2: PAZ Data Extraction
- Future: extract skill data from BDO game files directly
- More accurate than bdocodex (frame-accurate animations)
- Plan exists in docs/PAZ_EXTRACTION.md
- **Effort**: 8h+

### P3.3: DB Performance (baseName/isMaxRank columns)
- Precompute max-rank filtering at sync time
- Add composite indexes
- **Effort**: 3h

## Summary

| Priority | Items | Effort | Depends On |
|----------|-------|--------|------------|
| P0 — Critical | 4 | 13h | None |
| P1 — High | 4 | 8h | P0.1 |
| P2 — Medium | 4 | 12h | None |
| P3 — Low | 3 | 17h | None |
| **Total** | **15** | **50h** | |

### Execution Order
1. P0.1 (Missing Skills) → unblocks P0.2, P0.3, P1.3
2. P0.4 (Damage Calculator) → independent
3. P0.2 (Max-Rank) → depends on P0.1
4. P0.3 (Grab Logic) → depends on P0.1, P0.2
5. P1.1 (Arena Redesign) → independent
6. P1.4 (Lurker) → independent
7. P1.2 (Hash/Scholar) → research
8. Everything else → as time permits
