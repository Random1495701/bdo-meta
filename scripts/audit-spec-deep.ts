import { db } from '../src/lib/db'
async function main() {
  const warrior = await db.skill.findMany({
    where: { classId: 0 },
    select: { skillId: true, name: true, isAwakening: true, isSuccession: true, isAbsolute: true, isBlackSpirit: true, isPassive: true, requiredLevel: true, groupId: true },
    orderBy: { name: 'asc' },
  })
  
  // What does bdocodex's skillbuilder show for Warrior?
  // Main skills: pre-56, no awakening weapon
  // Awakening skills: 56+, use awakening weapon (isAwakening flag)
  // Succession skills: 56+, enhance main weapon (Prime:/Succession: prefix)
  // Absolute skills: enhanced versions of main skills (Absolute: prefix)
  // Black Spirit: rage skills
  
  // The key question: in bdocodex's skillbuilder, when you pick "Succession",
  // which skills are available? Let me check the level distribution.
  console.log('=== Level distribution by type ===')
  const types = ['Main', 'Awakening', 'Succession', 'Absolute', 'BlackSpirit', 'Passive']
  for (const type of types) {
    const skills = warrior.filter(s => {
      if (type === 'Main') return !s.isAwakening && !s.isSuccession && !s.isAbsolute && !s.isBlackSpirit && !s.isPassive
      if (type === 'Awakening') return s.isAwakening
      if (type === 'Succession') return s.isSuccession
      if (type === 'Absolute') return s.isAbsolute
      if (type === 'BlackSpirit') return s.isBlackSpirit
      if (type === 'Passive') return s.isPassive
    })
    const levels = skills.map(s => s.requiredLevel).sort((a,b) => a-b)
    console.log(`${type}: ${skills.length} skills, levels ${levels[0]}-${levels[levels.length-1]}`)
  }
  
  // Check: are there skills that are BOTH awakening AND have a Prime version?
  // In BDO, Awakening and Succession are mutually exclusive specs. But some skills
  // like "Black Spirit" rage skills might be shared.
  console.log('\n=== Skills with multiple flags ===')
  const multi = warrior.filter(s => {
    let count = 0
    if (s.isAwakening) count++
    if (s.isSuccession) count++
    if (s.isAbsolute) count++
    if (s.isBlackSpirit) count++
    if (s.isPassive) count++
    return count > 1
  })
  console.log(`Skills with multiple flags: ${multi.length}`)
  for (const s of multi.slice(0, 10)) {
    const flags = []
    if (s.isAwakening) flags.push('Awk')
    if (s.isSuccession) flags.push('Succ')
    if (s.isAbsolute) flags.push('Abs')
    if (s.isBlackSpirit) flags.push('BS')
    if (s.isPassive) flags.push('Pas')
    console.log(`  ${s.skillId} "${s.name}" [${flags.join('|')}]`)
  }
  
  // Check the actual bdocodex skillbuilder structure
  // The skillbuilder shows skills in sections: Main Skills, Awakening Skills, 
  // Succession Skills, Passive Skills
  // When you pick Succession, the Awakening section is hidden
  // When you pick Awakening, the Succession section is hidden
  
  // Let me check if there are "Awakening:" prefix skills vs isAwakening flag
  console.log('\n=== Name prefix analysis ===')
  const awkPrefix = warrior.filter(s => s.name.startsWith('Awakening:'))
  const awkFlag = warrior.filter(s => s.isAwakening)
  console.log(`"Awakening:" prefix: ${awkPrefix.length}`)
  console.log(`isAwakening flag: ${awkFlag.length}`)
  console.log(`Awakening flag but no prefix: ${awkFlag.filter(s => !s.name.startsWith('Awakening:')).length}`)
  
  // Check: do awakening skills have requiredLevel >= 56?
  console.log('\n=== Awakening skill levels ===')
  for (const s of awkFlag.slice(0, 5)) {
    console.log(`  ${s.skillId} Lv${s.requiredLevel} ${s.name}`)
  }
  
  // Check: do succession skills have requiredLevel >= 56?
  console.log('\n=== Succession skill levels ===')
  const succFlag = warrior.filter(s => s.isSuccession)
  for (const s of succFlag.slice(0, 5)) {
    console.log(`  ${s.skillId} Lv${s.requiredLevel} ${s.name}`)
  }
  
  // THE KEY ISSUE: In BDO's skillbuilder:
  // - Succession spec CANNOT use Awakening weapon skills
  // - Awakening spec CANNOT use Succession/Prime skills
  // - BUT both specs CAN use: Main skills, Absolute skills, Black Spirit, Passive
  // - The difference is: Succession gets Prime: versions (replacing main), Awakening gets Awakening: skills
  //
  // The question is: does our data correctly distinguish?
  // Let me check if any "Awakening:" prefix skills are NOT flagged isAwakening
  
  await db.$disconnect()
}
main().catch(console.error)
