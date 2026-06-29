import { db } from '../src/lib/db'
async function main() {
  // Check for resource cost patterns in description
  const patterns = [
    /Consumes?\s+(\d+)\s+(MP|WP|SP|Stamina|HP|Black Spirit)/i,
    /(\d+)\s+(MP|WP|SP|Stamina|HP)\s+(?:cost|consumed|per)/i,
    /Recover(?:s)?\s+(\d+)\s+(MP|WP|SP|Stamina|HP)/i,
  ]
  
  let withResource = 0
  const resourceTypes = new Map<string, number>()
  
  const skills = await db.skill.findMany({ 
    where: { description: { not: null } },
    select: { skillId: true, name: true, description: true },
    take: 2000,
  })
  
  for (const s of skills) {
    const desc = s.description || ''
    for (const p of patterns) {
      const m = desc.match(p)
      if (m) {
        withResource++
        const resource = m[2].toLowerCase()
        resourceTypes.set(resource, (resourceTypes.get(resource) || 0) + 1)
        break
      }
    }
  }
  
  console.log(`Skills with resource cost in description (of 2000): ${withResource}`)
  for (const [r, c] of [...resourceTypes.entries()].sort((a,b) => b[1]-a[1])) {
    console.log(`  ${r}: ${c}`)
  }
  
  // Also check tooltip HTML for resource cost near "tag_control" or in description div
  console.log('\n--- Checking tooltip HTML for stamina cost ---')
  const stamSkills = await db.skill.findMany({
    where: { tooltipRawHtml: { contains: 'Stamina' } },
    select: { skillId: true, name: true, tooltipRawHtml: true },
    take: 3,
  })
  for (const s of stamSkills) {
    const html = s.tooltipRawHtml!
    // Find "Stamina" in the description div
    const descMatch = html.match(/<div id="description">([\s\S]*?)<\/div>/)
    if (descMatch) {
      const desc = descMatch[1]
      if (desc.includes('Stamina')) {
        const idx = desc.indexOf('Stamina')
        console.log(`\n  ${s.skillId} ${s.name}:`)
        console.log(`    ${desc.slice(Math.max(0, idx - 60), idx + 80).replace(/<[^>]+>/g, '').trim()}`)
      }
    }
  }
  
  await db.$disconnect()
}
main().catch(console.error)
