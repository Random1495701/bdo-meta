import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { calculateDamage, type DamageRow } from '@/lib/damage'
import { calculateCCCounters, getRealCCs, getNonCCEffects, formatCCCounters } from '@/lib/cc'
import { dedupSkillsBySpec } from '@/lib/spec-dedup'

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

function serializeSkill(s: any, includeDamageRows = true) {
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
    damageRows: includeDamageRows ? damageRows : undefined,
    damage,
    damagePerCooldown: (damage.totalPvE > 0 && s.cooldownSec && s.cooldownSec > 0)
      ? Math.round(damage.totalPvE / s.cooldownSec)
      : null,
    damagePerCooldownPvP: (damage.totalPvP != null && damage.totalPvP > 0 && s.cooldownSec && s.cooldownSec > 0)
      ? Math.round(damage.totalPvP / s.cooldownSec)
      : null,
    damagePerSecond: (damage.totalPvE > 0 && s.animationDurationMs && s.animationDurationMs > 0)
      ? Math.round(damage.totalPvE / (s.animationDurationMs / 1000))
      : null,
    damagePerSecondPvP: (damage.totalPvP != null && damage.totalPvP > 0 && s.animationDurationMs && s.animationDurationMs > 0)
      ? Math.round(damage.totalPvP / (s.animationDurationMs / 1000))
      : null,
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
    isFlow: s.isFlow,
    isCore: s.isCore,
    isMaxRank: s.isMaxRank,
    baseName: s.baseName,
    prerequisiteIds: s.prerequisiteIds
      ? s.prerequisiteIds.split(',').map((x: string) => parseInt(x, 10)).filter((x: number) => x > 0)
      : [],
    videoUrl: s.videoUrl,
    animationDurationMs: s.animationDurationMs,
    staminaCost: (() => {
      if (!damageRows) return null
      for (const r of damageRows) {
        if (r.label && r.label.toLowerCase().includes('stamina')) {
          const match = r.label.match(/(?:Consumes?|Consume)\s+(\d+)\s+Stamina/i)
          if (match) return parseInt(match[1], 10)
        }
      }
      return null
    })(),
    patchChange: null,
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
  const excludeClassParam = sp.get('excludeClass') // "3,5" — exclude these classes
  const typeParam = sp.get('type') // "succession,absolute" or "all"
  const excludeTypeParam = sp.get('excludeType')
  const protectionParam = sp.get('protection') // "Super Armor,Forward Guard" or "none" or "all"
  const excludeProtectionParam = sp.get('excludeProtection')
  const cc = sp.get('cc')
  const excludeCc = sp.get('excludeCc')
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
  const hasPrereqs = sp.get('hasPrereqs')
  const hasPatchChange = sp.get('hasPatchChange')
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
      // Smart effect search: check if query matches known CC/protection keywords
      // e.g. "super armor knockdown" → skills with Super Armor AND Knockdown
      const qLower = q.toLowerCase()
      const EFFECT_KEYWORDS: Record<string, string[]> = {
        'super armor': ['Super Armor'],
        'superarmor': ['Super Armor'],
        'sa': ['Super Armor'],
        'forward guard': ['Forward Guard'],
        'forwardguard': ['Forward Guard'],
        'fg': ['Forward Guard'],
        'iframe': ['I-Frame', 'Invincible'],
        'i-frame': ['I-Frame', 'Invincible'],
        'if': ['I-Frame', 'Invincible'],
        'invincible': ['Invincible'],
        'stun': ['Stun'],
        'knockdown': ['Knockdown'],
        'kd': ['Knockdown'],
        'knockback': ['Knockback'],
        'kb': ['Knockback'],
        'float': ['Float'],
        'bound': ['Bound'],
        'grapple': ['Grapple'],
        'grab': ['Grapple'],
        'stiffness': ['Stiffness'],
        'stiff': ['Stiffness'],
        'freeze': ['Freeze'],
        'frostbite': ['Frostbite'],
        'chill': ['Chill'],
        'burn': ['Burn'],
        'poison': ['Poison'],
        'bleeding': ['Bleeding'],
        'shock': ['Shock'],
        'blind': ['Blind'],
        'down smash': ['Down Smash'],
        'air smash': ['Air Smash'],
        'smash': ['Down Smash', 'Air Smash', 'Smash'],
        'push': ['Push the target'],
        'pull': ['Pull the target'],
        'spin': ['Spin the target'],
      }

      // Check if query contains any effect keywords
      // Sort keywords by length (longest first) so "super armor" matches before "sa"
      const sortedKeywords = Object.entries(EFFECT_KEYWORDS).sort((a, b) => b[0].length - a[0].length)
      const matchedEffects: { field: 'ccTypes' | 'protectionTypes'; value: string }[] = []
      let remainingQuery = qLower
      for (const [keyword, dbValues] of sortedKeywords) {
        // Use word boundary for short keywords (2-3 chars) to avoid false matches
        const isShort = keyword.length <= 3
        const matches = isShort
          ? new RegExp(`\\b${keyword}\\b`, 'i').test(remainingQuery)
          : remainingQuery.includes(keyword)
        if (matches) {
          for (const v of dbValues) {
            const field = ['Super Armor', 'Forward Guard', 'I-Frame', 'Invincible', 'Crouching'].includes(v) ? 'protectionTypes' : 'ccTypes'
            matchedEffects.push({ field, value: v })
          }
          remainingQuery = remainingQuery.replace(new RegExp(isShort ? `\\b${keyword}\\b` : keyword, 'gi'), '').trim()
        }
      }

      if (matchedEffects.length > 0) {
        // Build effect-based search: ALL matched keywords must be present,
        // but multiple dbValues from the SAME keyword use OR (e.g., 'I-Frame' OR 'Invincible')
        // Group by field
        const byField = new Map<string, string[]>()
        for (const effect of matchedEffects) {
          if (!byField.has(effect.field)) byField.set(effect.field, [])
          byField.get(effect.field)!.push(effect.value)
        }
        for (const [field, values] of byField) {
          // Deduplicate values
          const unique = [...new Set(values)]
          if (unique.length === 1) {
            AND.push({ [field]: { contains: unique[0] } })
          } else {
            // Multiple values for same field = OR (e.g., I-Frame OR Invincible)
            AND.push({ OR: unique.map(v => ({ [field]: { contains: v } })) })
          }
        }
        // If there's remaining text after removing keywords, also search name/description
        if (remainingQuery.length > 1) {
          AND.push({
            OR: [
              { name: { contains: remainingQuery } },
              { description: { contains: remainingQuery } },
            ],
          })
        }
      } else {
        // No effect keywords — standard text search
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
      // Multi-class: match by classId OR className (using contains for multi-class skills like "Musa, Dosa")
      const selectedClasses = await db.bdoClass.findMany({
        where: { id: { in: classIds } },
        select: { name: true },
      })
      const classNameList = selectedClasses.map((c) => c.name)
      AND.push({
        OR: [
          { classId: { in: classIds } },
          { className: { in: classNameList } },
          // Also match multi-class skills (e.g. "Musa, Dosa" when filtering for "Musa")
          ...classNameList.map((name) => ({ className: { contains: name } })),
        ],
      })
    }
  }

  // Excluded classes (double-click to exclude)
  if (excludeClassParam && excludeClassParam !== 'all') {
    const excludeIds = excludeClassParam.split(',').map((c) => parseInt(c.trim(), 10)).filter((c) => !Number.isNaN(c))
    if (excludeIds.length > 0) {
      const excludeNames = (await db.bdoClass.findMany({
        where: { id: { in: excludeIds } },
        select: { name: true },
      })).map((c) => c.name)
      AND.push({
        NOT: {
          OR: [
            { classId: { in: excludeIds } },
            { className: { in: excludeNames } },
          ],
        },
      })
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

  // Excluded skill types (3-state toggle: off → filter → exclude → off)
  if (excludeTypeParam && excludeTypeParam !== 'all') {
    const exTypes = excludeTypeParam.split(',').map((t) => t.trim()).filter(Boolean)
    if (exTypes.length > 0) {
      const exConditions: Prisma.SkillWhereInput[] = []
      for (const t of exTypes) {
        if (t === 'main') {
          exConditions.push({ isAbsolute: false, isAwakening: false, isSuccession: false, isBlackSpirit: false, isPassive: false })
        } else if (t === 'awakening') exConditions.push({ isAwakening: true })
        else if (t === 'succession') exConditions.push({ isSuccession: true })
        else if (t === 'absolute') exConditions.push({ isAbsolute: true })
        else if (t === 'blackspirit') exConditions.push({ isBlackSpirit: true })
        else if (t === 'passive') exConditions.push({ isPassive: true })
      }
      if (exConditions.length === 1) {
        AND.push({ NOT: exConditions[0] })
      } else {
        AND.push({ NOT: { OR: exConditions } })
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

  // Excluded protections
  if (excludeProtectionParam && excludeProtectionParam !== 'all') {
    const exProts = excludeProtectionParam.split(',').map((p) => p.trim()).filter(Boolean)
    if (exProts.length > 0) {
      AND.push({ NOT: { OR: exProts.map((p) => ({ protectionTypes: { contains: p } })) } })
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

  // Excluded CC types
  if (excludeCc) {
    const exCcValues = excludeCc.split(',').map((c) => c.trim()).filter(Boolean).filter((c) => c !== '__pvp_only__')
    if (exCcValues.length > 0) {
      AND.push({ NOT: { OR: exCcValues.map((c) => ({ ccTypes: { contains: c } })) } })
    }
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
  if (hasPrereqs === 'true') AND.push({ prerequisiteIds: { not: null } })
  else if (hasPrereqs === 'false') AND.push({ OR: [{ prerequisiteIds: null }, { prerequisiteIds: '' }] })
  // Patch-change filter: placeholder — when true, narrow to skills flagged with
  // patch-change data. The actual patch-change flag/column will be wired up
  // separately; for now we keep all rows (filter is a no-op) so the param
  // parses correctly end-to-end.
  if (hasPatchChange === 'true') {
    // TODO: replace with a real column filter once patch-change data is loaded.
    // AND.push({ hasPatchChange: true })
  }

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
    // 'dps' is also computed (damage / animationDuration) — handled specially below.
    dps: { skillId: order },
    // 'type' uses a multi-flag orderBy for a stable type-priority sort.
    type: typeOrderBy(order),
  }
  const orderBy = sortMap[sort] || sortMap.skillId

  // For computed sorts (damage, pvpDamage, ccCounters, dmgPerCd, type),
  // we can't use DB orderBy — the final findMany just uses skillId ordering
  // and we sort filteredIds manually above.
  const effectiveOrderBy = ['damage', 'pvpDamage', 'ccCounters', 'dmgPerCd', 'dps', 'type'].includes(sort)
    ? { skillId: 'asc' as const }
    : orderBy

  // --- Max-rank filtering (DB-level via isMaxRank column) ---
  if (maxRank) {
    // Use the precomputed isMaxRank flag instead of JS-level grouping.
    // This is much faster and more accurate than the old baseName/rank approach.
    const allMatching = await db.skill.findMany({
      where: { ...where, isMaxRank: true },
      select: {
        skillId: true,
        name: true,
        requiredLevel: true,
        className: true,
        classId: true,
        cooldownSec: true,
        animationDurationMs: true,
        isPassive: true,
        isBlackSpirit: true,
        isAbsolute: true,
        isSuccession: true,
        isAwakening: true,
        isFlow: true,
        isCore: true,
        isMaxRank: true,
        prerequisiteIds: true,
      },
      orderBy: { requiredLevel: 'asc' },
    })

    const maxRankSkillIds = allMatching.map((s) => s.skillId)

    // Build a skillId → row map for sorting (avoids re-querying).
    const rowById = new Map<number, (typeof allMatching)[number]>()
    for (const s of allMatching) rowById.set(s.skillId, s)

    // --- Spec-aware deduplication (delegated to @/lib/spec-dedup) ---
    // Rules (mirrors the shared module so /api/skills, /api/meta, and the
    // Tiers page all agree on which variant of each baseName wins):
    //   - Both succession + awakening: union of awakening dedup + succession dedup
    //   - Succession only: succession dedup
    //   - Awakening only: awakening dedup
    //   - Ascension only: no dedup (ascension-only classes show all skills)
    //   - No spec: default dedup (spec=null) — prefers Prime > Absolute > Main,
    //     excludes Awakening-weapon skills.
    let specFilteredIds: number[]
    if (hasAscensionSpec) {
      specFilteredIds = maxRankSkillIds
    } else if (hasSuccessionSpec && hasAwakeningSpec) {
      const awk = dedupSkillsBySpec(allMatching, { spec: 'awakening' })
      const succ = dedupSkillsBySpec(allMatching, { spec: 'succession' })
      const seen = new Set<number>()
      specFilteredIds = []
      for (const s of [...awk, ...succ]) {
        if (!seen.has(s.skillId)) { seen.add(s.skillId); specFilteredIds.push(s.skillId) }
      }
    } else if (hasSuccessionSpec) {
      specFilteredIds = dedupSkillsBySpec(allMatching, { spec: 'succession' }).map((s) => s.skillId)
    } else if (hasAwakeningSpec) {
      specFilteredIds = dedupSkillsBySpec(allMatching, { spec: 'awakening' }).map((s) => s.skillId)
    } else {
      specFilteredIds = dedupSkillsBySpec(allMatching, { spec: null }).map((s) => s.skillId)
    }

    // Apply damage range filter post-query (since damage is computed, not stored).
    // Also pre-compute PvP damage and CC counters when sorting by those columns.
    let filteredIds = specFilteredIds
    const needsDmg = !!minDamage || !!maxDamage || sort === 'damage' || sort === 'pvpDamage' || sort === 'dmgPerCd' || sort === 'dps'
    const needsCC = sort === 'ccCounters' || pvpOnlyFilter
    let dmgPvEMap: Map<number, number> | null = null
    let dmgPvPMap: Map<number, number> | null = null
    let ccMap: Map<number, number> | null = null
    let cooldownMap: Map<number, number> | null = null
    let animMap: Map<number, number> | null = null
    if (needsDmg || needsCC) {
      const skills = await db.skill.findMany({
        where: { skillId: { in: maxRankSkillIds } },
        select: {
          skillId: true,
          damageRowsJson: true,
          pvpDamagePercent: true,
          ccTypes: true,
          cooldownSec: true,
          animationDurationMs: true,
        },
      })
      dmgPvEMap = new Map<number, number>()
      dmgPvPMap = new Map<number, number>()
      ccMap = new Map<number, number>()
      cooldownMap = new Map<number, number>()
      animMap = new Map<number, number>()
      for (const s of skills) {
        const rows = s.damageRowsJson ? JSON.parse(s.damageRowsJson) : null
        const dmg = calculateDamage(rows, s.pvpDamagePercent)
        dmgPvEMap.set(s.skillId, dmg.totalPvE)
        dmgPvPMap.set(s.skillId, dmg.totalPvP ?? 0)
        cooldownMap.set(s.skillId, s.cooldownSec ?? 0)
        animMap.set(s.skillId, s.animationDurationMs ?? 0)

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
    } else if (sort === 'dmgPerCd') {
      // Damage per cooldown: PvP damage / cooldownSec (matches the PvP DPC
      // column shown in the UI; falls back to PvE when PvP damage is missing).
      filteredIds = [...filteredIds].sort((a, b) => {
        const daPvE = dmgPvEMap!.get(a) ?? 0
        const dbPvE = dmgPvEMap!.get(b) ?? 0
        const daPvP = dmgPvPMap?.get(a) ?? 0
        const dbPvP = dmgPvPMap?.get(b) ?? 0
        const cda = cooldownMap?.get(a) ?? 0
        const cdb = cooldownMap?.get(b) ?? 0
        // Prefer PvP DPC; fall back to PvE DPC when PvP damage is unavailable.
        const da = daPvP > 0 ? daPvP : daPvE
        const db_ = dbPvP > 0 ? dbPvP : dbPvE
        // DPC = damage / cooldown (if cooldown is 0 or null, treat as instant = high efficiency)
        const dpcA = cda > 0 ? da / cda : da
        const dpcB = cdb > 0 ? db_ / cdb : db_
        return dir * (dpcA - dpcB)
      })
    } else if (sort === 'dps') {
      // Damage per second: total damage / animation duration in seconds.
      // Uses frame-perfect animationDurationMs from PAZ .paa files.
      filteredIds = [...filteredIds].sort((a, b) => {
        const daPvE = dmgPvEMap!.get(a) ?? 0
        const dbPvE = dmgPvEMap!.get(b) ?? 0
        const daPvP = dmgPvPMap?.get(a) ?? 0
        const dbPvP = dmgPvPMap?.get(b) ?? 0
        const ana = animMap?.get(a) ?? 0
        const anb = animMap?.get(b) ?? 0
        // Prefer PvP DPS; fall back to PvE
        const da = daPvP > 0 ? daPvP : daPvE
        const db_ = dbPvP > 0 ? dbPvP : dbPvE
        // DPS = damage / (animationMs / 1000). If no animation, DPS = 0 (can't compute)
        const dpsA = ana > 0 ? da / (ana / 1000) : 0
        const dpsB = anb > 0 ? db_ / (anb / 1000) : 0
        return dir * (dpsA - dpsB)
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
      orderBy: effectiveOrderBy,
    })

    const idOrder = new Map(pageIds.map((id, i) => [id, i]))
    items.sort((a, b) => (idOrder.get(a.skillId) || 0) - (idOrder.get(b.skillId) || 0))

    return NextResponse.json({
      items: items.map((s) => serializeSkill(s, false)),
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
    db.skill.findMany({ where, orderBy: effectiveOrderBy, skip: (page - 1) * pageSize, take: pageSize }),
  ])

  return NextResponse.json({
    items: items.map((s) => serializeSkill(s, false)),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    maxRankApplied: false,
    evasionFiltered: filterEvasion,
  })
}
