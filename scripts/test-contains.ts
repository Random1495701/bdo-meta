import { db } from '../src/lib/db'
async function main() {
  // Test exact match
  const c1 = await db.skill.count({ where: { protectionTypes: { contains: 'I-Frame' } } })
  const c2 = await db.skill.count({ where: { protectionTypes: { contains: 'i-frame' } } })
  const c3 = await db.skill.count({ where: { protectionTypes: { contains: 'iframe' } } })
  console.log(`'I-Frame': ${c1}`)
  console.log(`'i-frame': ${c2}`)
  console.log(`'iframe': ${c3}`)
  
  // Test the actual AND query
  const c4 = await db.skill.count({
    where: {
      AND: [
        { protectionTypes: { contains: 'I-Frame' } },
        { ccTypes: { contains: 'Float' } },
        { name: { not: { contains: 'Evasion' } } },
        { name: { not: { contains: 'Evasive' } } },
        { name: { not: { contains: '(Not in use)' } } },
        { name: { not: { contains: '(Not in Use)' } } },
        { className: { not: { startsWith: 'NEW_CLASS' } } },
      ],
    },
  })
  console.log(`Full AND query (with evasion/not-in-use filters): ${c4}`)
  
  await db.$disconnect()
}
main().catch(console.error)
