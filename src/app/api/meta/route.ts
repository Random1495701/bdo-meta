import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { calculateDamage, type DamageRow } from '@/lib/damage'
import { isRealCC } from '@/lib/cc'
import { getCached, setCached } from '@/lib/cache'
import { dedupSkillsBySpec } from '@/lib/spec-dedup'

export const dynamic = 'force-dynamic'

// GET /api/meta
// Returns per-class statistics for the Meta page:
// - avg PvP damage (ignoring Black Spirit rage skills)
// - median PvP damage (same)
// - number of PvP CC skills (count skills with CC, not CC count; ignore PvE-only)
// - number of Super Armors, Forward Guards, I-Frames (separately, ignore PvE only)
// - CC chain potential (skills with 2+ PvP CCs)
// - grab count (skills with Grapple CC)
// - core SA/FG counts (Core: skills)
// - PA Wiki data: combat type, class group, SA damage reduction per spec
// - computed separately for Awakening, Succession, and Ascension specs

interface SpecStats {
  skillCount: number
  avgPvpDamage: number
  medianPvpDamage: number
  pvpCcSkillCount: number
  grabCount: number // skills with Grapple CC
  superArmorCount: number
  forwardGuardCount: number
  iFrameCount: number
  coreSaCount: number // Core: skills with Super Armor (player picks only 1)
  coreFgCount: number // Core: skills with Forward Guard (player picks only 1)
  topPvpDamageSkill: { skillId: number; name: string; damage: number } | null
  dpsEstimate: number // avg PvP damage / avg animation duration
  avgDpc: number // avg PvE damage per cooldown second
  avgDpcPvP: number // avg PvP damage per cooldown second
  protectedCoverage: number // % of skills with any protection
}

interface ClassStats {
  classId: number
  className: string
  slug: string
  combatType: string | null
  successionGroup: string | null
  awakeningGroup: string | null
  ascensionGroup: string | null
  successionSaDr: number
  awakeningSaDr: number
  ascensionSaDr: number
  awakening: SpecStats
  succession: SpecStats
  ascension: SpecStats
}

function computeSpecStats(skills: any[]): SpecStats {
  const pvpDamages: number[] = []
  let pvpCcSkillCount = 0
  let ccChainPotential = 0
  let grabCount = 0
  let superArmorCount = 0
  let forwardGuardCount = 0
  let iFrameCount = 0
  let coreSaCount = 0
  let coreFgCount = 0
  let topPvpDamage = 0
  let topPvpDamageSkill: { skillId: number; name: string; damage: number } | null = null
  let protectedCount = 0
  const animDurations: number[] = []
  let totalDpc = 0
  let dpcCount = 0
  let totalDpcPvP = 0
  let dpcPvPCount = 0

  for (const s of skills) {
    // Skip "(Not in use)" skills — leftovers from old patches
    if (s.name?.includes('(Not in use)') || s.name?.includes('(Not in Use)')) continue

    const damageRows: DamageRow[] | null = s.damageRowsJson ? JSON.parse(s.damageRowsJson) : null
    const damage = calculateDamage(damageRows, s.pvpDamagePercent)

    if (!s.isBlackSpirit && damage.totalPvP != null && damage.totalPvP > 0) {
      pvpDamages.push(damage.totalPvP)
      if (damage.totalPvP > topPvpDamage) {
        topPvpDamage = damage.totalPvP
        topPvpDamageSkill = { skillId: s.skillId, name: s.name, damage: damage.totalPvP }
      }
      // Damage per cooldown — PvE & PvP variants (higher = more efficient).
      // Only counted for skills with positive PvP damage so the average stays
      // comparable to the avgPvpDamage sample.
      if (s.cooldownSec && s.cooldownSec > 0) {
        totalDpc += damage.totalPvE / s.cooldownSec
        dpcCount++
        totalDpcPvP += damage.totalPvP / s.cooldownSec
        dpcPvPCount++
      }
    }

    if (s.animationDurationMs && s.animationDurationMs > 0) {
      animDurations.push(s.animationDurationMs)
    }

    const pveOnlyCCs = new Set<string>()
    if (damageRows) {
      for (const r of damageRows) {
        if (r.kind === 'cc' && r.pveOnly && r.label) pveOnlyCCs.add(r.label)
      }
    }
    const ccTypes = s.ccTypes ? s.ccTypes.split(',').map((x: string) => x.trim()).filter(Boolean) : []
    const pvpCCs = ccTypes.filter((cc: string) => !pveOnlyCCs.has(cc) && isRealCC(cc))

    // FALSE GRAB FILTER: Some skills have "Grapple" in ccTypes but it's from
    // "All CC Resistance (except Grapple), including from Back Attacks" text
    // which is a RESISTANCE buff, not a grab CC. Check damageRows AND description.
    // Also check for block/guard skills (Forward Guard + name suggests blocking)
    // — these have Grapple CC from "except Grapple" tooltip text but are NOT grabs.
    const isFalseGrab = (damageRows?.some((r: DamageRow) =>
      r.label?.toLowerCase().includes('except grapple') ||
      r.label?.toLowerCase().includes('except grapling')
    ) || false) || (s.description?.toLowerCase().includes('except grapple') || false)

    // Block/guard skills with Forward Guard protection are NOT grabs.
    // The Grapple CC on these comes from "All CC Resistance (except Grapple)" tooltip.
    const blockSkillNames = ['guard', 'shield chase', 'greatsword defense', 'bladewall', 'noble spirit', 'vindicta', 'death line chase', 'icy fog', 'mass teleport', 'frenzied dash']
    const isBlockSkill = s.protectionTypes?.includes('Forward Guard') &&
      blockSkillNames.some(n => s.name?.toLowerCase().includes(n))

    const hasRealGrab = pvpCCs.includes('Grapple') && !isFalseGrab && !isBlockSkill

    // CC stats: exclude Black Spirit rage skills (they're not part of normal PvP rotation)
    if (!s.isBlackSpirit) {
      if (pvpCCs.length > 0) pvpCcSkillCount++
      if (hasRealGrab) grabCount++
    }

    // Protection stats
    const pveOnlyProts = new Set<string>()
    if (damageRows) {
      for (const r of damageRows) {
        if (r.kind === 'protection' && r.pveOnly && r.label) pveOnlyProts.add(r.label)
      }
    }
    const protections = s.protectionTypes ? s.protectionTypes.split(',').map((x: string) => x.trim()).filter(Boolean) : []
    const pvpProts = protections.filter((p: string) => !pveOnlyProts.has(p))
    const isCoreSkill = s.name?.startsWith('Core:')
    
    if (pvpProts.length > 0) protectedCount++
    if (pvpProts.includes('Super Armor')) {
      if (isCoreSkill) coreSaCount++
      else superArmorCount++
    }
    if (pvpProts.includes('Forward Guard')) {
      if (isCoreSkill) coreFgCount++
      else forwardGuardCount++
    }
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

  const avgAnimSec = animDurations.length > 0
    ? (animDurations.reduce((a, b) => a + b, 0) / animDurations.length) / 1000
    : 1
  const dpsEstimate = avgPvpDamage > 0 && avgAnimSec > 0
    ? Math.round(avgPvpDamage / avgAnimSec)
    : 0

  const protectedCoverage = skills.length > 0
    ? Math.round((protectedCount / skills.length) * 100)
    : 0

  const avgDpc = dpcCount > 0 ? Math.round(totalDpc / dpcCount) : 0
  const avgDpcPvP = dpcPvPCount > 0 ? Math.round(totalDpcPvP / dpcPvPCount) : 0

  return {
    skillCount: skills.length,
    avgPvpDamage,
    medianPvpDamage,
    pvpCcSkillCount,
    grabCount,
    superArmorCount,
    forwardGuardCount,
    iFrameCount,
    coreSaCount,
    coreFgCount,
    topPvpDamageSkill,
    dpsEstimate,
    avgDpc,
    avgDpcPvP,
    protectedCoverage,
  }
}

export async function GET() {
  const cached = getCached('meta')
  if (cached) return NextResponse.json(cached)

  const classes = await db.bdoClass.findMany({ orderBy: { name: 'asc' } })

  const allSkills = await db.skill.findMany({
    where: {
      className: { not: { startsWith: 'NEW_CLASS' } },
    },
    select: {
      skillId: true, name: true, className: true, classId: true,
      damageRowsJson: true, pvpDamagePercent: true, ccTypes: true, protectionTypes: true,
      isAwakening: true, isSuccession: true, isAbsolute: true, isBlackSpirit: true, isPassive: true,
      isFlow: true, isCore: true,
      requiredLevel: true, animationDurationMs: true, description: true, cooldownSec: true,
      isMaxRank: true, prerequisiteIds: true,
    },
  })

  const results: ClassStats[] = []

  for (const cls of classes) {
    if (cls.name.startsWith('NEW_CLASS')) continue
    const classSkills = allSkills.filter((s) => s.classId === cls.id)
    if (classSkills.length === 0) continue

    // Spec-aware deduplication is delegated to @/lib/spec-dedup so /api/meta,
    // /api/skills, and the Tiers page all agree on which variant of each
    // baseName wins. The module filters by isMaxRank internally, so we pass
    // the full per-class list (max-rank + lower ranks) and let it pick.
    const isAscensionClass = cls.isAscension === true
    const awakeningSkills = isAscensionClass
      ? []
      : dedupSkillsBySpec(classSkills, { spec: 'awakening' })
    const successionSkills = isAscensionClass
      ? []
      : dedupSkillsBySpec(classSkills, { spec: 'succession' })
    const ascensionSkills = isAscensionClass
      ? dedupSkillsBySpec(classSkills, { spec: 'ascension' })
      : []

    // For ascension-only classes, awakening spec should be empty (their "awakening"
    // IS ascension, not a separate awakening spec)
    const effectiveAwakeningSkills = awakeningSkills
    const effectiveSuccessionSkills = successionSkills

    // PA Wiki data is stored directly in DB columns (combatType, successionGroup, etc.)
    results.push({
      classId: cls.id,
      className: cls.name,
      slug: cls.slug,
      combatType: cls.combatType || null,
      successionGroup: cls.successionGroup || null,
      awakeningGroup: cls.awakeningGroup || null,
      ascensionGroup: cls.ascensionGroup || null,
      successionSaDr: cls.successionSaDr ?? 10,
      awakeningSaDr: cls.awakeningSaDr ?? 10,
      ascensionSaDr: cls.ascensionSaDr ?? 10,
      awakening: computeSpecStats(effectiveAwakeningSkills),
      succession: computeSpecStats(effectiveSuccessionSkills),
      ascension: isAscensionClass ? computeSpecStats(ascensionSkills) : {
        skillCount: 0, avgPvpDamage: 0, medianPvpDamage: 0,
        pvpCcSkillCount: 0, grabCount: 0, superArmorCount: 0, forwardGuardCount: 0, iFrameCount: 0, coreSaCount: 0, coreFgCount: 0,
        topPvpDamageSkill: null, dpsEstimate: 0, avgDpc: 0, avgDpcPvP: 0, protectedCoverage: 0,
      },
    })
  }

  const result = { classes: results }
  setCached('meta', result, 5 * 60 * 1000) // cache for 5 min
  return NextResponse.json(result)
}
