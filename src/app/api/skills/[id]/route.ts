import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { calculateDamage, type DamageRow } from '@/lib/damage'
import { calculateCCCounters, getRealCCs, getNonCCEffects } from '@/lib/cc'

export const dynamic = 'force-dynamic'

function iconUrl(iconPath: string | null): string | null {
  if (!iconPath) return null
  if (iconPath.startsWith('http')) return iconPath
  return `https://bdocodex.com/${iconPath.replace(/^\//, '')}`
}

function splitCsv(s: string | null): string[] | null {
  if (!s) return null
  const arr = s.split(',').map((x) => x.trim()).filter(Boolean)
  return arr.length ? arr : null
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const skillId = parseInt(id, 10)
  if (Number.isNaN(skillId)) {
    return NextResponse.json({ error: 'Invalid skill id' }, { status: 400 })
  }

  const skill = await db.skill.findUnique({ where: { skillId } })
  if (!skill) {
    return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
  }

  // Look up prerequisite skills (lightweight select)
  const prereqIds = skill.prerequisiteIds
    ? skill.prerequisiteIds.split(',').map((x) => parseInt(x, 10)).filter((x) => x > 0)
    : []
  const prerequisites = prereqIds.length
    ? await db.skill.findMany({
        where: { skillId: { in: prereqIds } },
        select: {
          skillId: true,
          name: true,
          className: true,
          iconPath: true,
          requiredLevel: true,
        },
      })
    : []

  // Look up other ranks in the same group (I, II, III, IV...)
  let relatedRanks: { skillId: number; name: string; requiredLevel: number }[] = []
  if (skill.groupId) {
    relatedRanks = await db.skill.findMany({
      where: {
        groupId: skill.groupId,
        skillId: { not: skill.skillId },
      },
      select: { skillId: true, name: true, requiredLevel: true },
      orderBy: { requiredLevel: 'asc' },
    })
  }

  const damageRows: DamageRow[] | null = skill.damageRowsJson ? JSON.parse(skill.damageRowsJson) : null
  const damage = calculateDamage(damageRows, skill.pvpDamagePercent)
  const ccTypes = splitCsv(skill.ccTypes)
  const realCCs = getRealCCs(ccTypes)
  const nonCCEffects = getNonCCEffects(ccTypes)
  const ccCounters = calculateCCCounters(ccTypes)

  const serialized = {
    id: skill.id,
    skillId: skill.skillId,
    groupId: skill.groupId,
    name: skill.name,
    krName: skill.krName,
    className: skill.className,
    classId: skill.classId,
    iconUrl: iconUrl(skill.iconPath),
    iconPath: skill.iconPath,
    requiredLevel: skill.requiredLevel,
    maxLevel: skill.maxLevel,
    skillPoints: skill.skillPoints,
    command: skill.command,
    cooldown: skill.cooldown,
    cooldownSec: skill.cooldownSec,
    description: skill.description,
    damageRows,
    damage,
    ccTypes,
    ccCounters,
    realCCs,
    nonCCEffects,
    protectionTypes: splitCsv(skill.protectionTypes),
    pvpDamagePercent: skill.pvpDamagePercent,
    isQuickSlot: skill.isQuickSlot,
    isAbsolute: skill.isAbsolute,
    isAwakening: skill.isAwakening,
    isSuccession: skill.isSuccession,
    isBlackSpirit: skill.isBlackSpirit,
    isPassive: skill.isPassive,
    prerequisiteIds: prereqIds,
    prerequisites: prerequisites.map((p) => ({
      skillId: p.skillId,
      name: p.name,
      className: p.className,
      iconUrl: iconUrl(p.iconPath),
      requiredLevel: p.requiredLevel,
    })),
    relatedRanks: relatedRanks.map((r) => ({
      skillId: r.skillId,
      name: r.name,
      requiredLevel: r.requiredLevel,
    })),
    videoUrl: skill.videoUrl,
    animationDurationMs: skill.animationDurationMs,
    addons: skill.addonsJson ? JSON.parse(skill.addonsJson) : null,
    syncedAt: skill.syncedAt,
    bdocodexUrl: `https://bdocodex.com/us/skill/${skill.skillId}/`,
  }

  return NextResponse.json(serialized)
}
