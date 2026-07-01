import { db } from '../src/lib/db'
async function main() {
  const skill = await db.skill.findUnique({ where: { skillId: 9042 } })
  if (!skill) { console.log('Not found'); return }
  console.log(`Skill ${skill.skillId}: ${skill.name}`)
  console.log(`PvP: ${skill.pvpDamagePercent}%`)
  console.log(`Description: ${skill.description?.slice(0, 200)}`)
  if (skill.damageRowsJson) {
    const rows = JSON.parse(skill.damageRowsJson)
    console.log(`\nDamage rows (${rows.length}):`)
    for (const r of rows) {
      console.log(`  [${r.kind}] ${r.label}${r.value ? ' = ' + r.value : ''}${r.pvpOnly ? ' (PvP)' : ''}${r.pveOnly ? ' (PvE)' : ''}`)
    }
  }
  await db.$disconnect()
}
main().catch(console.error)
