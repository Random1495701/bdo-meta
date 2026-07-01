import { db } from '../src/lib/db'

async function main() {
  // Get skills with damage rows and check the calculation
  const skills = await db.skill.findMany({
    where: { damageRowsJson: { not: null }, pvpDamagePercent: { not: null } },
    select: { skillId: true, name: true, damageRowsJson: true, pvpDamagePercent: true },
    take: 10,
  })
  
  for (const s of skills) {
    const rows = JSON.parse(s.damageRowsJson!)
    const damageRows = rows.filter((r: any) => r.kind === 'damage' && r.value)
    if (damageRows.length === 0) continue
    
    console.log(`\n${s.skillId} ${s.name} (pvp=${s.pvpDamagePercent}%)`)
    
    let totalPvE = 0
    for (const r of damageRows) {
      // Current parsing: "8246% x1" → percent=8246, hits=1
      const m = r.value.match(/([\d,]+)%\s*x\s*(\d+)/i)
      if (!m) continue
      const percent = parseFloat(m[1].replace(/,/g, ''))
      const hits = parseInt(m[2], 10)
      // Also check for "max N hits"
      const maxMatch = r.value.match(/max\s+(\d+)\s+hits/i)
      const maxHits = maxMatch ? parseInt(maxMatch[1], 10) : undefined
      
      // CURRENT calculation:
      // totalPerHit = percent * hits
      // totalMax = maxHits ? percent * hits * maxHits : totalPerHit
      const currentPerHit = percent * hits
      const currentMax = maxHits ? percent * hits * maxHits : currentPerHit
      totalPvE += currentMax
      
      console.log(`  ${r.label}: ${percent}% x${hits}${maxHits ? ` max ${maxHits} hits` : ''}`)
      console.log(`    CURRENT: perHit=${currentPerHit}, max=${currentMax}`)
      
      // CORRECT calculation should be:
      // The "x N" in "8246% x1" means the attack hits N times
      // Each hit does 8246% damage
      // So total damage for this attack = percent * hits (NOT percent * hits * maxHits)
      // "max N hits" means the skill can hit up to N targets, not N additional hits
      // The damage per target = percent * hits
      // If maxHits is specified, it's the max number of TARGETS, not a multiplier on damage
      const correctPerHit = percent * hits
      console.log(`    CORRECT: damage=${correctPerHit} (max ${maxHits || 1} targets, but damage per target is ${correctPerHit})`)
    }
    
    console.log(`  CURRENT total PvE: ${totalPvE}`)
    console.log(`  CURRENT PvP (${s.pvpDamagePercent}%): ${Math.round(totalPvE * s.pvpDamagePercent! / 100 * 100) / 100}`)
  }
  
  await db.$disconnect()
}
main().catch(console.error)
