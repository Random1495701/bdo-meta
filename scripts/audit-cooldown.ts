import { db } from '../src/lib/db'
async function main() {
  const highCd = await db.skill.findMany({
    where: { cooldownSec: { gt: 300 } },
    select: { skillId: true, name: true, className: true, cooldown: true, cooldownSec: true },
    orderBy: { cooldownSec: 'desc' },
    take: 20,
  })
  console.log(`Skills with cooldown > 300s: ${highCd.length}`)
  for (const s of highCd) {
    console.log(`  ${s.skillId} ${s.name} cd="${s.cooldown}" sec=${s.cooldownSec}`)
  }
  
  console.log('\n--- Cooldown distribution ---')
  const ranges: [number, number | null][] = [
    [0, 10], [10, 30], [30, 60], [60, 120], [120, 300], [300, 600], [600, null]
  ]
  for (const [min, max] of ranges) {
    const where = max != null 
      ? { cooldownSec: { gte: min, lt: max } }
      : { cooldownSec: { gte: min } }
    const count = await db.skill.count({ where })
    if (count > 0) console.log(`  ${min}-${max ?? '∞'}s: ${count} skills`)
  }
  
  const realMax = await db.skill.aggregate({
    _max: { cooldownSec: true },
    where: { cooldownSec: { lt: 600 } }
  })
  console.log(`\nMax cooldown (excluding >600s outliers): ${realMax._max.cooldownSec}s`)
  
  const outlier = await db.skill.findFirst({
    where: { cooldownSec: 1200 },
    select: { skillId: true, name: true, cooldown: true, cooldownSec: true, tooltipRawHtml: true },
  })
  if (outlier) {
    console.log(`\n1200s outlier: ${outlier.skillId} ${outlier.name}`)
    console.log(`  cooldown field: "${outlier.cooldown}"`)
    const html = outlier.tooltipRawHtml || ''
    const cdMatch = html.match(/tag_cooldown">([\s\S]*?)<\/span>/)
    if (cdMatch) console.log(`  raw tag_cooldown: "${cdMatch[1].replace(/<[^>]+>/g,'').trim()}"`)
  }
  
  await db.$disconnect()
}
main().catch(console.error)
