import { db } from '../src/lib/db'
async function main() {
  const all = await db.skill.findMany({
    where: { cooldownSec: { not: null } },
    select: { cooldownSec: true },
    orderBy: { cooldownSec: 'asc' },
  })
  const vals = all.map(s => s.cooldownSec!).filter(v => v > 0)
  console.log(`Total skills with cooldown: ${vals.length}`)
  const p = (pct: number) => vals[Math.floor(vals.length * pct / 100)]
  console.log(`50th percentile: ${p(50)}s`)
  console.log(`75th percentile: ${p(75)}s`)
  console.log(`90th percentile: ${p(90)}s`)
  console.log(`95th percentile: ${p(95)}s`)
  console.log(`99th percentile: ${p(99)}s`)
  console.log(`Max: ${vals[vals.length-1]}s`)
  
  // Also check animation duration percentiles
  const anims = await db.skill.findMany({
    where: { animationDurationMs: { not: null } },
    select: { animationDurationMs: true },
    orderBy: { animationDurationMs: 'asc' },
  })
  const avals = anims.map(s => s.animationDurationMs!).filter(v => v > 0)
  console.log(`\nAnimation durations: ${avals.length} skills`)
  const ap = (pct: number) => avals[Math.floor(avals.length * pct / 100)]
  console.log(`50th: ${ap(50)}ms, 90th: ${ap(90)}ms, 95th: ${ap(95)}ms, 99th: ${ap(99)}ms, max: ${avals[avals.length-1]}ms`)
  
  await db.$disconnect()
}
main().catch(console.error)
