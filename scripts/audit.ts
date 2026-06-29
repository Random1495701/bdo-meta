import { db } from '../src/lib/db'
async function main() {
  // 1. Check Warrior skills - className vs classId
  console.log('--- Warrior (classId=0) ---')
  const warriorByClassId = await db.skill.count({ where: { classId: 0 } })
  const warriorByName = await db.skill.count({ where: { className: 'Warrior' } })
  console.log(`  by classId=0: ${warriorByClassId}, by className='Warrior': ${warriorByName}`)
  
  // 2. Check what classIds exist vs what classNames exist
  console.log('\n--- classId distribution ---')
  const byClassId = await db.skill.groupBy({ by: ['classId'], _count: { skillId: true }, orderBy: { classId: 'asc' } })
  for (const r of byClassId) console.log(`  classId=${r.classId}: ${r._count.skillId}`)
  
  console.log('\n--- className distribution ---')
  const byClassName = await db.skill.groupBy({ by: ['className'], _count: { skillId: true }, orderBy: { className: 'asc' } })
  for (const r of byClassName) console.log(`  className='${r.className}': ${r._count.skillId}`)
  
  // 3. Check succession/absolute flags
  console.log('\n--- skill type flags ---')
  console.log(`  isAwakening=true: ${await db.skill.count({ where: { isAwakening: true } })}`)
  console.log(`  isSuccession=true: ${await db.skill.count({ where: { isSuccession: true } })}`)
  console.log(`  isAbsolute=true: ${await db.skill.count({ where: { isAbsolute: true } })}`)
  console.log(`  isBlackSpirit=true: ${await db.skill.count({ where: { isBlackSpirit: true } })}`)
  console.log(`  isPassive=true: ${await db.skill.count({ where: { isPassive: true } })}`)
  
  // 4. Check group IDs - are they set?
  console.log('\n--- groupId coverage ---')
  const withGroup = await db.skill.count({ where: { groupId: { not: null } } })
  const withoutGroup = await db.skill.count({ where: { groupId: null } })
  console.log(`  with groupId: ${withGroup}, without: ${withoutGroup}`)
  
  // 5. Sample Warrior skills
  console.log('\n--- sample Warrior skills (classId=0) ---')
  const warriorSkills = await db.skill.findMany({ where: { classId: 0 }, select: { skillId: true, name: true, className: true, classId: true, groupId: true, isAbsolute: true, isSuccession: true, isAwakening: true }, take: 5 })
  for (const s of warriorSkills) console.log(`  ${s.skillId} ${s.name} className='${s.className}' classId=${s.classId} groupId=${s.groupId}`)
  
  // 6. Sample a succession skill if any exist
  console.log('\n--- sample succession skills ---')
  const successionSkills = await db.skill.findMany({ where: { isSuccession: true }, select: { skillId: true, name: true, className: true, classId: true }, take: 5 })
  for (const s of successionSkills) console.log(`  ${s.skillId} ${s.name} className='${s.className}' classId=${s.classId}`)
  
  // 7. Check "evasion" skills
  console.log('\n--- evasion skills ---')
  const evasionByName = await db.skill.count({ where: { name: { contains: 'Evasion' } } })
  const evasionByDesc = await db.skill.count({ where: { description: { contains: 'vasion' } } })
  console.log(`  name contains 'Evasion': ${evasionByName}, description contains 'vasion': ${evasionByDesc}`)
  
  // 8. Max level per group - to understand rank filtering
  console.log('\n--- sample group with multiple ranks ---')
  const sampleGroup = await db.skill.findFirst({ where: { groupId: { not: null } }, select: { groupId: true } })
  if (sampleGroup?.groupId) {
    const groupSkills = await db.skill.findMany({ where: { groupId: sampleGroup.groupId }, select: { skillId: true, name: true, requiredLevel: true }, orderBy: { requiredLevel: 'asc' } })
    console.log(`  groupId=${sampleGroup.groupId}: ${groupSkills.length} skills`)
    for (const s of groupSkills) console.log(`    ${s.skillId} Lv${s.requiredLevel} ${s.name}`)
  }
  
  // 9. Max values for slider ranges
  console.log('\n--- max values for sliders ---')
  const maxLevel = await db.skill.aggregate({ _max: { requiredLevel: true } })
  const maxCd = await db.skill.aggregate({ _max: { cooldownSec: true } })
  const maxAnim = await db.skill.aggregate({ _max: { animationDurationMs: true } })
  console.log(`  max requiredLevel: ${maxLevel._max.requiredLevel}`)
  console.log(`  max cooldownSec: ${maxCd._max.cooldownSec}`)
  console.log(`  max animationDurationMs: ${maxAnim._max.animationDurationMs}`)
  
  await db.$disconnect()
}
main().catch(console.error)
