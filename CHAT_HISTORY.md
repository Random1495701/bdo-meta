# BDO Meta — Chat History Index

> Consolidated index of all chat sessions that shaped the BDO Meta app.
> Full transcripts in `docs/chat-history/`.

## Session Timeline

| Date | Session | Key Topics | Version Impact |
|------|---------|------------|----------------|
| 2025-06-28 | [evening](chat-history/session-2025-06-28-evening.md) | Initial concept: BDO skill database, mirror bdocodex, animation duration, filtering UI | v1.0.0 |
| 2025-06-28 | [night](chat-history/session-2025-06-28-night.md) | Alternative data sources, lurker anti-bot strategy | v1.1.0, v1.2.0 |
| 2025-06-29 | [late-night](chat-history/session-2025-06-29-late-night.md) | Diagnose lurker stall, user-uploaded BDO files | v1.2.0 |
| 2025-06-29 | [redesign](chat-history/session-2025-06-29-redesign.md) | Max-level auto-filter, evasion filter, BDO-themed UI redesign, rename to "BDO Meta" | v1.3.0, v1.4.0 |
| 2025-06-29 | [documentation](chat-history/session-2025-06-29-documentation.md) | Document all changes, git commits, non-deletable backups | v1.4.0 |
| 2025-06-29 | [cc-system](chat-history/session-2025-06-29-cc-system.md) | PvP CC only filter, slider ranges, video parsing plan | v1.8.0 |
| 2025-06-29 | [cc-fix](chat-history/session-2025-06-29-cc-fix.md) | CC counter values, detail drawer redesign, SA/FG icons | v1.6.0, v1.7.0 |
| 2025-06-29 | [github-paz](chat-history/session-2025-06-29-github-paz.md) | Cooldown slider, PAZ extraction docs, GitHub commit + token | v1.9.0 |
| 2025-06-29 | [spec-filtering](chat-history/session-2025-06-29-spec-filtering.md) | S/A spec buttons, multi-spec toggle | v2.0.0, v2.1.0 |
| 2025-06-30 | [restoration](chat-history/session-2025-06-30-restoration.md) | Feature restoration, tier builder, patch notes, portraits, version dropdown, damage calc, grab logic, matchups | v3.0.0–v5.1.0 |

## Recent Sessions (post-chat-history, via worklog)

| Date | Worklog Task ID | Key Topics | Version Impact |
|------|-----------------|------------|----------------|
| 2026-07-04 | Task 34 (DEDUP-FIX) | Fixed "ALL Classes" duplicate skills, spec docs, OCR/VLM plan | v5.4.1 |
| 2026-07-04 | Task 35 (LEAN-DEDUP-DPC) | Shared dedup module, addon system skipped, lean app (no LLM), PvP DPC | v5.4.1 |
| 2026-07-04 | Task 36 (PVP-DPC-ROADMAP) | PvP DPC conversion, matchups redesign, spec comparison, patch arrows | v5.4.1 |
| 2026-07-04 | Task 37 (AWA-LEAK-HEATMAP) | Fixed Awakening leaks in Succession, removed heatmap overlays, grab mystery resolved | v5.4.1 |
| 2026-07-04 | Task 38 (INDEXES-THEME-LURKER-COMBOS) | DB indexes, theme toggle, lurker investigation, combo guide links | v5.4.1 |
| 2026-07-04 | Task 39 (AUDIT-ROADMAP) | Comprehensive audit + new roadmap, CHAT_HISTORY, version metadata | v5.4.1 |
| 2026-07-04 | Task 40 (VERSION-VALIDATE-REBUILD-ROADMAP) | Version validation, full rebuild after session reset, TS error fixes | v5.5.0, v5.5.1 |
| 2026-07-04 | Task 41 (CRITICAL-DB-RESTORE-FIX) | Restored PA Wiki data, fixed import-pa-wiki script | v5.5.2 |
| 2026-07-04 | Task 42 (DB-IN-GIT-FIX-MISSING) | DB stored in git, restored missing features, added missing grab skills | v5.5.2 |
| 2026-07-05 | Task 43 (DB-AUDIT-AND-RESTORE) | DB audit, restored from v3.9.0 export (7,189 skills, was 4,113) | v5.5.3 |
| 2026-07-05 | Task 44 (STABILITY-FILTERING-AUDIT) | Stability fixes, version auto-derivation, session reset banner, false grab fix, export regeneration | v5.5.3 |

## Key User Decisions

1. **2025-06-29**: Rename from "BDO Skills Codex" to "BDO Meta"
2. **2025-06-30**: Restore features lost in v3.x reset
3. **2026-07-04**: Skip addon system entirely
4. **2026-07-04**: Lean app — no internal LLM, use external free AI paste-JSON flow
5. **2026-07-04**: DPC should be PvP DPC (keep PvE DPC for future tiering)
6. **2026-07-04**: Remove ugly heatmap overlays (colored numbers/arrows only)
7. **2026-07-04**: Skip video parsing (will get from PAZ instead)
8. **2026-07-05**: Skip Skill Build Calculator
9. **2026-07-05**: Skip addon system (confirmed)
10. **2026-07-05**: Skip video parsing (confirmed)
11. **2026-07-05**: Prioritize stability + backup + skill filtering correctness
