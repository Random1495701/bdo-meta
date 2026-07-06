# BDO Meta — Database Stability Marker

> **Marked Stable**: 2026-07-06
> **Version**: v5.9.8
> **Skill Count**: 7,038 skills (3,485 maxRank)
> **ClassId Source**: bdocodex.com tooltip `tag_required_class` field (source of truth)

## Stability Declaration

This database has been verified as **CORRECT and STABLE**. All skill classId
assignments match the bdocodex tooltip source of truth. Skill filtering by
class and spec is confirmed accurate by user QC.

## What Was Fixed

### ClassId Poisoning (v5.9.7)
- **Root cause**: bdocodex assigns skills to the classId of the tree page they
  appear on, NOT the actual class. The tooltip page has the correct class.
- **Fix**: Re-scraped all 7,038 skill tooltips from `bdocodex.com/tip.php`,
  extracted `tag_required_class`, and corrected 675 skills.
- **Verification**: 0 cross-class leaks across all 31 classes × 3 specs.

### BSR Deduplication (v5.9.7)
- Succession: `Black Spirit: Prime: X` replaces `Black Spirit: X`
- Awakening: `Black Spirit: Absolute: X` replaces `Black Spirit: X`

### Max-Rank (v5.9.7)
- Recomputed after classId fix. 3,485 maxRank skills.
- Each (classId, baseName, variant) group has exactly one maxRank entry.

### Spec Dedup (v5.9.0-v5.9.3)
- 0 Awakening leaks in Succession across all classes
- 0 Succession leaks in Awakening across all classes
- Core:/Rabam skills correctly spec-filtered

## DO NOT Re-Scrape classId

The `classId` and `className` fields are now correct. Do NOT run any sync
scripts that would overwrite them from bdocodex's API (which returns the
wrong classId). Only trust the tooltip source.

## Verification Status

| Check | Status |
|-------|--------|
| classId matches tooltip | ✅ 7038/7038 |
| className matches classId | ✅ 0 mismatches |
| 0 cross-class leaks | ✅ all 31 classes |
| 0 spec leaks | ✅ all 31 classes |
| BSR dedup correct | ✅ Prime for Succ, Absolute for Awk |
| Max-rank correct | ✅ 3485 skills |
| Grabs verified | ✅ 38 real grabs |
| PvP% confirmed | ✅ passives excluded |
| Icons | ✅ 2875/2875 present |
