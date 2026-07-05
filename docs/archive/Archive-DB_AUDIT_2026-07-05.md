# DB Validity Audit + Roadmap Update

> **Created**: 2026-07-05
> **Finding**: The current DB (4,113 skills) is MISSING ~3,076 skills compared to the v3.9.0 export (7,189 skills). The wrong export was used for restoration.

---

## DB Validity Audit

### What happened
1. The DB was never in git until v5.5.2 (we fixed this)
2. When the session reset, the DB was restored from `db/skills-export.json`
3. **The export was wrong**: All tags from v4.1.0+ contain a 7.5MB export with 4,113 skills
4. **The correct export**: v3.9.0 and v4.0.0 contain a 16.4MB export with 7,189 skills
5. At some point between v4.0.0 and v4.1.0, the export was regenerated and lost 3,076 skills

### The numbers

| Metric | v3.9.0 export | Current DB (v5.5.2) | Difference |
|--------|---------------|---------------------|------------|
| Total skills | 7,189 | 4,113 | **-3,076** |
| Archer | 208 | 108 | -100 |
| Berserker | 250 | 153 | -97 |
| Sorceress | 250 | 152 | -98 |
| Tamer | 300 | 179 | -121 |
| Striker | 272 | 151 | -121 |
| Skill 5618 (Hash grab) | ✅ Present | ❌ Manually added | Should have been there |
| Skill 8169 (Scholar grab) | ✅ Present | ❌ Manually added | Should have been there |
| With damage data | 7,135 (99%) | 4,079 (99%) | Same % |
| With PvP % | 4,546 (63%) | 2,603 (63%) | Same % |

### Was importing the v5.4.1 DB the right move?

**No.** The v3.9.0 export was the better data source. The v4.1.0+ export was a truncated regeneration that lost 3,076 skills. The v3.9.0 export:
- Has 7,189 skills (74% more than current 4,113)
- Has both missing grab skills natively
- Has more rank variants (I, II, III, IV for each skill)
- Same enrichment rate (99% with damage, 63% with PvP %)

**However**, the current DB has PA Wiki data (groups, SA DR, isAscension) that the v3.9.0 export does NOT have (it only has skills, no classes array).

### Recommendation
Restore from the v3.9.0 export, then re-run import-pa-wiki + compute-max-rank. This gives us the most complete dataset.

---

## Comprehensive Git History Audit

### Features found in git history but missing currently

| Feature | Found in tags | Status |
|---------|--------------|--------|
| `/api/upload/skills-json` | v1.2.0–v5.1.0 | ✅ Restored (Task 42) |
| `public/logo.svg` | v1.1.0–v5.5.2 | ✅ Exists (was never lost) |
| Skill Build Calculator | Never built | ❌ Not building (user said skip) |
| Filter sidebar collapsible sections | Never built | ❌ Missing |
| Lurker health monitoring | Never built | ❌ Missing |
| Automated tests | Never built | ❌ Missing |
| i18n | Never built | ❌ Missing |

### Features confirmed present in all versions
- SVG logo (`public/logo.svg`) — exists in all tags including current
- 8 tabs — stable since v5.4.0
- Shared dedup module — new in v5.5.0 (not in older tags)
- Theme toggle — new in v5.5.0

---

## Updated Roadmap

### P0 — Critical: Restore full DB from v3.9.0 export
- Restore 7,189 skills from the v3.9.0 export (currently only 4,113)
- Re-run import-pa-wiki + compute-max-rank after restore
- This recovers 3,076 missing skills including all rank variants
- **Effort**: 30 min
- **Impact**: HIGH — this is the single most impactful fix

### P1 — Verify and polish
- P1.1: After DB restore, verify all 52 grab skills still present ✅
- P1.2: Verify meta/matchups/tiers still work with 7,189 skills
- P1.3: Re-verify Awakening leak fix (0 leaks in Succession)
- **Effort**: 30 min

### P2 — Continue previous roadmap items
- P2.1: ~~Skill Build Calculator~~ — SKIPPED (user decision)
- P2.2: Light theme polish — partially done (BDO utility classes now use CSS vars)
- P2.3: Stale doc cleanup — done (archived to docs/archive/)
- P2.4: Populate CHAT_HISTORY.md fully
- **Effort**: 1h

### P3 — Infrastructure
- P3.1: /api/upload/skills-json — ✅ Restored
- P3.2: Automated patch-lurker (cron)
- P3.3: Database backup automation
- P3.4: Update skills-export.json to current state after DB restore
- **Effort**: 2h

### P4 — Future
- P4.1: PAZ data extraction (needs new tools)
- P4.2: Re-scrape missing Prime: skills (may be resolved by P0 DB restore)
- P4.3: SVG logo already exists — just needs to be more prominent
- P4.4: Automated tests
- **Effort**: variable

---

## Summary

The DB audit revealed that **we've been using the wrong export since v4.1.0**. The v3.9.0 export has 7,189 skills (3,076 more than current). The immediate priority is to restore from the v3.9.0 export, then re-run PA Wiki import + compute-max-rank. This single action recovers more data than any other roadmap item.
