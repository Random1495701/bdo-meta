import { db } from '../src/lib/db'
async function main() {
  // Scholar and Wukong have a few succession skills that should be ascension
  // These are ascension-only classes — any "succession" flag is actually ascension
  for (const slug of ['scholar', 'wukong']) {
    const cls = await db.bdoClass.findFirst({ where: { slug } })
    if (!cls) continue
    const result = await db.skill.updateMany({
      where: { classId: cls.id, isSuccession: true },
      data: { isSuccession: false, isAwakening: true },
    })
    console.log(`${cls.name}: moved ${result.count} succession → awakening (ascension)`)
  }
  await db.$disconnect()
}
main().catch(console.error)
