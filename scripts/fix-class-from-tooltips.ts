// Re-scrape the correct class for every skill from bdocodex tooltips.
//
// ROOT CAUSE:
// bdocodex assigns skills to the classId of the tree page they appear on
// (e.g. a Dark Knight Prime: skill appears on the Sorceress succession tree
// page, so bdocodex's API returns classId=8 for it). But the TOOLTIP page
// (tip.php) has the correct class in the `tag_required_class` field.
//
// FIX:
// For each skill, fetch tip.php, extract the class name, look up the
// correct classId from BdoClass table, and update the DB.
//
// Rate limiting: 3 requests/second to avoid hammering bdocodex.
// Usage: bun run scripts/fix-class-from-tooltips.ts

import { db } from '../src/lib/db'
import { setTimeout as sleep } from 'node:timers/promises'

const BATCH_SIZE = 50
const RATE_LIMIT_MS = 350 // ~3 req/sec

async function fetchTooltipClass(skillId: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://bdocodex.com/tip.php?id=skill--${skillId}&l=us&nf=on`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'text/html',
        },
        signal: AbortSignal.timeout(10000),
      },
    )
    if (!res.ok) return null
    const html = await res.text()
    // Extract class from: <span class="tag_required_class">ClassName</span>
    const match = html.match(/tag_required_class[^>]*>\s*([^<]+)/i)
    const className = match?.[1]?.trim()
    return className || null
  } catch {
    return null
  }
}

async function main() {
  console.log('=== Fix classId from bdocodex tooltips ===\n')

  // Build className → classId map
  const classes = await db.bdoClass.findMany({ select: { id: true, name: true } })
  const nameToId = new Map<string, number>(classes.map((c) => [c.name, c.id]))
  console.log(`Loaded ${classes.length} classes`)

  // Get all skills
  const allSkills = await db.skill.findMany({
    select: { skillId: true, name: true, classId: true, className: true },
    orderBy: { skillId: 'asc' },
  })
  console.log(`Total skills to process: ${allSkills.length}\n`)

  let processed = 0
  let fixed = 0
  let unchanged = 0
  let failed = 0
  const failedIds: number[] = []

  for (let i = 0; i < allSkills.length; i++) {
    const s = allSkills[i]

    if ((i + 1) % 100 === 0) {
      console.log(
        `Progress: ${i + 1}/${allSkills.length} | fixed:${fixed} unchanged:${unchanged} failed:${failed}`,
      )
    }

    const tooltipClass = await fetchTooltipClass(s.skillId)

    if (!tooltipClass) {
      failed++
      failedIds.push(s.skillId)
      await sleep(RATE_LIMIT_MS)
      continue
    }

    // Handle multi-class tooltips like "Musa, Dosa" — pick the first class
    const primaryClass = tooltipClass.split(',')[0].trim()
    const correctClassId = nameToId.get(primaryClass)

    if (correctClassId == null) {
      // Class name from tooltip doesn't match any known class — skip
      failed++
      failedIds.push(s.skillId)
      await sleep(RATE_LIMIT_MS)
      continue
    }

    if (correctClassId === s.classId) {
      unchanged++
    } else {
      // Mismatch — update the DB
      await db.skill.update({
        where: { skillId: s.skillId },
        data: {
          classId: correctClassId,
          className: primaryClass,
        },
      })
      fixed++
      if (fixed <= 30) {
        console.log(
          `  FIXED: ${s.name} (${s.skillId}) | ${s.classId}:${s.className} → ${correctClassId}:${primaryClass}`,
        )
      }
    }

    processed++
    await sleep(RATE_LIMIT_MS)
  }

  console.log(`\n=== Summary ===`)
  console.log(`Processed: ${processed}`)
  console.log(`Fixed: ${fixed}`)
  console.log(`Unchanged: ${unchanged}`)
  console.log(`Failed: ${failed}`)
  if (failedIds.length > 0) {
    console.log(`\nFailed skill IDs (first 20): ${failedIds.slice(0, 20).join(', ')}`)
  }
}

main()
  .catch((e) => {
    console.error('FAILED:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
