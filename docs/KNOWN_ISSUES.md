# Known Issues — BDO Meta

## Currently Broken
1. **3,810 stub skills** — name="Skill {id}", no data. Need enrichment via PAZ or lurker.
2. **Hashashin & Scholar grabs** — 0 in DB and bdocodex. User says they have grabs. May use different CC label.
3. **CHAT_HISTORY.md empty** — needs population from this session's chat.
4. **Lurker not running** — PID 2885 dead since 2026-06-30T13:45. Needs investigation.
5. **PAZ tools unavailable** — BDOToolkit and UnPAZ GitHub repos are gone. Need alternative.

## Resolved
- ✅ Hydration crash (nested button in skill-card)
- ✅ videoAutoplay not defined (merged code missing state)
- ✅ Zustand persist causing state reversion (removed persist, manual localStorage)
- ✅ False grabs ("All CC Resistance except Grapple" parsed as CC instead of protection)
- ✅ PA Wiki group names ("Crusher" → "Pulverizer" — official PA name)
- ✅ PA Wiki spec-dependent groups (Warrior Succ=Vanguard, Awk=Skirmisher)
- ✅ Matchups not showing specs (now 50 rows with AWK/SUCC/ASC labels)
- ✅ Max-rank JS-level filtering (now DB-level isMaxRank column)
- ✅ Grab spec assignment (prerequisite-based exclusion for awakening)
- ✅ .env tracked in git (untracked, .gitignore updated)
- ✅ db/custom.db tracked (untracked)
- ✅ Video autoplay ON (now OFF by default)
- ✅ No lurker stop button (now always visible)
- ✅ Arena of Solare only expandable via Show button (now click anywhere + arrow)
