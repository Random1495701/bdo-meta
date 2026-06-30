import { db } from '../src/lib/db'
async function main() {
  const count = await db.skill.count({ where: { protectionTypes: { contains: 'I-Frame' } } })
  console.log(`Skills with 'I-Frame': ${count}`)
  const count2 = await db.skill.count({ where: { protectionTypes: { contains: 'Invincible' } } })
  console.log(`Skills with 'Invincible': ${count2}`)
  const sample = await db.skill.findFirst({ where: { protectionTypes: { contains: 'I-Frame' } }, select: { name: true, protectionTypes: true } })
  console.log(`Sample: ${sample?.name} prot=${sample?.protectionTypes}`)
  await db.$disconnect()
}
main().catch(console.error)
