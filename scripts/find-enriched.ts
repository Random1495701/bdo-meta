import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  const enriched = await db.skill.findMany({
    where: { 
      description: { not: null },
      videoUrl: { not: null },
      animationDurationMs: { not: null },
    },
    select: { skillId: true, name: true, className: true, description: true, videoUrl: true, animationDurationMs: true, ccTypes: true, protectionTypes: true },
    take: 10,
  })
  console.log('Fully enriched skills:')
  for (const s of enriched) {
    console.log(`  ${s.skillId} ${s.name} (${s.className}) - anim: ${s.animationDurationMs}ms, cc: ${s.ccTypes}, prot: ${s.protectionTypes}`)
    console.log(`    desc: ${s.description?.slice(0, 80)}`)
  }
  await db.$disconnect()
}
main().catch(console.error)
