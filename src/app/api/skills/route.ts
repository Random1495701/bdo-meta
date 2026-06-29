import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

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

const RANK_MAP: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10,
  XI: 11, XII: 12, XIII: 13, XIV: 14, XV: 15, XVI: 16, XVII: 17, XVIII: 18,
}
const RANK_SUFFIX = /\s+(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII)$/

function getBaseName(name: string): string {
  return name.replace(RANK_SUFFIX, '')
}

function getRank(name: string): number {
  const m = name.match(RANK_SUFFIX)
  return m ? (RANK_MAP[m[1]] || 0) : 0
}

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

  const page = Math.max(1, parseInt(sp.get('page') || '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(sp.get('pageSize') || '24', 10)))

  const q = sp.get('q')?.trim() || ''
  const classId = sp.get('class') // class id or "all"
  const skillType = sp.get('type')
  const protection = sp.get('protection')
  const cc = sp.get('cc')
  const minLvl = sp.get('minLvl')
  const maxLvl = sp.get('maxLvl')
  const minCd = sp.get('minCd')
  const maxCd = sp.get('maxCd')
  const minAnim = sp.get('minAnim')
  const maxAnim = sp.get('maxAnim')
  const hasVideo = sp.get('hasVideo')
  const hasAnim = sp.get('hasAnim')
  const quickslot = sp.get('quickslot')
  const hasAddon = sp.get('hasAddon')
  // NEW: maxRank filter (default true — only show highest rank per skill)
  const maxRank = sp.get('maxRank') !== 'false'
  // NEW: filter out evasion skills (default true)
  const filterEvasion = sp.get('filterEvasion') !== 'false'

  const sort = sp.get('sort') || 'skillId'
  const order = (sp.get('order') || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc'

  // --- Build Prisma where ---
  const where: Prisma.SkillWhereInput = {}
  const AND: Prisma.SkillWhereInput[] = []

  // Exclude NEW_CLASS placeholders always
  AND.push({
    className: { not: { startsWith: 'NEW_CLASS' } },
  })

  // Filter out evasion skills by default
  if (filterEvasion) {
    AND.push({
      AND: [
        { name: { not: { contains: 'Evasion' } } },
        { name: { not: { contains: 'Evasive' } } },
      ],
    })
  }

  // Search
  if (q) {
    const asNum = parseInt(q, 10)
    if (!Number.isNaN(asNum) && /^\d+$/.test(q)) {
      AND.push({
        OR: [{ skillId: asNum }, { name: { contains: q } }, { krName: { contains: q } }],
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

  // Class filter — FIXED: handle classId=0 (Warrior) properly
  if (classId !== null && classId !== undefined && classId !== 'all' && classId !== '') {
    const cid = parseInt(classId, 10)
    if (!Number.isNaN(cid)) {
      // Match by classId OR by className containing the class name (for multi-class skills)
      AND.push({ classId: cid })
    }
  }

  // Skill type filter
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
      AND.push({ OR: [{ protectionTypes: null }, { protectionTypes: '' }] })
    } else {
      AND.push({ protectionTypes: { contains: protection } })
    }
  }

  if (cc) {
    const ccs = cc.split(',').map((c) => c.trim()).filter(Boolean)
    if (ccs.length) {
      AND.push({ OR: ccs.map((c) => ({ ccTypes: { contains: c } })) })
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
  else if (hasAnim === 'false') AND.push({ animationDurationMs: null })
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

  // --- Max-rank filtering ---
  // If maxRank is enabled, we need to:
  // 1. Fetch ALL matching skills (not just the page)
  // 2. Group by base name
  // 3. Keep only the highest rank per group
  // 4. Then paginate the result
  //
  // For performance, we only fetch the fields we need for grouping + the page.
  
  if (maxRank) {
    // Fetch all matching skill IDs + names + levels for grouping
    const allMatching = await db.skill.findMany({
      where,
      select: { skillId: true, name: true, requiredLevel: true },
      orderBy: { requiredLevel: 'asc' },
    })

    // Group by base name, keep highest rank
    const baseNameMap = new Map<string, { skillId: number; rank: number; level: number }>()
    for (const s of allMatching) {
      const baseName = getBaseName(s.name)
      const rank = getRank(s.name)
      const existing = baseNameMap.get(baseName)
      if (!existing) {
        baseNameMap.set(baseName, { skillId: s.skillId, rank, level: s.requiredLevel })
      } else {
        // Keep the one with the higher rank, or higher level if same rank
        if (rank > existing.rank || (rank === existing.rank && s.requiredLevel > existing.level)) {
          baseNameMap.set(baseName, { skillId: s.skillId, rank, level: s.requiredLevel })
        }
      }
    }

    const maxRankSkillIds = Array.from(baseNameMap.values()).map((v) => v.skillId)
    const total = maxRankSkillIds.length

    // Now fetch the full skill data for just the page's skill IDs
    // We need to sort and paginate the max-rank skills
    // Re-fetch with the ID filter and proper sorting
    const pageIds = maxRankSkillIds
      .sort((a, b) => {
        // Apply sort
        if (sort === 'name') return order === 'asc' ? a - b : b - a // fallback
        return order === 'asc' ? a - b : b - a
      })
      .slice((page - 1) * pageSize, page * pageSize)

    const items = await db.skill.findMany({
      where: { skillId: { in: pageIds } },
      orderBy,
    })

    // Sort items to match pageIds order (since findMany with `in` may not preserve order)
    const idOrder = new Map(pageIds.map((id, i) => [id, i]))
    items.sort((a, b) => (idOrder.get(a.skillId) || 0) - (idOrder.get(b.skillId) || 0))

    return NextResponse.json({
      items: items.map(serializeSkill),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      maxRankApplied: true,
      evasionFiltered: filterEvasion,
    })
  }

  // Non-maxRank path (original behavior)
  const [total, items] = await Promise.all([
    db.skill.count({ where }),
    db.skill.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
  ])

  return NextResponse.json({
    items: items.map(serializeSkill),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    maxRankApplied: false,
    evasionFiltered: filterEvasion,
  })
}
