// BDO Skill Damage Calculator
// Parses damage rows from bdocodex tooltip data and computes total damage values.
//
// Damage format: "X% x N, max Z hits" where:
// - X = damage percentage
// - N = damage multiplier
// - Z = number of times the attack hits (max hits). If absent, defaults to 1.
//
// Formula: total = percent × multiplier × maxHits
// - "6588% x1" → 6588 × 1 × 1 = 6588
// - "10550% x2" → 10550 × 2 × 1 = 21100
// - "5208% x2, max 3 hits" → 5208 × 2 × 3 = 31248
// - "1325% x1, max 3 hits" → 1325 × 1 × 3 = 3975
//
// Special modes: Some skills have multiple sets of damage rows (normal + special mode).
// We separate these into different stat sheets with mode indicators.
//
// "Maximum N targets" (separate row, [target] kind) is NOT part of the damage formula.

export interface DamageRow {
  label: string
  value?: string
  pvpOnly?: boolean
  pveOnly?: boolean
  kind: 'damage' | 'target' | 'cc' | 'protection' | 'buff' | 'note' | 'pvp'
}

export interface PhaseDamage {
  phase: string
  percent: number
  multiplier: number    // the "x N" value
  maxHits: number       // number of times the attack hits (from "max Z hits", default 1)
  totalPerHit: number   // percent * multiplier
  totalMax: number      // percent * multiplier * maxHits
  pvpOnly: boolean
  pveOnly: boolean
}

export interface DamageMode {
  modeName: string      // "Normal" or "Special" or specific mode name
  phases: PhaseDamage[]
  totalPvE: number
  totalPvP: number | null
}

export interface DamageCalculation {
  phases: PhaseDamage[]   // first mode phases (for backward compat)
  totalPvE: number        // first mode total
  totalPvP: number | null // first mode PvP total
  pvpDamagePercent: number | null
  hasDamage: boolean
  hasSpecialMode: boolean
  modes: DamageMode[]     // all modes (if multiple)
}

// Parse a damage value string like "8246% x1" or "5208% x2, max 3 hits"
function parseDamageValue(value: string): { percent: number; multiplier: number; maxHits: number } | null {
  const dmgMatch = value.match(/([\d,]+(?:\.\d+)?)%\s*x\s*(\d+)/i)
  if (!dmgMatch) return null
  const percent = parseFloat(dmgMatch[1].replace(/,/g, ''))
  const multiplier = parseInt(dmgMatch[2], 10)
  // "max Z hits" = number of times the attack hits. Default 1.
  const maxMatch = value.match(/max\s+(\d+)\s+hits/i)
  const maxHits = maxMatch ? parseInt(maxMatch[1], 10) : 1
  return { percent, multiplier, maxHits }
}

function extractPhase(label: string): string {
  const m = label.match(/^(.+?)(?:\s+(?:hit|last)\s+)?damage/i)
  if (m) return m[1].trim()
  return label
}

function buildPhasesFromRows(rows: { phaseLabel: string; percent: number; multiplier: number; maxHits: number; pvpOnly: boolean; pveOnly: boolean }[]): PhaseDamage[] {
  const phases: PhaseDamage[] = []
  const phaseMap = new Map<string, PhaseDamage>()

  for (const row of rows) {
    const totalPerHit = row.percent * row.multiplier
    const totalMax = totalPerHit * row.maxHits

    const existing = phaseMap.get(row.phaseLabel)
    if (existing) {
      existing.percent += row.percent
      existing.multiplier += row.multiplier
      existing.totalPerHit += totalPerHit
      existing.totalMax += totalMax
      // For maxHits, take the max (different attacks in same phase might have different hit counts)
      existing.maxHits = Math.max(existing.maxHits, row.maxHits)
    } else {
      const phase: PhaseDamage = {
        phase: row.phaseLabel,
        percent: row.percent,
        multiplier: row.multiplier,
        maxHits: row.maxHits,
        totalPerHit,
        totalMax,
        pvpOnly: row.pvpOnly,
        pveOnly: row.pveOnly,
      }
      phaseMap.set(row.phaseLabel, phase)
      phases.push(phase)
    }
  }

  return phases
}

function computeTotal(phases: PhaseDamage[], pvpDamagePercent: number | null): { pve: number; pvp: number | null } {
  const pvePhases = phases.filter((p) => !p.pvpOnly)
  const pve = pvePhases.reduce((sum, p) => sum + p.totalMax, 0)
  const pvp = pvpDamagePercent != null && pve > 0
    ? Math.round(pve * (pvpDamagePercent / 100) * 100) / 100
    : null
  return { pve, pvp }
}

export function calculateDamage(
  damageRows: DamageRow[] | null,
  pvpDamagePercent: number | null,
): DamageCalculation {
  if (!damageRows || damageRows.length === 0) {
    return { phases: [], totalPvE: 0, totalPvP: null, pvpDamagePercent, hasDamage: false, hasSpecialMode: false, modes: [] }
  }

  // Collect all damage rows
  const parsedRows: { phaseLabel: string; percent: number; multiplier: number; maxHits: number; pvpOnly: boolean; pveOnly: boolean }[] = []

  for (const row of damageRows) {
    let parsed: { percent: number; multiplier: number; maxHits: number } | null = null
    let phaseLabel = ''

    if (row.kind === 'damage' && row.value) {
      parsed = parseDamageValue(row.value)
      phaseLabel = extractPhase(row.label)
    } else if (row.kind === 'note' && row.label) {
      const dmgMatch = row.label.match(/([\d,]+(?:\.\d+)?)%\s*x\s*(\d+)/i)
      if (dmgMatch && row.label.toLowerCase().includes('damage')) {
        parsed = parseDamageValue(row.label)
        const phaseMatch = row.label.match(/^(.+?)\s+(?:hit\s+)?damage/i)
        phaseLabel = phaseMatch ? phaseMatch[1].trim() : 'Attack'
      }
    }

    if (!parsed) continue

    parsedRows.push({
      phaseLabel,
      percent: parsed.percent,
      multiplier: parsed.multiplier,
      maxHits: parsed.maxHits,
      pvpOnly: row.pvpOnly || false,
      pveOnly: row.pveOnly || false,
    })
  }

  // Detect special modes: multiple "Attack 1" entries
  const attack1Indices: number[] = []
  for (let i = 0; i < parsedRows.length; i++) {
    if (parsedRows[i].phaseLabel.toLowerCase().includes('attack 1')) {
      attack1Indices.push(i)
    }
  }

  const hasSpecialMode = attack1Indices.length > 1
  const modes: DamageMode[] = []

  if (hasSpecialMode) {
    // Split into modes — each mode starts at an "Attack 1" and goes until the next one
    const splitPoints = [...attack1Indices, parsedRows.length]
    for (let m = 0; m < splitPoints.length - 1; m++) {
      const modeRows = parsedRows.slice(splitPoints[m], splitPoints[m + 1])
      const phases = buildPhasesFromRows(modeRows)
      const { pve, pvp } = computeTotal(phases, pvpDamagePercent)
      modes.push({
        modeName: m === 0 ? 'Normal' : `Mode ${m + 1}`,
        phases,
        totalPvE: pve,
        totalPvP: pvp,
      })
    }
  } else {
    // Single mode
    const phases = buildPhasesFromRows(parsedRows)
    const { pve, pvp } = computeTotal(phases, pvpDamagePercent)
    modes.push({ modeName: 'Normal', phases, totalPvE: pve, totalPvP: pvp })
  }

  // Use first mode for backward-compat fields
  const firstMode = modes[0]
  return {
    phases: firstMode.phases,
    totalPvE: firstMode.totalPvE,
    totalPvP: firstMode.totalPvP,
    pvpDamagePercent,
    hasDamage: firstMode.phases.length > 0,
    hasSpecialMode,
    modes,
  }
}

export function formatDamage(value: number): string {
  if (value === 0) return '—'
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M%`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K%`
  return `${value.toLocaleString()}%`
}
