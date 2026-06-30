import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { calculateDamage, type DamageRow } from '@/lib/damage'
import { isRealCC } from '@/lib/cc'
import { getCached, setCached } from '@/lib/cache'

export const dynamic = 'force-dynamic'

// GET /api/meta
// Returns per-class statistics for the Meta page:
// - avg PvP damage (ignoring Black Spirit rage skills)
// - median PvP damage (same)
// - number of PvP CC skills (count skills with CC, not CC count; ignore PvE-only)
// - number of Super Armors, Forward Guards, I-Frames (separately, ignore PvE only)
// - computed separately for Awakening and Succession specs

interface SpecStats {
  skillCount: number
  avgPvpDamage: number
  medianPvpDamage: number
  pvpCcSkillCount: number
  ccChainPotential: number // skills with 2+ PvP CC counters
  superArmorCount: number
  forwardGuardCount: number
  iFrameCount: number
  topPvpDamageSkill: { skillId: number; name: string; damage: number } | null
  dpsEstimate: number // avg PvP damage / avg animation duration
  protectedCoverage: number // % of skills with any protection
}

interface ClassStats {
  classId: number
  className: string
  slug: string
  awakening: SpecStats
  succession: SpecStats
  ascension: SpecStats
}

const RANK_SUFFIX = /\s+(XXX|XXIX|XXVIII|XXVII|XXVI|XXV|XXIV|XXIII|XXII|XXI|XX|XIX|XVIII|XVII|XVI|XV|XIV|XIII|XII|XI|IX|VIII|VII|VI|IV|V|III|II|I)$/
const RANK_MAP: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10,
  XI: 11, XII: 12, XIII: 13, XIV: 14, XV: 15, XVI: 16, XVII: 17, XVIII: 18,
  XIX: 19, XX: 20, XXI: 21, XXII: 22, XXIII: 23, XXIV: 24, XXV: 25,
  XXVI: 26, XXVII: 27, XXVIII: 28, XXIX: 29, XXX: 30,
}

function getBaseName(name: string): string {
  return name.replace(RANK_SUFFIX, '')
}

function computeSpecStats(skills: any[]): SpecStats {
  const pvpDamages: number[] = []
  let pvpCcSkillCount = 0
  let ccChainPotential = 0
  let superArmorCount = 0
  let forwardGuardCount = 0
  let iFrameCount = 0
  let topPvpDamage = 0
  let topPvpDamageSkill: { skillId: number; name: string; damage: number } | null = null
  let protectedCount = 0
  const animDurations: number[] = []

  for (const s of skills) {
    const damageRows: DamageRow[] | null = s.damageRowsJson ? JSON.parse(s.damageRowsJson) : null
    const damage = calculateDamage(damageRows, s.pvpDamagePercent)

    // Damage stats: exclude Black Spirit skills (rage) and skills without PvP damage
    if (!s.isBlackSpirit && damage.totalPvP != null && damage.totalPvP > 0) {
      pvpDamages.push(damage.totalPvP)
      // Track top PvP damage skill
      if (damage.totalPvP > topPvpDamage) {
        topPvpDamage = damage.totalPvP
        topPvpDamageSkill = { skillId: s.skillId, name: s.name, damage: damage.totalPvP }
      }
    }

    // Animation duration for DPS estimate
    if (s.animationDurationMs && s.animationDurationMs > 0) {
      animDurations.push(s.animationDurationMs)
    }

    // CC stats: count skills that have at least 1 PvP CC (not PvE-only)
    const pveOnlyCCs = new Set<string>()
    if (damageRows) {
      for (const r of damageRows) {
        if (r.kind === 'cc' && r.pveOnly && r.label) pveOnlyCCs.add(r.label)
      }
    }
    const ccTypes = s.ccTypes ? s.ccTypes.split(',').map((x: string) => x.trim()).filter(Boolean) : []
    const pvpCCs = ccTypes.filter((cc: string) => !pveOnlyCCs.has(cc) && isRealCC(cc))
    if (pvpCCs.length > 0) pvpCcSkillCount++
    // CC chain potential: skills with 2+ PvP CC counters (can fill immunity bar in one combo)
    if (pvpCCs.length >= 2) ccChainPotential++

    // Protection stats: ignore PvE-only
    const pveOnlyProts = new Set<string>()
    if (damageRows) {
      for (const r of damageRows) {
        if (r.kind === 'protection' && r.pveOnly && r.label) pveOnlyProts.add(r.label)
      }
    }
    const protections = s.protectionTypes ? s.protectionTypes.split(',').map((x: string) => x.trim()).filter(Boolean) : []
    const pvpProts = protections.filter((p: string) => !pveOnlyProts.has(p))
    if (pvpProts.length > 0) protectedCount++
    if (pvpProts.includes('Super Armor')) superArmorCount++
    if (pvpProts.includes('Forward Guard')) forwardGuardCount++
    if (pvpProts.includes('I-Frame') || pvpProts.includes('Invincible')) iFrameCount++
  }

  const avgPvpDamage = pvpDamages.length > 0
    ? Math.round(pvpDamages.reduce((a, b) => a + b, 0) / pvpDamages.length)
    : 0
  const sorted = [...pvpDamages].sort((a, b) => a - b)
  const medianPvpDamage = sorted.length > 0
    ? Math.round(sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)])
    : 0

  // DPS estimate: avg PvP damage / avg animation duration (in seconds)
  const avgAnimSec = animDurations.length > 0
    ? (animDurations.reduce((a, b) => a + b, 0) / animDurations.length) / 1000
    : 1
  const dpsEstimate = avgPvpDamage > 0 && avgAnimSec > 0
    ? Math.round(avgPvpDamage / avgAnimSec)
    : 0

  // Protected coverage: % of skills with any protection
  const protectedCoverage = skills.length > 0
    ? Math.round((protectedCount / skills.length) * 100)
    : 0

  return {
    skillCount: skills.length,
    avgPvpDamage,
    medianPvpDamage,
    pvpCcSkillCount,
    ccChainPotential,
    superArmorCount,
    forwardGuardCount,
    iFrameCount,
    topPvpDamageSkill,
    dpsEstimate,
    protectedCoverage,
  }
}

export async function GET() {
  const cached = getCached('meta')
  if (cached) return NextResponse.json(cached)

  const classes = await db.bdoClass.findMany({ orderBy: { id: 'asc' } })

  const allSkills = await db.skill.findMany({
    where: {
      className: { not: { startsWith: 'NEW_CLASS' } },
    },
    select: {
      skillId: true, name: true, className: true, classId: true,
      damageRowsJson: true, pvpDamagePercent: true, ccTypes: true, protectionTypes: true,
      isAwakening: true, isSuccession: true, isAbsolute: true, isBlackSpirit: true, isPassive: true,
      requiredLevel: true,
    },
  })

  const results: ClassStats[] = []

  for (const cls of classes) {
    if (cls.name.startsWith('NEW_CLASS')) continue
    const classSkills = allSkills.filter((s) => s.classId === cls.id)
    if (classSkills.length === 0) continue

    // Max-rank filtering
    const baseNameMap = new Map<string, { skill: typeof classSkills[0]; rank: number; level: number }>()
    for (const s of classSkills) {
      const baseName = getBaseName(s.name)
      const rank = RANK_MAP[s.name.match(RANK_SUFFIX)?.[1] || ''] || 0
      const existing = baseNameMap.get(baseName)
      if (!existing || rank > existing.rank || (rank === existing.rank && s.requiredLevel > existing.level)) {
        baseNameMap.set(baseName, { skill: s, rank, level: s.requiredLevel })
      }
    }
    const maxRankSkills = Array.from(baseNameMap.values()).map((v) => v.skill)

    // Build spec dedup map
    const specMap = new Map<string, { skillIds: number[]; hasSuccession: boolean; hasAbsolute: boolean; hasAwakening: boolean; isBS: boolean; isPassive: boolean }>()
    for (const s of maxRankSkills) {
      let specBase = s.name
      const isSucc = s.isSuccession || s.name.includes('Prime: ') || s.name.startsWith('Succession:')
      const isAbs = s.isAbsolute || s.name.includes('Absolute: ')
      const isAwk = s.isAwakening
      if (isSucc) specBase = s.name.replace(/(Prime:|Succession:)\s+/, '')
      else if (isAbs) specBase = s.name.replace(/Absolute:\s+/, '')
      specBase = getBaseName(specBase)
      const existing = specMap.get(specBase) || { skillIds: [], hasSuccession: false, hasAbsolute: false, hasAwakening: false, isBS: false, isPassive: false }
      existing.skillIds.push(s.skillId)
      if (isSucc) existing.hasSuccession = true
      if (isAbs) existing.hasAbsolute = true
      if (isAwk) existing.hasAwakening = true
      if (s.isBlackSpirit) existing.isBS = true
      if (s.isPassive) existing.isPassive = true
      specMap.set(specBase, existing)
    }

    const skillById = new Map(maxRankSkills.map((s) => [s.skillId, s]))
    const awakeningSkills: typeof classSkills = []
    const successionSkills: typeof classSkills = []
    const awkAdded = new Set<number>()
    const succAdded = new Set<number>()

    for (const [, info] of specMap) {
      // Succession spec
      if (info.hasSuccession) {
        for (const id of info.skillIds) {
          const s = skillById.get(id)
          if (s && (s.isSuccession || s.name.includes('Prime: ') || s.name.startsWith('Succession:')) && !succAdded.has(id)) {
            successionSkills.push(s); succAdded.add(id)
          }
        }
      } else if (info.hasAbsolute) {
        for (const id of info.skillIds) {
          const s = skillById.get(id)
          if (s && (s.isAbsolute || s.name.includes('Absolute: ')) && !succAdded.has(id)) {
            successionSkills.push(s); succAdded.add(id)
          }
        }
      } else {
        for (const id of info.skillIds) {
          const s = skillById.get(id)
          if (s && !s.isAwakening && !succAdded.has(id)) { successionSkills.push(s); succAdded.add(id) }
        }
      }

      // Awakening spec
      if (info.hasAbsolute && !info.hasSuccession) {
        for (const id of info.skillIds) {
          const s = skillById.get(id)
          if (s && (s.isAbsolute || s.name.includes('Absolute: ')) && !awkAdded.has(id)) {
            awakeningSkills.push(s); awkAdded.add(id)
          }
        }
      } else if (!info.hasSuccession) {
        for (const id of info.skillIds) {
          const s = skillById.get(id)
          if (s && !s.isAwakening && !s.isAbsolute && !s.isBlackSpirit && !s.isPassive && !awkAdded.has(id)) {
            awakeningSkills.push(s); awkAdded.add(id)
          }
        }
      }
      if (info.hasAwakening) {
        for (const id of info.skillIds) {
          const s = skillById.get(id)
          if (s && s.isAwakening && !awkAdded.has(id)) { awakeningSkills.push(s); awkAdded.add(id) }
        }
      }
      // BS + Passive in both
      for (const id of info.skillIds) {
        const s = skillById.get(id)
        if (s && (s.isBlackSpirit || s.isPassive)) {
          if (!awkAdded.has(id)) { awakeningSkills.push(s); awkAdded.add(id) }
          if (!succAdded.has(id)) { successionSkills.push(s); succAdded.add(id) }
        }
      }
    }

    // Ascension spec: for ascension-only classes (Wukong, Scholar, Shai, Archer,
    // Seraph, Deadeye), the "awakening" skills are actually ascension skills.
    // These classes have no succession — their "awakening" IS their ascension.
    // For normal classes, ascension = empty (they don't have ascension).
    const ascensionSkills: typeof classSkills = []
    const ascAdded = new Set<number>()
    const isAscensionClass = ['wukong', 'scholar', 'shai', 'archer', 'seraph', 'deadeye'].includes(cls.slug)

    if (isAscensionClass) {
      // For ascension-only classes: their "awakening" skills are ascension skills
      // Also include Main (Lv56+), Absolute, BS, Passive
      for (const s of maxRankSkills) {
        if (s.isAwakening && !ascAdded.has(s.skillId)) {
          ascensionSkills.push(s); ascAdded.add(s.skillId)
        }
      }
      // Include unclassified Lv56+ main skills (new ascension skill tree)
      for (const s of maxRankSkills) {
        const isOther = s.isAwakening || s.isSuccession || s.isAbsolute || s.isBlackSpirit || s.isPassive
        if (!isOther && s.requiredLevel >= 56 && !ascAdded.has(s.skillId)) {
          ascensionSkills.push(s); ascAdded.add(s.skillId)
        }
      }
      // Also include BS + Passive
      for (const s of maxRankSkills) {
        if ((s.isBlackSpirit || s.isPassive) && !ascAdded.has(s.skillId)) {
          ascensionSkills.push(s); ascAdded.add(s.skillId)
        }
      }
    }

    // For ascension-only classes, awakening spec should be empty (their "awakening"
    // IS ascension, not a separate awakening spec)
    const effectiveAwakeningSkills = isAscensionClass ? [] : awakeningSkills
    const effectiveSuccessionSkills = isAscensionClass ? [] : successionSkills

    results.push({
      classId: cls.id,
      className: cls.name,
      slug: cls.slug,
      awakening: computeSpecStats(effectiveAwakeningSkills),
      succession: computeSpecStats(effectiveSuccessionSkills),
      ascension: isAscensionClass ? computeSpecStats(ascensionSkills) : {
        skillCount: 0, avgPvpDamage: 0, medianPvpDamage: 0,
        pvpCcSkillCount: 0, ccChainPotential: 0, superArmorCount: 0, forwardGuardCount: 0, iFrameCount: 0,
        topPvpDamageSkill: null, dpsEstimate: 0, protectedCoverage: 0,
      },
    })
  }

  const result = { classes: results }
  setCached('meta', result, 5 * 60 * 1000) // cache for 5 min
  return NextResponse.json(result)
}
