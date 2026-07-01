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
