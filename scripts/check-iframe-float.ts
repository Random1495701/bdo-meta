import { db } from '../src/lib/db'
async function main() {
  const count = await db.skill.count({
    where: {
      AND: [
        { protectionTypes: { contains: 'I-Frame' } },
        { ccTypes: { contains: 'Float' } },
      ],
    },
  })
  console.log(`Skills with BOTH I-Frame AND Float: ${count}`)
  const sample = await db.skill.findFirst({
    where: {
      AND: [
        { protectionTypes: { contains: 'I-Frame' } },
        { ccTypes: { contains: 'Float' } },
      ],
    },
    select: { name: true, ccTypes: true, protectionTypes: true },
  })
  console.log(`Sample: ${sample?.name}`)
  await db.$disconnect()
}
main().catch(console.error)
