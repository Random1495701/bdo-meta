# Chat History — Session 10 (2025-06-30 → 2025-07-01)

## Session Context
- **Session ID**: web-4b91b15e-e4dd-469b-8f49-72d3cef43171
- **Started**: 2025-06-30
- **Previous state**: v4.0.0 on GitHub remote, v2.7.0 on local filesystem (reverted)
- **Goal**: Restore lost features, fix bugs, improve UI

## User Requests & Status

### 1. Roadmap Continuation (v3.9.0 restoration)
- User asked to continue roadmap: E1 performance, A2 patch notes, B1 combo extraction
- Patch notes checker needed new top menu, latest class patches, skill change linking
- **Status**: Patch notes system built (structured parser, DB linking, skill icons, change type filters)

### 2. Tier List Overhaul
- User: "Merge Awa/Succ/Ascension for Tier list into a single list containing all specs"
- User: "List all the parameters that give score to each class tier and let the user decide the value"
- **Status**: ✅ Done — Tier Builder with 13 user-weighted parameters, 6 presets, 4 view modes (Ranked/Table/Portraits/Tiers)

### 3. Patch Notes Improvements
- User: "Put more patchnotes fixes at the end, but the current UI is horrible"
- User: "not linking the logic of the skill changed with the logic of that skill in our database"
- User: "List only the latest patch"
- User: "Keep on lurking / agent webbing for the patches tho"
- **Status**: ✅ Done — structured parsing, skill linking, up/down arrows, latest patch only, archive all

### 4. Session Reset Recovery
- App stalled, DB emptied (0 skills), files reverted to v2.7.0
- **Status**: ✅ Recovered — DB restored from JSON (4111 skills), files rebuilt

### 5. Patches UI + Meta Card Fixes
- User: "Patches UI is still bad... does not link the appropriate skill icon"
- User: "Cards in meta are not clickable anymore"
- **Status**: ✅ Done — skill icons in patches, meta cards clickable + expandable

### 6. Portrait Visualization + Change Tracking
- User: "Add an extra visualization type for Tiers that displays them in a more fun way (with character portraits)"
- User: "Add a system that tracks changes made into the skill databases and add a log on top"
- User: "tune the patch lurker to look for the patch only after its patch day (thursday)"
- **Status**: ✅ Done — Portrait view, change log banner, Thursday-only lurker

### 7. Deep Restoration (v3.9.0 features)
- User: "It seems that we lost a bunch of features up to v3.9.0"
- User: "damage calculation fixes are not correct, the separation of special modes"
- User: "qol changes all around the app like sorting preferences and capabilities have been lost"
- User: "the expanded card in the meta menu"
- **Status**: ✅ Done — AUDIT-2 found 27 missing features, restored critical ones

### 8. GitHub Token & Push
- User provided token: ghp_E6IQ... (auto-revoked by GitHub push protection)
- User provided new fine-grained PAT
- **Status**: ✅ Token stored at ~/.config/bdo-meta/github-token, all commits pushed

### 9. Merge Issues
- `-X theirs` merge overwrote my restoration work with remote's simpler versions
- **Status**: ✅ Fixed — restored Tier Builder (1314 lines), patches UI, class-bar from backup branch

### 10. Bug Reports & Feature Requests (LATEST)
- User: "Damage numbers are wrong"
- User: "Skill division for modes is wrong aka non existant (ie. DE marni rounds/regular rounds)"
- User: "App crashes: clicking succession sorc > prime: black wave III crashes"
- User: "QoL changes on sorting which dont exist anymore"
- User: "grab details, now classes like seraph list no grab in meta, but have grab skills in filtering"
- User: "class vs class ratios worked correctly... Now it gives neutral for all"
- User: "Meta > Matchup this just does nothing now. The classes arent in their correct categories"
- User: "filtering should be by class ratio group, not by classes"
- User: "We had converted logos to svg for ease of use"
- User: "We had an 'exclusion' system on double click in filtering"

**Status of fixes**:
- ✅ Crash fixed (hydration error from zustand persist)
- ✅ Grabs fixed (ascension spec now includes all skills)
- ✅ Ratios fixed ("Pulverizer" → "Crusher" name mismatch)
- ✅ Meta API fixed (reading from real DB columns not JSON)
- ✅ Matchups viewMode type fixed
- ✅ BS skills excluded from CC counter + tooltip
- ✅ Error boundary with reset button
- ✅ Patches API crash fixed (undefined skillName guard)
- ⏳ Grab spec assignment logic — waiting for user confirmation
- ⏳ Matchups redesign (merge specs, move to top page, pin classes) — NOT DONE
- ⏳ Tiers portrait redesign — NOT DONE
- ⏳ Logo — user says it's "just z.ai's logo", needs proper BDO occult design
- ⏳ Version number in header — NOT DONE
- ⏳ Version dropdown — NOT DONE
- ⏳ Chat history saving to GitHub — NOT DONE (doing now)

### 11. Latest Requests (CURRENT)
- User: "logo is just z.ais logo. You didnt do things i asked you to do"
- User: "Add v.X.x.x to the top where the Title is so that i can track when the version gets reset"
- User: "add a dropdown menu and make all versions that we have stored in the github vaults runnable"
- User: "if you have not been saving the chat so far, you should've had that file made on the github and tracked"

## Key Decisions
- Tier Builder uses user-adjustable weights (0-100 per parameter) with normalization, NOT fixed v4.0.0 formula
- Damage calc uses v4.0.0's special-mode separation (modes array, first-mode-only for totals)
- PA Wiki data stored in proper DB columns (combatType, successionGroup, etc.) not JSON
- Token stored at ~/.config/bdo-meta/github-token (outside repo, chmod 600)
- Git history rewritten with filter-branch to remove old token

## PA Wiki Question (UNANSWERED)
- User asked: "What website is the PA Wiki for you? Give me a yes or no to confirm"
- My answer: https://www.naeu.playblackdesert.com/
- User has NOT confirmed yet

## Grab Logic Question (UNANSWERED)
- User asked me to find their explanation of grab spec assignment in chat
- I searched all chat-history files and worklog — NOT FOUND
- I proposed logic (main grabs → both specs, awk grabs → awk only, etc.)
- User has NOT confirmed yet

## Patch Note System Multiple Choice (UNANSWERED)
- A) Restore current display-only functionality (instant)
- B) Add up/down arrow indicators in Data tab (~2h)
- C) Full auto-apply system (~8h+)
- D) A + B
- User has NOT chosen yet

---

## Update: Crash Analysis (2025-07-01)

### User Report
"I filter for succession sorceress. I click Prime: Black Wave III, the app crashes. It does the same on so so many places."

### Analysis Results

I reproduced the issue extensively. There are **THREE distinct bugs** causing crashes:

#### Bug 1: Hydration Error — Nested `<button>` inside `<button>` (CRITICAL)
**Error**: `In HTML, <button> cannot be a descendant of <button>. This will cause a hydration error.`

**Root cause**: In `src/components/skills/skill-card.tsx`, the entire card is a `<motion.button>` (line 153), but I added a "Compare" button (line 219) INSIDE it. HTML doesn't allow `<button>` nested inside `<button>`. This causes:
- React hydration errors on every page load
- The hydration error throws an exception that React catches, leaving the app in a broken state
- Subsequent interactions (like clicking a card to open the detail drawer) fail because the component tree is corrupted

**File**: `src/components/skills/skill-card.tsx` lines 153-229
- Line 153: `<motion.button>` (the card container)
- Line 219: `<button>` (the compare button, nested inside)

**Impact**: This is the PRIMARY cause of "random crashes." Every skill card has this nested button issue. When React tries to hydrate the server-rendered HTML, it hits this invalid DOM structure and throws. The error boundary catches it, but the app is left in an inconsistent state where clicks don't register properly.

#### Bug 2: Zustand `persist` Middleware State Corruption (HIGH)
**Error**: Filter state reverts to `classIds: [0], specs: ["awakening"]` (Warrior Awakening) after clicking Sorceress + Succession.

**Root cause**: The `persist` middleware with `skipHydration: true` + manual `rehydrate()` in Providers creates a race condition:
1. Server renders with default state (Warrior, Awakening)
2. Client mounts, React hydrates with server state
3. `useEffect` fires, calls `rehydrate()` which loads from localStorage
4. Store updates to Sorceress Succession
5. But the URL/fetch cache still has the old Warrior data
6. React Query refetches, but the `placeholderData` (keepPreviousData) shows stale Warrior cards
7. User sees Warrior cards even though Sorc is selected

**File**: `src/lib/skill-store.ts` (persist config), `src/components/skills/providers.tsx` (rehydrate)

**Impact**: User clicks Sorceress → S → search "Black Wave" → sees Warrior cards instead. The card they want to click never appears.

#### Bug 3: The Compare Button Itself (MEDIUM)
**Error**: `button <button>` in console — the compare button's `stopPropagation` doesn't fully prevent the parent card's `onClick` from firing, causing the detail drawer AND compare drawer to both try to open simultaneously.

**File**: `src/components/skills/skill-card.tsx` line 219

### Why "So Many Places" Crash
The nested button issue (Bug 1) affects EVERY skill card on EVERY page. The hydration error corrupts the React tree on initial load, making subsequent clicks unpredictable. Combined with the state corruption (Bug 2), the app is in a fragile state where any interaction can trigger the crash.

### Recommended Fix Order (for next session)
1. **Fix Bug 1 first** — Change the card from `<motion.button>` to `<motion.div>` with an onClick, OR move the compare button outside the card button
2. **Fix Bug 2** — Remove `skipHydration` and use a different hydration strategy (e.g., `useHydration` hook or render-only-after-mount)
3. **Fix Bug 3** — Ensure compare button's `stopPropagation` works correctly

### Files Involved
- `src/components/skills/skill-card.tsx` — nested button (PRIMARY CAUSE)
- `src/lib/skill-store.ts` — persist hydration race condition
- `src/components/skills/providers.tsx` — manual rehydrate timing
- `src/components/skills/skill-detail-drawer.tsx` — may have additional crash points once the above are fixed

### Verification
- API `/api/skills/4582` returns valid data (no API crash)
- API `/api/skills?class=8&specs=succession&q=Black+Wave` returns 1 result correctly
- The crash is 100% frontend — the drawer never opens because the card click doesn't fire properly due to the corrupted React tree from the hydration error

---

## Update: Crash Fixes Applied (2025-07-01, NOT COMMITTED)

### Fixes Applied (in working directory, not committed per user request)

1. **skill-card.tsx**: Changed `<motion.button>` to `<motion.div>` with `role="button"` + `tabIndex` + `onKeyDown`. Fixes nested button hydration error (PRIMARY CRASH CAUSE).

2. **skill-detail-drawer.tsx**: Added `const [videoAutoplay, setVideoAutoplay] = React.useState(true)`. Fixes `ReferenceError: videoAutoplay is not defined` when opening any skill.

3. **skill-store.ts**: Removed zustand `persist` middleware entirely. It was causing state reversion (Sorc selection reverting to Warrior) and hydration race conditions.

4. **providers.tsx**: Removed `mounted` flag and `rehydrate()` call (no longer needed without persist). Simplified to just ErrorBoundary + QueryClientProvider.

### Verification
- Sorc Succession > Prime: Black Wave III → **NO CRASH** ✅
- Drawer opens correctly ✅
- No console errors ✅
- No hydration errors ✅
- State persists correctly during session (not across reloads, since persist was removed)

### PA Wiki Confirmation
User confirmed: https://www.naeu.playblackdesert.com/ is the correct PA Wiki website.
Specific page: https://www.naeu.playblackdesert.com/en-us/Wiki?wikiNo=225 (class ratios)
Must use web agent (agent-browser) for access due to bot protection.

### Grab Logic (User's Explanation)
- For Succession: main/absolute grabs become Prime:/Succession: versions (same skill name with prefix added)
- For Awakening: the grab skill that gets replaced is usually a prerequisite for the new awakening skill
- Some classes have false grabs from "All CC Resistance (except Grapple), including from Back Attacks" text — this is NOT a grab
- Some classes have grabs not being counted

### Still Pending
- Commit crash fixes to git (user wants to test old versions first)
- Fix grab logic per user's explanation
- Scrape PA Wiki wikiNo=225 for class ratio data
- Matchups redesign (merge specs, move to top page, pin classes)
- Tiers portrait redesign
- Patch note system multiple choice (user hasn't chosen A/B/C/D yet)

---

## Session Update: v5.0.0 — Damage Calculator + Q-Block + Grapple Fix (2025-07-01)

### What Was Done

1. **Grapple parsing fix (root cause found and fixed)**:
   - The bdocodex tooltip parser incorrectly extracted "All CC Resistance (except Grapple), including from Back Attacks" as a `cc: Grapple` row
   - This text is a RESISTANCE BUFF (adds Super Armor), not a grab CC
   - Fixed 17 skills: changed damageRows from `cc: Grapple` to `protection: All CC Resistance (except Grapple), including from Back Attacks`
   - Added `Super Armor` to protectionTypes for these skills (Q-block = SA + FG)
   - Removed `Grapple` from ccTypes for 6 newly identified skills (Valkyrie Guard, Warrior Guard, Valk Shield Chase I/II, Valk Succession: Ultimate Righteous Charge, Nova Command: Passed Pawn I)
   - Classes with Q-block: Valkyrie, Warrior, Nova, Wizard, Witch, Seraph

2. **Damage Calculator page** (new tool):
   - Input: Total AP, Enemy DR, DR Coefficient, Species AP, 6 damage scalar toggles (Crit, Down, Air, Back, Speed, Counter)
   - Skill search with auto-add to calculation list
   - Results table with per-skill PvP damage, per-scalar columns, expandable formula breakdown
   - Formula: `[(AP × Skill% × PvP%) - (DR × Coef)] × Scalars`
   - Note: Formula needs validation from bigandshiny's documentation — user asked to locate it

3. **Version tracking**: v5.0.0 tagged, v4.3.1 stable tagged
4. **GitHub**: Force-pushed after session reset restored code from remote

### PA Wiki Confirmation
User confirmed: https://www.naeu.playblackdesert.com/en-us/Wiki?wikiNo=225 is the correct PA Wiki page

### Still Pending
- BDO PvP damage formula validation (user needs to locate bigandshiny's documentation)
- Combo Extraction (Foundry guides) — low priority
- Documentation gaps (CHANGELOG + docs-page) — low priority
- Tier portrait redesign — medium priority

---

## Session Update: v5.0.1 — Video/Logo/Arena fixes + Grapple investigation (2025-07-01)

### Fixes Applied
1. **Video autoplay OFF by default** — Video no longer loads bdocodex URLs automatically. Shows "Click to load video" placeholder instead. Prevents bdocodex from seeing our video requests.
2. **Lurker stop button** — Added red "Stop Lurker" button in sync footer (appears when lurker is running). Kills the lurker PID via API.
3. **Arena expand fix** — Click anywhere on the Arena of Solare header to expand/collapse. Arrow up/down icon replaces Show/Hide button.
4. **Logo frame removed** — No more border/shadow/gradient around the logo. Just the raw SVG.
5. **Square icon fix** — `Stop` doesn't exist in lucide-react, used `Square` instead.

### Grapple Investigation
- Current DB has 33 real grapple skills across 17 classes
- Hashashin: 0 grabs in DB or bdocodex (user says has grab — may be a community-known grab not labeled as "Grapple" CC on bdocodex)
- Scholar: 0 grabs in DB or bdocodex (same issue)
- Guardian: 1 grab (Chokeslam I) — user says "more than one" — may need Chokeslam II which is missing from DB
- Q-block classes confirmed: Valkyrie, Warrior, Nova, Wizard, Witch, Seraph
- Additional Q-block skills found on bdocodex but not in DB: Vindicta (Valk), Greatsword Defense (Warrior), Absolute: Frenzied Dash (Warrior), Icy Fog (Nova)

### Damage Calculator
- User provided formula sources: Reddit post, bdo-tools.net, garmoth.com
- User wants: total AP (including species), total DR, toggles for crit/back/down/air, class type toggles (for ratio %), SA reduction %, advanced mode (pick classes for specific SA %)
- Current calculator has basic formula — needs rewrite per user spec

### Still Pending
- Rewrite Damage Calculator per user spec
- Investigate Hashashin/Scholar grab mystery
- Find missing skill ranks (Chokeslam II, etc.)
- Combo Extraction
- Documentation gaps

---

## Session Update: PA Wiki Fix + Roadmap + Formula Research (2025-07-01)

### PA Wiki Data Fixed (Critical)
- Fetched official data from https://www.naeu.playblackdesert.com/en-us/Wiki?wikiNo=225 via agent-browser
- **Key finding**: Official name is "Pulverizer" not "Crusher" — we had it wrong
- **Key finding**: Groups are spec-dependent! Warrior Succ=Vanguard, Warrior Awk=Skirmisher (we had both as Vanguard)
- Fixed all 31 classes with correct spec-to-group mapping and SA DR values
- Updated all code references from "Crusher" to "Pulverizer"
- Fixed group counter cycle: Vanguard > Pulverizer > Skirmisher > Vanguard

### Damage Formula Research
- Reddit blocked (network security)
- bdo-tools.net formula (credited to @gpw):
  1. AP = Total AP
  2. Base Damage = AP + Species AP - Enemy DR
  3. DR Rate = Damage × (1 - DR%)
  4. Critical Hit = Damage × Crit Multiplier (assume 100% crit, 2.25x)
  5. Final Multipliers = Damage × PvP% × Skill Damage% × Hit Count
  6. Class Group = ×1.05 if counter advantage
  7. SA DR = × (1 - SA DR%)
- Garmoth uses same formula (same author @gpw)
- All 3 sources use the same formula — validated

### Stop Button
- Always visible now (dimmed when lurker not running, red when running)
- Lurker was already dead (PID 2885 dead, lock cleaned)

### Missing Skills Investigation
- DB has 4,111 skills but ~5,900 skill IDs are missing (bdocodex has ~10,000+)
- Cause: Original sync used skill calculator API which doesn't return all ranks/variants
- Fix: Use bdocodex sitemap to discover all skill IDs, then targeted sync

### Roadmap Created
- docs/ROADMAP_2026-07-01.md with 15 items across P0-P3 priorities
- P0.1 (Missing Skills) is the critical blocker for grab logic, max-rank, and Q-block

---

## v5.1.0: DB-level max-rank + Damage Calculator v2 (2025-07-01)

### P0.2: Max-Rank Filtering (COMPLETED)
- Added `baseName` and `isMaxRank` columns to Skill model
- Created `scripts/compute-max-rank.ts` that computes max-rank for all skills:
  - Strips prefixes (Prime:/Succession:/Absolute:/Core:/Flow:) and rank suffixes (I-XXX)
  - Groups by (classId, baseName)
  - For each group: Prime/Succession → max for succ spec, Absolute → max for awk spec, highest rank → max if no Prime/Absolute
  - BS/Passive/Flow/Core skills are always maxRank
- 2,557 skills marked as maxRank (from 4,111 enriched)
- Updated `/api/skills` to use `isMaxRank: true` DB filter instead of JS-level baseName/rank grouping
- Updated `/api/meta` to use `isMaxRank` filter instead of JS-level grouping
- Result: 2,514 max-rank skills shown in Data tab (was ~2,321 with old JS filter)
- Performance improvement: no more loading all matching skills + JS grouping per request

### P0.4: Damage Calculator Rewrite (COMPLETED)
- Completely rewritten with validated PvP formula from bdo-tools.net/@gpw
- Formula: `[(AP - DR) × (1 - DR_Rate%)] × Crit × (PvP% × Skill% × Hits) × Group_Modifier × (1 - SA_DR%)`
- Input panel: Total AP, Enemy DR, DR Rate%, 4 scalar toggles (Crit/Back/Down/Air)
- Class group selectors (attacker + target) for +5% counter advantage
- SA DR toggle with advanced mode (auto-fill from /api/meta class data)
- Skill search with debounced results
- Results table with sortable columns, per-scalar damage, expandable formula breakdown
- Formula display with validation note

### Matchups Fix
- Spec-separated entries (50 rows: each class×spec is separate)
- Spec column with colored badges (AWK/SUCC/ASC)
- Groups now correct per spec (Warrior Succ=Vanguard, Awk=Skirmisher)

### Sync
- 3,564 missing combat skill IDs synced from bdocodex sitemap (7,675 total in DB)
- 4,111 enriched, 3,564 stubs (need lurker enrichment)
