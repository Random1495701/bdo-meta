// Re-scrape the correct class for every skill from bdocodex tooltips.
// v2: parallel fetches + resume capability.
//
// Usage: bun run scripts/fix-class-from-tooltips-v2.ts
// Resume: re-run the same command — it skips already-fixed skills.

import { db } from '../src/lib/db'
import { writeFileSync, readFileSync, existsSync } from 'node:fs'

const PROGRESS_FILE = '/tmp/fix-class-progress.json'
const CONCURRENCY = 5
const RATE_LIMIT_MS = 100 // per request, with 5 concurrent = ~50 req/sec

interface Progress {
  lastProcessedIndex: number
  fixed: number
  unchanged: number
  failed: number
  failedIds: number[]
}

function loadProgress(): Progress {
  if (existsSync(PROGRESS_FILE)) {
    try {
      return JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8'))
    } catch {}
  }
  return { lastProcessedIndex: 0, fixed: 0, unchanged: 0, failed: 0, failedIds: [] }
}

function saveProgress(p: Progress) {
  writeFileSync(PROGRESS_FILE, JSON.stringify(p))
}

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
    const match = html.match(/tag_required_class[^>]*>\s*([^<]+)/i)
    return match?.[1]?.trim() || null
  } catch {
    return null
  }
}

async function main() {
  console.log('=== Fix classId from bdocodex tooltips (v2 parallel) ===\n')

  const classes = await db.bdoClass.findMany({ select: { id: true, name: true } })
  const nameToId = new Map<string, number>(classes.map((c) => [c.name, c.id]))

  const allSkills = await db.skill.findMany({
    select: { skillId: true, name: true, classId: true, className: true },
    orderBy: { skillId: 'asc' },
  })
  console.log(`Total skills: ${allSkills.length}`)

  const progress = loadProgress()
  console.log(
    `Resuming from index ${progress.lastProcessedIndex} | fixed:${progress.fixed} unchanged:${progress.unchanged} failed:${progress.failed}\n`,
  )

  // Process in batches of CONCURRENCY
  const batchSize = CONCURRENCY
  for (let i = progress.lastProcessedIndex; i < allSkills.length; i += batchSize) {
    const batch = allSkills.slice(i, i + batchSize)

    // Fetch all tooltips in parallel
    const results = await Promise.all(
      batch.map(async (s) => ({
        skill: s,
        tooltipClass: await fetchTooltipClass(s.skillId),
      })),
    )

    for (const { skill, tooltipClass } of results) {
      if (!tooltipClass) {
        progress.failed++
        progress.failedIds.push(skill.skillId)
        continue
      }

      const primaryClass = tooltipClass.split(',')[0].trim()
      const correctClassId = nameToId.get(primaryClass)

      if (correctClassId == null) {
        progress.failed++
        progress.failedIds.push(skill.skillId)
        continue
      }

      if (correctClassId === skill.classId) {
        progress.unchanged++
      } else {
        await db.skill.update({
          where: { skillId: skill.skillId },
          data: { classId: correctClassId, className: primaryClass },
        })
        progress.fixed++
        if (progress.fixed <= 30) {
          console.log(
            `  FIXED: ${skill.name} (${skill.skillId}) | ${skill.classId}:${skill.className} → ${correctClassId}:${primaryClass}`,
          )
        }
      }
    }

    progress.lastProcessedIndex = i + batch.length

    // Log progress every 500 skills
    if (progress.lastProcessedIndex % 500 < batchSize) {
      console.log(
        `Progress: ${progress.lastProcessedIndex}/${allSkills.length} | fixed:${progress.fixed} unchanged:${progress.unchanged} failed:${progress.failed}`,
      )
    }

    // Save progress every batch
    saveProgress(progress)

    // Small delay between batches
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS))
  }

  console.log(`\n=== Summary ===`)
  console.log(`Processed: ${progress.lastProcessedIndex}`)
  console.log(`Fixed: ${progress.fixed}`)
  console.log(`Unchanged: ${progress.unchanged}`)
  console.log(`Failed: ${progress.failed}`)
  if (progress.failedIds.length > 0) {
    console.log(`Failed IDs (first 20): ${progress.failedIds.slice(0, 20).join(', ')}`)
  }

  // Clean up progress file on completion
  if (progress.failed === 0 || progress.lastProcessedIndex >= allSkills.length) {
    try {
      unlinkSync(PROGRESS_FILE)
    } catch {}
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
