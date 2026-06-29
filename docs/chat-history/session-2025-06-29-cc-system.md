# Session 6 — 2025-06-29 (Late Night) — CC System + Protection Icons + Table Sort

## User Request
Add a "Pvp cc only" filter to cc types as the first filter. Ranges are still crazy, there is no skill with 1200 sec of cooldown. Figure out a plan how we can parse through the videos to skip when a skill is being cast twice or there is hanging time after the skill. Do not execute it, just figure it out. Test out the waters for access to this skill data from other sources too.

## What Was Done
- Researched BDO CC counter values from blackdesertfoundry.com and garmoth.com: 8 real CCs (Stun, Stiffness, Freeze, Knockdown, Float, Bound, Grapple, Knockback). Stiffness and Knockback have 0.7 counter value; all others have 1.
- Created `src/lib/cc.ts` with CC_TYPES, NON_CC_EFFECTS, PROTECTION_META, calculateCCCounters(), formatCCCounters()
- Fixed CC counter values: Stiffness=0.7, Knockback=0.7 (was both 1)
- Added "PvP CC only" filter as first option in CC Types section
- Fixed cooldown slider range: 90th percentile (60s) instead of 1200s outlier
- Created `docs/VIDEO_PARSING_PLAN.md` — 4-phase plan for detecting double casts + hanging time using ffmpeg scene detection. Not executed per user request.
- Discovered `api.garmoth.com/api/skill-addons` is completely open (no anti-bot, 927 skills with addon popularity data, matching bdocodex IDs)
- Discovered bdocodex sitemap has 29,005 skill URLs (vs our 7,231)

## Key Findings
- CC counter: Stun/Float/Bound/Freeze/Grapple/Knockdown = 1, Stiffness/Knockback = 0.7
- At 2 counters, target becomes CC-immune. Stiffness + 2 CCs can reach 2.7 (bypasses cap)
- api.garmoth.com is a viable alternative data source with no rate limiting
- Video parsing plan: use ffmpeg scene filter to detect motion curves, identify hanging time and double casts

## Task IDs: 14, 15
