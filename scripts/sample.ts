import { db } from '../src/lib/db'
async function main() {
  const recent = await db.skill.findMany({
    where: { description: { not: null } },
    select: { skillId: true, name: true, description: true, videoUrl: true, animationDurationMs: true, syncedAt: true },
    orderBy: { syncedAt: 'desc' },
    take: 5,
  })
  for (const s of recent) {
    console.log(`  ${s.skillId} ${s.name} — anim: ${s.animationDurationMs}ms — synced: ${s.syncedAt.toISOString()}`)
  }
  await db.$disconnect()
}
main().catch(console.error)
