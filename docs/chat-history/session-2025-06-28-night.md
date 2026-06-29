# Session 2 — 2025-06-28 Night — Lurker + Bot Detection Fix

## User Request
There are other sites that have the skills synced, can you use those to speed up the sync too? (Find them). Can we change the sync lurker so that it doesnt trigger bot detection?

## What Was Done
- Researched alternative BDO databases: garmoth, grumpygreen, bdolytics, bddatabase — ALL Cloudflare-locked
- Found that bdocodex itself has 6 endpoint variants (tip.php + 5 locale URLs)
- Built Lurker v1 (scripts/sync-lurker.ts) with endpoint rotation, session cookies, jittered delays
- Added --kr-names, --re-enrich, --batch, --videos, --once modes
- Added lurker UI (emerald button + real-time status indicator)
- Updated sync API to support lurker script
- Lurker enriched 50+ skills with 0 bot-challenges in ~5 minutes

## Key Findings
- No viable alternative data sources (all Cloudflare-locked)
- Solution is endpoint rotation on bdocodex itself
- Lurker v1: 2 English endpoints, jittered delays, single concurrency

## Task IDs: 4, 5
