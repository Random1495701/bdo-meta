import { db } from '../src/lib/db'
import { writeFileSync } from 'node:fs'

async function main() {
  console.log('Exporting enriched skills...')
  const skills = await db.skill.findMany({
    where: { description: { not: null } },
    orderBy: { skillId: 'asc' },
  })
  console.log(`Found ${skills.length} enriched skills`)

  const serialized = skills.map((s) => ({
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
    prerequisiteIds: s.prerequisiteIds ? s.prerequisiteIds.split(',').map(Number).filter((x) => x > 0) : [],
    videoUrl: s.videoUrl,
    animationDurationMs: s.animationDurationMs,
    syncedAt: s.syncedAt,
  }))

  const exportData = {
    exportedAt: new Date().toISOString(),
    source: 'bdo-meta-restore',
    total: serialized.length,
    skills: serialized,
  }

  writeFileSync('db/skills-export.json', JSON.stringify(exportData, null, 2))
  console.log(`Exported ${serialized.length} skills to db/skills-export.json`)
  await db.$disconnect()
}
main().catch(console.error)
