#!/usr/bin/env bun
/**
 * Upsert PAZ-sourced skill data into the BDO Meta DB.
 * Updates cooldown + CC types for existing skills (matched by skillId),
 * preserving all other fields (name, className, damage rows, PvP%, etc.).
 * Creates new skills if they don't exist.
 *
 * Usage:
 *   bun run scripts/paz-tools/upsert-paz-skills.ts
 *   bun run scripts/paz-tools/upsert-paz-skills.ts --dry-run  # preview without writing
 *   bun run scripts/paz-tools/upsert-paz-skills.ts --only-cooldown  # skip CC
 */

import { db } from '../../src/lib/db'
import { readFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    'dry-run': { type: 'boolean', default: false },
    'only-cooldown': { type: 'boolean', default: false },
  },
})

async function main() {
  const dryRun = values['dry-run']
  const onlyCooldown = values['only-cooldown']

  console.log(`Loading data/paz-skills.json...${dryRun ? ' (DRY RUN)' : ''}`)
  const { skills } = JSON.parse(await readFile('./data/paz-skills.json', 'utf-8'))
  console.log(`  ${skills.length} skills to upsert`)

  // Get existing skills to know which to update vs create
  const existing = await db.skill.findMany({
    select: { skillId: true, name: true, cooldownSec: true, ccTypes: true },
  })
  const existingIds = new Set(existing.map(s => s.skillId))
  console.log(`  ${existingIds.size} existing skills in DB`)

  let updated = 0
  let created = 0
  let unchanged = 0
  let skipped = 0
  let cooldownUpdated = 0
  let ccUpdated = 0
  const changes: Array<{ skillId: number, name: string, field: string, oldVal: any, newVal: any }> = []

  for (const pazSkill of skills) {
    const skillId = pazSkill.skillId
    const cooldownSec = pazSkill.cooldownSec
    const ccTypes = pazSkill.ccTypes

    // Skip skills with no name (can't create without a name)
    if (!pazSkill.name || pazSkill.name.trim() === '') {
      skipped++
      continue
    }

    if (existingIds.has(skillId)) {
      // UPDATE — only cooldown + CC, preserve everything else
      const updateData: any = {}
      const existingSkill = existing.find(s => s.skillId === skillId)!

      // Cooldown: update if PAZ has a non-null value that differs.
      // PAZ convention: 0 = no cooldown. DB convention: null = no cooldown (0 skills have cd=0).
      // So we convert PAZ 0 → null to stay consistent with the DB.
      const pazCd = cooldownSec === 0 ? null : cooldownSec
      if (pazCd !== null && pazCd !== undefined && pazCd !== existingSkill.cooldownSec) {
        updateData.cooldownSec = pazCd
        cooldownUpdated++
        changes.push({ skillId, name: pazSkill.name, field: 'cooldownSec', oldVal: existingSkill.cooldownSec, newVal: pazCd })
      }

      // Animation: update if PAZ has a value (from .paa files via BT_ string matching)
      const animMs = pazSkill.animationDurationMs
      if (animMs !== null && animMs !== undefined && animMs > 0) {
        // Only update if the existing value is null or differs significantly (>10% diff)
        const existing = await db.skill.findUnique({ where: { skillId }, select: { animationDurationMs: true } })
        const existingAnim = existing?.animationDurationMs
        if (existingAnim === null || existingAnim === 0 || Math.abs((existingAnim - animMs) / animMs) > 0.1) {
          updateData.animationDurationMs = animMs
          changes.push({ skillId, name: pazSkill.name, field: 'animationDurationMs', oldVal: existingAnim, newVal: animMs })
        }
      }

      // CC types: update if PAZ has a value (even if null → update to clear)
      if (!onlyCooldown && ccTypes !== existingSkill.ccTypes) {
        // Only update if PAZ has a non-null value (don't overwrite existing CC with null)
        if (ccTypes !== null) {
          updateData.ccTypes = ccTypes
          ccUpdated++
          changes.push({ skillId, name: pazSkill.name, field: 'ccTypes', oldVal: existingSkill.ccTypes, newVal: ccTypes })
        }
      }

      if (Object.keys(updateData).length > 0) {
        if (!dryRun) {
          await db.skill.update({
            where: { skillId },
            data: updateData,
          })
        }
        updated++
      } else {
        unchanged++
      }
    } else {
      // CREATE — new skill from PAZ data
      const newSkill: any = {
        skillId,
        name: pazSkill.name,
        description: pazSkill.description,
        isPassive: pazSkill.kind === 2,
        cooldownSec: cooldownSec === 0 ? null : cooldownSec,
        ccTypes: ccTypes,
      }
      if (!dryRun) {
        await db.skill.create({ data: newSkill })
      }
      created++
    }
  }

  console.log(`\n=== ${dryRun ? 'DRY RUN ' : ''}results ===`)
  console.log(`  updated: ${updated}`)
  console.log(`  created: ${created}`)
  console.log(`  unchanged: ${unchanged}`)
  console.log(`  skipped (no name): ${skipped}`)
  console.log(`  cooldown fields updated: ${cooldownUpdated}`)
  console.log(`  cc fields updated: ${ccUpdated}`)

  if (changes.length > 0) {
    console.log(`\n=== first 15 field changes ===`)
    for (const c of changes.slice(0, 15)) {
      console.log(`  skill ${c.skillId} '${c.name.slice(0, 30)}': ${c.field} ${JSON.stringify(c.oldVal)} → ${JSON.stringify(c.newVal)}`)
    }
    if (changes.length > 15) console.log(`  ... and ${changes.length - 15} more`)
  }

  await db.$disconnect()
  console.log(`\n${dryRun ? '(dry run — no changes written)' : 'Done.'}`)
}

main().catch(e => { console.error(e); process.exit(1) })
