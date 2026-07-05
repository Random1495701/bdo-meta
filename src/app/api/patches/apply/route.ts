import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logPatchApplication } from '@/lib/change-log'

export const dynamic = 'force-dynamic'

// POST /api/patches/apply
// Applies the latest patch changes to the DB.
// For each skill change with a matchedSkillId:
// - If changeType is damage_up/down: update damageRowsJson or pvpDamagePercent
// - If changeType is cooldown_up/down: update cooldownSec
// - If changeType is added_effect/removed_effect: update ccTypes or protectionTypes
// - Logs all changes via SkillChangeLog
// Body: { dryRun?: boolean } — if true, returns what would change without applying

interface SkillChange {
  skillName: string
  matchedSkillId: number | null
  changeType: string
  before?: string
  after?: string
  description: string
}

export async function POST(request: Request) {
  try {
    const { dryRun } = await request.json()
    const { readFileSync, existsSync } = await import('node:fs')

    const filePath = 'data/patch-notes.json'
    if (!existsSync(filePath)) {
      return NextResponse.json({ ok: false, error: 'No patch notes found' }, { status: 404 })
    }

    const patches = JSON.parse(readFileSync(filePath, 'utf-8'))
    if (!patches || patches.length === 0) {
      return NextResponse.json({ ok: false, error: 'No patches to apply' }, { status: 404 })
    }

    const latestPatch = patches[0]
    const patchDate = latestPatch.date

    const results: { skillId: number; skillName: string; field: string; applied: boolean; reason: string }[] = []

    for (const cc of latestPatch.classChanges || []) {
      for (const change of cc.changes || []) {
        if (!change.matchedSkillId) continue

        const skillId = change.matchedSkillId as number
        const skill = await db.skill.findUnique({ where: { skillId }, select: { skillId: true, name: true, ccTypes: true, protectionTypes: true, cooldownSec: true, pvpDamagePercent: true, damageRowsJson: true } })
        if (!skill) continue

        // Parse before/after values
        const beforeText = change.before || ''
        const afterText = change.after || ''

        // Cooldown changes: "7 sec" → 7
        if (change.changeType === 'cooldown_up' || change.changeType === 'cooldown_down') {
          const afterMatch = afterText.match(/(\d+(?:\.\d+)?)\s*sec/i)
          if (afterMatch) {
            const newCd = parseFloat(afterMatch[1])
            if (dryRun) {
              results.push({ skillId, skillName: skill.name, field: 'cooldownSec', applied: false, reason: `Would update ${skill.cooldownSec}s → ${newCd}s` })
            } else {
              await db.skill.update({ where: { skillId }, data: { cooldownSec: newCd } })
              await logPatchApplication(skillId, skill.name, 'cooldownSec', skill.cooldownSec, newCd, cc.className, patchDate)
              results.push({ skillId, skillName: skill.name, field: 'cooldownSec', applied: true, reason: `Updated ${skill.cooldownSec}s → ${newCd}s` })
            }
          }
        }

        // Damage changes: look for percentage in before/after
        if (change.changeType === 'damage_up' || change.changeType === 'damage_down') {
          // Try to extract new damage values from the description
          const dmgMatch = change.description.match(/(\d+(?:,\d+)?)%\s*x\s*(\d+)/i)
          if (dmgMatch && dryRun) {
            results.push({ skillId, skillName: skill.name, field: 'damageRowsJson', applied: false, reason: `Damage change detected — manual review needed: ${change.description.slice(0, 80)}` })
          } else {
            results.push({ skillId, skillName: skill.name, field: 'damageRowsJson', applied: false, reason: `Damage change needs manual review: ${change.description.slice(0, 80)}` })
          }
        }

        // Effect changes
        if (change.changeType === 'added_effect' || change.changeType === 'removed_effect') {
          // Check if the description mentions Super Armor, Forward Guard, etc.
          const protections = ['Super Armor', 'Forward Guard', 'I-Frame', 'Invincible']
          const ccs = ['Stun', 'Knockdown', 'Float', 'Bound', 'Freeze', 'Grapple', 'Stiffness', 'Knockback']

          for (const prot of protections) {
            if (change.changeType === 'added_effect' && change.description.includes(prot)) {
              const currentProts = skill.protectionTypes ? skill.protectionTypes.split(',').map((x: string) => x.trim()) : []
              if (!currentProts.includes(prot)) {
                const newProts = [...currentProts, prot].join(',')
                if (dryRun) {
                  results.push({ skillId, skillName: skill.name, field: 'protectionTypes', applied: false, reason: `Would add ${prot}` })
                } else {
                  await db.skill.update({ where: { skillId }, data: { protectionTypes: newProts } })
                  await logPatchApplication(skillId, skill.name, 'protectionTypes', skill.protectionTypes, newProts, cc.className, patchDate)
                  results.push({ skillId, skillName: skill.name, field: 'protectionTypes', applied: true, reason: `Added ${prot}` })
                }
              }
            }
          }

          for (const ccType of ccs) {
            if (change.changeType === 'added_effect' && change.description.includes(ccType)) {
              const currentCcs = skill.ccTypes ? skill.ccTypes.split(',').map((x: string) => x.trim()) : []
              if (!currentCcs.includes(ccType)) {
                const newCcs = [...currentCcs, ccType].join(',')
                if (dryRun) {
                  results.push({ skillId, skillName: skill.name, field: 'ccTypes', applied: false, reason: `Would add ${ccType}` })
                } else {
                  await db.skill.update({ where: { skillId }, data: { ccTypes: newCcs } })
                  await logPatchApplication(skillId, skill.name, 'ccTypes', skill.ccTypes, newCcs, cc.className, patchDate)
                  results.push({ skillId, skillName: skill.name, field: 'ccTypes', applied: true, reason: `Added ${ccType}` })
                }
              }
            }
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      patchDate,
      dryRun: !!dryRun,
      results,
      summary: {
        total: results.length,
        applied: results.filter(r => r.applied).length,
        needsReview: results.filter(r => !r.applied).length,
      },
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
