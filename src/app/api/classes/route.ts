import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCached, setCached } from '@/lib/cache'

export const dynamic = 'force-dynamic'

export async function GET() {
  const cached = getCached('classes')
  if (cached) return NextResponse.json(cached)

  // Return all bdocodex classes plus per-class skill counts.
  const classes = await db.bdoClass.findMany({ orderBy: { id: 'asc' } })
  const counts = await db.skill.groupBy({
    by: ['classId'],
    _count: { skillId: true },
  })
  const countMap = new Map<number, number>()
  for (const c of counts) {
    if (c.classId != null) countMap.set(c.classId, c._count.skillId)
  }

  const result = {
    classes: classes.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      awakened: c.awakened,
      mainWeapon: c.mainWeapon,
      awakeningWeapon: c.awakeningWeapon,
      combatType: c.combatType,
      isAscension: c.isAscension,
      skillCount: countMap.get(c.id) ?? 0,
    })),
  }

  setCached('classes', result, 5 * 60 * 1000)
  return NextResponse.json(result)
}
