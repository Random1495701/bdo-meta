import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
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

  // Compact by-class breakdown
  const classBreakdown = byClass
    .filter((c) => c.className && !c.className.startsWith('NEW_CLASS'))
    .map((c) => ({
      className: c.className,
      classId: c.classId,
      count: c._count.skillId,
    }))

  const typeBreakdown = {
    main: notAnyTypeCount,
    awakening: awakeningCount,
    succession: successionCount,
    absolute: absoluteCount,
    blackSpirit: blackSpiritCount,
    passive: passiveCount,
  }

  return NextResponse.json({
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
  })
}
