import { db } from '../src/lib/db'
async function main() {
  // Fix isSuccession from name
  const succResult = await db.skill.updateMany({
    where: { name: { startsWith: 'Succession:' }, isSuccession: false },
    data: { isSuccession: true },
  })
  console.log(`Fixed isSuccession: ${succResult.count} skills`)

  // Fix isAbsolute from name
  const absResult = await db.skill.updateMany({
    where: { name: { startsWith: 'Absolute:' }, isAbsolute: false },
    data: { isAbsolute: true },
  })
  console.log(`Fixed isAbsolute: ${absResult.count} skills`)

  // Fix isBlackSpirit from name
  const bsResult = await db.skill.updateMany({
    where: { name: { startsWith: 'Black Spirit:' }, isBlackSpirit: false },
    data: { isBlackSpirit: true },
  })
  console.log(`Fixed isBlackSpirit: ${bsResult.count} skills`)

  // Fix the German locale leak
  const deResult = await db.skill.updateMany({
    where: { className: 'Schwarzmagierin' },
    data: { className: 'Sorceress' },
  })
  console.log(`Fixed Schwarzmagierin→Sorceress: ${deResult.count} skills`)

  // Verify
  console.log(`\nVerification:`)
  console.log(`  isSuccession=true: ${await db.skill.count({ where: { isSuccession: true } })}`)
  console.log(`  isAbsolute=true: ${await db.skill.count({ where: { isAbsolute: true } })}`)
  console.log(`  isBlackSpirit=true: ${await db.skill.count({ where: { isBlackSpirit: true } })}`)

  await db.$disconnect()
}
main().catch(console.error)
