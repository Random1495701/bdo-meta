import { db } from '../src/lib/db'
async function main() {
  const corsair = await db.bdoClass.findFirst({ where: { name: 'Corsair' } })
  console.log(`Corsair: id=${corsair?.id}, slug=${corsair?.slug}`)
  
  // Check what skills have classId = corsair.id
  const corsairSkills = await db.skill.count({ where: { classId: corsair!.id } })
  console.log(`Skills with classId=${corsair!.id}: ${corsairSkills}`)
  
  // Check what skills have className = 'Corsair'
  const corsairNameSkills = await db.skill.count({ where: { className: 'Corsair' } })
  console.log(`Skills with className='Corsair': ${corsairNameSkills}`)
  
  // Check for skills with 'Corsair' in className but different classId
  const multiClass = await db.skill.findMany({
    where: { className: { contains: 'Corsair' } },
    select: { skillId: true, name: true, className: true, classId: true },
    distinct: ['classId'],
    take: 10,
  })
  console.log(`\nDistinct classIds for skills with 'Corsair' in name:`)
  for (const s of multiClass) {
    console.log(`  classId=${s.classId} className='${s.className}'`)
  }
  
  // Check the API query
  console.log(`\n--- API query test ---`)
  console.log(`When user clicks Corsair in Meta, we call onCardClick(corsair.id, spec)`)
  console.log(`This sets classIds=[corsair.id] in the store`)
  console.log(`The API receives class=${corsair.id} and filters WHERE classId = ${corsair.id}`)
  
  // But some skills have className='Corsair' but classId pointing to another class
  const wrongClassId = await db.skill.findMany({
    where: { className: 'Corsair', classId: { not: corsair!.id } },
    select: { skillId: true, name: true, className: true, classId: true },
    take: 10,
  })
  console.log(`\nSkills with className='Corsair' but wrong classId: ${wrongClassId.length}`)
  for (const s of wrongClassId.slice(0, 5)) {
    const actualClass = await db.bdoClass.findFirst({ where: { id: s.classId! } })
    console.log(`  ${s.skillId} ${s.name} className='${s.className}' classId=${s.classId} (actual class: ${actualClass?.name})`)
  }
  
  // Check multi-class skills (className contains comma)
  const multiClassSkills = await db.skill.findMany({
    where: { className: { contains: ',' } },
    select: { skillId: true, name: true, className: true, classId: true },
    take: 15,
  })
  console.log(`\nMulti-class skills (className contains comma): ${multiClassSkills.length}`)
  for (const s of multiClassSkills.slice(0, 10)) {
    console.log(`  ${s.skillId} ${s.name} className='${s.className}' classId=${s.classId}`)
  }
  
  await db.$disconnect()
}
main().catch(console.error)
