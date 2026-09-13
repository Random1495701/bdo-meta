# bdo-data-extractor Fork — Emit Active-Skill Effects

> **Goal**: Make `bdo-data-extractor` emit the `Effects` field (which carries
> `CooldownMs` + per-buff `DurationMs`) for ALL skills — active combat skills
> included — not just passives. This unlocks cooldown + CC/buff duration data
> for every skill in `class_skills.json`, which BDO Meta has never had.

## Background

The upstream `bdo-data-extractor` decodes the skill→buff chain for every skill
(`skill.dbss @99` → `buff.dbss` records, each with a `DurationMs` field), but
its `buildClassSkills` function in `internal/build/classskills.go` only emits
the `Effects` field when `header.Kind == model.SkillKindPassive`:

```go
// upstream internal/build/classskills.go (line ~140)
if header.Kind == model.SkillKindPassive {
    isPassive = true
    if effect, exists := effects[skillKey]; exists {
        resolvedRank.Effects = b.buildEffects(buffs, effect)
    }
}
```

This patch removes that guard so active combat skills (kind=1) also get their
`Effects` emitted. The data is already decoded — it's just not being written
to the JSON.

## How to apply (3 ways)

### Option A — Clone + patch + build (recommended)

```sh
git clone https://github.com/idevelopthings/bdo-data-extractor.git
cd bdo-data-extractor

# Apply the patch (from this file's directory)
# Save the patch block below as emit-active-skills.patch, then:
git apply emit-active-skills.patch

# Build
go build -o bdo-data-extractor .

# Run — produces class_skills.json with Effects on every skill that has them
bdo-data-extractor build --game "C:\Program Files (x86)\Steam\steamapps\common\Black Desert Online" --out .\data --lang en
```

### Option B — Manual edit (5 lines)

Open `internal/build/classskills.go` in a text editor. Find this block
(around line 138–144):

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
		// This gives BDO Meta the cooldown (skill.dbss @95) + CC/buff DurationMs
		// for every active combat skill, which the upstream extractor omits.
		if header.Kind == model.SkillKindPassive {
			isPassive = true
		}
		if effect, exists := effects[skillKey]; exists {
			resolvedRank.Effects = b.buildEffects(buffs, effect)
		}
```

Then `go build -o bdo-data-extractor .` and re-run `bdo-data-extractor build`.

### Option C — Upstream PR

If you want to contribute this back upstream (iDevelopThings is responsive
per the README), open a PR with the same change + a note explaining the use
case (BDO Meta needs cooldown + CC duration for active skills, not just
passive stat modifiers). The maintainer may prefer a separate
`ActiveEffects` field to avoid changing the existing `Effects` semantics —
but for our use, reusing `Effects` is simpler and the JSON shape is the same.

## The patch

Save as `emit-active-skills.patch`:

```patch
--- a/internal/build/classskills.go
+++ b/internal/build/classskills.go
@@ -137,11 +137,14 @@ func (b *Builder) buildClassSkills(buffs map[uint16]tables.Buff, effects map[uint
 			if resolved.Name == "" && localized.Name != "" {
 				resolved.Name = localized.Name
 			}
-			if header.Kind == model.SkillKindPassive {
+			// Fork: emit Effects for ALL skills (active + passive), not just passives.
+			// BDO Meta needs the cooldown (skill.dbss @95) + CC/buff DurationMs
+			// for every active combat skill, which the upstream extractor omits.
+			if header.Kind == model.SkillKindPassive {
 				isPassive = true
-				if effect, exists := effects[skillKey]; exists {
-					resolvedRank.Effects = b.buildEffects(buffs, effect)
-				}
 			}
+			if effect, exists := effects[skillKey]; exists {
+				resolvedRank.Effects = b.buildEffects(buffs, effect)
+			}
 			resolved.Ranks = append(resolved.Ranks, resolvedRank)
 		}
 		if isPassive {
```

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
        "cooldownMs": 0,            // from skill.dbss @95
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
  `scripts/parse-paa-frames.ts`.
- Damage row numbers (% x hits) are NOT in this data — those are in the
  `skilltype.dbss` "action configuration" block (FORMATS.md line 778,
  "not decoded here"). That's a separate reverse-engineering effort.

## Verifying the fork

```sh
# After rebuilding + re-running build:
# Check that active skills now have effects
bdo-data-extractor build --game ... --out .\data --lang en

# Then in the output:
jq '.groups[].ranks[] | select(.kind == 1) | select(.effects != null) | {name: .name, cd: .effects.cooldownMs, stats: [.effects.stats[]? | {stat, durationMs}]}' data/class_skills.json | head -40
```

You should see active combat skills with their cooldown + CC/buff durations.
