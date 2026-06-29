import { db } from '../src/lib/db'
async function main() {
  const skills = await db.skill.findMany({
    where: { skillId: { in: [2538, 5798, 2518, 9544] } },
    select: { skillId: true, name: true, krName: true, className: true, description: true, command: true, cooldown: true, cooldownSec: true, videoUrl: true, animationDurationMs: true, ccTypes: true, protectionTypes: true, syncedAt: true },
  })
  for (const s of skills) {
    console.log(`\nSkill ${s.skillId}: ${s.name} (${s.className})`)
    console.log(`  KR: ${s.krName}`)
    console.log(`  desc: ${s.description?.slice(0, 100)}`)
    console.log(`  cmd: ${s.command}, cd: ${s.cooldown} (${s.cooldownSec}s)`)
    console.log(`  video: ${s.videoUrl ? 'yes' : 'no'}, anim: ${s.animationDurationMs}ms`)
    console.log(`  cc: ${s.ccTypes}, prot: ${s.protectionTypes}`)
  }
  await db.$disconnect()
}
main().catch(console.error)
