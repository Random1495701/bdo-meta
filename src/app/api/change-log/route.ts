import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/change-log
// Returns recent skill change log entries for live tracking.
// Query params:
//   ?limit=50  — max entries to return (default 50, max 200)
//   ?source=   — filter by source (lurker, patch_apply, manual, import, garmoth)
//   ?field=    — filter by field name
//   ?skillId=  — filter by skill ID

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)
  const source = searchParams.get('source')
  const field = searchParams.get('field')
  const skillId = searchParams.get('skillId')

  const where: any = {}
  if (source) where.source = source
  if (field) where.field = field
  if (skillId) where.skillId = parseInt(skillId, 10)

  const [entries, totalCount, stats] = await Promise.all([
    db.skillChangeLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    db.skillChangeLog.count({ where }),
    db.skillChangeLog.groupBy({
      by: ['source'],
      _count: true,
    }),
  ])

  // Also get recent activity stats (last 24h, last 7d)
  const now = new Date()
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [last24h, last7d, uniqueSkillsChanged] = await Promise.all([
    db.skillChangeLog.count({ where: { ...where, createdAt: { gte: dayAgo } } }),
    db.skillChangeLog.count({ where: { ...where, createdAt: { gte: weekAgo } } }),
    db.skillChangeLog.findMany({
      where,
      select: { skillId: true },
      distinct: ['skillId'],
    }),
  ])

  return NextResponse.json({
    entries,
    total: totalCount,
    stats: {
      last24h,
      last7d,
      uniqueSkillsChanged: uniqueSkillsChanged.length,
      bySource: stats.reduce((acc, s) => {
        acc[s.source] = s._count
        return acc
      }, {} as Record<string, number>),
    },
  })
}
