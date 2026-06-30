// BDO Skill Damage Calculator
// Parses damage rows from bdocodex tooltip data and computes total damage values.
//
// Damage rows come in two formats:
// 1. [damage] kind: "Attack N damage" with value "X% xY"  (structured)
// 2. [note] kind:  "Phase attack damage X% xY, max Z hits"  (unstructured)
//
// Format explanation:
// "8246% x1" means: 8246% damage, 1 hit → total = 8246 * 1 = 8246
// "938% x3" means: 938% damage per hit, 3 hits → total = 938 * 3 = 2814
// "1325% x1, max 3 hits" means: 1325% damage, 1 hit, can hit up to 3 targets
//   → total damage per target = 1325 * 1 = 1325 (max targets is NOT a damage multiplier)
//
// We parse both, group by phase, and compute:
// - Per-phase damage: percent * hits (the "x N" is the hit count, NOT a multiplier)
// - Total PvE damage: sum of all phases (per target)
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
  hits: number
  maxTargets?: number // max targets the skill can hit (NOT a damage multiplier)
  totalPerHit: number  // percent * hits
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
}

// Parse a damage value string like "8246% x1" or "938% x3, max 5 hits"
function parseDamageValue(value: string): { percent: number; hits: number; maxTargets?: number } | null {
  // Match "X% xY" pattern
  const dmgMatch = value.match(/([\d,]+(?:\.\d+)?)%\s*x\s*(\d+)/i)
  if (!dmgMatch) return null
  const percent = parseFloat(dmgMatch[1].replace(/,/g, ''))
  const hits = parseInt(dmgMatch[2], 10)
  // Check for "max Z hits" — this is the max TARGET count, not a damage multiplier
  const maxMatch = value.match(/max\s+(\d+)\s+hits/i)
  const maxTargets = maxMatch ? parseInt(maxMatch[1], 10) : undefined
  return { percent, hits, maxTargets }
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
    return { phases: [], totalPvE: 0, totalPvP: null, pvpDamagePercent, hasDamage: false }
  }

  const phases: PhaseDamage[] = []
  const phaseMap = new Map<string, PhaseDamage>()

  for (const row of damageRows) {
    let parsed: { percent: number; hits: number; maxTargets?: number } | null = null
    let phaseLabel = ''

    if (row.kind === 'damage' && row.value) {
      // [damage] kind: value is "X% xY"
      parsed = parseDamageValue(row.value)
      phaseLabel = extractPhase(row.label)
    } else if (row.kind === 'note' && row.label) {
      // [note] kind: label contains damage info like "Standing attack damage 938% x1, max 3 hits"
      const dmgMatch = row.label.match(/([\d,]+(?:\.\d+)?)%\s*x\s*(\d+)/i)
      if (dmgMatch && row.label.toLowerCase().includes('damage')) {
        parsed = parseDamageValue(row.label)
        const phaseMatch = row.label.match(/^(.+?)\s+(?:hit\s+)?damage/i)
        phaseLabel = phaseMatch ? phaseMatch[1].trim() : 'Attack'
      }
    }

    if (!parsed) continue

    // CORRECT: damage = percent * hits (the "x N" IS the hit count)
    // maxTargets is the max number of targets the skill can hit — NOT a damage multiplier
    const totalPerHit = parsed.percent * parsed.hits
    const totalMax = totalPerHit // max targets doesn't change per-target damage

    // Merge with existing phase if same name (some skills have multiple rows for same phase)
    const existing = phaseMap.get(phaseLabel)
    if (existing) {
      existing.percent += parsed.percent
      existing.hits += parsed.hits
      existing.totalPerHit += totalPerHit
      existing.totalMax += totalMax
      if (parsed.maxTargets) {
        existing.maxTargets = (existing.maxTargets || 1) * parsed.maxTargets
      }
    } else {
      const phase: PhaseDamage = {
        phase: phaseLabel,
        percent: parsed.percent,
        hits: parsed.hits,
        maxTargets: parsed.maxTargets,
        totalPerHit,
        totalMax,
        pvpOnly: row.pvpOnly || false,
        pveOnly: row.pveOnly || false,
      }
      phaseMap.set(phaseLabel, phase)
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
  }
}

// Format a damage value for display
export function formatDamage(value: number): string {
  if (value === 0) return '—'
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M%`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K%`
  return `${value.toLocaleString()}%`
}
