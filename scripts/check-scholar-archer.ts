import { db } from '../src/lib/db'
async function main() {
  // Check Scholar skills for any ascension-like pattern
  const scholar = await db.skill.findMany({
    where: { classId: 6 },
    select: { skillId: true, name: true, requiredLevel: true, isAwakening: true, isSuccession: true, isAbsolute: true, isBlackSpirit: true, isPassive: true },
    orderBy: { requiredLevel: 'asc' },
  })
  console.log(`Scholar: ${scholar.length} skills`)
  console.log(`  Main: ${scholar.filter(s => !s.isAwakening && !s.isSuccession && !s.isAbsolute && !s.isBlackSpirit && !s.isPassive).length}`)
  console.log(`  Awakening: ${scholar.filter(s => s.isAwakening).length}`)
  console.log(`  Succession: ${scholar.filter(s => s.isSuccession).length}`)
  console.log(`  Absolute: ${scholar.filter(s => s.isAbsolute).length}`)
  console.log(`  BS: ${scholar.filter(s => s.isBlackSpirit).length}`)
  console.log(`  Passive: ${scholar.filter(s => s.isPassive).length}`)
  
  // Check for skills that are neither main/awk/succ/abs/bs/pas — could be ascension
  const unclassified = scholar.filter(s => 
    !s.isAwakening && !s.isSuccession && !s.isAbsolute && !s.isBlackSpirit && !s.isPassive &&
    s.requiredLevel >= 56
  )
  console.log(`  Unclassified (Lv56+, no flags): ${unclassified.length}`)
  for (const s of unclassified.slice(0, 10)) {
    console.log(`    ${s.skillId} Lv${s.requiredLevel} ${s.name}`)
  }
  
  // Same for Archer
  console.log('\n--- Archer ---')
  const archer = await db.skill.findMany({
    where: { classId: 29 },
    select: { skillId: true, name: true, requiredLevel: true, isAwakening: true, isSuccession: true, isAbsolute: true, isBlackSpirit: true, isPassive: true },
    orderBy: { requiredLevel: 'asc' },
  })
  console.log(`Archer: ${archer.length} skills`)
  console.log(`  Main: ${archer.filter(s => !s.isAwakening && !s.isSuccession && !s.isAbsolute && !s.isBlackSpirit && !s.isPassive).length}`)
  console.log(`  Awakening: ${archer.filter(s => s.isAwakening).length}`)
  console.log(`  Succession: ${archer.filter(s => s.isSuccession).length}`)
  console.log(`  Absolute: ${archer.filter(s => s.isAbsolute).length}`)
  
  const archerUnclassified = archer.filter(s => 
    !s.isAwakening && !s.isSuccession && !s.isAbsolute && !s.isBlackSpirit && !s.isPassive &&
    s.requiredLevel >= 56
  )
  console.log(`  Unclassified (Lv56+, no flags): ${archerUnclassified.length}`)
  for (const s of archerUnclassified.slice(0, 10)) {
    console.log(`    ${s.skillId} Lv${s.requiredLevel} ${s.name}`)
  }
  
  await db.$disconnect()
}
main().catch(console.error)
