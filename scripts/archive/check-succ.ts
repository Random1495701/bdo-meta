import { db } from '../src/lib/db'
async function main() {
  const classes = await db.bdoClass.findMany()
  for (const cls of classes) {
    if (cls.name.startsWith('NEW_CLASS')) continue
    const succ = await db.skill.count({ where: { classId: cls.id, isSuccession: true } })
    if (succ === 0) {
      console.log(`  ${cls.name} (${cls.slug}): NO succession skills`)
    }
  }
  await db.$disconnect()
}
main().catch(console.error)
