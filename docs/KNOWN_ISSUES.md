# Known Issues — BDO Meta

> Last updated: 2026-07-05

## Currently Open

### Data Gaps
1. **Missing Prime: skills** — Some Prime: skills may still be missing from the DB. The dedup falls back to Absolute: correctly. Needs verification with the restored 7,189-skill DB.
2. **10 stub skills** — A few skills still have name="Skill {id}". Need targeted lurker enrichment.
3. **PvP % missing for 37%** — 2,643 skills lack PvP damage multiplier. Limits Damage Calculator accuracy.
4. **Prerequisite chain incomplete** — Only 3,261/7,189 skills have prerequisiteIds. Limits dedup accuracy for Awakening leak fix.

### Infrastructure
5. **PAZ tools unavailable** — BDOToolkit and UnPAZ GitHub repos are gone. PAZ extraction guide needs alternative tools.
6. **Lurker not running** — Lurker process died. DB is 100% enriched but lurker needed for future patch updates + backfilling missing data.
7. **No automated tests** — Zero test coverage. Critical logic (spec-dedup, damage, cc) has no tests.

### Skipped Features (by user decision)
8. **Addon system** — Skipped 2026-07-04. `addonsJson` DB column kept (unused), filter/UI removed.
9. **Internal LLM** — Skipped 2026-07-04. App is lean — no `z-ai-web-dev-sdk` in app code.
10. **Video parsing** — Skipped. User said "we'll try to get that directly from the PAZ".
11. **Skill Build Calculator** — Skipped. User said skip.

## Resolved
- ✅ DB is now in git (5.7MB → 10MB after v3.9.0 restore, well under GitHub 100MB limit)
- ✅ Hashashin & Scholar grabs (skills 5618, 8169 natively present after v3.9.0 restore)
- ✅ All 4,113 stub skills enriched (now 7,189 total skills)
- ✅ Skill icons 100% coverage (4,111/4,111 verified, now 7,189 total)
- ✅ "ALL Classes" duplicate skills (shared dedup module)
- ✅ German skill "Absolute Finsternis II" → "Absolute Darkness II"
- ✅ Awakening skills leaking into Succession (0 leaks verified)
- ✅ False grabs / Q-block (15 block skills with false Grapple CC fixed — Guard, Shield Chase, etc.)
- ✅ PA Wiki data (29 classes with groups + SA DR, 6 ascension classes)
- ✅ Version metadata (auto-derived from git tags)
- ✅ Session reset auto-detection banner
- ✅ DB export regenerated (7,189 skills, 21.9MB)
