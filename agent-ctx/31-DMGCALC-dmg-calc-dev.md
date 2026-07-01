# Task 31-DMGCALC — Damage Calculator Page

**Agent:** dmg-calc-dev  
**Date:** 2025-06-30  
**Status:** ✅ Complete

## Summary

Built a PvP damage calculator page for the BDO Meta project and wired it into the main app navigation as a new "Dmg Calc" tab.

## Files Changed

| File | Change | Lines |
|------|--------|-------|
| `src/components/skills/damage-calculator-page.tsx` | **NEW** — full page component | 855 |
| `src/components/skills/tab-switcher.tsx` | Added `Calculator` icon import, `'dmgcalc'` to `ViewMode` union, new tab entry between Patches and Docs | +2 |
| `src/app/page.tsx` | Added `DamageCalculatorPage` import, `dmgcalc` keyboard shortcut (key `6`), `dmgcalc` view render branch | +10 |

## Implementation Notes

### Calculation function
`calculatePvpDamage(ap, speciesAp, skillDamagePercent, pvpDamagePercent, dr, drCoefficient, scalars)` implements the spec exactly:

```
rawDamage = ((ap + speciesAp) × (skillDmgPct/100) × (pvpPct/100)) - (dr × drCoefficient)
base      = max(1, round(rawDamage))
perScalar[key] = max(1, round(rawDamage × cfg.multiplier))   # for each of 6 scalars
scalarMult = product of active scalar multipliers (1.5/1.5/1.3/1.5/1.2/1.5)
withScalars = max(1, round(rawDamage × scalarMult))
breakdown = string like `[(325 × 12.07 × 0.32) - (350 × 5)] × 2.25`
```

### UI sections
1. **Input Panel** — Total AP (300), Enemy DR (350), DR Coefficient (5, with Info tooltip), Species AP (0). 4-column responsive grid (2 cols mobile).
2. **Damage Scalars** — 6 toggle buttons (Crit ×1.5, Down ×1.5, Air ×1.3, Back ×1.5, Speed ×1.2, Counter ×1.5) in a 6/3/2-col responsive grid. Active state uses gold-glow `bdo-chip-on` style. Counter badge shows active count.
3. **Skill Search** — Debounced (300ms) `useQuery` against `/api/skills?q=...&maxRank=true&filterEvasion=true&pageSize=10`. Results in `max-h-96 overflow-y-auto` list with icon, name, SPM badge (special mode), class color label, PvE total (`formatDamage`), PvP %, and add-to-list button. Already-added skills disabled.
4. **Results Table** — Empty state with Calculator icon prompt. Desktop sortable table: Skill | Skill Dmg % | PvP % | PvP Dmg | 6 per-scalar columns | expand/remove. Mobile card list with 2-col stat boxes + 3-col scalar grid. Expandable per-skill breakdown showing the formula string with all intermediate values. Sortable by Skill name / PvP % / PvP Damage with asc/desc toggle (chevron icons).
5. **Formula Display** — Centered formula `PvP Damage = [ (AP × Skill% × PvP%) - (DR × Coef) ] × Scalars`, 3-column legend explaining each variable, amber-bordered validation note mentioning bigandshiny's documentation and unmodeled modifiers.
6. **Top-of-page validation banner** reiterates: "Formula is approximate and based on community research. Needs validation."

### Theme consistency
Uses BDO dark theme classes throughout: `bg-bdo-ink`, `bg-bdo-leather-dark`, `bdo-title`, `bdo-heading`, `bdo-input`, `bdo-icon-frame`, `bdo-leather`, plus amber-300/400/900 accent palette. No indigo/blue (except cyan for Air Attack accent, which is a scalar color, not a primary theme color).

### Animation
- `framer-motion` `motion.tr` / `motion.div` with `layout` + `AnimatePresence` for smooth add/remove transitions.
- Expand/collapse uses AnimatePresence with opacity transition.
- Scalar toggle buttons have CSS transitions for border-color and shadow.

### Accessibility
- Semantic `<header>`, `<main>`, `<section>`, `<table>` elements.
- `aria-label` on icon-only buttons.
- `title` attributes on Info icons explaining the DR Coefficient and scalar descriptions.
- Touch targets ≥ 36px (skill icons) and ≥ 32px (scalar toggle buttons, sort headers).

## Verification

- `bun run lint` — ✅ clean (no errors, no warnings)
- `bunx tsc --noEmit` — ✅ clean for all 3 modified files (pre-existing errors elsewhere in scripts/, examples/, and route.ts:713 are unrelated)
- Dev server (PID 5443) — ✅ still serving HTTP 200 on localhost:3000

## What's NOT included (intentional)
- No persistence to localStorage (skills list and inputs reset on page reload — could be added later if desired).
- No export/share of calculation results.
- No batch calculation against multiple enemy DR presets.
- DR Coefficient is a single global value (per spec), not per-skill or per-class.

## Keyboard navigation
The `dmgcalc` view is reachable via keyboard shortcut `6` (was previously `6` = docs, now `7` = docs). The other keyboard shortcuts (1-5) are unchanged.
