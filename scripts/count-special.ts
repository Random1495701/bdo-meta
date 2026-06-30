import { db } from '../src/lib/db'
import { calculateDamage } from '../src/lib/damage'
async function main() {
  const skills = await db.skill.findMany({
    where: { damageRowsJson: { not: null } },
    select: { skillId: true, name: true, className: true, damageRowsJson: true, pvpDamagePercent: true },
  })
  let specialCount = 0
  const specialClasses = new Map<string, number>()
  for (const s of skills) {
    const rows = JSON.parse(s.damageRowsJson!)
    const dmg = calculateDamage(rows, s.pvpDamagePercent)
    if (dmg.hasSpecialMode) {
      specialCount++
      const cls = s.className || 'Unknown'
      specialClasses.set(cls, (specialClasses.get(cls) || 0) + 1)
    }
  }
  console.log(`Skills with special modes: ${specialCount}`)
  for (const [cls, count] of [...specialClasses.entries()].sort((a,b) => b[1]-a[1])) {
    console.log(`  ${cls}: ${count}`)
  }
  await db.$disconnect()
}
main().catch(console.error)
