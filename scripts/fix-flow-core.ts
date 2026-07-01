import { db } from '../src/lib/db'
async function main() {
  // Flow: skills — combo continuation skills
  const flowResult = await db.skill.updateMany({
    where: { name: { startsWith: 'Flow:' }, isAbsolute: false, isAwakening: false, isSuccession: false, isBlackSpirit: false, isPassive: false },
    data: {}, // We don't have isFlow column yet — just count for now
  })
  const flowCount = await db.skill.count({ where: { name: { startsWith: 'Flow:' } } })
  const coreCount = await db.skill.count({ where: { name: { startsWith: 'Core:' } } })
  console.log(`Flow: skills: ${flowCount}`)
  console.log(`Core: skills: ${coreCount}`)
  
  // Check what types Flow/Core skills currently are
  const flowUntyped = await db.skill.count({
    where: { name: { startsWith: 'Flow:' }, isAbsolute: false, isAwakening: false, isSuccession: false, isBlackSpirit: false, isPassive: false }
  })
  const coreUntyped = await db.skill.count({
    where: { name: { startsWith: 'Core:' }, isAbsolute: false, isAwakening: false, isSuccession: false, isBlackSpirit: false, isPassive: false }
  })
  console.log(`Flow: untyped (no flags): ${flowUntyped}`)
  console.log(`Core: untyped (no flags): ${coreUntyped}`)
  
  // Flow: skills are awakening skills (they extend awakening combos)
  const flowAsAwk = await db.skill.count({ where: { name: { startsWith: 'Flow:' }, isAwakening: true } })
  console.log(`Flow: already isAwakening: ${flowAsAwk}`)
  
  // Core: skills are already handled in meta (protection counting) but not typed
  // They're enhancement skills — let's mark them as isAwakening since they're 56+ skills
  const coreAsAwk = await db.skill.count({ where: { name: { startsWith: 'Core:' }, isAwakening: true } })
  console.log(`Core: already isAwakening: ${coreAsAwk}`)
  
  await db.$disconnect()
}
main().catch(console.error)
