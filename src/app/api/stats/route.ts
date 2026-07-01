import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCached, setCached } from '@/lib/cache'

export const dynamic = 'force-dynamic'

export async function GET() {
  const cached = getCached('stats')
  if (cached) return NextResponse.json(cached)

  const [
    total,
    withDescription,
    withVideo,
    withAnimation,
    withCc,
    withProtection,
    byClass,
    awakeningCount,
    successionCount,
    absoluteCount,
    blackSpiritCount,
    passiveCount,
    notAnyTypeCount,
    recentSyncLogs,
  ] = await Promise.all([
    db.skill.count(),
    db.skill.count({ where: { description: { not: null } } }),
    db.skill.count({ where: { videoUrl: { not: null } } }),
    db.skill.count({ where: { animationDurationMs: { not: null } } }),
    db.skill.count({ where: { ccTypes: { not: null } } }),
    db.skill.count({ where: { protectionTypes: { not: null } } }),
    db.skill.groupBy({
      by: ['className', 'classId'],
      _count: { skillId: true },
      orderBy: { _count: { skillId: 'desc' } },
    }),
    db.skill.count({ where: { isAwakening: true } }),
    db.skill.count({ where: { isSuccession: true } }),
    db.skill.count({ where: { isAbsolute: true } }),
    db.skill.count({ where: { isBlackSpirit: true } }),
    db.skill.count({ where: { isPassive: true } }),
    db.skill.count({
      where: {
        isAwakening: false,
        isSuccession: false,
        isAbsolute: false,
        isBlackSpirit: false,
        isPassive: false,
      },
    }),
    db.syncLog.findMany({ take: 20, orderBy: { createdAt: 'desc' } }),
  ])

  // Compact by-class breakdown — group by classId, taking the className with the
  // most skills as the canonical name (fixes data errors where a few skills have
  // the wrong className but correct classId, e.g. 1 Valkyrie skill tagged classId=0).
  const byClassIdMap = new Map<number, { className: string; count: number }>()
  for (const c of byClass) {
    if (!c.className || c.className.startsWith('NEW_CLASS')) continue
    const cid = c.classId ?? -1
    const existing = byClassIdMap.get(cid)
    if (!existing || c._count.skillId > existing.count) {
      byClassIdMap.set(cid, { className: c.className, count: c._count.skillId })
    }
  }
  const classBreakdown = Array.from(byClassIdMap.entries())
    .filter(([cid]) => cid >= 0)
    .map(([cid, { className, count }]) => ({ className, classId: cid, count }))

  const typeBreakdown = {
    main: notAnyTypeCount,
    awakening: awakeningCount,
    succession: successionCount,
    absolute: absoluteCount,
    blackSpirit: blackSpiritCount,
    passive: passiveCount,
  }

  const result = {
    total,
    withDescription,
    withVideo,
    withAnimation,
    withCc,
    withProtection,
    classBreakdown,
    typeBreakdown,
    syncLogs: recentSyncLogs.map((l) => ({
      type: l.type,
      status: l.status,
      count: l.count,
      total: l.total,
      message: l.message,
      createdAt: l.createdAt,
    })),
  }

  setCached('stats', result, 60 * 1000) // cache for 1 min (shorter since sync logs change)
  return NextResponse.json(result)
}
