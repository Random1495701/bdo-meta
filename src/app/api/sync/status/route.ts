import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  const [total, withDescription, withVideo, withAnimation, recentLogs] = await Promise.all([
    db.skill.count(),
    db.skill.count({ where: { description: { not: null } } }),
    db.skill.count({ where: { videoUrl: { not: null } } }),
    db.skill.count({ where: { animationDurationMs: { not: null } } }),
    db.syncLog.findMany({ take: 10, orderBy: { createdAt: 'desc' } }),
  ])

  return NextResponse.json({
    total,
    withDescription,
    withVideo,
    withAnimation,
    pendingTooltips: Math.max(0, total - withDescription),
    pendingAnimations: Math.max(0, withVideo - withAnimation),
    recentLogs: recentLogs.map((l) => ({
      id: l.id,
      type: l.type,
      status: l.status,
      count: l.count,
      total: l.total,
      message: l.message,
      createdAt: l.createdAt,
    })),
  })
}
