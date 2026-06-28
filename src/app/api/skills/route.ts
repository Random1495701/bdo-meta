import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

// Common icon path -> absolute URL helper
function iconUrl(iconPath: string | null): string | null {
  if (!iconPath) return null
  if (iconPath.startsWith('http')) return iconPath
  return `https://bdocodex.com/${iconPath.replace(/^\//, '')}`
}

// Parse comma-separated string into array
function splitCsv(s: string | null): string[] | null {
  if (!s) return null
  const arr = s.split(',').map((x) => x.trim()).filter(Boolean)
  return arr.length ? arr : null
}

// Transform a DB skill row into a clean API response object
function serializeSkill(s: any) {
  return {
    id: s.id,
    skillId: s.skillId,
    groupId: s.groupId,
    name: s.name,
    krName: s.krName,
    className: s.className,
    classId: s.classId,
    iconUrl: iconUrl(s.iconPath),
    iconPath: s.iconPath,
    requiredLevel: s.requiredLevel,
    maxLevel: s.maxLevel,
    skillPoints: s.skillPoints,
    command: s.command,
    cooldown: s.cooldown,
    cooldownSec: s.cooldownSec,
    description: s.description,
    damageRows: s.damageRowsJson ? JSON.parse(s.damageRowsJson) : null,
    ccTypes: splitCsv(s.ccTypes),
    protectionTypes: splitCsv(s.protectionTypes),
    pvpDamagePercent: s.pvpDamagePercent,
    isQuickSlot: s.isQuickSlot,
    isAbsolute: s.isAbsolute,
    isAwakening: s.isAwakening,
    isSuccession: s.isSuccession,
    isBlackSpirit: s.isBlackSpirit,
    isPassive: s.isPassive,
    prerequisiteIds: s.prerequisiteIds
      ? s.prerequisiteIds.split(',').map((x: string) => parseInt(x, 10)).filter((x: number) => x > 0)
      : [],
    videoUrl: s.videoUrl,
    animationDurationMs: s.animationDurationMs,
    syncedAt: s.syncedAt,
    bdocodexUrl: `https://bdocodex.com/us/skill/${s.skillId}/`,
  }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams

  // --- Pagination ---
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(sp.get('pageSize') || '24', 10)))

  // --- Filters ---
  const q = sp.get('q')?.trim() || ''
  const classId = sp.get('class') // class id or "all"
  const className = sp.get('className')
  const skillType = sp.get('type') // main | awakening | succession | absolute | blackspirit | passive | all
  const protection = sp.get('protection') // Super Armor | Forward Guard | I-Frame | none
  const cc = sp.get('cc') // Knockback,Knockdown,...
  const minLvl = sp.get('minLvl')
  const maxLvl = sp.get('maxLvl')
  const minCd = sp.get('minCd')
  const maxCd = sp.get('maxCd')
  const minAnim = sp.get('minAnim')
  const maxAnim = sp.get('maxAnim')
  const hasVideo = sp.get('hasVideo') // "true" | "false" | null
  const hasAnim = sp.get('hasAnim')
  const quickslot = sp.get('quickslot')
  const hasAddon = sp.get('hasAddon')

  // --- Sort ---
  const sort = sp.get('sort') || 'skillId' // skillId | name | level | cooldown | anim | class
  const order = (sp.get('order') || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc'

  // --- Build Prisma where ---
  const where: Prisma.SkillWhereInput = {}
  const AND: Prisma.SkillWhereInput[] = []

  if (q) {
    const asNum = parseInt(q, 10)
    if (!Number.isNaN(asNum) && /^\d+$/.test(q)) {
      AND.push({
        OR: [
          { skillId: asNum },
          { name: { contains: q } },
          { krName: { contains: q } },
        ],
      })
    } else {
      AND.push({
        OR: [
          { name: { contains: q } },
          { krName: { contains: q } },
          { description: { contains: q } },
          { command: { contains: q } },
        ],
      })
    }
  }

  if (classId && classId !== 'all') {
    const cid = parseInt(classId, 10)
    if (!Number.isNaN(cid)) AND.push({ classId: cid })
  } else if (className && className !== 'all') {
    AND.push({ className })
  }

  if (skillType && skillType !== 'all') {
    if (skillType === 'main') {
      AND.push({
        isAbsolute: false,
        isAwakening: false,
        isSuccession: false,
        isBlackSpirit: false,
        isPassive: false,
      })
    } else if (skillType === 'awakening') AND.push({ isAwakening: true })
    else if (skillType === 'succession') AND.push({ isSuccession: true })
    else if (skillType === 'absolute') AND.push({ isAbsolute: true })
    else if (skillType === 'blackspirit') AND.push({ isBlackSpirit: true })
    else if (skillType === 'passive') AND.push({ isPassive: true })
  }

  if (protection) {
    if (protection === 'none') {
      AND.push({
        OR: [{ protectionTypes: null }, { protectionTypes: '' }],
      })
    } else {
      AND.push({ protectionTypes: { contains: protection } })
    }
  }

  if (cc) {
    const ccs = cc.split(',').map((c) => c.trim()).filter(Boolean)
    if (ccs.length) {
      AND.push({
        OR: ccs.map((c) => ({ ccTypes: { contains: c } })),
      })
    }
  }

  if (minLvl) {
    const v = parseInt(minLvl, 10)
    if (!Number.isNaN(v)) AND.push({ requiredLevel: { gte: v } })
  }
  if (maxLvl) {
    const v = parseInt(maxLvl, 10)
    if (!Number.isNaN(v)) AND.push({ requiredLevel: { lte: v } })
  }

  if (minCd) {
    const v = parseFloat(minCd)
    if (!Number.isNaN(v)) AND.push({ cooldownSec: { gte: v } })
  }
  if (maxCd) {
    const v = parseFloat(maxCd)
    if (!Number.isNaN(v)) AND.push({ cooldownSec: { lte: v } })
  }

  if (minAnim) {
    const v = parseInt(minAnim, 10)
    if (!Number.isNaN(v)) AND.push({ animationDurationMs: { gte: v } })
  }
  if (maxAnim) {
    const v = parseInt(maxAnim, 10)
    if (!Number.isNaN(v)) AND.push({ animationDurationMs: { lte: v } })
  }

  if (hasVideo === 'true') AND.push({ videoUrl: { not: null } })
  else if (hasVideo === 'false') AND.push({ OR: [{ videoUrl: null }, { videoUrl: '' }] })

  if (hasAnim === 'true') AND.push({ animationDurationMs: { not: null } })
  else if (hasAnim === 'false') AND.push({ OR: [{ animationDurationMs: null }] })

  if (quickslot === 'true') AND.push({ isQuickSlot: true })
  else if (quickslot === 'false') AND.push({ isQuickSlot: false })

  if (hasAddon === 'true') AND.push({ addonsJson: { not: null } })

  if (AND.length) where.AND = AND

  const sortMap: Record<string, Prisma.SkillOrderByWithRelationInput> = {
    skillId: { skillId: order },
    name: { name: order },
    level: { requiredLevel: order },
    cooldown: { cooldownSec: order === 'asc' ? 'asc' : 'desc' },
    anim: { animationDurationMs: order === 'asc' ? 'asc' : 'desc' },
    class: { className: order },
    sp: { skillPoints: order },
  }
  const orderBy = sortMap[sort] || sortMap.skillId

  const [total, items] = await Promise.all([
    db.skill.count({ where }),
    db.skill.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return NextResponse.json({
    items: items.map(serializeSkill),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  })
}
