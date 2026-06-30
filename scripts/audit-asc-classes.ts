import { db } from '../src/lib/db'
async function main() {
  // Seraph=32, Deadeye=34, Shai=17, Scholar=6, Archer=29
  const classes = [
    { name: 'Seraph', id: 32 },
    { name: 'Deadeye', id: 34 },
    { name: 'Shai', id: 17 },
    { name: 'Scholar', id: 6 },
    { name: 'Archer', id: 29 },
  ]
  
  for (const cls of classes) {
    const skills = await db.skill.findMany({
      where: { classId: cls.id },
      select: { skillId: true, name: true, requiredLevel: true, isAwakening: true, isSuccession: true, isAbsolute: true, isBlackSpirit: true, isPassive: true },
      orderBy: { requiredLevel: 'asc' },
    })
    const main = skills.filter(s => !s.isAwakening && !s.isSuccession && !s.isAbsolute && !s.isBlackSpirit && !s.isPassive)
    const awk = skills.filter(s => s.isAwakening)
    const succ = skills.filter(s => s.isSuccession)
    const abs = skills.filter(s => s.isAbsolute)
    const bs = skills.filter(s => s.isBlackSpirit)
    const pas = skills.filter(s => s.isPassive)
    
    console.log(`\n${cls.name} (id=${cls.id}): ${skills.length} skills`)
    console.log(`  Main: ${main.length}, Awakening: ${awk.length}, Succession: ${succ.length}, Absolute: ${abs.length}, BS: ${bs.length}, Passive: ${pas.length}`)
    
    // Check for unclassified Lv56+ skills (potential ascension)
    const unclass = skills.filter(s => 
      !s.isAwakening && !s.isSuccession && !s.isAbsolute && !s.isBlackSpirit && !s.isPassive &&
      s.requiredLevel >= 56
    )
    console.log(`  Unclassified Lv56+: ${unclass.length}`)
    
    // Sample the skills to see naming patterns
    console.log(`  Sample skills:`)
    const sample = [...awk.slice(0, 3), ...succ.slice(0, 3), ...main.filter(s => s.requiredLevel >= 56).slice(0, 3)]
    for (const s of sample) {
      const flags = []
      if (s.isAwakening) flags.push('Awk')
      if (s.isSuccession) flags.push('Succ')
      if (s.isAbsolute) flags.push('Abs')
      if (s.isBlackSpirit) flags.push('BS')
      if (s.isPassive) flags.push('Pas')
      if (!flags.length) flags.push('Main')
      console.log(`    ${s.skillId} Lv${s.requiredLevel} ${s.name} [${flags.join('|')}]`)
    }
  }
  
  await db.$disconnect()
}
main().catch(console.error)
