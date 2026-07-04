import { db } from '../src/lib/db'
async function main() {
  const passives = await db.skill.findMany({ 
    where: { isPassive: true }, 
    select: { skillId: true, name: true, requiredLevel: true, className: true },
    orderBy: { name: 'asc' },
  })
  console.log(`Total passives: ${passives.length}`)
  
  // Check rank suffixes including high ones
  const rankSuffix = /\s+(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX|XXI|XXII|XXIII|XXIV|XXV)$/
  const withRank = passives.filter(s => rankSuffix.test(s.name))
  const withoutRank = passives.filter(s => !rankSuffix.test(s.name))
  console.log(`  with rank suffix: ${withRank.length}`)
  console.log(`  without rank suffix: ${withoutRank.length}`)
  
  // Show high roman numerals
  console.log('\n--- Passives with XVIII+ ---')
  const highRomanRe = /\s+(XVIII|XIX|XX|XXI|XXII|XXIII|XXIV|XXV)$/
  const high = passives.filter(s => highRomanRe.test(s.name))
  for (const s of high.slice(0, 15)) console.log(`  ${s.skillId} Lv${s.requiredLevel} ${s.name}`)
  
  // Show passives without rank
  console.log('\n--- Passives WITHOUT rank suffix (sample 15) ---')
  for (const s of withoutRank.slice(0, 15)) console.log(`  ${s.skillId} Lv${s.requiredLevel} ${s.name}`)
  
  // Sample damage rows for damage calculation audit
  console.log('\n--- Damage rows sample (for damage calc) ---')
  const withDamage = await db.skill.findMany({
    where: { damageRowsJson: { not: null } },
    select: { skillId: true, name: true, damageRowsJson: true, pvpDamagePercent: true },
    take: 5,
  })
  for (const s of withDamage) {
    const rows = JSON.parse(s.damageRowsJson!)
    console.log(`\n  ${s.skillId} ${s.name} (pvp=${s.pvpDamagePercent}%)`)
    for (const r of rows.slice(0, 8)) {
      console.log(`    [${r.kind}] ${r.label}${r.value ? ' = ' + r.value : ''}${r.pvpOnly ? ' (PvP)' : ''}${r.pveOnly ? ' (PvE)' : ''}`)
    }
  }
  
  await db.$disconnect()
}
main().catch(console.error)
