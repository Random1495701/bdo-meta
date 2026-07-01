import { db } from '../src/lib/db'

async function main() {
  // Find skills with "max N hits" pattern to understand the format
  const skills = await db.skill.findMany({
    where: { damageRowsJson: { contains: 'max' } },
    select: { skillId: true, name: true, damageRowsJson: true, pvpDamagePercent: true },
    take: 5,
  })
  
  for (const s of skills) {
    const rows = JSON.parse(s.damageRowsJson!)
    const damageRows = rows.filter((r: any) => (r.kind === 'damage' || (r.kind === 'note' && r.label.includes('damage'))) && (r.value || r.label))
    
    console.log(`\n${s.skillId} ${s.name} (pvp=${s.pvpDamagePercent}%)`)
    for (const r of damageRows) {
      const text = r.value || r.label
      console.log(`  [${r.kind}] ${r.label}: ${text}`)
    }
    
    // Also show note-type damage rows that have "max hits"
    const noteDamage = rows.filter((r: any) => r.kind === 'note' && r.label.toLowerCase().includes('damage') && r.label.toLowerCase().includes('max'))
    for (const r of noteDamage) {
      console.log(`  NOTE DAMAGE: ${r.label}`)
      // Parse: "Standing attack hit damage 938% x1, max 3 hits"
      const m = r.label.match(/([\d,]+)%\s*x\s*(\d+).*?max\s+(\d+)\s+hits/i)
      if (m) {
        const percent = parseFloat(m[1].replace(/,/g, ''))
        const hits = parseInt(m[2], 10)
        const maxHits = parseInt(m[3], 10)
        console.log(`    Parsed: ${percent}% x${hits}, max ${maxHits} hits`)
        console.log(`    CURRENT calc: ${percent * hits * maxHits} (percent * hits * maxHits)`)
        console.log(`    CORRECT calc: ${percent * hits} (percent * hits, max ${maxHits} is TARGETS not hits)`)
        console.log(`    OR if max means total hits: ${percent * maxHits} (percent * maxHits)`)
      }
    }
  }
  
  await db.$disconnect()
}
main().catch(console.error)
