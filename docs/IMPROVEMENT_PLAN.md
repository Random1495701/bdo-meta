# BDO Meta — Improvement Plan

> **Audit of remaining issues and proposed improvements, ordered by priority.**

Last updated: 2025-06-29

---

## Priority 1 — Data Quality (High Impact)

### 1.1 Skill Add-Ons Not Parsed
**Status**: Not started
**Problem**: The `addonsJson` field is NULL for all skills. bdocodex's `ajax.php?a=skill_list2` response contains `addon_skills` and `addon_effects` maps, but our tree parser only extracts skill cells, not add-ons.
**Fix**: Extend `fetchClassTree()` in `scripts/sync-skills.ts` to parse the `addon_skills[class_id][slot_type][skill_id]` and `addon_effects[effect_id]` JSON embedded in the response HTML. Store as `addonsJson` in the Skill table.
**Effort**: ~2 hours

### 1.2 Prerequisite Chain Incomplete
**Status**: Partial
**Problem**: `prerequisiteIds` is only set for skills found in the class tree (3,261 skills). The remaining 4,441 skills have NULL prerequisites.
**Fix**: The lurker's tooltip parser already extracts prerequisites from the "Requirements" section of `tip.php`. Verify this is working and backfill the remaining skills.
**Effort**: ~1 hour (verify + run lurker re-enrich)

### 1.3 Multi-Class Skills Misattributed
**Status**: Known issue
**Problem**: Some skills have `className` like "Musa, Dosa" or "Wizard, Witch" (31 skills). These are shared skills. The `classId` is set to the first class, so filtering by the second class misses them.
**Fix**: Either (a) duplicate these skills with both classIds, or (b) change the class filter to also match `className LIKE '%ClassName%'`.
**Effort**: ~30 min

### 1.4 "Flow:" and "Core:" Skills Not Typed
**Status**: Not started
**Problem**: 269 "Flow:" and 160 "Core:" skills exist but aren't flagged. In BDO, "Flow:" skills are combo continuations and "Core:" skills are core abilities.
**Fix**: Add `isFlow` and `isCore` flags to the schema, or classify them as `main` type (which they already are, but they could have their own filter category).
**Effort**: ~30 min (schema change + data fix)

---

## Priority 2 — UI/UX Polish (Medium Impact)

### 2.1 Skill Detail Drawer — Add Skill Add-Ons Section
**Status**: Blocked on 1.1
**Problem**: The detail drawer doesn't show skill add-ons (the 3-slot customization system in BDO).
**Fix**: Once `addonsJson` is populated, add a new section to the drawer showing the available add-on effects per slot.
**Effort**: ~1 hour

### 2.2 Mobile Class Bar — Swipe to Scroll
**Status**: Not started
**Problem**: On mobile, the class bar supports wheel/drag scroll but not touch swipe.
**Fix**: Add touch event handlers (`onTouchStart`, `onTouchMove`, `onTouchEnd`) to the class bar scroll container, similar to the existing drag-to-scroll logic.
**Effort**: ~30 min

### 2.3 Filter Sidebar — Collapsible Sections
**Status**: Not started
**Problem**: The filter sidebar is long on desktop. All 7 sections are always visible.
**Fix**: Make each section (Skill Type, Protection, CC Types, Level, Cooldown, Animation, Toggles) collapsible using the shadcn Collapsible component. Remember collapsed state in localStorage.
**Effort**: ~1 hour

### 2.4 Skill Cards — Show Damage Summary
**Status**: Not started
**Problem**: Skill cards show level/cooldown/animation but not damage. Users have to open the drawer to see damage values.
**Fix**: If `damageRows` has damage-type rows, show the first one as a mini-stat on the card (e.g., "805% x1").
**Effort**: ~30 min

### 2.5 Keyboard Navigation
**Status**: Not started
**Problem**: Can't navigate skills with arrow keys or search with `/`.
**Fix**: Add keyboard shortcuts: `/` focuses search, `Esc` closes drawer, arrow keys navigate between skills, `Enter` opens selected skill.
**Effort**: ~1 hour

---

## Priority 3 — Performance (Low Impact, High Confidence)

### 3.1 Max-Rank Filtering Performance
**Status**: Working but slow for large result sets
**Problem**: The max-rank filter fetches ALL matching skills from the DB, groups them in JS, then re-fetches the page. For "All Classes" with no filters, this means loading 7,231 skill IDs.
**Fix**: (a) Add a `baseName` column to the Skill table (precomputed on sync), (b) add a `isMaxRank` boolean column, (c) query directly with `WHERE isMaxRank = true`. This eliminates the JS grouping.
**Effort**: ~2 hours (schema change + migration + API update)

### 3.2 Skill Icon Caching
**Status**: Not started
**Problem**: Skill icons are loaded from `bdocodex.com` CDN. When bdocodex is in bot-challenge mode, icons fail to load.
**Fix**: Download all skill icons locally (like we did for class icons). There are ~3,000 unique icons. Store at `/icons/skills/{skillId}.webp` and update the `iconUrl` helper.
**Effort**: ~1 hour (download script + URL change). Note: this is a large download (~3,000 images) and should be done via the lurker to avoid bot challenges.

### 3.3 Database Indexing
**Status**: Basic indexes exist
**Problem**: The `Skill` table has indexes on `classId`, `name`, `groupId`, etc., but not on `isSuccession`, `isAbsolute`, `isBlackSpirit`, `isPassive` combinations.
**Fix**: Add composite indexes for common filter combinations: `(classId, isSuccession)`, `(classId, isAwakening)`, `(classId, isAbsolute)`.
**Effort**: ~15 min (schema change + db push)

---

## Priority 4 — Features (Nice to Have)

### 4.1 Skill Build Calculator
**Status**: Not started
**Problem**: Users can browse skills but can't create or save skill builds.
**Fix**: Add a "Builds" feature: select a class, allocate skill points to skills, see total SP used, save builds to localStorage, share builds via URL.
**Effort**: ~4 hours

### 4.2 Skill Comparison Tool
**Status**: Not started
**Problem**: Can't compare two skills side-by-side.
**Fix**: Add a "Compare" button to skill cards. Opens a split-view drawer showing two skills' stats side-by-side with diff highlighting.
**Effort**: ~2 hours

### 4.3 Search by Effect
**Status**: Not started
**Problem**: Can search by name/description but not by specific effects like "Super Armor" or "Knockdown".
**Fix**: The CC and Protection filters already do this, but add a unified "Effect" search that searches across CC, protection, damage rows, and description simultaneously.
**Effort**: ~30 min

### 4.4 Dark/Light Theme Toggle
**Status**: Dark only
**Problem**: No light theme option.
**Fix**: The BDO theme is inherently dark, but a "parchment" light theme could be added for accessibility. Use `next-themes` (already installed).
**Effort**: ~2 hours

### 4.5 Internationalization (i18n)
**Status**: English only
**Problem**: bdocodex supports 5 languages (US, DE, FR, ES, KR). We only sync English.
**Fix**: Add a language toggle. The lurker's `--kr-names` mode already populates `krName`. Extend to sync DE/FR/ES descriptions into separate columns or a JSON field.
**Effort**: ~3 hours (schema + sync + UI)

---

## Priority 5 — Infrastructure (Low Priority)

### 5.1 Database Backup Automation
**Status**: Manual (git commits)
**Problem**: The DB is committed to git, but there's no automated backup schedule.
**Fix**: Add a cron job that exports the DB to JSON via `/api/export` and commits it weekly.
**Effort**: ~30 min

### 5.2 Lurker Health Monitoring
**Status**: Manual (check footer)
**Problem**: If the lurker dies, no one knows until they check the footer.
**Fix**: Add a `/api/health` endpoint that checks lurker heartbeat. If dead for >10 min, log a warning. Could add email/Discord webhook notification.
**Effort**: ~1 hour

### 5.3 API Caching
**Status**: None (force-dynamic on all routes)
**Problem**: Every page load hits the DB. For max-rank filtering, this means loading all matching skills.
**Fix**: Add in-memory caching for `/api/classes`, `/api/ranges`, and `/api/stats` (they change rarely). Use `unstable_cache` from Next.js or a simple Map with TTL.
**Effort**: ~30 min

---

## Summary

| Priority | Items | Total Effort |
|----------|-------|-------------|
| P1 — Data Quality | 4 | ~4 hours |
| P2 — UI/UX Polish | 5 | ~4 hours |
| P3 — Performance | 3 | ~3.5 hours |
| P4 — Features | 5 | ~12 hours |
| P5 — Infrastructure | 3 | ~2 hours |
| **Total** | **20** | **~25.5 hours** |

### Recommended Next Steps
1. **1.1** Skill Add-Ons (high player value, unblocks 2.1)
2. **3.1** Max-Rank Performance (improves load speed for all users)
3. **3.2** Skill Icon Caching (fixes broken icons when bdocodex is challenged)
4. **2.3** Collapsible Filter Sections (improves desktop UX)
5. **4.1** Skill Build Calculator (highest-value feature for BDO players)
