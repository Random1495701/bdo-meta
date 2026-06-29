# Session 9 — 2025-06-29 (Midday) — Spec Filtering + Multi-Spec

## User Request (Part 1)
Learn what succession and awakening are so that you are not confused by what im looking for. I want to be able to select a spec and have the skills available for that spec loaded at a click. To do it, add buttons for succession and awakening bellow the class icons instead of the counter for how many skills there are. When clicking S or A, the system automatically filters the skills either would have. Succession would display Succession+Main+Absolute+Black Spirit+Passive minus the skills that have the same name, removing the main/absolute versions of those skills that have a succession or prime version and only displaying the awakening ones "Succession: " or "Prime: ". Awakening would display: Main+Awakening+Absolute+Black Spirit+Passive, removing the duplicate skills that have the same name but are absolute and main, leaving only the absolute version displayed.

## User Request (Part 2)
Allow for succession and awakening to be clicked at the same time. In fact, when clicking on the class icon (instead of the individual icons) activate both always.

## What Was Done
- Learned BDO spec system: At level 56, choose Awakening (awakened weapon) or Succession (enhanced main weapon)
- Added S/A buttons below each class icon (replacing skill count badge)
- Succession spec: Shows Prime:/Succession: versions (replacing Main/Absolute). Excludes Awakening skills.
- Awakening spec: Shows Absolute versions (replacing Main). Excludes Succession/Prime skills.
- Spec-aware deduplication: strips prefixes to compare base names across versions
- Multi-spec support: S and A can be clicked together (toggleSpec)
- Clicking class icon activates BOTH specs by default
- Fixed dedup issues:
  - Black Spirit: Prime: prefix detection (nested prefix)
  - Absolute-over-Main dedup in succession spec
  - Spec base name extraction keeps "Black Spirit: " prefix (BS skills are separate)

## Key Findings
- BDO specs: Succession = Prime skills + Main/Absolute (deduped) + BS + Passive, no Awakening
- BDO specs: Awakening = Awakening skills + Absolute (replaces Main) + BS + Passive, no Succession
- "Black Spirit: Prime: " is a nested prefix that needs special handling
- 1 remaining edge case: "Slash" skill has both "Absolute: Slash" and "Slash X" showing (max-rank + spec dedup interaction)

## Results (Warrior)
| Spec | Skills | Awakening | Succession | Duplicates |
|------|--------|-----------|------------|------------|
| Succession only | 64 | 0 ✓ | — | 1 (edge case) |
| Awakening only | 81 | — | 0 ✓ | 1 (edge case) |
| Both specs | 85 | — | — | 1 (edge case) |
| No spec | 124 | — | — | — |

## Task IDs: 17, 18
