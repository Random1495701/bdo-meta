// Restore DB from JSON export + seed classes
// Usage: bun run scripts/restore-db.ts
import { db } from '../src/lib/db'
import { readFileSync } from 'node:fs'

const BDO_CLASSES: { id: number; name: string; slug: string }[] = [
  { id: 0, name: 'Warrior', slug: 'warrior' },
  { id: 1, name: 'Hashashin', slug: 'hashashin' },
  { id: 2, name: 'Sage', slug: 'sage' },
  { id: 3, name: 'Wukong', slug: 'wukong' },
  { id: 4, name: 'Ranger', slug: 'ranger' },
  { id: 5, name: 'Guardian', slug: 'guardian' },
  { id: 6, name: 'Scholar', slug: 'scholar' },
  { id: 7, name: 'Drakania', slug: 'drakania' },
  { id: 8, name: 'Sorceress', slug: 'sorceress' },
  { id: 9, name: 'Nova', slug: 'nova' },
  { id: 10, name: 'Corsair', slug: 'corsair' },
  { id: 11, name: 'Lahn', slug: 'lahn' },
  { id: 12, name: 'Berserker', slug: 'berserker' },
  { id: 15, name: 'Maegu', slug: 'maegu' },
  { id: 16, name: 'Tamer', slug: 'tamer' },
  { id: 17, name: 'Shai', slug: 'shai' },
  { id: 19, name: 'Striker', slug: 'striker' },
  { id: 20, name: 'Musa', slug: 'musa' },
  { id: 21, name: 'Maehwa', slug: 'maehwa' },
  { id: 23, name: 'Mystic', slug: 'mystic' },
  { id: 24, name: 'Valkyrie', slug: 'valkyrie' },
  { id: 25, name: 'Kunoichi', slug: 'kunoichi' },
  { id: 26, name: 'Ninja', slug: 'ninja' },
  { id: 27, name: 'Dark Knight', slug: 'dark-knight' },
  { id: 28, name: 'Wizard', slug: 'wizard' },
  { id: 29, name: 'Archer', slug: 'archer' },
  { id: 30, name: 'Woosa', slug: 'woosa' },
  { id: 31, name: 'Witch', slug: 'witch' },
  { id: 32, name: 'Seraph', slug: 'seraph' },
  { id: 33, name: 'Dosa', slug: 'dosa' },
  { id: 34, name: 'Deadeye', slug: 'deadeye' },
]

async function main() {
  console.log('=== BDO Meta DB Restore ===')

  // 1. Seed classes
  console.log('\n[1/2] Seeding classes...')
  for (const c of BDO_CLASSES) {
    await db.bdoClass.upsert({
      where: { id: c.id },
      create: { id: c.id, name: c.name, slug: c.slug },
      update: { name: c.name, slug: c.slug },
    })
  }
  const classCount = await db.bdoClass.count()
  console.log(`  ✓ ${classCount} classes seeded`)

  // 2. Import skills from JSON export
  console.log('\n[2/2] Importing skills from db/skills-export.json...')
  const data = JSON.parse(readFileSync('db/skills-export.json', 'utf-8'))
  const skills = data.skills || data
  console.log(`  Found ${skills.length} skills to import`)

  let upserted = 0
  let errors = 0
  for (let i = 0; i < skills.length; i++) {
    const s = skills[i]
    try {
      if (!s.skillId || typeof s.skillId !== 'number') { errors++; continue }

      const updateData: any = {}
      if (s.name) updateData.name = String(s.name)
      if (s.krName) updateData.krName = String(s.krName)
      if (s.className) updateData.className = String(s.className)
      if (s.classId != null) updateData.classId = Number(s.classId)
      if (s.description) updateData.description = String(s.description)
      if (s.command) updateData.command = String(s.command)
      if (s.cooldown) updateData.cooldown = String(s.cooldown)
      if (s.cooldownSec != null) updateData.cooldownSec = Number(s.cooldownSec)
      if (s.requiredLevel != null) updateData.requiredLevel = Number(s.requiredLevel)
      if (s.maxLevel != null) updateData.maxLevel = Number(s.maxLevel)
      if (s.skillPoints != null) updateData.skillPoints = Number(s.skillPoints)
      if (s.pvpDamagePercent != null) updateData.pvpDamagePercent = Number(s.pvpDamagePercent)
      if (s.iconPath) updateData.iconPath = String(s.iconPath)
      if (s.videoUrl) updateData.videoUrl = String(s.videoUrl)
      if (s.animationDurationMs != null) updateData.animationDurationMs = Number(s.animationDurationMs)
      if (s.isQuickSlot != null) updateData.isQuickSlot = Boolean(s.isQuickSlot)
      if (s.isAbsolute != null) updateData.isAbsolute = Boolean(s.isAbsolute)
      if (s.isAwakening != null) updateData.isAwakening = Boolean(s.isAwakening)
      if (s.isSuccession != null) updateData.isSuccession = Boolean(s.isSuccession)
      if (s.isBlackSpirit != null) updateData.isBlackSpirit = Boolean(s.isBlackSpirit)
      if (s.isPassive != null) updateData.isPassive = Boolean(s.isPassive)
      if (s.ccTypes) updateData.ccTypes = Array.isArray(s.ccTypes) ? s.ccTypes.join(',') : String(s.ccTypes)
      if (s.protectionTypes) updateData.protectionTypes = Array.isArray(s.protectionTypes) ? s.protectionTypes.join(',') : String(s.protectionTypes)
      if (s.damageRows && Array.isArray(s.damageRows)) updateData.damageRowsJson = JSON.stringify(s.damageRows)
      else if (s.damageRowsJson) updateData.damageRowsJson = String(s.damageRowsJson)
      if (s.groupId != null) updateData.groupId = Number(s.groupId)
      if (s.prerequisiteIds) updateData.prerequisiteIds = Array.isArray(s.prerequisiteIds) ? s.prerequisiteIds.join(',') : String(s.prerequisiteIds)
      updateData.syncedAt = new Date()

      await db.skill.upsert({
        where: { skillId: s.skillId },
        create: { skillId: s.skillId, ...updateData },
        update: updateData,
      })
      upserted++
      if (upserted % 500 === 0) console.log(`  imported ${upserted}/${skills.length}`)
    } catch (err) {
      errors++
      if (errors <= 3) console.error(`  error on skill ${s.skillId}: ${(err as Error).message}`)
    }
  }

  console.log(`\n  ✓ ${upserted} skills imported, ${errors} errors`)

  const finalSkills = await db.skill.count()
  const finalClasses = await db.bdoClass.count()
  console.log(`\n=== Restore complete ===`)
  console.log(`  Skills: ${finalSkills}`)
  console.log(`  Classes: ${finalClasses}`)
  await db.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
