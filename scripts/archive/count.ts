import { db } from '../src/lib/db'
async function main() {
  const total = await db.skill.count()
  const withDesc = await db.skill.count({ where: { description: { not: null } } })
  const withVideo = await db.skill.count({ where: { videoUrl: { not: null } } })
  const withAnim = await db.skill.count({ where: { animationDurationMs: { not: null } } })
  console.log('total:', total, 'desc:', withDesc, 'video:', withVideo, 'anim:', withAnim)
  await db.$disconnect()
}
main().catch(console.error)
