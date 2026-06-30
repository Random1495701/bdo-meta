#!/usr/bin/env bun
// DB backup + git commit script — exports DB to JSON and commits to git.
// Run manually or via cron:
//   bun run scripts/backup.ts
//
// To push to GitHub, set the GH_TOKEN env var or configure git credentials:
//   GH_TOKEN=ghp_xxx bun run scripts/backup.ts --push

import { db } from '../src/lib/db'
import { writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

async function main() {
  console.log('=== BDO Meta Backup ===')
  const timestamp = new Date().toISOString()

  // 1. Export DB to JSON
  console.log('[1/3] Exporting DB to JSON...')
  const skills = await db.skill.findMany()
  const classes = await db.bdoClass.findMany()
  const exportData = {
    exportedAt: timestamp,
    source: 'backup script',
    total: skills.length,
    skills: skills.map(s => ({
      skillId: s.skillId,
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
      damageRowsJson: s.damageRowsJson,
      ccTypes: s.ccTypes,
      protectionTypes: s.protectionTypes,
      pvpDamagePercent: s.pvpDamagePercent,
      isQuickSlot: s.isQuickSlot,
      isAbsolute: s.isAbsolute,
      isAwakening: s.isAwakening,
      isSuccession: s.isSuccession,
      isBlackSpirit: s.isBlackSpirit,
      isPassive: s.isPassive,
      isFlow: s.isFlow,
      isCore: s.isCore,
      groupId: s.groupId,
      prerequisiteIds: s.prerequisiteIds,
      videoUrl: s.videoUrl,
      animationDurationMs: s.animationDurationMs,
      addonsJson: s.addonsJson,
    })),
    classes: classes.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      combatType: c.combatType,
      successionGroup: c.successionGroup,
      awakeningGroup: c.awakeningGroup,
      ascensionGroup: c.ascensionGroup,
      successionSaDr: c.successionSaDr,
      awakeningSaDr: c.awakeningSaDr,
      ascensionSaDr: c.ascensionSaDr,
      isAscension: c.isAscension,
    })),
  }
  writeFileSync('db/skills-export.json', JSON.stringify(exportData, null, 2))
  console.log(`  ✓ Exported ${skills.length} skills, ${classes.length} classes`)

  await db.$disconnect()

  // 2. Git commit
  console.log('[2/3] Committing to git...')
  try {
    execSync('git add -A', { stdio: 'pipe' })
    const status = execSync('git status --short', { stdio: 'pipe' }).toString().trim()
    if (status) {
      execSync(`git commit -m "Backup: ${timestamp} — ${skills.length} skills"`, { stdio: 'pipe' })
      console.log('  ✓ Committed changes')
    } else {
      console.log('  - No changes to commit')
    }
  } catch (err) {
    console.log('  - Git commit failed:', (err as Error).message)
  }

  // 3. Push to GitHub (if token provided)
  const pushFlag = process.argv.includes('--push')
  const ghToken = process.env.GH_TOKEN
  if (pushFlag || ghToken) {
    console.log('[3/3] Pushing to GitHub...')
    try {
      if (ghToken) {
        // Use token in the remote URL temporarily
        execSync('git push https://Random1495701:' + ghToken + '@github.com/Random1495701/bdo-meta.git main', { stdio: 'pipe' })
      } else {
        execSync('git push origin main', { stdio: 'pipe' })
      }
      console.log('  ✓ Pushed to GitHub')
    } catch (err) {
      console.log('  ✗ Push failed:', (err as Error).message)
      console.log('  Set GH_TOKEN env var or configure git credentials to push.')
    }
  } else {
    console.log('[3/3] Skipping push (use --push or set GH_TOKEN)')
  }

  console.log('\n=== Backup complete ===')
  console.log(`  Timestamp: ${timestamp}`)
  console.log(`  Skills: ${skills.length}`)
  console.log(`  Classes: ${classes.length}`)
}

main().catch(e => { console.error(e); process.exit(1) })
