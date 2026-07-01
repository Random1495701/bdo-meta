import { db } from '../src/lib/db'
async function main() {
  const count = await db.skill.count({ where: { name: { contains: '(Not in use)' } } })
  console.log(`Skills with "(Not in use)": ${count}`)
  const sample = await db.skill.findMany({ where: { name: { contains: '(Not in use)' } }, select: { skillId: true, name: true, className: true }, take: 5 })
  for (const s of sample) console.log(`  ${s.skillId} ${s.name} (${s.className})`)
  
  // Check for Grapple skills
  const grabs = await db.skill.count({ where: { ccTypes: { contains: 'Grapple' } } })
  console.log(`\nSkills with Grapple: ${grabs}`)
  const grabSample = await db.skill.findMany({ where: { ccTypes: { contains: 'Grapple' } }, select: { skillId: true, name: true, className: true }, take: 5 })
  for (const s of grabSample) console.log(`  ${s.skillId} ${s.name} (${s.className})`)
  
  // Check for Core: skills with protection
  const coreWithProt = await db.skill.findMany({
    where: { name: { startsWith: 'Core:' }, protectionTypes: { not: null } },
    select: { skillId: true, name: true, className: true, protectionTypes: true },
    take: 10,
  })
  console.log(`\nCore: skills with protection: ${coreWithProt.length}`)
  for (const s of coreWithProt) console.log(`  ${s.skillId} ${s.name} prot=${s.protectionTypes}`)
  
  await db.$disconnect()
}
main().catch(console.error)
