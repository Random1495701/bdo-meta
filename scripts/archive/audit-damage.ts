import { db } from '../src/lib/db'
async function main() {
  // Check all damage row formats
  const withDamage = await db.skill.findMany({
    where: { damageRowsJson: { not: null } },
    select: { skillId: true, name: true, damageRowsJson: true, pvpDamagePercent: true },
    take: 200,
  })
  
  // Collect all unique damage row patterns
  const damagePatterns = new Map<string, number>()
  const noteDamagePatterns = new Map<string, number>()
  
  for (const s of withDamage) {
    const rows = JSON.parse(s.damageRowsJson!)
    for (const r of rows) {
      if (r.kind === 'damage' && r.value) {
        // Extract the pattern (replace numbers with #)
        const pattern = r.value.replace(/\d+/g, '#').replace(/\d+\.\d+/g, '#')
        damagePatterns.set(pattern, (damagePatterns.get(pattern) || 0) + 1)
      }
      if (r.kind === 'note' && r.label.includes('damage')) {
        const pattern = r.label.replace(/\d+/g, '#').replace(/\d+\.\d+/g, '#')
        noteDamagePatterns.set(pattern, (noteDamagePatterns.get(pattern) || 0) + 1)
      }
    }
  }
  
  console.log('=== [damage] kind value patterns (top 10) ===')
  for (const [p, c] of [...damagePatterns.entries()].sort((a,b) => b[1]-a[1]).slice(0, 10)) {
    console.log(`  ${c}x  "${p}"`)
  }
  
  console.log('\n=== [note] kind with "damage" in label (top 15) ===')
  for (const [p, c] of [...noteDamagePatterns.entries()].sort((a,b) => b[1]-a[1]).slice(0, 15)) {
    console.log(`  ${c}x  "${p}"`)
  }
  
  // Show 5 full examples with multihit
  console.log('\n=== Multihit skill examples ===')
  const multihit = withDamage.filter(s => {
    const rows = JSON.parse(s.damageRowsJson!)
    return rows.filter((r: any) => r.kind === 'damage').length > 1
  })
  for (const s of multihit.slice(0, 3)) {
    const rows = JSON.parse(s.damageRowsJson!)
    console.log(`\n${s.skillId} ${s.name} (pvp=${s.pvpDamagePercent}%)`)
    for (const r of rows) {
      if (r.kind === 'damage' || (r.kind === 'note' && r.label.includes('damage'))) {
        console.log(`  [${r.kind}] ${r.label}${r.value ? ' = ' + r.value : ''}`)
      }
    }
  }
  
  await db.$disconnect()
}
main().catch(console.error)
