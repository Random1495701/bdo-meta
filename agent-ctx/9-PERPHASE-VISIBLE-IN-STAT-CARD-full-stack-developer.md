# Task 9-PERPHASE-VISIBLE-IN-STAT-CARD — full-stack-developer

## Goal
Show per-phase DPS DIRECTLY inside the ANIMATION stat card body (no scroll/hover needed) for multi-attack skills, while preserving the existing tooltip as a hover affordance and leaving single-animation skills unchanged.

## Files changed
- `src/components/skills/skill-detail-drawer.tsx`

## Key changes
1. `StatCard` component gained a new optional prop `extraContent?: React.ReactNode`. It is rendered BELOW the main value (and below the tooltip wrapper) inside a `mt-0.5 border-t border-amber-700/30 pt-1` container. Existing `valueTooltip` behaviour is unchanged.
2. The ANIMATION StatCard IIFE was rewritten:
   - Extracted a small `phaseDps(ap, i)` helper that returns `{ pve, pvp }`. The inline content and the hover tooltip both call this helper so they can never diverge.
   - Built `inlinePhases: React.ReactNode` rendering each animation phase as a compact `font-mono text-[10px] tabular-nums leading-tight text-amber-200/70` row in the format `P{phase}: {durationMs}ms → {pvpDps}/s (PvE {pveDps}/s)`. PvP is primary (pink-400/90), PvE in parens (amber-200/40). Falls back to PvE-only (amber-300/80) or `—` when no damage data.
   - Refactored `phaseTooltip` to consume the same `phaseDps` helper (no behaviour change).
   - Passed `extraContent={inlinePhases}` to StatCard. Updated `hint` text to mention that the breakdown is shown below.
   - For single-animation skills (`hasPhases === false`), `inlinePhases` is `undefined`, so no extra content is rendered — the original compact display is preserved exactly.

## Verification
- `bun run lint` → PASS (0 errors)
- Dev server stable, all HTTP 200
- Agent Browser:
  - "Absolute: Blade Waltz" → drawer shows ANIMATION stat card with inline breakdown directly:
    - "ANIMATION (2 PHASES)"
    - "9.53s (2×)"
    - "P2: 4700ms → 851/s (PvE 1,326/s)"
    - "P4: 4833ms → 827/s (PvE 1,290/s)"
  - "Black Spirit: Prime: Ground Smash IV" → BSR COST card still shows "200%".

## Notes for downstream agents
- The `extraContent` prop on `StatCard` is generic and can be reused by other stat cards if needed.
- The dedicated "ANIMATION PHASES (N× MULTI-ATTACK)" Section (added in task 8) is intentionally LEFT IN PLACE — it provides a larger, more detailed breakdown with a footer explanation for users who want the expanded view. The inline card content is the always-visible summary; the section is the expanded reference.
