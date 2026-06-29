import { db } from '../src/lib/db'
async function main() {
  const skills = await db.skill.findMany({
    where: { skillId: { in: [2226, 3081, 8192] } },
    select: { skillId: true, name: true, description: true, command: true, cooldown: true, videoUrl: true, animationDurationMs: true, syncedAt: true },
  })
  for (const s of skills) {
    console.log(`Skill ${s.skillId}: ${s.name}`)
    console.log(`  desc: ${s.description ? s.description.slice(0, 80) : 'NULL'}`)
    console.log(`  command: ${s.command}, cooldown: ${s.cooldown}, video: ${s.videoUrl ? 'yes' : 'no'}, anim: ${s.animationDurationMs}`)
    console.log(`  synced: ${s.syncedAt.toISOString()}`)
  }
  await db.$disconnect()
}
main().catch(console.error)
