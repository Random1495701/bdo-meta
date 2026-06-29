# Session 8 — 2025-06-29 (Morning) — Cooldown Slider + PAZ Docs + GitHub

## User Request
Change cooldown setting to include 3-5 min skill cooldowns as well, clipping at the highest mark before the 1200s skills., and then a clipable jump to 1200 [that skips all values in between] for the black spirit skills. RE: Video Parsing Plan - Can i extract that data in the paz files somewhere as well? I plan on injecting live extracted databases as the game gets updated by myself instead of waiting for the lurker. Start committing to my github repo as well for backup safety. Do github token hygiene also.

## What Was Done
- Fixed cooldown slider: 0-240s smooth range + "Include Black Spirit (20m)" jump button (skips to 1200s)
- Created `docs/PAZ_EXTRACTION.md` — complete guide for extracting skill data from BDO PAZ files:
  - File locations for skill XML, .pac animation files, icons
  - How to parse .pac files for frame-accurate animation duration (frame_count / 60 FPS)
  - Class prefix mapping (phm=Warrior, pef=Ranger, etc.)
  - Live database injection workflow for patch updates
  - Comparison: bdocodex (video-based) vs PAZ extraction (frame-accurate)
- Set up GitHub backup at https://github.com/Random1495701/bdo-meta
- db/custom.db (102MB) exceeded GitHub 100MB limit. Used git filter-branch to remove from all history. Exported as JSON (2.2MB) instead.
- Pushed all commits + 10 version tags (v1.0.0 through v1.9.0)

## Key Findings
- Cooldown distribution: 90% of skills ≤60s, max non-Black-Spirit is 240s, 61 Black Spirit skills at 1200s
- BDO PAZ files contain frame-accurate animation data in .pac files: duration = frame_count / 60
- Skill XML in ui_data/skill/skill_*.xml, animations in character/skillaction/{prefix}_skill_{id}.pac
- GitHub has 100MB file limit; SQLite DB must be exported as JSON for backup

## Token Hygiene Warning
GitHub token was shared in chat. User revoked it after this session. Token was NOT saved to any file in the repo. Remote URL uses clean HTTPS without token.

## Task ID: 16
