import { db } from '../src/lib/db'
async function main() {
  // Check ALL classes for awakening/succession counts to identify ascension-only classes
  const classes = await db.bdoClass.findMany({ orderBy: { id: 'asc' } })
  console.log('=== All classes: spec availability ===')
  for (const cls of classes) {
    if (cls.name.startsWith('NEW_CLASS')) continue
    const skills = await db.skill.findMany({
      where: { classId: cls.id },
      select: { isAwakening: true, isSuccession: true, isAbsolute: true },
    })
    const awk = skills.filter(s => s.isAwakening).length
    const succ = skills.filter(s => s.isSuccession).length
    const abs = skills.filter(s => s.isAbsolute).length
    const hasAwk = awk > 0
    const hasSucc = succ > 0
    const hasAbs = abs > 0
    
    // Ascension-only classes: have awakening-flagged skills but NO succession
    // AND the awakening skills use different nomenclature (Sacra:/Purga: for Seraph, etc.)
    const isAscOnly = !hasSucc && hasAwk
    const marker = isAscOnly ? ' ← ASCENSION-ONLY' : ''
    console.log(`  ${cls.name.padEnd(15)} awk=${awk}, succ=${succ}, abs=${abs}${marker}`)
  }
  await db.$disconnect()
}
main().catch(console.error)
