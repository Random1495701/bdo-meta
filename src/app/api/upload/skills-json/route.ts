import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logSkillChanges } from '@/lib/change-log'

export const dynamic = 'force-dynamic'

// POST /api/upload/skills-json
// Accepts a JSON body of skills and upserts them into the database.
// Used by the sync-footer "Import" button for manual data injection.
//
// Body format: { skills: [{ skillId, name, className, ... }, ...] }
// Returns: { ok: boolean, upserted: number, errors: number }

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const skills = body.skills || body

    if (!Array.isArray(skills)) {
      return NextResponse.json({ ok: false, error: 'Expected an array of skills' }, { status: 400 })
    }

    let upserted = 0
    let errors = 0

    for (const s of skills) {
      try {
        if (!s.skillId || typeof s.skillId !== 'number') { errors++; continue }

        // Fetch existing skill to compare for change logging
        const existing = await db.skill.findUnique({
          where: { skillId: s.skillId },
        })

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

        // Log changes
        await logSkillChanges(
          s.skillId,
          s.name || String(s.skillId),
          existing as any,
          updateData,
          s.className,
          'import',
        )

        upserted++
        if (upserted % 200 === 0) {
          console.log(`  imported ${upserted}/${skills.length}`)
        }
      } catch (err) {
        errors++
        if (errors <= 3) console.error(`  error on skill ${s.skillId}:`, (err as Error).message)
      }
    }

    return NextResponse.json({ ok: true, upserted, errors })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
