import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { calculateDamage, type DamageRow } from '@/lib/damage'
import { calculateCCCounters, getRealCCs, getNonCCEffects, formatCCCounters } from '@/lib/cc'

export const dynamic = 'force-dynamic'

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
  const realCCs = getRealCCs(pvpCCs)
  const nonCCEffects = getNonCCEffects(pvpCCs)
  const ccCounters = calculateCCCounters(pvpCCs)
  const ccCounterDisplay = formatCCCounters(pvpCCs)

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
    damagePerCooldown: (damage.totalPvE > 0 && skill.cooldownSec && skill.cooldownSec > 0)
      ? Math.round(damage.totalPvE / skill.cooldownSec)
      : null,
    ccTypes,
    ccCounters,
    ccCounterDisplay,
    realCCs,
    nonCCEffects,
    pveOnlyCCs: Array.from(pveOnlyCCs),
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
