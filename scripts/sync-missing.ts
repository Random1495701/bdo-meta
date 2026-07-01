import { db } from '../src/lib/db'
import { readFileSync } from 'node:fs'

async function main() {
  console.log('=== Targeted Missing Skill Sync ===')
  
  // Get all skill IDs from sitemap
  const allIds = readFileSync('/tmp/all-skill-ids.txt', 'utf-8').trim().split('\n').map(Number)
  const combatIds = allIds.filter(id => id <= 10000)
  console.log(`Bdocodex combat skills: ${combatIds.length}`)
  
  // Get DB skill IDs
  const dbSkills = await db.skill.findMany({ select: { skillId: true } })
  const dbIds = new Set(dbSkills.map(s => s.skillId))
  const missing = combatIds.filter(id => !dbIds.has(id))
  console.log(`Missing from DB: ${missing.length}`)
  console.log(`First 20: ${missing.slice(0, 20).join(', ')}`)
  
  // Insert missing skill IDs with just skillId + name (will be enriched later)
  let inserted = 0
  for (const skillId of missing) {
    try {
      await db.skill.upsert({
        where: { skillId },
        create: { skillId, name: `Skill ${skillId}`, syncedAt: new Date() },
        update: {},
      })
      inserted++
      if (inserted % 500 === 0) console.log(`  inserted ${inserted}/${missing.length}`)
    } catch (e) {
      // Skip errors
    }
  }
  console.log(`\nInserted ${inserted} missing skill IDs`)
  console.log('These skills have no data yet — need to be enriched by the lurker.')
  
  const total = await db.skill.count()
  console.log(`Total skills in DB: ${total}`)
  await db.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
