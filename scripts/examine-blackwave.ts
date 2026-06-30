import { db } from '../src/lib/db'
async function main() {
  const skill = await db.skill.findFirst({ where: { name: { contains: 'Prime: Black Wave III' } } })
  if (!skill) { console.log('Not found'); return }
  console.log(`Skill ${skill.skillId}: ${skill.name}`)
  console.log(`PvP: ${skill.pvpDamagePercent}%`)
  if (skill.damageRowsJson) {
    const rows = JSON.parse(skill.damageRowsJson)
    console.log(`\nDamage rows:`)
    for (const r of rows) {
      console.log(`  [${r.kind}] ${r.label}${r.value ? ' = ' + r.value : ''}${r.pvpOnly ? ' (PvP)' : ''}${r.pveOnly ? ' (PvE)' : ''}`)
    }
  }
  await db.$disconnect()
}
main().catch(console.error)
