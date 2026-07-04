import { db } from '../src/lib/db'
async function main() {
  const slashes = await db.skill.findMany({
    where: { name: { startsWith: 'Slash' } },
    select: { skillId: true, name: true, classId: true, className: true, isAbsolute: true, isPassive: true },
    orderBy: { skillId: 'asc' },
  })
  for (const s of slashes) {
    console.log(`${s.skillId} "${s.name}" class=${s.className}(${s.classId}) abs=${s.isAbsolute} pas=${s.isPassive}`)
  }
  await db.$disconnect()
}
main().catch(console.error)
