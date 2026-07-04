import { db } from '../src/lib/db'
async function main() {
  const prime = await db.skill.findMany({ where: { name: { startsWith: 'Prime:' } }, select: { skillId: true, name: true, className: true, isSuccession: true }, take: 10 })
  console.log(`Prime: skills (startsWith 'Prime:'): ${prime.length} (showing 10)`)
  for (const s of prime) console.log(`  ${s.skillId} ${s.name} [succ=${s.isSuccession}] class=${s.className}`)
  const primeCount = await db.skill.count({ where: { name: { startsWith: 'Prime:' } } })
  const succCount = await db.skill.count({ where: { isSuccession: true } })
  console.log(`\nTotal Prime: ${primeCount}, Total Succession-flagged: ${succCount}`)
  // Check what other prefixes exist
  console.log('\n--- name prefix distribution (first word before :) ---')
  const all = await db.skill.findMany({ where: { name: { contains: ':' } }, select: { name: true } })
  const prefixes = new Map<string, number>()
  for (const s of all) {
    const m = s.name.match(/^([^:]+):/)
    if (m) prefixes.set(m[1], (prefixes.get(m[1]) || 0) + 1)
  }
  const sorted = [...prefixes.entries()].sort((a,b) => b[1]-a[1]).slice(0, 15)
  for (const [p, c] of sorted) console.log(`  "${p}:" → ${c}`)
  await db.$disconnect()
}
main().catch(console.error)
