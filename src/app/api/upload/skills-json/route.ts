import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { writeFileSync, existsSync, mkdirSync } from 'node:fs'

export const dynamic = 'force-dynamic'

// POST /api/upload/skills-json
// Accepts a JSON file (or JSON body) containing an array of skill objects and
// upserts them into the database. This is the "user-provided data" path — if the
// user has a BDO skill data dump (from a community tool, a PAZ extraction, or
// their own scrape), they can upload it here to instantly enrich the database
// without any bdocodex scraping.
//
// Accepted formats:
// 1. JSON array of skill objects:
//    [{ "skillId": 1119, "name": "Round Kick II", "description": "...", "className": "Ranger", ... }]
//
// 2. JSON object with "skills" array:
//    { "skills": [{ "skillId": 1119, ... }] }
//
// 3. Multipart form upload with a .json file (field name "file")
//
// Skill object fields (all optional except skillId):
//   skillId (required), name, krName, className, classId, description, command,
//   cooldown, cooldownSec, requiredLevel, maxLevel, skillPoints,
//   ccTypes (string or array), protectionTypes (string or array),
//   pvpDamagePercent, isQuickSlot, isAbsolute, isAwakening, isSuccession,
//   isBlackSpirit, isPassive, videoUrl, animationDurationMs, iconPath,
//   damageRows (array of {label, value, pvpOnly, pveOnly, kind})

export async function POST(req: NextRequest) {
  let skills: any[] = []
  let source = 'unknown'

  try {
    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      // Multipart file upload
      const formData = await req.formData()
      const file = formData.get('file')
      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'No file uploaded (field name must be "file")' }, { status: 400 })
      }
      source = file.name
      const text = await file.text()
      const parsed = JSON.parse(text)
      skills = extractSkillsArray(parsed)
    } else {
      // JSON body
      const body = await req.json()
      source = body.source || 'json-body'
      skills = extractSkillsArray(body)
    }
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to parse upload', details: (err as Error).message },
      { status: 400 },
    )
  }

  if (!Array.isArray(skills) || skills.length === 0) {
    return NextResponse.json({ error: 'No skills found in upload' }, { status: 400 })
  }

  // Validate and upsert
  let upserted = 0
  let skipped = 0
  const errors: string[] = []

  for (const raw of skills) {
    try {
      if (!raw.skillId || typeof raw.skillId !== 'number') {
        skipped++
        continue
      }

      // Normalize fields
      const data: any = {}
      if (raw.name) data.name = String(raw.name)
      if (raw.krName) data.krName = String(raw.krName)
      if (raw.className) data.className = String(raw.className)
      if (raw.classId != null) data.classId = Number(raw.classId)
      if (raw.description) data.description = String(raw.description)
      if (raw.command) data.command = String(raw.command)
      if (raw.cooldown) data.cooldown = String(raw.cooldown)
      if (raw.cooldownSec != null) data.cooldownSec = Number(raw.cooldownSec)
      if (raw.requiredLevel != null) data.requiredLevel = Number(raw.requiredLevel)
      if (raw.maxLevel != null) data.maxLevel = Number(raw.maxLevel)
      if (raw.skillPoints != null) data.skillPoints = Number(raw.skillPoints)
      if (raw.pvpDamagePercent != null) data.pvpDamagePercent = Number(raw.pvpDamagePercent)
      if (raw.iconPath) data.iconPath = String(raw.iconPath)
      if (raw.videoUrl) data.videoUrl = String(raw.videoUrl)
      if (raw.animationDurationMs != null) data.animationDurationMs = Number(raw.animationDurationMs)
      if (raw.isQuickSlot != null) data.isQuickSlot = Boolean(raw.isQuickSlot)
      if (raw.isAbsolute != null) data.isAbsolute = Boolean(raw.isAbsolute)
      if (raw.isAwakening != null) data.isAwakening = Boolean(raw.isAwakening)
      if (raw.isSuccession != null) data.isSuccession = Boolean(raw.isSuccession)
      if (raw.isBlackSpirit != null) data.isBlackSpirit = Boolean(raw.isBlackSpirit)
      if (raw.isPassive != null) data.isPassive = Boolean(raw.isPassive)

      // CC types: accept string or array
      if (raw.ccTypes) {
        data.ccTypes = Array.isArray(raw.ccTypes) ? raw.ccTypes.join(',') : String(raw.ccTypes)
      }
      if (raw.protectionTypes) {
        data.protectionTypes = Array.isArray(raw.protectionTypes)
          ? raw.protectionTypes.join(',')
          : String(raw.protectionTypes)
      }

      // Damage rows: accept array, store as JSON
      if (raw.damageRows && Array.isArray(raw.damageRows)) {
        data.damageRowsJson = JSON.stringify(raw.damageRows)
      } else if (raw.damageRowsJson) {
        data.damageRowsJson = String(raw.damageRowsJson)
      }

      data.syncedAt = new Date()

      await db.skill.upsert({
        where: { skillId: raw.skillId },
        create: { skillId: raw.skillId, ...data },
        update: data,
      })
      upserted++
    } catch (err) {
      errors.push(`skillId ${raw.skillId}: ${(err as Error).message}`)
      skipped++
    }
  }

  // Log the upload
  await db.syncLog.create({
    data: {
      type: 'upload_json',
      status: upserted > 0 ? 'success' : 'error',
      count: upserted,
      total: skills.length,
      message: `Uploaded ${source}: ${upserted} upserted, ${skipped} skipped`,
    },
  })

  return NextResponse.json({
    ok: true,
    source,
    total: skills.length,
    upserted,
    skipped,
    errors: errors.slice(0, 10),
  })
}

function extractSkillsArray(parsed: any): any[] {
  if (Array.isArray(parsed)) return parsed
  if (parsed.skills && Array.isArray(parsed.skills)) return parsed.skills
  if (parsed.data && Array.isArray(parsed.data)) return parsed.data
  if (parsed.aaData && Array.isArray(parsed.aaData)) {
    // bdocodex query.php format: [[skillId, iconHtml, nameHtml, level, className, 1], ...]
    return parsed.aaData.map((row: any[]) => ({
      skillId: row[0],
      name: row[2]?.replace(/<[^>]+>/g, ''),
      requiredLevel: row[3],
      className: row[4],
    }))
  }
  return []
}
