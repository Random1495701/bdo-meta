import { db } from '../src/lib/db'
async function main() {
  // "Prime:" skills are succession skills (bdocodex labels them this way for
  // awakening-rank succession skills). Flag them as isSuccession.
  const result = await db.skill.updateMany({
    where: { name: { startsWith: 'Prime:' }, isSuccession: false },
    data: { isSuccession: true },
  })
  console.log(`Fixed Prime: → isSuccession: ${result.count} skills`)
  
  // Also check for other succession-like prefixes we might have missed
  // "Awakening:" prefix skills are awakening skills
  const awkResult = await db.skill.updateMany({
    where: { name: { startsWith: 'Awakening:' }, isAwakening: false },
    data: { isAwakening: true },
  })
  console.log(`Fixed Awakening: → isAwakening: ${awkResult.count} skills`)
  
  // Verify
  console.log(`\nVerification:`)
  console.log(`  isSuccession=true: ${await db.skill.count({ where: { isSuccession: true } })}`)
  console.log(`  isAwakening=true: ${await db.skill.count({ where: { isAwakening: true } })}`)
  console.log(`  isAbsolute=true: ${await db.skill.count({ where: { isAbsolute: true } })}`)
  console.log(`  isBlackSpirit=true: ${await db.skill.count({ where: { isBlackSpirit: true } })}`)
  await db.$disconnect()
}
main().catch(console.error)
