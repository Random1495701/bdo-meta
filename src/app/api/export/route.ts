import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/export
// Exports the current database as a JSON file. The user can download this as a
// backup of all enriched skill data, and re-upload it later via /api/upload/skills-json.
//
// Query params:
//   enriched=true  — only export skills with descriptions (default: false = all)
//   format=snapshot — full skill objects with all fields (default)
//   format=compact  — minimal fields (skillId, name, className, description)

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const enrichedOnly = sp.get('enriched') === 'true'
  const format = sp.get('format') || 'snapshot'

  const where = enrichedOnly
    ? { description: { not: null } as const }
    : {}

  const skills = await db.skill.findMany({
    where,
    orderBy: { skillId: 'asc' },
  })

  const serialized = skills.map((s) => {
    if (format === 'compact') {
      return {
        skillId: s.skillId,
        name: s.name,
        className: s.className,
        description: s.description,
      }
    }
    return {
      skillId: s.skillId,
      groupId: s.groupId,
      name: s.name,
      krName: s.krName,
      className: s.className,
      classId: s.classId,
      iconPath: s.iconPath,
      requiredLevel: s.requiredLevel,
      maxLevel: s.maxLevel,
      skillPoints: s.skillPoints,
      command: s.command,
      cooldown: s.cooldown,
      cooldownSec: s.cooldownSec,
      description: s.description,
      damageRows: s.damageRowsJson ? JSON.parse(s.damageRowsJson) : null,
      ccTypes: s.ccTypes ? s.ccTypes.split(',') : null,
      protectionTypes: s.protectionTypes ? s.protectionTypes.split(',') : null,
      pvpDamagePercent: s.pvpDamagePercent,
      isQuickSlot: s.isQuickSlot,
      isAbsolute: s.isAbsolute,
      isAwakening: s.isAwakening,
      isSuccession: s.isSuccession,
      isBlackSpirit: s.isBlackSpirit,
      isPassive: s.isPassive,
      videoUrl: s.videoUrl,
      animationDurationMs: s.animationDurationMs,
      syncedAt: s.syncedAt,
    }
  })

  const total = await db.skill.count()
  const enriched = await db.skill.count({ where: { description: { not: null } } })

  const exportData = {
    exportedAt: new Date().toISOString(),
    source: 'bdo-skills-codex',
    total: serialized.length,
    dbTotal: total,
    dbEnriched: enriched,
    format,
    skills: serialized,
  }

  const filename = `bdo-skills-${format}-${new Date().toISOString().slice(0, 10)}.json`

  return NextResponse.json(exportData, {
    headers: {
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
