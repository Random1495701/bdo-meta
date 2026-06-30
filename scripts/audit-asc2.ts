import { db } from '../src/lib/db'
async function main() {
  // Check Seraph and Deadeye more carefully - they might not have isAwakening flags
  const classes = [
    { name: 'Seraph', id: 32 },
    { name: 'Deadeye', id: 34 },
  ]
  for (const cls of classes) {
    const skills = await db.skill.findMany({
      where: { classId: cls.id },
      select: { skillId: true, name: true, requiredLevel: true, isAwakening: true, isSuccession: true, isAbsolute: true, isBlackSpirit: true, isPassive: true },
      orderBy: { requiredLevel: 'asc' },
    })
    console.log(`\n=== ${cls.name} (id=${cls.id}): ${skills.length} skills ===`)
    
    // Show ALL skills Lv56+
    const lv56 = skills.filter(s => s.requiredLevel >= 56)
    console.log(`Lv56+ skills: ${lv56.length}`)
    for (const s of lv56.slice(0, 15)) {
      const flags = []
      if (s.isAwakening) flags.push('Awk')
      if (s.isSuccession) flags.push('Succ')
      if (s.isAbsolute) flags.push('Abs')
      if (s.isBlackSpirit) flags.push('BS')
      if (s.isPassive) flags.push('Pas')
      if (!flags.length) flags.push('Main')
      console.log(`  ${s.skillId} Lv${s.requiredLevel} ${s.name} [${flags.join('|')}]`)
    }
  }
  await db.$disconnect()
}
main().catch(console.error)
