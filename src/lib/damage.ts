// BDO Skill Damage Calculator
// Parses damage rows from bdocodex tooltip data and computes total damage values.
//
// Damage format: "X% x N" where X = damage percentage, N = damage multiplier
// - "6588% x1" → 6588 * 1 = 6588
// - "10550% x2" → 10550 * 2 = 21100
// - "871% x1, max 5 hits" → 871 * 1 = 871 (max 5 is TARGETS, not a multiplier)
//
// Special modes: Some skills (Deadeye Marni mode, Witch/tamer variants, etc.) have
// multiple sets of damage rows in the same tooltip. Each set starts with "Attack 1".
// We only count the FIRST set (normal mode) to avoid overcalculation.
//
// We compute:
// - Per-phase damage: percent * multiplier
// - Total PvE damage: sum of all phases (first set only)
// - Total PvP damage: total PvE * (pvpDamagePercent / 100) if pvpDamagePercent exists

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
  multiplier: number  // the "x N" value
  maxTargets?: number // max targets the skill can hit (NOT a damage multiplier)
  totalPerHit: number  // percent * multiplier
  totalMax: number     // same as totalPerHit (max targets doesn't multiply damage)
  pvpOnly: boolean
  pveOnly: boolean
}

export interface DamageCalculation {
  phases: PhaseDamage[]
  totalPvE: number
  totalPvP: number | null
  pvpDamagePercent: number | null
  hasDamage: boolean
  hasSpecialMode: boolean // true if skill had duplicate damage sets
}

// Parse a damage value string like "8246% x1" or "938% x3, max 5 hits"
function parseDamageValue(value: string): { percent: number; multiplier: number; maxTargets?: number } | null {
  // Match "X% x N" pattern — N is the damage multiplier
  const dmgMatch = value.match(/([\d,]+(?:\.\d+)?)%\s*x\s*(\d+)/i)
  if (!dmgMatch) return null
  const percent = parseFloat(dmgMatch[1].replace(/,/g, ''))
  const multiplier = parseInt(dmgMatch[2], 10)
  // Check for "max Z hits" — this is the max TARGET count, not a damage multiplier
  const maxMatch = value.match(/max\s+(\d+)\s+hits/i)
  const maxTargets = maxMatch ? parseInt(maxMatch[1], 10) : undefined
  return { percent, multiplier, maxTargets }
}

// Extract phase name from a damage row label
function extractPhase(label: string): string {
  const m = label.match(/^(.+?)(?:\s+(?:hit|last)\s+)?damage/i)
  if (m) return m[1].trim()
  return label
}

export function calculateDamage(
  damageRows: DamageRow[] | null,
  pvpDamagePercent: number | null,
): DamageCalculation {
  if (!damageRows || damageRows.length === 0) {
    return { phases: [], totalPvE: 0, totalPvP: null, pvpDamagePercent, hasDamage: false, hasSpecialMode: false }
  }

  // Collect all damage rows (both [damage] kind and [note] kind with damage info)
  const parsedRows: { phaseLabel: string; percent: number; multiplier: number; maxTargets?: number; pvpOnly: boolean; pveOnly: boolean }[] = []

  for (const row of damageRows) {
    let parsed: { percent: number; multiplier: number; maxTargets?: number } | null = null
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
      maxTargets: parsed.maxTargets,
      pvpOnly: row.pvpOnly || false,
      pveOnly: row.pveOnly || false,
    })
  }

  // Detect special modes: if we see "Attack 1" more than once, the skill has
  // multiple modes (normal + special). We only count the FIRST set.
  let hasSpecialMode = false
  let firstSetRows = parsedRows

  const attack1Indices: number[] = []
  for (let i = 0; i < parsedRows.length; i++) {
    if (parsedRows[i].phaseLabel.toLowerCase().includes('attack 1')) {
      attack1Indices.push(i)
    }
  }

  if (attack1Indices.length > 1) {
    hasSpecialMode = true
    // Only keep rows from the first "Attack 1" up to (but not including) the second "Attack 1"
    firstSetRows = parsedRows.slice(0, attack1Indices[1])
  }

  // Build phases from the first set only
  const phases: PhaseDamage[] = []
  const phaseMap = new Map<string, PhaseDamage>()

  for (const row of firstSetRows) {
    const totalPerHit = row.percent * row.multiplier
    const totalMax = totalPerHit

    const existing = phaseMap.get(row.phaseLabel)
    if (existing) {
      existing.percent += row.percent
      existing.multiplier += row.multiplier
      existing.totalPerHit += totalPerHit
      existing.totalMax += totalMax
      if (row.maxTargets) {
        existing.maxTargets = (existing.maxTargets || 1) * row.maxTargets
      }
    } else {
      const phase: PhaseDamage = {
        phase: row.phaseLabel,
        percent: row.percent,
        multiplier: row.multiplier,
        maxTargets: row.maxTargets,
        totalPerHit,
        totalMax,
        pvpOnly: row.pvpOnly,
        pveOnly: row.pveOnly,
      }
      phaseMap.set(row.phaseLabel, phase)
      phases.push(phase)
    }
  }

  // Calculate totals — sum of all phases' damage per target
  const pvePhases = phases.filter((p) => !p.pvpOnly)
  const totalPvE = pvePhases.reduce((sum, p) => sum + p.totalMax, 0)

  // PvP total = PvE total * (pvpDamagePercent / 100)
  const totalPvP = pvpDamagePercent != null && totalPvE > 0
    ? Math.round(totalPvE * (pvpDamagePercent / 100) * 100) / 100
    : null

  return {
    phases,
    totalPvE,
    totalPvP,
    pvpDamagePercent,
    hasDamage: phases.length > 0,
    hasSpecialMode,
  }
}

// Format a damage value for display
export function formatDamage(value: number): string {
  if (value === 0) return '—'
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M%`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K%`
  return `${value.toLocaleString()}%`
}
