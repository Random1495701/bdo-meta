# BDO Meta — Audit Findings & Next-Steps Roadmap

> **Created**: 2026-07-04 (late evening)
> **Scope**: Audit of all work from v5.4.1 → present (post-session-reset rebuild)
> **Method**: Cross-referenced worklog Tasks 34–40 + live file-state verification + git diff

---

## Part 1 — What the Worklog Claims Was Done

The worklog (Tasks 34–40) claims the following were completed since v5.4.1:

| Task | Claim | Status |
|------|-------|--------|
| 34 | Shared dedup module, spec docs, OCR/VLM plan, German skill fix | ✅ Verified |
| 35 | PvP DPC, addon removal, lean app, theme toggle, filter persistence | ✅ Verified |
| 36 | Matchups redesign, spec comparison modal, patch arrows | ✅ Verified |
| 37 | Awakening leak fix, heatmap overlay removal, grab mystery resolved | ⚠️ Partial |
| 38 | DB indexes, theme toggle, lurker investigation, combo guide links | ⚠️ Partial |
| 39 | Comprehensive audit + new roadmap, CHAT_HISTORY, version metadata | ⚠️ Partial |
| 40 | Version validation, full rebuild after reset, TS error fixes | ✅ Verified |

---

## Part 2 — What's Actually Missing (verified via file checks)

### ❌ Missing: Combo Guide link in skill detail drawer
- **Worklog claim**: Task 38 added "Combo Guide" link to `skill-detail-drawer.tsx` pointing to `blackdesertfoundry.com/{class}-guide/`
- **Actual state**: 0 references to "foundry" or "Combo Guide" in the file
- **Fix needed**: Add the link

### ❌ Missing: "Skill Specs Explained" section in Docs tab
- **Worklog claim**: Task 34 added a "Skill Specs Explained" section to `docs-page.tsx` with Awakening/Succession/Ascension explanations
- **Actual state**: 0 references to "Skill Specs Explained" in docs-page.tsx. The docs page still has the old version history only.
- **Fix needed**: Add the spec explanation section

### ❌ Missing: docs/SPEC_DEDUP_LOGIC.md
- **Worklog claim**: Task 34 created this standalone markdown doc
- **Actual state**: File does not exist
- **Fix needed**: Create it

### ❌ Missing: docs/OCR_VLM_PLAN.md (lean app version)
- **Worklog claim**: Task 35 updated this to reflect the lean approach (no internal LLM)
- **Actual state**: File does not exist
- **Fix needed**: Create it

### ❌ Missing: docs/ROADMAP_2026-07-04_AUDIT.md
- **Worklog claim**: Task 39 created comprehensive audit + new roadmap
- **Actual state**: File does not exist
- **Fix needed**: Create it (this document IS that fix)

### ⚠️ Partial: Heatmap overlay removal
- **Worklog claim**: Task 37 removed all `backgroundColor: saDrColor.bg` from matchups
- **Actual state**: 1 remaining at line 992 (in the Arena class chips section)
- **Fix needed**: Remove the last heatmap background

### ⚠️ Partial: Version metadata
- **Worklog claim**: Task 39 fixed `APP_VERSION_DATE` to "2026-07-04" and expanded `GIT_TAGS` to 41 entries
- **Actual state**: `APP_VERSION_DATE` is correct ("2026-07-04"), but `APP_VERSION` still says "v5.4.1" (should be "v5.5.1"). `GIT_TAGS` array is MISSING v5.5.0 and v5.5.1 (only goes up to v5.4.1, 42 entries instead of 44).
- **Fix needed**: Update `APP_VERSION` to "v5.5.1", add v5.5.0 + v5.5.1 to `GIT_TAGS`

### ⚠️ Partial: Light theme polish
- **Worklog claim**: Task 38 added light theme with CSS variables
- **Actual state**: `.light` class exists in globals.css, but BDO utility classes (`bdo-leather`, `bdo-recessed`, `bdo-title`) still use hardcoded dark hex values instead of CSS variables. Light theme will have visible inconsistencies.
- **Fix needed**: Make BDO utility classes use `var(--color-bdo-*)` instead of hardcoded hex

---

## Part 3 — What's Done and Verified

| Feature | Verification |
|---------|-------------|
| Shared dedup module (`src/lib/spec-dedup.ts`) | ✅ File exists, 0 Awakening leaks in Succession |
| PvP DPC (`damagePerCooldownPvP` / `avgDpcPvP`) | ✅ In skills API + meta API + UI components |
| Theme toggle (dark/light) | ✅ ThemeProvider + ThemeToggle in header, `.light` CSS exists |
| Patch change indicator | ✅ Component exists, wired into table/card/list-row + filter toggle |
| Spec comparison modal | ✅ Component exists, "AWK vs SUCC" buttons on Meta page |
| Matchups redesign (31 rows, pin, group filter) | ✅ All features present |
| Awakening leak fix | ✅ 0 leaks verified |
| German skill fix | ✅ "Absolute Darkness II" confirmed in DB |
| Addon system removed | ✅ 0 references in store/types |
| Lean app (no z-ai-web-dev-sdk in src/) | ✅ 0 references |
| Session tracker 3-step paste-JSON flow | ✅ All state + handlers present |
| DB composite indexes | ✅ 14 `@@index` declarations in schema |
| CHAT_HISTORY.md populated | ✅ 80 lines |
| Scripts archived | ✅ 64 in scripts/archive/ |
| TypeScript errors in src/ | ✅ 0 errors |
| Lint | ✅ Clean |

---

## Part 4 — New Roadmap: Next Steps

> Philosophy: Fill the gaps from the audit, then continue with high-value polish and the flagship Skill Build Calculator feature.

### P0 — Fill Audit Gaps (do first, ~1.5h total)

#### P0.1: Fix version metadata
- Update `APP_VERSION` from "v5.4.1" to "v5.5.1" in `src/lib/version.ts`
- Add "v5.5.0", "v5.5.1" to `GIT_TAGS` array
- **Effort**: 5 min

#### P0.2: Add Combo Guide link to skill detail drawer
- In `src/components/skills/skill-detail-drawer.tsx`, add a "Combo Guide" link next to "View on bdocodex.com" that points to `https://www.blackdesertfoundry.com/{classname}-guide/`
- **Effort**: 10 min

#### P0.3: Add "Skill Specs Explained" section to Docs tab
- In `src/components/skills/docs-page.tsx`, add a section between "Data sources" and "Version history" explaining Awakening/Succession/Ascension + dedup logic
- **Effort**: 30 min

#### P0.4: Create missing docs
- `docs/SPEC_DEDUP_LOGIC.md` — standalone spec logic documentation
- `docs/OCR_VLM_PLAN.md` — lean OCR approach (external AI paste-JSON flow)
- **Effort**: 20 min

#### P0.5: Remove last heatmap overlay
- In `src/components/skills/matchups-page.tsx` line 992, remove `backgroundColor: saDrColor.bg` from the Arena class chips
- **Effort**: 5 min

#### P0.6: Create docs/ROADMAP_2026-07-04_AUDIT.md
- This document IS that fix — it's being created now
- **Effort**: 0 min (this IS the doc)

### P1 — High-Value Polish (~4h total)

#### P1.1: Light theme polish
- Make BDO utility classes (`bdo-leather`, `bdo-recessed`, `bdo-title`, `bdo-frame`) use `var(--color-bdo-*)` instead of hardcoded hex values
- Test all 8 tabs in light mode
- **Effort**: 2h

#### P1.2: Stale doc cleanup
- Archive `docs/ROADMAP.md`, `docs/ROADMAP_2026-07-01.md`, `docs/ROADMAP_2026-07-01_v2.md`, `docs/RESTORATION_PLAN.md` to `docs/archive/`
- Update `docs/PROJECT.md` API table (remove /api/upload reference, update skill count)
- Update `docs/IMPROVEMENT_PLAN.md` to mark done items or archive it
- **Effort**: 30 min

#### P1.3: Data tab UX polish
- Improve table header contrast further (column headers are still `/50` opacity)
- Add `focus-visible:ring-2 ring-amber-400` to all interactive elements
- Improve class bar mobile layout (horizontal scroll with touch)
- **Effort**: 1.5h

### P2 — Flagship New Feature (~6h)

#### P2.1: Skill Build Calculator
- **What**: New "Builds" tab where users can allocate skill points, see total SP used, save builds to localStorage, share via URL
- **Why**: Highest-value unbuilt feature. Differentiates from bdocodex. Users have wanted this since IMPROVEMENT_PLAN 4.1.
- **Scope**:
  - User selects class + spec
  - Skill tree shows all skills for that spec (using shared dedup module)
  - User clicks skills to allocate points (respecting prerequisites and max levels)
  - Total SP used counter
  - Save/load builds (localStorage)
  - Share via URL (encode build as base64 in query param)
  - "Open in Data tab" button to see selected skills filtered
- **Effort**: 6h

### P3 — Infrastructure (~2.5h total)

#### P3.1: /api/upload/skills-json endpoint
- POST endpoint accepting JSON array of skill objects
- Validates, upserts to DB
- Logs to SkillChangeLog with source='import'
- Needed for PAZ extraction (P4.1)
- **Effort**: 1h

#### P3.2: Automated patch-lurker (cron)
- Add cron entry to run `bun run scripts/patch-lurker.ts` every Thursday 9 AM Europe/Warsaw
- Log results to SyncLog
- **Effort**: 30 min

#### P3.3: Database backup automation
- Add weekly cron to run `scripts/backup.ts`
- Commit backup to git
- **Effort**: 30 min

#### P3.4: Populate CHAT_HISTORY.md fully
- Current CHAT_HISTORY.md is an 80-line index
- Populate with actual session summaries from `docs/chat-history/session-*.md` files
- **Effort**: 30 min

### P4 — Future / Exploratory

#### P4.1: PAZ data extraction
- Research alternative PAZ tools (BDOToolkit/UnPAZ repos are gone)
- Update `docs/PAZ_EXTRACTION_GUIDE.md` with working tools
- Depends on: P3.1 (/api/upload endpoint)
- **Effort**: User-side research + 2h import

#### P4.2: Re-scrape missing Prime: skills
- Some Prime: skills missing from DB (e.g. "Prime: Bloody Calamity" for Sorceress)
- Restart lurker for targeted enrichment OR wait for PAZ extraction
- **Effort**: 4h (lurker) or 0h (wait for PAZ)

#### P4.3: SVG logo + branding refresh
- Design proper BDO-themed SVG logo
- Add favicon
- Apply to header + Docs tab
- **Effort**: 3h

#### P4.4: Automated tests
- Add vitest
- Write tests for spec-dedup.ts (most critical logic)
- Write tests for damage calculation
- Add GitHub Actions CI
- **Effort**: 6h

#### P4.5: Internationalization (i18n)
- Add next-intl for DE/FR/ES/KR support
- Extract UI strings to locale files
- **Effort**: 8h

---

## Part 5 — Summary

### What's missing from the worklog claims (P0 — fix immediately)
1. Combo Guide link in detail drawer
2. "Skill Specs Explained" section in Docs tab
3. 3 missing docs (SPEC_DEDUP_LOGIC, OCR_VLM_PLAN, ROADMAP_AUDIT)
4. Last heatmap overlay in matchups
5. Version metadata (APP_VERSION + GIT_TAGS not updated for v5.5.x)

### What's next (recommended execution order)
1. **P0** (fill audit gaps) — 1.5h — fixes all missing items
2. **P1.2** (stale doc cleanup) — 30 min — reduces confusion
3. **P1.1** (light theme polish) — 2h — makes light theme usable
4. **P2.1** (Skill Build Calculator) — 6h — flagship new feature
5. **P3** (infrastructure) — 2.5h — /api/upload, cron, CHAT_HISTORY
6. **P4** (future) — as time permits

### Key insight
The session reset lost ~60% of the Task 34–39 work. The rebuild (Task 40) recovered the core functionality but missed several docs and small UI elements. This roadmap fills those gaps first, then moves to the flagship Skill Build Calculator — the highest-value unbuilt feature that users have wanted since the original IMPROVEMENT_PLAN.
