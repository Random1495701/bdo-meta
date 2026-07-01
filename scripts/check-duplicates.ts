import { db } from '../src/lib/db'
async function main() {
  const skills = await db.skill.findMany({
    where: { damageRowsJson: { not: null } },
    select: { skillId: true, name: true, className: true, damageRowsJson: true },
  })
  
  let dupCount = 0
  const dupClasses = new Map<string, number>()
  
  for (const s of skills) {
    const rows = JSON.parse(s.damageRowsJson!)
    const damageRows = rows.filter((r: any) => r.kind === 'damage')
    
    // Count "Attack 1" occurrences
    const attack1s = damageRows.filter((r: any) => r.label.toLowerCase().includes('attack 1'))
    if (attack1s.length > 1) {
      dupCount++
      const cls = s.className || 'Unknown'
      dupClasses.set(cls, (dupClasses.get(cls) || 0) + 1)
      if (dupCount <= 10) {
        console.log(`  ${s.skillId} ${s.name} (${s.className}): ${attack1s.length}x "Attack 1"`)
      }
    }
  }
  
  console.log(`\nTotal skills with duplicate Attack 1: ${dupCount}`)
  console.log('By class:')
  for (const [cls, count] of [...dupClasses.entries()].sort((a,b) => b[1]-a[1])) {
    console.log(`  ${cls}: ${count}`)
  }
  
  await db.$disconnect()
}
main().catch(console.error)
