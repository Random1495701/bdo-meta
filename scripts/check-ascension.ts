import { db } from '../src/lib/db'
async function main() {
  // Check if any skills mention "Ascension" in the name
  const ascensionSkills = await db.skill.findMany({
    where: { name: { contains: 'Ascension' } },
    select: { skillId: true, name: true, className: true, classId: true },
  })
  console.log(`Skills with "Ascension" in name: ${ascensionSkills.length}`)
  for (const s of ascensionSkills.slice(0, 10)) {
    console.log(`  ${s.skillId} ${s.name} (${s.className})`)
  }
  
  // Check Scholar and Archer skill counts
  const scholar = await db.skill.count({ where: { classId: 6 } })
  const archer = await db.skill.count({ where: { classId: 29 } })
  console.log(`\nScholar (classId=6): ${scholar} skills`)
  console.log(`Archer (classId=29): ${archer} skills`)
  
  // Check if there are skills with "Ascension:" prefix
  const ascPrefix = await db.skill.findMany({
    where: { name: { startsWith: 'Ascension:' } },
    select: { skillId: true, name: true, className: true },
  })
  console.log(`\nSkills with "Ascension:" prefix: ${ascPrefix.length}`)
  for (const s of ascPrefix.slice(0, 10)) {
    console.log(`  ${s.skillId} ${s.name} (${s.className})`)
  }
  
  await db.$disconnect()
}
main().catch(console.error)
