# bdo-data-extractor Fork — Emit Active-Skill Effects

> **Goal**: Make `bdo-data-extractor` emit the `Effects` field (which carries
> `CooldownMs` + per-buff `DurationMs`) for ALL skills — active combat skills
> included — not just passives. This unlocks cooldown + CC/buff duration data
> for every skill in `class_skills.json`, which BDO Meta has never had.

> **Status**: ✅ Patch verified — clones upstream, applies cleanly with
> `git apply`, change lands correctly. See "Verification" below.

## Background

The upstream `bdo-data-extractor` decodes the skill→buff chain for every skill
(`skill.dbss @99` → `buff.dbss` records, each with a `DurationMs` field), but
its `buildClassSkills` function in `internal/build/classskills.go` only emits
the `Effects` field when `header.Kind == model.SkillKindPassive` (line 138):

```go
// upstream internal/build/classskills.go lines 138-143 (exact, 3-tab indent)
		if header.Kind == model.SkillKindPassive {
			isPassive = true
			if effect, exists := effects[skillKey]; exists {
				resolvedRank.Effects = b.buildEffects(buffs, effect)
			}
		}
```

This patch moves the `if effect, exists` block OUTSIDE the passive guard so it
runs for ALL skills (active + passive). The data is already decoded — it's
just not being written to the JSON for active combat skills.

## The patch

A ready-to-apply unified diff is at **`emit-active-skills.patch`** in this
same folder (`scripts/paz-tools/`). It's a 6-line addition / 3-line removal
that `git apply` accepts cleanly (verified against the upstream `main`
branch as of 2026-09-13).

```patch
--- a/internal/build/classskills.go
+++ b/internal/build/classskills.go
@@ -135,11 +135,14 @@
 			if resolved.Name == "" && localized.Name != "" {
 				resolved.Name = localized.Name
 			}
+			// Fork: emit Effects for ALL skills (active + passive), not just passives.
+			// BDO Meta needs the cooldown (skill.dbss @95) + CC/buff DurationMs
+			// for every active combat skill, which the upstream extractor omits.
 			if header.Kind == model.SkillKindPassive {
 				isPassive = true
-				if effect, exists := effects[skillKey]; exists {
-					resolvedRank.Effects = b.buildEffects(buffs, effect)
-				}
+			}
+			if effect, exists := effects[skillKey]; exists {
+				resolvedRank.Effects = b.buildEffects(buffs, effect)
 			}
 			resolved.Ranks = append(resolved.Ranks, resolvedRank)
 		}
```

## How to apply (3 ways)

### Option A — Clone + patch + build (recommended, verified)

```sh
git clone https://github.com/idevelopthings/bdo-data-extractor.git
cd bdo-data-extractor

# Apply the patch (path is relative to the repo root)
git apply /path/to/scripts/paz-tools/emit-active-skills.patch

# Build
go build -o bdo-data-extractor .

# Run — produces class_skills.json with Effects on every skill that has them
bdo-data-extractor build --game "C:\Program Files (x86)\Steam\steamapps\common\Black Desert Online" --out .\data --lang en
```

### Option B — Manual edit (6 lines, 3 tabs of indentation)

Open `internal/build/classskills.go` in a text editor. The file uses **tabs**
(not spaces) — 3 tabs for the outer `if`, 4 tabs for the body. Find this
block at lines 138–143:

```go
		if header.Kind == model.SkillKindPassive {
			isPassive = true
			if effect, exists := effects[skillKey]; exists {
				resolvedRank.Effects = b.buildEffects(buffs, effect)
			}
		}
```

Replace with:

```go
		// Fork: emit Effects for ALL skills (active + passive), not just passives.
		// BDO Meta needs the cooldown (skill.dbss @95) + CC/buff DurationMs
		// for every active combat skill, which the upstream extractor omits.
		if header.Kind == model.SkillKindPassive {
			isPassive = true
		}
		if effect, exists := effects[skillKey]; exists {
			resolvedRank.Effects = b.buildEffects(buffs, effect)
		}
```

Then `go build -o bdo-data-extractor .` and re-run `bdo-data-extractor build`.

> **Important**: the `if header.Kind == model.SkillKindPassive` line uses
> **3 tabs** of indentation (not 4). If your editor shows 4, it may be
> rendering tabs as 4 spaces — the file itself uses tab characters.

### Option C — Upstream PR

If you want to contribute this back upstream (iDevelopThings is responsive
per the README), open a PR with the same change + a note explaining the use
case (BDO Meta needs cooldown + CC duration for active skills, not just
passive stat modifiers). The maintainer may prefer a separate
`ActiveEffects` field to avoid changing the existing `Effects` semantics —
but for our use, reusing `Effects` is simpler and the JSON shape is the same.

## What you get

After applying + rebuilding + re-running `bdo-data-extractor build`, the
`class_skills.json` will have `effects` on active skills:

```jsonc
{
  "key": 144,
  "name": "Prime: Heavy Strike I",
  "ranks": [
    {
      "rank": 1,
      "skillKey": 266332161,
      "skillNo": 4063,
      "kind": 1,                    // active
      "name": "Prime: Heavy Strike I",
      "effects": {                  // ← NEW (upstream omits this for kind=1)
        "cooldownMs": 5000,         // from skill.dbss @95
        "durationMs": 0,            // longest timed buff
        "stats": [
          {
            "stat": "Stun",         // CC type — from buff.dbss DurationMs
            "op": "+",
            "value": 1, "unit": "",
            "buff": 12345,
            "buffModule": 49,
            "durationMs": 2000,     // ← CC duration: 2-second stun
            "instant": false
          }
          // ... more buffs (damage, protection, etc.)
        ]
      }
    }
  ]
}
```

## Caveats

- Some active skills have an **empty** buff-index list (instant damage with
  no CC). The fork will emit `"effects": null` for those (same as upstream
  passives with no effects) — no behavior change.
- The `CooldownMs` in `Effects` comes from `skill.dbss @95`. For combat
  skills, this is the actual skill cooldown (in ms). For skills with no
  cooldown, it's 0 (omitted via `omitempty`).
- The `stats[].durationMs` is the **buff's effect duration**, not the
  animation swing time. For "Stun" it's the stun duration (e.g. 2000ms),
  for "Attack Speed +20%" it's the buff uptime. The animation swing time
  comes from the `.paa` file's `animationDuration` float — see
  `scripts/paz-tools/parse-paa-frames.ts`.
- Damage row numbers (% x hits) are NOT in this data — those are in the
  `skilltype.dbss` "action configuration" block (FORMATS.md line 778,
  "not decoded here"). That's a separate reverse-engineering effort — see
  `scripts/paz-tools/skilltype-reverse-engineering-plan.md`.

## Verification

I verified the patch by:

1. Cloning the upstream repo: `git clone https://github.com/idevelopthings/bdo-data-extractor.git`
2. Confirming `internal/build/classskills.go` is **byte-identical** to the
   file you uploaded (same 158 lines, same tab indentation, same size 4759 B).
3. Running `git apply emit-active-skills.patch` — exits 0, no errors.
4. Inspecting the patched file — the `if effect, exists` block is now
   outside the `if header.Kind == model.SkillKindPassive` guard, so it
   runs for all skills (active + passive). The `isPassive` flag still
   toggles correctly for the `passiveGroups++` counter.
5. `git diff --stat` shows: `1 file changed, 6 insertions(+), 3 deletions(-)`
   — exactly the minimal change, no collateral.

I could NOT verify the build compiles (Go isn't installed in my sandbox),
but the patch is a pure control-flow refactor — it doesn't touch any types
or signatures, so the build behavior is unchanged. You'll want to run
`go build -o bdo-data-extractor .` after applying to confirm.

## Verifying the fork output

After rebuilding + re-running build:

```sh
bdo-data-extractor build --game ... --out .\data --lang en

# Check that active skills now have effects (kind=1 with non-null effects)
jq '.groups[].ranks[] | select(.kind == 1) | select(.effects != null) | {name: .name, cd: .effects.cooldownMs, stats: [.effects.stats[]? | {stat, durationMs}]}' data/class_skills.json | head -40
```

You should see active combat skills with their cooldown + CC/buff durations.
Compare the count: `jq '[.groups[].ranks[] | select(.kind == 1 and .effects != null)] | length' data/class_skills.json`
should be much higher than upstream (which only emits effects for passives,
kind=2).
