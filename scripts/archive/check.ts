import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  const total = await db.skill.count()
  const withDesc = await db.skill.count({ where: { description: { not: null } } })
  const withVideo = await db.skill.count({ where: { videoUrl: { not: null } } })
  const withAnim = await db.skill.count({ where: { animationDurationMs: { not: null } } })
  console.log('FRESH CLIENT - total:', total, 'desc:', withDesc, 'video:', withVideo, 'anim:', withAnim)
  // sample a skill with description
  const sample = await db.skill.findFirst({ where: { description: { not: null } }, select: { skillId: true, name: true, description: true, videoUrl: true, animationDurationMs: true } })
  console.log('Sample:', JSON.stringify(sample, null, 2).slice(0, 500))
  await db.$disconnect()
}
main().catch(console.error)
