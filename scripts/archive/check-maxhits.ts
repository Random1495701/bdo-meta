import { db } from '../src/lib/db'
async function main() {
  // Find skills where [damage] kind has "max" in the value
  const skills = await db.skill.findMany({
    where: { damageRowsJson: { contains: 'max' } },
    select: { skillId: true, name: true, damageRowsJson: true },
    take: 5,
  })
  for (const s of skills) {
    const rows = JSON.parse(s.damageRowsJson!)
    const damageRows = rows.filter((r: any) => r.kind === 'damage')
    const noteDamage = rows.filter((r: any) => r.kind === 'note' && r.label.toLowerCase().includes('damage') && r.label.toLowerCase().includes('max'))
    console.log(`${s.skillId} ${s.name}:`)
    for (const r of damageRows) {
      if (r.value && r.value.includes('max')) {
        console.log(`  [damage] ${r.label}: ${r.value}`)
      }
    }
    for (const r of noteDamage) {
      console.log(`  [note] ${r.label}`)
    }
  }
  await db.$disconnect()
}
main().catch(console.error)
