// Backfill animationDurationMs for skills with videoUrl but no duration.
//
// Downloads each skill's preview video from bdocodex, runs ffprobe to get
// the duration in milliseconds, and updates the DB.
//
// Usage: bun run scripts/backfill-animations.ts

import { db } from '../src/lib/db'
import { execSync } from 'node:child_process'
import { writeFileSync, unlinkSync, existsSync } from 'node:fs'

const TMP_FILE = '/tmp/bdo-skill-video.webm'

async function main() {
  const skills = await db.skill.findMany({
    where: { videoUrl: { not: null }, animationDurationMs: null },
    select: { skillId: true, name: true, videoUrl: true, className: true },
  })
  console.log(`=== Backfill animation durations for ${skills.length} skills ===\n`)

  let success = 0
  let failed = 0
  const failedList: { skillId: number; name: string; error: string }[] = []

  for (let i = 0; i < skills.length; i++) {
    const s = skills[i]
    process.stdout.write(
      `[${i + 1}/${skills.length}] ${s.name} (${s.skillId})... `,
    )

    try {
      // Download the video
      execSync(`curl -s -L -o "${TMP_FILE}" "${s.videoUrl}"`, {
        timeout: 30000,
        stdio: 'pipe',
      })

      if (!existsSync(TMP_FILE)) {
        throw new Error('download failed — file not found')
      }

      // Run ffprobe to get duration in seconds
      const durationStr = execSync(
        `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${TMP_FILE}"`,
        { encoding: 'utf-8', timeout: 10000 },
      ).trim()

      const durationSec = parseFloat(durationStr)
      if (isNaN(durationSec) || durationSec <= 0) {
        throw new Error(`invalid duration: ${durationStr}`)
      }

      const durationMs = Math.round(durationSec * 1000)

      // Update DB
      await db.skill.update({
        where: { skillId: s.skillId },
        data: { animationDurationMs: durationMs },
      })

      console.log(`${durationMs}ms`)
      success++

      // Clean up
      try {
        unlinkSync(TMP_FILE)
      } catch {}
    } catch (e: any) {
      console.log(`FAILED: ${e.message}`)
      failed++
      failedList.push({
        skillId: s.skillId,
        name: s.name,
        error: e.message?.substring(0, 100) || 'unknown',
      })
    }

    // Small delay to avoid hammering bdocodex
    await new Promise((r) => setTimeout(r, 200))
  }

  console.log(`\n=== Summary ===`)
  console.log(`Success: ${success}`)
  console.log(`Failed: ${failed}`)

  if (failedList.length > 0) {
    console.log(`\nFailed skills:`)
    for (const f of failedList) {
      console.log(`  ${f.name} (${f.skillId}): ${f.error}`)
    }
  }

  // Final count
  const stillMissing = await db.skill.count({
    where: { videoUrl: { not: null }, animationDurationMs: null },
  })
  console.log(`\nSkills still missing animation: ${stillMissing}`)
}

main()
  .catch((e) => {
    console.error('FAILED:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
