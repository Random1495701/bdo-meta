import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { calculateDamage } from '@/lib/damage'
import { getCached, setCached } from '@/lib/cache'

export const dynamic = 'force-dynamic'

// Returns the actual min/max values for filterable numeric fields, computed
// from the real data in the database. Uses the 99th percentile for max values
// to avoid outliers (e.g., Black Spirit skills with 20m cooldown) making the
// slider range impractical.

function percentile(sorted: number[], pct: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.floor(sorted.length * pct / 100)
  return sorted[Math.min(idx, sorted.length - 1)]
}

export async function GET() {
  // Check cache first (ranges change rarely)
  const cached = getCached('ranges')
  if (cached) return NextResponse.json(cached)

  const [levelAgg, cdSkills, animSkills, spAgg, dmgSkills] = await Promise.all([
    db.skill.aggregate({ _min: { requiredLevel: true }, _max: { requiredLevel: true } }),
    db.skill.findMany({ where: { cooldownSec: { not: null } }, select: { cooldownSec: true }, orderBy: { cooldownSec: 'asc' } }),
    db.skill.findMany({ where: { animationDurationMs: { not: null } }, select: { animationDurationMs: true }, orderBy: { animationDurationMs: 'asc' } }),
    db.skill.aggregate({ _max: { skillPoints: true } }),
    db.skill.findMany({ where: { damageRowsJson: { not: null } }, select: { damageRowsJson: true, pvpDamagePercent: true } }),
  ])

  // Cooldown: max is the highest value before the Black Spirit 1200s gap.
  // All non-Black-Spirit skills are ≤240s. Black Spirit skills are all 1200s.
  // The slider goes 0→240s smoothly, then has a "jump to 20m" button for 1200s.
  const cdVals = cdSkills.map(s => s.cooldownSec!).filter(v => v > 0)
  const belowBs = cdVals.filter(v => v < 600) // everything before Black Spirit
  const cdMax = belowBs.length > 0 ? Math.ceil(belowBs[belowBs.length - 1] / 30) * 30 : 240 // round up to nearest 30s
  const cdBlackSpirit = 1200 // Black Spirit rage skills

  // Animation: use actual max (25s is reasonable for a slider)
  const animVals = animSkills.map(s => s.animationDurationMs!).filter(v => v > 0)
  const animMax = animVals.length > 0 ? Math.ceil(animVals[animVals.length - 1] / 1000) * 1000 : 25000

  // Damage: use 99th percentile
  let maxDmg = 0
  const dmgVals: number[] = []
  for (const s of dmgSkills) {
    const rows = JSON.parse(s.damageRowsJson!)
    const dmg = calculateDamage(rows, s.pvpDamagePercent)
    if (dmg.totalPvE > 0) {
      dmgVals.push(dmg.totalPvE)
      if (dmg.totalPvE > maxDmg) maxDmg = dmg.totalPvE
    }
  }
  dmgVals.sort((a, b) => a - b)
  const dmgMax = dmgVals.length > 0 ? Math.ceil(percentile(dmgVals, 99) / 1000) * 1000 : 100000

  return NextResponse.json({
    requiredLevel: {
      min: levelAgg._min.requiredLevel ?? 0,
      max: levelAgg._max.requiredLevel ?? 62,
    },
    cooldownSec: {
      min: 0,
      max: cdMax, // highest non-Black-Spirit cooldown (e.g., 240s)
      blackSpiritMax: cdBlackSpirit, // 1200s — for the "jump to 20m" button
      absoluteMax: cdVals.length > 0 ? cdVals[cdVals.length - 1] : 1200,
    },
    animationDurationMs: {
      min: 0,
      max: animMax,
    },
    skillPoints: {
      min: 0,
      max: spAgg._max.skillPoints ?? 50,
    },
    damage: {
      min: 0,
      max: dmgMax, // 99th percentile
      absoluteMax: maxDmg, // for reference
    },
  }
  setCached('ranges', result, 10 * 60 * 1000) // cache for 10 min
  return NextResponse.json(result)
}
