import { db } from '../src/lib/db'
async function main() {
  // Check ALL skills for stamina mentions in tooltip
  const withStamTooltip = await db.skill.findMany({ 
    where: { tooltipRawHtml: { contains: 'tamina' } },
    select: { skillId: true, name: true, tooltipRawHtml: true, description: true },
    take: 5,
  })
  console.log(`Skills with "tamina" in tooltip: ${await db.skill.count({ where: { tooltipRawHtml: { contains: 'tamina' } } })}`)
  
  for (const s of withStamTooltip) {
    const html = s.tooltipRawHtml!
    const idx = html.toLowerCase().indexOf('tamina')
    const context = html.slice(Math.max(0, idx - 80), idx + 120)
    console.log(`\n  ${s.skillId} ${s.name}:`)
    console.log(`    ...${context}...`)
  }
  
  // Check for "Endurance" or "WP" or "MP" cost patterns
  console.log('\n--- MP/WP cost patterns ---')
  const withMp = await db.skill.count({ where: { tooltipRawHtml: { contains: 'MP' } } })
  const withWp = await db.skill.count({ where: { tooltipRawHtml: { contains: 'WP' } } })
  const withHp = await db.skill.count({ where: { tooltipRawHtml: { contains: 'HP' } } })
  console.log(`  tooltip contains "MP": ${withMp}`)
  console.log(`  tooltip contains "WP": ${withWp}`)
  console.log(`  tooltip contains "HP": ${withHp}`)
  
  // Check for a resource cost pattern like "10 MP" or "MP 10"
  const sampleMp = await db.skill.findFirst({
    where: { tooltipRawHtml: { contains: 'MP' }, NOT: { tooltipRawHtml: { contains: 'MP +55' } } },
    select: { skillId: true, name: true, tooltipRawHtml: true },
  })
  if (sampleMp) {
    const html = sampleMp.tooltipRawHtml!
    const idx = html.indexOf('MP')
    console.log(`\n  Sample MP skill: ${sampleMp.skillId} ${sampleMp.name}`)
    console.log(`    Context: ...${html.slice(Math.max(0, idx - 60), idx + 80)}...`)
  }
  
  await db.$disconnect()
}
main().catch(console.error)
