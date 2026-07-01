import { db } from '../src/lib/db'
async function main() {
  // The bug: skills with className containing ALL classes (the Flute Buff etc.)
  // These have classId set to ONE class but className is a comma-separated list
  // Let's check what classId the "all classes" skills have
  const allClassSkills = await db.skill.findMany({
    where: { className: { contains: 'Corsair' } },
    select: { skillId: true, name: true, className: true, classId: true },
    take: 20,
  })
  console.log(`Skills with 'Corsair' in className: ${allClassSkills.length}`)
  for (const s of allClassSkills) {
    if (s.classId !== 10) {
      console.log(`  WRONG CLASS: ${s.skillId} ${s.name} classId=${s.classId} className='${s.className?.slice(0,50)}'`)
    }
  }
  
  // The real issue: the meta card click sends classId=10, but some shared skills
  // have classId=10 (assigned to Corsair as primary) but className lists ALL classes.
  // When the API filters by classId=10, these shared skills show up.
  // 
  // The fix: filter by BOTH classId AND exclude multi-class skills (className contains comma)
  // OR: the meta page should filter by className='Corsair' instead of classId=10
  
  // Let's check: does the bdocodex tree data assign shared skills to a specific classId?
  const sharedSkills = await db.skill.findMany({
    where: { classId: 10, className: { contains: ',' } },
    select: { skillId: true, name: true, className: true },
    take: 10,
  })
  console.log(`\nSkills with classId=10 but multi-class className: ${sharedSkills.length}`)
  for (const s of sharedSkills) {
    console.log(`  ${s.skillId} ${s.name} className='${s.className?.slice(0,60)}...'`)
  }
  
  // Check Kunoichi/Ninja specifically
  const kunNin = await db.skill.findMany({
    where: { className: { contains: 'Kunoichi, Ninja' } },
    select: { skillId: true, name: true, className: true, classId: true },
    take: 5,
  })
  console.log(`\nKunoichi, Ninja skills: ${kunNin.length}`)
  for (const s of kunNin) {
    console.log(`  ${s.skillId} ${s.name} classId=${s.classId} className='${s.className}'`)
  }
  
  await db.$disconnect()
}
main().catch(console.error)
