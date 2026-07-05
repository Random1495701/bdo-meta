// Verify all skills have self-hosted icons in /public/icons/skills/
// Usage: bun run scripts/verify-icons.ts

import { db } from '../src/lib/db'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

function iconBasename(iconPath: string | null): string | null {
  if (!iconPath) return null
  if (iconPath.startsWith('http')) return null
  const basename = iconPath.split('/').pop()?.replace(/\.\w+$/, '')
  return basename || null
}

async function main() {
  console.log('=== Icon Coverage Verification ===')

  const skills = await db.skill.findMany({
    select: { skillId: true, name: true, iconPath: true },
    orderBy: { skillId: 'asc' },
  })
  console.log(`Total skills: ${skills.length}`)

  const iconsDir = join(process.cwd(), 'public', 'icons', 'skills')
  let withIconPath = 0
  let existing = 0
  let missing = 0
  const missingList: { skillId: number; name: string; expectedPath: string }[] = []
  const uniqueBasenames = new Set<string>()

  for (const s of skills) {
    const basename = iconBasename(s.iconPath)
    if (!basename) continue
    withIconPath++
    uniqueBasenames.add(basename)
    const filePath = join(iconsDir, `${basename}.webp`)
    if (existsSync(filePath)) {
      existing++
    } else {
      missing++
      if (missingList.length < 20) {
        missingList.push({ skillId: s.skillId, name: s.name, expectedPath: filePath })
      }
    }
  }

  console.log(`Skills with iconPath: ${withIconPath}`)
  console.log(`Unique icon basenames: ${uniqueBasenames.size}`)
  console.log(`Existing icon files: ${existing}`)
  console.log(`Missing icon files: ${missing}`)
  const coverage = withIconPath > 0 ? Math.round((existing / withIconPath) * 100) : 0
  console.log(`Coverage: ${coverage}%`)

  if (missing > 0) {
    console.log(`\nFirst ${missingList.length} missing icons:`)
    for (const m of missingList) {
      console.log(`  ${m.skillId} ${m.name} → ${m.expectedPath}`)
    }
  }

  await db.$disconnect()
  console.log('\n=== Done ===')
}

main().catch(e => { console.error(e); process.exit(1) })
