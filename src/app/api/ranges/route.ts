import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Returns the actual min/max values for filterable numeric fields, so the UI
// can set slider ranges to the real data distribution.
export async function GET() {
  const [levelAgg, cdAgg, animAgg] = await Promise.all([
    db.skill.aggregate({ _min: { requiredLevel: true }, _max: { requiredLevel: true } }),
    db.skill.aggregate({ _min: { cooldownSec: true }, _max: { cooldownSec: true } }),
    db.skill.aggregate({ _min: { animationDurationMs: true }, _max: { animationDurationMs: true } }),
  ])

  return NextResponse.json({
    requiredLevel: {
      min: levelAgg._min.requiredLevel ?? 1,
      max: levelAgg._max.requiredLevel ?? 62,
    },
    cooldownSec: {
      min: 0,
      max: Math.ceil((cdAgg._max.cooldownSec ?? 1200) / 60) * 60,
    },
    animationDurationMs: {
      min: 0,
      max: Math.ceil((animAgg._max.animationDurationMs ?? 25000) / 1000) * 1000,
    },
  })
}
