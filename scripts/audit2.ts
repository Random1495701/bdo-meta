import { db } from '../src/lib/db'
async function main() {
  // Full classId distribution
  console.log('--- full classId distribution ---')
  const byClassId = await db.skill.groupBy({ by: ['classId'], _count: { skillId: true }, orderBy: { classId: 'asc' } })
  for (const r of byClassId) console.log(`  classId=${r.classId}: ${r._count.skillId}`)
  
  // Check succession/absolute by name
  console.log('\n--- succession/absolute by NAME ---')
  const succByName = await db.skill.count({ where: { name: { startsWith: 'Succession:' } } })
  const absByName = await db.skill.count({ where: { name: { startsWith: 'Absolute:' } } })
  const bsByName = await db.skill.count({ where: { name: { startsWith: 'Black Spirit:' } } })
  console.log(`  name startsWith 'Succession:': ${succByName}`)
  console.log(`  name startsWith 'Absolute:': ${absByName}`)
  console.log(`  name startsWith 'Black Spirit:': ${bsByName}`)
  
  // Sample succession skills
  console.log('\n--- sample succession skills (by name) ---')
  const succSkills = await db.skill.findMany({ where: { name: { startsWith: 'Succession:' } }, select: { skillId: true, name: true, className: true, classId: true, isSuccession: true }, take: 5 })
  for (const s of succSkills) console.log(`  ${s.skillId} ${s.name} [flag=${s.isSuccession}] class=${s.className}(${s.classId})`)
  
  // Check rank suffixes
  console.log('\n--- rank suffix analysis ---')
  const allSkills = await db.skill.findMany({ select: { name: true, requiredLevel: true, skillId: true }, orderBy: { skillId: 'asc' } })
  const rankSuffix = /\s+(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII)$/
  const withRank = allSkills.filter(s => rankSuffix.test(s.name))
  const withoutRank = allSkills.filter(s => !rankSuffix.test(s.name))
  console.log(`  with rank suffix (I-XVIII): ${withRank.length}`)
  console.log(`  without rank suffix: ${withoutRank.length}`)
  
  // Sample groups by base name
  console.log('\n--- sample base name groups (top 5 by count) ---')
  const baseNameMap = new Map<string, {count: number, maxLevel: number, maxSkillId: number}>()
  for (const s of withRank) {
    const baseName = s.name.replace(rankSuffix, '')
    const rankStr = s.name.match(rankSuffix)?.[1] || ''
    const rankNum = {I:1,II:2,III:3,IV:4,V:5,VI:6,VII:7,VIII:8,IX:9,X:10,XI:11,XII:12,XIII:13,XIV:14,XV:15,XVI:16,XVII:17,XVIII:18}[rankStr] || 0
    if (!baseNameMap.has(baseName)) {
      baseNameMap.set(baseName, {count: 0, maxLevel: 0, maxSkillId: 0})
    }
    const entry = baseNameMap.get(baseName)!
    entry.count++
    if (s.requiredLevel > entry.maxLevel || (s.requiredLevel === entry.maxLevel && rankNum > 0)) {
      entry.maxLevel = s.requiredLevel
      entry.maxSkillId = s.skillId
    }
  }
  const topGroups = [...baseNameMap.entries()].sort((a,b) => b[1].count - a[1].count).slice(0, 5)
  for (const [name, info] of topGroups) {
    console.log(`  "${name}": ${info.count} ranks, maxLevel=${info.maxLevel}, maxSkillId=${info.maxSkillId}`)
  }
  
  await db.$disconnect()
}
main().catch(console.error)
