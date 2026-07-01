import { db } from '../src/lib/db'
async function main() {
  const s = await db.skill.findUnique({ where: { skillId: 4582 }, select: { skillId: true, name: true, cooldownSec: true, cooldown: true } })
  console.log(JSON.stringify(s))
  await db.$disconnect()
}
main().catch(console.error)
