// DB-export-vs-DB sanity check.
// Compares db/skills-export.json skill count vs live DB skill count.
// Run on dev startup to detect if the export is stale (which would cause
// catastrophic data loss if restore-db.ts is triggered).
//
// Usage: bun run scripts/sanity-check.ts

import { db } from '../src/lib/db'
import { readFileSync, existsSync } from 'node:fs'

async function main() {
  console.log('=== DB Export Sanity Check ===')

  const dbCount = await db.skill.count()
  console.log(`  DB skill count: ${dbCount}`)

  const exportPath = 'db/skills-export.json'
  if (!existsSync(exportPath)) {
    console.log('  ⚠️ No export file found')
    await db.$disconnect()
    return
  }

  const raw = readFileSync(exportPath, 'utf-8')
  const data = JSON.parse(raw)
  const exportCount = data.skills ? data.skills.length : 0
  console.log(`  Export skill count: ${exportCount}`)

  const diff = Math.abs(dbCount - exportCount)
  const pct = dbCount > 0 ? Math.round((diff / dbCount) * 100) : 0

  if (pct > 5) {
    console.log(`  ❌ MISMATCH: ${diff} skills difference (${pct}%)`)
    console.log('  ⚠️  If restore-db.ts runs, the DB will be overwritten with the export!')
    console.log('  Fix: Run `bun run scripts/export-db.ts` to regenerate the export.')
    process.exit(1)
  } else if (diff > 0) {
    console.log(`  ⚠️ Minor mismatch: ${diff} skills (${pct}%) — acceptable`)
  } else {
    console.log('  ✅ Export matches DB')
  }

  await db.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
