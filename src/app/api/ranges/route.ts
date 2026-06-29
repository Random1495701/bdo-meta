import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { calculateDamage } from '@/lib/damage'

export const dynamic = 'force-dynamic'

// Returns the actual min/max values for filterable numeric fields, computed
// from the real data in the database. The UI uses these to set slider ranges.
export async function GET() {
  const [levelAgg, cdAgg, animAgg, spAgg] = await Promise.all([
    db.skill.aggregate({ _min: { requiredLevel: true }, _max: { requiredLevel: true } }),
    db.skill.aggregate({ _min: { cooldownSec: true }, _max: { cooldownSec: true } }),
    db.skill.aggregate({ _min: { animationDurationMs: true }, _max: { animationDurationMs: true } }),
    db.skill.aggregate({ _max: { skillPoints: true } }),
  ])

  // Compute max damage by scanning all enriched skills
  const withDamage = await db.skill.findMany({
    where: { damageRowsJson: { not: null } },
    select: { damageRowsJson: true, pvpDamagePercent: true },
  })
  let maxDamage = 0
  for (const s of withDamage) {
    const rows = JSON.parse(s.damageRowsJson!)
    const dmg = calculateDamage(rows, s.pvpDamagePercent)
    if (dmg.totalPvE > maxDamage) maxDamage = dmg.totalPvE
  }

  return NextResponse.json({
    requiredLevel: {
      min: levelAgg._min.requiredLevel ?? 0,
      max: levelAgg._max.requiredLevel ?? 62,
    },
    cooldownSec: {
      min: 0,
      max: cdAgg._max.cooldownSec ?? 1200,
    },
    animationDurationMs: {
      min: 0,
      max: animAgg._max.animationDurationMs ?? 25000,
    },
    skillPoints: {
      min: 0,
      max: spAgg._max.skillPoints ?? 50,
    },
    damage: {
      min: 0,
      max: maxDamage > 0 ? maxDamage : 100000,
    },
  })
}
