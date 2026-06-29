import { db } from '../src/lib/db'
async function main() {
  // For Warrior (classId=0), check what skills exist in each type
  const warrior = await db.skill.findMany({
    where: { classId: 0 },
    select: { skillId: true, name: true, isAwakening: true, isSuccession: true, isAbsolute: true, isBlackSpirit: true, isPassive: true, requiredLevel: true },
    orderBy: { name: 'asc' },
  })
  
  console.log(`Warrior skills: ${warrior.length} total`)
  console.log(`  Main (no flags): ${warrior.filter(s => !s.isAwakening && !s.isSuccession && !s.isAbsolute && !s.isBlackSpirit && !s.isPassive).length}`)
  console.log(`  Awakening: ${warrior.filter(s => s.isAwakening).length}`)
  console.log(`  Succession: ${warrior.filter(s => s.isSuccession).length}`)
  console.log(`  Absolute: ${warrior.filter(s => s.isAbsolute).length}`)
  console.log(`  Black Spirit: ${warrior.filter(s => s.isBlackSpirit).length}`)
  console.log(`  Passive: ${warrior.filter(s => s.isPassive).length}`)
  
  // Check if Succession skills have matching Main/Absolute versions
  const succSkills = warrior.filter(s => s.isSuccession)
  console.log(`\n--- Succession skills (sample) ---`)
  for (const s of succSkills.slice(0, 5)) {
    // Strip "Succession: " or "Prime: " prefix to get base name
    const baseName = s.name.replace(/^(Succession:|Prime:)\s+/, '')
    // Find Main/Absolute versions with same base name
    const mainMatch = warrior.filter(m => 
      !m.isSuccession && !m.isAwakening && 
      (m.name === baseName || m.name.startsWith(baseName + ' ') || m.name.replace(/^Absolute:\s+/, '') === baseName)
    )
    console.log(`  ${s.skillId} "${s.name}" → base="${baseName}"`)
    console.log(`    matching main/abs: ${mainMatch.map(m => `${m.skillId} "${m.name}"`).join(', ') || 'none'}`)
  }
  
  // Check Absolute skills - do they match Main skills?
  const absSkills = warrior.filter(s => s.isAbsolute)
  console.log(`\n--- Absolute skills (sample) ---`)
  for (const s of absSkills.slice(0, 5)) {
    const baseName = s.name.replace(/^Absolute:\s+/, '')
    const mainMatch = warrior.filter(m => 
      !m.isAbsolute && !m.isSuccession && !m.isAwakening &&
      (m.name === baseName || m.name.startsWith(baseName + ' '))
    )
    console.log(`  ${s.skillId} "${s.name}" → base="${baseName}"`)
    console.log(`    matching main: ${mainMatch.map(m => `${m.skillId} "${m.name}"`).join(', ') || 'none'}`)
  }
  
  await db.$disconnect()
}
main().catch(console.error)
