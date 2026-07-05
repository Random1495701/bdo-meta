# BDO Skill Specs & Dedup Logic

## The three specs

At level 56, every BDO class picks **one** spec. Ascension-only classes (Archer, Shai, Scholar, Deadeye, Wukong, Seraph) have a single spec.

### Awakening (red)
- Equip a new **Awakening weapon**.
- Pre-56 skills get upgraded to **`Absolute:`** variants.
- Gain **Awakening-weapon skills** (`isAwakening=true`).
- Do NOT get `Prime:` / `Succession:` variants.

### Succession (blue)
- Keep the main weapon.
- Pre-56 skills get upgraded to **`Prime:`** / **`Succession:`** variants.
- For skills with NO Prime variant, fall back to **`Absolute:`** (only if no Prime exists).
- Do NOT get Awakening-weapon skills.

### Ascension (yellow)
- Only for: Archer, Shai, Scholar, Deadeye, Wukong, Seraph.
- These classes do NOT have Awakening or Succession. Ascension is their only spec.
- Show all skills (no spec exclusion).

## Deduplication (`src/lib/spec-dedup.ts`)

### Step 1 — DB-level: `isMaxRank` column
For every `(classId, baseName, variant)` group, only the **highest rank** is `isMaxRank=true`. Variants: `main`, `prime`, `absolute`, `core`, `flow`, `bs`, `passive`.

### Step 2 — API-level: spec-aware dedup
Groups all max-rank skills by stripped baseName, picks ONE variant per group:

| Spec selected | Variant kept |
|---------------|-------------|
| Awakening | Absolute (if exists), else Main. Excludes Awakening-weapon prereqs. NEVER Prime. |
| Succession | Prime (if exists), else Absolute (if no Prime), else Main. NEVER Awakening-weapon. |
| Both | Union of Awakening + Succession (Prime AND Absolute shown) |
| None (default) | Prime > Absolute > Core > Flow > Main (one row per baseName) |

### Special cases
- **Core:/Flow: with isAwakening=true** — excluded from Succession and default (they require the Awakening weapon).
- **Passive-vs-active collision** — only the active is kept.
- **Black Spirit skills** — always kept separately.
