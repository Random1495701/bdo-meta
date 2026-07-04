import { db } from '../src/lib/db'
async function main() {
  // Flow: skills that aren't awakening should be marked as awakening
  // (Flow: skills are combo continuations that extend awakening skills)
  const flowResult = await db.skill.updateMany({
    where: { name: { startsWith: 'Flow:' }, isAwakening: false, isAbsolute: false, isSuccession: false, isBlackSpirit: false, isPassive: false },
    data: { isAwakening: true },
  })
  console.log(`Fixed Flow: → isAwakening: ${flowResult.count} skills`)
  
  // Core: skills that aren't awakening should be marked as awakening
  // (Core: skills are 56+ enhancement skills, part of awakening kit)
  const coreResult = await db.skill.updateMany({
    where: { name: { startsWith: 'Core:' }, isAwakening: false, isAbsolute: false, isSuccession: false, isBlackSpirit: false, isPassive: false },
    data: { isAwakening: true },
  })
  console.log(`Fixed Core: → isAwakening: ${coreResult.count} skills`)
  
  // Verify
  console.log(`\nVerification:`)
  console.log(`  Flow: isAwakening=true: ${await db.skill.count({ where: { name: { startsWith: 'Flow:' }, isAwakening: true } })}`)
  console.log(`  Core: isAwakening=true: ${await db.skill.count({ where: { name: { startsWith: 'Core:' }, isAwakening: true } })}`)
  console.log(`  Flow: untyped: ${await db.skill.count({ where: { name: { startsWith: 'Flow:' }, isAwakening: false, isAbsolute: false, isSuccession: false, isBlackSpirit: false, isPassive: false } })}`)
  console.log(`  Core: untyped: ${await db.skill.count({ where: { name: { startsWith: 'Core:' }, isAwakening: false, isAbsolute: false, isSuccession: false, isBlackSpirit: false, isPassive: false } })}`)
  
  await db.$disconnect()
}
main().catch(console.error)
