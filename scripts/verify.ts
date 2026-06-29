import { db } from '../src/lib/db'
async function main() {
  // Check recently enriched skills for English data + cooldown parsing
  const skills = await db.skill.findMany({
    where: { 
      skillId: { in: [1229, 5878, 3380, 6335, 381] },
    },
    select: { skillId: true, name: true, krName: true, className: true, description: true, command: true, cooldown: true, cooldownSec: true, ccTypes: true, protectionTypes: true, videoUrl: true, animationDurationMs: true },
  })
  for (const s of skills) {
    console.log(`\n${s.skillId} ${s.name} (${s.className})`)
    console.log(`  KR: ${s.krName}`)
    console.log(`  desc: ${s.description?.slice(0, 80)}`)
    console.log(`  cmd: ${s.command}, cd: ${s.cooldown} → ${s.cooldownSec}s`)
    console.log(`  cc: ${s.ccTypes}, prot: ${s.protectionTypes}`)
    console.log(`  video: ${s.videoUrl ? 'yes' : 'no'}, anim: ${s.animationDurationMs}ms`)
  }
  await db.$disconnect()
}
main().catch(console.error)
