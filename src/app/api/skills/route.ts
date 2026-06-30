import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { calculateDamage, type DamageRow } from '@/lib/damage'
import { calculateCCCounters, getRealCCs, getNonCCEffects, formatCCCounters } from '@/lib/cc'

export const dynamic = 'force-dynamic'

// Type sort priority order — matches the SKILL_TYPE_META order: main, awakening,
// succession, absolute, blackspirit, passive. Implemented as a multi-flag
// Prisma orderBy so it works server-side without computed columns.
function typeOrderBy(order: 'asc' | 'desc'): Prisma.SkillOrderByWithRelationInput[] {
  return [
    { isPassive: order },
    { isBlackSpirit: order },
    { isAbsolute: order },
    { isSuccession: order },
    { isAwakening: order },
  ]
}

// Resolve a skill iconPath to a self-hosted URL under /icons/skills/.
// All DB iconPaths look like `items/new_icon/04_pc_skill/01_pc_skill/28_pmyf_skill/pmyf_skill_7714.webp`
// — we save each unique icon to `public/icons/skills/{basename}.webp` (one file per
// unique icon, shared across skill IDs/ranks that use the same art). Self-hosting
// avoids bdocodex's bot-challenge page being served to end-user browsers when
// their IP is rate-limited. If the local file is missing, the browser gets a 404
// and the UI already falls back to a placeholder via <img onError>.
function iconUrl(iconPath: string | null, _skillId?: number): string | null {
  if (!iconPath) return null
  if (iconPath.startsWith('http')) {
    // Already absolute (rare) — return as-is.
    return iconPath
  }
  const basename = iconPath.split('/').pop()?.replace(/\.\w+$/, '')
  if (basename) {
    return `/icons/skills/${basename}.webp`
  }
  return null
}

function splitCsv(s: string | null): string[] | null {
  if (!s) return null
  const arr = s.split(',').map((x) => x.trim()).filter(Boolean)
  return arr.length ? arr : null
}

// Extended rank map — includes high roman numerals used by passive skills (up to XXX)
const RANK_MAP: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10,
  XI: 11, XII: 12, XIII: 13, XIV: 14, XV: 15, XVI: 16, XVII: 17, XVIII: 18,
  XIX: 19, XX: 20, XXI: 21, XXII: 22, XXIII: 23, XXIV: 24, XXV: 25,
  XXVI: 26, XXVII: 27, XXVIII: 28, XXIX: 29, XXX: 30,
}
// Regex ordered longest-first to ensure correct matching (XXX before XX before X)
const RANK_SUFFIX = /\s+(XXX|XXIX|XXVIII|XXVII|XXVI|XXV|XXIV|XXIII|XXII|XXI|XX|XIX|XVIII|XVII|XVI|XV|XIV|XIII|XII|XI|IX|VIII|VII|VI|IV|V|III|II|I)$/

function getBaseName(name: string): string {
  return name.replace(RANK_SUFFIX, '')
}

function getRank(name: string): number {
  const m = name.match(RANK_SUFFIX)
  return m ? (RANK_MAP[m[1]] || 0) : 0
}

function serializeSkill(s: any) {
  const damageRows: DamageRow[] | null = s.damageRowsJson ? JSON.parse(s.damageRowsJson) : null
  const damage = calculateDamage(damageRows, s.pvpDamagePercent)
  const ccTypes = splitCsv(s.ccTypes)

  // Determine which CCs are PvE-only by checking damage rows
  const pveOnlyCCs = new Set<string>()
  if (damageRows) {
    for (const r of damageRows) {
      if (r.kind === 'cc' && r.pveOnly && r.label) {
        pveOnlyCCs.add(r.label)
      }
    }
  }

  // Separate PvP CCs (count toward counter) from PvE-only CCs (don't count)
  const pvpCCs = (ccTypes || []).filter((cc) => !pveOnlyCCs.has(cc))
  const pveCCs = (ccTypes || []).filter((cc) => pveOnlyCCs.has(cc))

  const realCCs = getRealCCs(pvpCCs)
  const nonCCEffects = getNonCCEffects(pvpCCs)
  const ccCounters = calculateCCCounters(pvpCCs)
  const ccCounterDisplay = formatCCCounters(pvpCCs)

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
    damageRows,
    damage,
    ccTypes,
    ccCounters,
    ccCounterDisplay,
    realCCs,
    nonCCEffects,
    pveOnlyCCs: Array.from(pveOnlyCCs),
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
  // Multi-select: comma-separated values
  const classParam = sp.get('class') // "0,1,2" or "all"
  const typeParam = sp.get('type') // "succession,absolute" or "all"
  const protectionParam = sp.get('protection') // "Super Armor,Forward Guard" or "none" or "all"
  const cc = sp.get('cc')
  const minLvl = sp.get('minLvl')
  const maxLvl = sp.get('maxLvl')
  const minCd = sp.get('minCd')
  const maxCd = sp.get('maxCd')
  const minAnim = sp.get('minAnim')
  const maxAnim = sp.get('maxAnim')
  const minSp = sp.get('minSp')
  const maxSp = sp.get('maxSp')
  const minDamage = sp.get('minDamage')
  const maxDamage = sp.get('maxDamage')
  const hasVideo = sp.get('hasVideo')
  const hasAnim = sp.get('hasAnim')
  const quickslot = sp.get('quickslot')
  const hasAddon = sp.get('hasAddon')
  const hasPrereqs = sp.get('hasPrereqs')
  const maxRank = sp.get('maxRank') !== 'false'
  const filterEvasion = sp.get('filterEvasion') !== 'false'
  // Multi-spec: comma-separated "succession,awakening,ascension"
  const specsParam = sp.get('specs')
  const specs: ('succession' | 'awakening' | 'ascension')[] = specsParam
    ? (specsParam.split(',').map((s) => s.trim()).filter((s) => s === 'succession' || s === 'awakening' || s === 'ascension') as ('succession' | 'awakening' | 'ascension')[])
    : []
  // Legacy single-spec param
  const legacySpec = sp.get('spec') as 'succession' | 'awakening' | 'ascension' | null
  if (legacySpec && !specs.length) specs.push(legacySpec)

  const sort = sp.get('sort') || 'skillId'
  const order = (sp.get('order') || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc'

  // --- Build Prisma where ---
  const where: Prisma.SkillWhereInput = {}
  const AND: Prisma.SkillWhereInput[] = []

  // Exclude NEW_CLASS placeholders always
  AND.push({ className: { not: { startsWith: 'NEW_CLASS' } } })

  // Exclude "(Not in use)" skills — leftovers from old patches
  AND.push({ name: { not: { contains: '(Not in use)' } } })
  AND.push({ name: { not: { contains: '(Not in Use)' } } })

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

  // Multi-select class filter
  // When filtering by classId, also exclude multi-class skills that don't belong
  // to the selected class (some shared skills have classId set to one class but
  // className lists a different class, e.g. Kunoichi/Ninja skills with classId=10/Corsair)
  if (classParam && classParam !== 'all') {
    const classIds = classParam.split(',').map((c) => parseInt(c.trim(), 10)).filter((c) => !Number.isNaN(c))
    if (classIds.length === 1) {
      // Single class: filter by classId AND exclude skills whose className
      // contains a comma (multi-class) unless the class name matches
      const cls = await db.bdoClass.findFirst({ where: { id: classIds[0] } })
      if (cls) {
        AND.push({
          AND: [
            { classId: classIds[0] },
            {
              OR: [
                { className: cls.name },           // Exact match (most skills)
                { className: { contains: cls.name } }, // Multi-class skill that includes this class
              ],
            },
          ],
        })
      } else {
        AND.push({ classId: classIds[0] })
      }
    } else if (classIds.length > 1) {
      AND.push({ classId: { in: classIds } })
    }
  }

  // Multi-select skill type filter
  if (typeParam && typeParam !== 'all') {
    const types = typeParam.split(',').map((t) => t.trim()).filter(Boolean)
    if (types.length > 0) {
      const typeConditions: Prisma.SkillWhereInput[] = []
      for (const t of types) {
        if (t === 'main') {
          typeConditions.push({
            isAbsolute: false, isAwakening: false, isSuccession: false,
            isBlackSpirit: false, isPassive: false,
          })
        } else if (t === 'awakening') typeConditions.push({ isAwakening: true })
        else if (t === 'succession') typeConditions.push({ isSuccession: true })
        else if (t === 'absolute') typeConditions.push({ isAbsolute: true })
        else if (t === 'blackspirit') typeConditions.push({ isBlackSpirit: true })
        else if (t === 'passive') typeConditions.push({ isPassive: true })
      }
      if (typeConditions.length === 1) {
        AND.push(typeConditions[0])
      } else {
        AND.push({ OR: typeConditions })
      }
    }
  }

  // Spec filter — supports multi-spec (succession + awakening together).
  // In BDO, at level 56 a character chooses Awakening (awakened weapon) or
  // Succession (enhanced main weapon). Each spec has access to different skills:
  //
  // Succession spec: Prime:/Succession: skills + Main (no dup) + Absolute (no dup) + BS + Passive. No Awakening.
  // Awakening spec: Awakening skills + Main (no dup) + Absolute (no dup) + BS + Passive. No Succession.
  // Both specs: All skills (Succession + Awakening + Main + Absolute + BS + Passive), deduped.
  //
  // The spec-aware deduplication happens post-query in the max-rank path.
  const hasSuccessionSpec = specs.includes('succession')
  const hasAwakeningSpec = specs.includes('awakening')
  const hasAscensionSpec = specs.includes('ascension')

  if (hasSuccessionSpec && !hasAwakeningSpec && !hasAscensionSpec) {
    // Succession only: exclude awakening and ascension skills
    AND.push({ isAwakening: false })
  } else if (hasAwakeningSpec && !hasSuccessionSpec && !hasAscensionSpec) {
    // Awakening only: exclude succession skills
    AND.push({ isSuccession: false })
  }
  // Ascension only or any combo: no DB-level exclusion (handled in dedup)
  // If both/all specs or neither, no type exclusion at DB level

  // Multi-select protection filter
  if (protectionParam && protectionParam !== 'all') {
    if (protectionParam === 'none') {
      AND.push({ OR: [{ protectionTypes: null }, { protectionTypes: '' }] })
    } else {
      const prots = protectionParam.split(',').map((p) => p.trim()).filter(Boolean)
      if (prots.length > 0) {
        AND.push({ OR: prots.map((p) => ({ protectionTypes: { contains: p } })) })
      }
    }
  }

  // CC filter (multi-select). Special value "__pvp_only__" filters for skills
  // that have at least one PvP CC (ccCounters > 0, excluding PvE-only CCs).
  const pvpOnlyFilter = cc?.includes('__pvp_only__')
  const ccFilterValues = cc
    ? cc.split(',').map((c) => c.trim()).filter(Boolean).filter((c) => c !== '__pvp_only__')
    : []

  if (pvpOnlyFilter) {
    // Must have at least some CC types (rough DB filter; precise PvE-only
    // filtering happens post-query in the max-rank path)
    AND.push({ ccTypes: { not: null } })
    AND.push({ ccTypes: { not: '' } })
  }

  if (ccFilterValues.length) {
    AND.push({ OR: ccFilterValues.map((c) => ({ ccTypes: { contains: c } })) })
  }

  // Numeric ranges
  if (minLvl) { const v = parseInt(minLvl, 10); if (!Number.isNaN(v)) AND.push({ requiredLevel: { gte: v } }) }
  if (maxLvl) { const v = parseInt(maxLvl, 10); if (!Number.isNaN(v)) AND.push({ requiredLevel: { lte: v } }) }
  if (minCd) { const v = parseFloat(minCd); if (!Number.isNaN(v)) AND.push({ cooldownSec: { gte: v } }) }
  if (maxCd) { const v = parseFloat(maxCd); if (!Number.isNaN(v)) AND.push({ cooldownSec: { lte: v } }) }
  if (minAnim) { const v = parseInt(minAnim, 10); if (!Number.isNaN(v)) AND.push({ animationDurationMs: { gte: v } }) }
  if (maxAnim) { const v = parseInt(maxAnim, 10); if (!Number.isNaN(v)) AND.push({ animationDurationMs: { lte: v } }) }
  if (minSp) { const v = parseInt(minSp, 10); if (!Number.isNaN(v)) AND.push({ skillPoints: { gte: v } }) }
  if (maxSp) { const v = parseInt(maxSp, 10); if (!Number.isNaN(v)) AND.push({ skillPoints: { lte: v } }) }

  // Has filters
  if (hasVideo === 'true') AND.push({ videoUrl: { not: null } })
  else if (hasVideo === 'false') AND.push({ OR: [{ videoUrl: null }, { videoUrl: '' }] })
  if (hasAnim === 'true') AND.push({ animationDurationMs: { not: null } })
  else if (hasAnim === 'false') AND.push({ animationDurationMs: null })
  if (quickslot === 'true') AND.push({ isQuickSlot: true })
  else if (quickslot === 'false') AND.push({ isQuickSlot: false })
  if (hasAddon === 'true') AND.push({ addonsJson: { not: null } })
  if (hasPrereqs === 'true') AND.push({ prerequisiteIds: { not: null } })
  else if (hasPrereqs === 'false') AND.push({ OR: [{ prerequisiteIds: null }, { prerequisiteIds: '' }] })

  if (AND.length) where.AND = AND

  const sortMap: Record<string, Prisma.SkillOrderByWithRelationInput | Prisma.SkillOrderByWithRelationInput[]> = {
    skillId: { skillId: order },
    name: { name: order },
    level: { requiredLevel: order },
    cooldown: { cooldownSec: order === 'asc' ? 'asc' : 'desc' },
    anim: { animationDurationMs: order === 'asc' ? 'asc' : 'desc' },
    class: { className: order },
    sp: { skillPoints: order },
    // 'damage', 'pvpDamage', 'ccCounters' are computed — handled specially below.
    damage: { skillId: order },
    pvpDamage: { skillId: order },
    ccCounters: { skillId: order },
    // 'type' uses a multi-flag orderBy for a stable type-priority sort.
    type: typeOrderBy(order),
  }
  const orderBy = sortMap[sort] || sortMap.skillId

  // --- Max-rank filtering ---
  if (maxRank) {
    // Include all sort-relevant fields up-front so we can sort filteredIds
    // directly (the page slice + items.sort pattern below only stable-sorts
    // by idOrder, so the orderBy on the inner query would otherwise be lost).
    const allMatching = await db.skill.findMany({
      where,
      select: {
        skillId: true,
        name: true,
        requiredLevel: true,
        className: true,
        cooldownSec: true,
        animationDurationMs: true,
        isPassive: true,
        isBlackSpirit: true,
        isAbsolute: true,
        isSuccession: true,
        isAwakening: true,
      },
      orderBy: { requiredLevel: 'asc' },
    })

    const baseNameMap = new Map<string, { skillId: number; rank: number; level: number }>()
    for (const s of allMatching) {
      const baseName = getBaseName(s.name)
      const rank = getRank(s.name)
      const existing = baseNameMap.get(baseName)
      if (!existing) {
        baseNameMap.set(baseName, { skillId: s.skillId, rank, level: s.requiredLevel })
      } else {
        if (rank > existing.rank || (rank === existing.rank && s.requiredLevel > existing.level)) {
          baseNameMap.set(baseName, { skillId: s.skillId, rank, level: s.requiredLevel })
        }
      }
    }

    const maxRankSkillIds = Array.from(baseNameMap.values()).map((v) => v.skillId)

    // Build a skillId → row map for sorting (avoids re-querying).
    const rowById = new Map<number, (typeof allMatching)[number]>()
    for (const s of allMatching) rowById.set(s.skillId, s)

    // --- Spec-aware deduplication ---
    // For succession spec: if a Prime:/Succession: version exists, exclude
    //   Main/Absolute versions with the same base name.
    // For awakening spec: if an Absolute: version exists, exclude the Main
    //   version with the same base name.
    // For both specs: apply BOTH dedup rules independently.
    // NOTE: "Black Spirit: " prefix is KEPT — BS skills are separate from regular skills.
    let specFilteredIds = maxRankSkillIds
    if (hasSuccessionSpec || hasAwakeningSpec) {
      // Build spec base name map
      const specMap = new Map<string, { skillIds: number[]; hasSuccession: boolean; hasAbsolute: boolean; hasAwakening: boolean; isBlackSpirit: boolean; isPassive: boolean }>()
      for (const id of maxRankSkillIds) {
        const s = rowById.get(id)
        if (!s) continue
        let specBase = s.name
        const isSucc = s.isSuccession || s.name.includes('Prime: ') || s.name.startsWith('Succession:')
        const isAbs = s.isAbsolute || s.name.includes('Absolute: ')
        const isAwk = s.isAwakening
        // Strip ONLY the spec prefix (Prime/Succession/Absolute), keep "Black Spirit: "
        if (isSucc) specBase = s.name.replace(/(Prime:|Succession:)\s+/, '')
        else if (isAbs) specBase = s.name.replace(/Absolute:\s+/, '')
        specBase = getBaseName(specBase)
        const existing = specMap.get(specBase) || { skillIds: [], hasSuccession: false, hasAbsolute: false, hasAwakening: false, isBlackSpirit: false, isPassive: false }
        existing.skillIds.push(id)
        if (isSucc) existing.hasSuccession = true
        if (isAbs) existing.hasAbsolute = true
        if (isAwk) existing.hasAwakening = true
        if (s.isBlackSpirit) existing.isBlackSpirit = true
        if (s.isPassive) existing.isPassive = true
        specMap.set(specBase, existing)
      }

      specFilteredIds = []
      for (const [, info] of specMap) {
        if (hasSuccessionSpec && info.hasSuccession) {
          // Succession spec: show Prime:/Succession: version only (exclude main/absolute)
          for (const id of info.skillIds) {
            const s = rowById.get(id)
            if (s && (s.isSuccession || s.name.includes('Prime: ') || s.name.startsWith('Succession:'))) {
              specFilteredIds.push(id)
            }
          }
          // If also awakening spec, show awakening version too
          if (hasAwakeningSpec && info.hasAwakening) {
            for (const id of info.skillIds) {
              const s = rowById.get(id)
              if (s && s.isAwakening) specFilteredIds.push(id)
            }
          }
        } else if (hasAwakeningSpec && info.hasAbsolute) {
          // Awakening spec (no succession): show Absolute, exclude Main
          for (const id of info.skillIds) {
            const s = rowById.get(id)
            if (s && (s.isAbsolute || s.name.includes('Absolute: '))) {
              specFilteredIds.push(id)
            }
          }
          // Also show awakening version if it exists
          if (info.hasAwakening) {
            for (const id of info.skillIds) {
              const s = rowById.get(id)
              if (s && s.isAwakening) specFilteredIds.push(id)
            }
          }
        } else if (hasSuccessionSpec && info.hasAbsolute && !info.hasAwakening) {
          // Succession spec, no Prime version but has Absolute: show Absolute, exclude Main
          for (const id of info.skillIds) {
            const s = rowById.get(id)
            if (s && (s.isAbsolute || s.name.includes('Absolute: '))) {
              specFilteredIds.push(id)
            }
          }
        } else {
          // No spec override for this skill — include all versions
          specFilteredIds.push(...info.skillIds)
        }
      }
    }

    // Apply damage range filter post-query (since damage is computed, not stored).
    // Also pre-compute PvP damage and CC counters when sorting by those columns.
    let filteredIds = specFilteredIds
    const needsDmg = !!minDamage || !!maxDamage || sort === 'damage' || sort === 'pvpDamage'
    const needsCC = sort === 'ccCounters' || pvpOnlyFilter
    let dmgPvEMap: Map<number, number> | null = null
    let dmgPvPMap: Map<number, number> | null = null
    let ccMap: Map<number, number> | null = null
    if (needsDmg || needsCC) {
      const skills = await db.skill.findMany({
        where: { skillId: { in: maxRankSkillIds } },
        select: {
          skillId: true,
          damageRowsJson: true,
          pvpDamagePercent: true,
          ccTypes: true,
        },
      })
      dmgPvEMap = new Map<number, number>()
      dmgPvPMap = new Map<number, number>()
      ccMap = new Map<number, number>()
      for (const s of skills) {
        const rows = s.damageRowsJson ? JSON.parse(s.damageRowsJson) : null
        const dmg = calculateDamage(rows, s.pvpDamagePercent)
        dmgPvEMap.set(s.skillId, dmg.totalPvE)
        dmgPvPMap.set(s.skillId, dmg.totalPvP ?? 0)

        // Exclude PvE-only CCs from the counter calculation
        const pveOnlySet = new Set<string>()
        if (rows) {
          for (const r of rows) {
            if (r.kind === 'cc' && r.pveOnly && r.label) {
              pveOnlySet.add(r.label)
            }
          }
        }
        const ccArr = s.ccTypes
          ? s.ccTypes.split(',').map((x) => x.trim()).filter(Boolean).filter((cc) => !pveOnlySet.has(cc))
          : null
        ccMap.set(s.skillId, calculateCCCounters(ccArr))
      }

      // Filter by PvP CC only (ccCounters > 0 after excluding PvE-only)
      if (pvpOnlyFilter) {
        filteredIds = filteredIds.filter((id) => (ccMap!.get(id) ?? 0) > 0)
      }

      // Filter by damage range (PvE)
      if (minDamage || maxDamage) {
        const min = minDamage ? parseFloat(minDamage) : 0
        const max = maxDamage ? parseFloat(maxDamage) : Infinity
        filteredIds = filteredIds.filter((id) => {
          const v = dmgPvEMap!.get(id) ?? 0
          return v >= min && v <= max
        })
      }
    }

    // Sort filteredIds by the requested sort column. We sort in-place so the
    // page slice + items.sort(by idOrder) below preserves the sort.
    const dir = order === 'asc' ? 1 : -1
    // Nulls always sort last, regardless of asc/desc. This matches user
    // expectations (e.g. clicking "CD desc" shows highest CDs first, not a
    // wall of null cooldowns).
    function cmpNull(a: any, b: any): number {
      if (a == null && b == null) return 0
      if (a == null) return 1
      if (b == null) return -1
      return 0
    }
    if (sort === 'damage') {
      filteredIds = [...filteredIds].sort((a, b) => {
        const da = dmgPvEMap!.get(a) ?? 0
        const db_ = dmgPvEMap!.get(b) ?? 0
        return dir * (da - db_)
      })
    } else if (sort === 'pvpDamage') {
      filteredIds = [...filteredIds].sort((a, b) => {
        const da = dmgPvPMap!.get(a) ?? 0
        const db_ = dmgPvPMap!.get(b) ?? 0
        return dir * (da - db_)
      })
    } else if (sort === 'ccCounters') {
      filteredIds = [...filteredIds].sort((a, b) => {
        const ca = ccMap!.get(a) ?? 0
        const cb_ = ccMap!.get(b) ?? 0
        return dir * (ca - cb_)
      })
    } else if (sort === 'name') {
      filteredIds = [...filteredIds].sort((a, b) => {
        const ra = rowById.get(a)!
        const rb = rowById.get(b)!
        return dir * ra.name.localeCompare(rb.name)
      })
    } else if (sort === 'level') {
      filteredIds = [...filteredIds].sort((a, b) => {
        const ra = rowById.get(a)!
        const rb = rowById.get(b)!
        return dir * ((ra.requiredLevel ?? 0) - (rb.requiredLevel ?? 0))
      })
    } else if (sort === 'cooldown') {
      filteredIds = [...filteredIds].sort((a, b) => {
        const ra = rowById.get(a)!
        const rb = rowById.get(b)!
        const c = cmpNull(ra.cooldownSec, rb.cooldownSec)
        if (c !== 0) return c
        return dir * ((ra.cooldownSec ?? 0) - (rb.cooldownSec ?? 0))
      })
    } else if (sort === 'anim') {
      filteredIds = [...filteredIds].sort((a, b) => {
        const ra = rowById.get(a)!
        const rb = rowById.get(b)!
        const c = cmpNull(ra.animationDurationMs, rb.animationDurationMs)
        if (c !== 0) return c
        return dir * ((ra.animationDurationMs ?? 0) - (rb.animationDurationMs ?? 0))
      })
    } else if (sort === 'class') {
      filteredIds = [...filteredIds].sort((a, b) => {
        const ra = rowById.get(a)!
        const rb = rowById.get(b)!
        const ca = ra.className ?? ''
        const cb = rb.className ?? ''
        const c = cmpNull(ra.className, rb.className)
        if (c !== 0) return c
        return dir * ca.localeCompare(cb)
      })
    } else if (sort === 'type') {
      // Type priority: main, awakening, succession, absolute, blackspirit, passive
      const typePriority = (s: (typeof allMatching)[number]): number => {
        if (s.isPassive) return 5
        if (s.isBlackSpirit) return 4
        if (s.isAbsolute) return 3
        if (s.isSuccession) return 2
        if (s.isAwakening) return 1
        return 0
      }
      filteredIds = [...filteredIds].sort((a, b) => {
        const ra = rowById.get(a)!
        const rb = rowById.get(b)!
        return dir * (typePriority(ra) - typePriority(rb))
      })
    }

    const total = filteredIds.length
    const pageIds = filteredIds.slice((page - 1) * pageSize, page * pageSize)

    const items = await db.skill.findMany({
      where: { skillId: { in: pageIds } },
      orderBy,
    })

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

  // Non-maxRank path
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
