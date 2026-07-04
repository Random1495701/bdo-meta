import { db } from '../src/lib/db'
async function main() {
  const skills = await db.skill.findMany({ where: { cooldownSec: { not: null, gt: 0 } }, select: { cooldownSec: true }, orderBy: { cooldownSec: 'asc' } })
  const vals = skills.map(s => s.cooldownSec!)
  // Find the highest value below 600s (before Black Spirit skills)
  const below600 = vals.filter(v => v < 600)
  console.log(`Skills with cooldown < 600s: ${below600.length}`)
  console.log(`Max cooldown below 600s: ${below600[below600.length-1]}s`)
  console.log(`Skills at 1200s: ${vals.filter(v => v === 1200).length}`)
  console.log(`Skills between 300-600s: ${vals.filter(v => v >= 300 && v < 600).length}`)
  console.log(`Skills between 240-300s: ${vals.filter(v => v >= 240 && v < 300).length}`)
  await db.$disconnect()
}
main().catch(console.error)
