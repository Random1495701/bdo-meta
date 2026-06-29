import { db } from '../src/lib/db'
async function main() {
  const all = await db.skill.findMany({ where: { ccTypes: { not: null } }, select: { ccTypes: true } })
  const ccSet = new Map<string, number>()
  for (const s of all) {
    for (const cc of s.ccTypes!.split(',').map(x => x.trim()).filter(Boolean)) {
      ccSet.set(cc, (ccSet.get(cc) || 0) + 1)
    }
  }
  console.log('--- All CC types in DB (by frequency) ---')
  for (const [cc, count] of [...ccSet.entries()].sort((a,b) => b[1]-a[1])) {
    console.log(`  ${cc}: ${count}`)
  }
  
  // Check stamina/endurance in descriptions
  console.log('\n--- Stamina/Endurance in skill data ---')
  const withStamina = await db.skill.count({ where: { description: { contains: 'tamina' } } })
  const withEndurance = await db.skill.count({ where: { description: { contains: 'ndurance' } } })
  console.log(`  description contains "tamina": ${withStamina}`)
  console.log(`  description contains "ndurance": ${withEndurance}`)
  
  // Check tooltip HTML for stamina
  const sampleWithStam = await db.skill.findFirst({ 
    where: { tooltipRawHtml: { contains: 'tamina' } },
    select: { skillId: true, name: true, tooltipRawHtml: true },
  })
  if (sampleWithStam) {
    console.log(`\n  Sample skill with stamina in tooltip: ${sampleWithStam.skillId} ${sampleWithStam.name}`)
    // Find the stamina context
    const idx = sampleWithStam.tooltipRawHtml!.toLowerCase().indexOf('tamina')
    if (idx >= 0) console.log(`  Context: ...${sampleWithStam.tooltipRawHtml!.slice(Math.max(0,idx-30), idx+80)}...`)
  }
  
  // Check for protection icons in tooltip HTML
  console.log('\n--- Protection in tooltip HTML ---')
  const withProt = await db.skill.findFirst({ 
    where: { protectionTypes: { not: null } },
    select: { skillId: true, name: true, tooltipRawHtml: true, protectionTypes: true },
  })
  if (withProt) {
    console.log(`  Sample: ${withProt.skillId} ${withProt.name} prot=${withProt.protectionTypes}`)
    // Look for img tags near protection keywords
    const html = withProt.tooltipRawHtml!
    const protIdx = html.indexOf('Super Armor')
    if (protIdx >= 0) {
      console.log(`  Context around "Super Armor": ...${html.slice(Math.max(0,protIdx-100), protIdx+100)}...`)
    }
  }
  
  await db.$disconnect()
}
main().catch(console.error)
