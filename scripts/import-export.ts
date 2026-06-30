import { db } from '../src/lib/db'
import { readFileSync } from 'node:fs'

async function main() {
  console.log('Reading export file...')
  const data = JSON.parse(readFileSync('db/skills-export.json', 'utf-8'))
  const skills = data.skills || data
  console.log(`Found ${skills.length} skills to import`)

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
      if (upserted % 200 === 0) console.log(`  imported ${upserted}/${skills.length}`)
    } catch (err) {
      errors++
      if (errors <= 3) console.error(`  error on skill ${s.skillId}: ${(err as Error).message}`)
    }
  }

  console.log(`\nDone: ${upserted} upserted, ${errors} errors`)
  await db.$disconnect()
}
main().catch(console.error)
