import { db } from '../src/lib/db'
async function main() {
  const skills = await db.skill.findMany({
    where: { damageRowsJson: { not: null } },
    select: { skillId: true, name: true, damageRowsJson: true, ccTypes: true },
    take: 100,
  })
  let pveCcCount = 0
  for (const s of skills) {
    const rows = JSON.parse(s.damageRowsJson!)
    for (const r of rows) {
      if (r.kind === 'cc' && r.pveOnly) {
        pveCcCount++
        if (pveCcCount <= 5) {
          console.log(`  ${s.skillId} ${s.name}: CC "${r.label}" is PvE-only`)
        }
      }
    }
  }
  console.log(`\nTotal PvE-only CC rows in 100 skills: ${pveCcCount}`)
  await db.$disconnect()
}
main().catch(console.error)
