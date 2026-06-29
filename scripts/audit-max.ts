import { db } from '../src/lib/db'
async function main() {
  const maxLevel = await db.skill.aggregate({ _max: { requiredLevel: true } })
  const maxCd = await db.skill.aggregate({ _max: { cooldownSec: true } })
  const maxAnim = await db.skill.aggregate({ _max: { animationDurationMs: true } })
  const maxSp = await db.skill.aggregate({ _max: { skillPoints: true } })
  const minCd = await db.skill.aggregate({ _min: { cooldownSec: true } })
  const minAnim = await db.skill.aggregate({ _min: { animationDurationMs: true } })
  console.log('requiredLevel:', maxLevel._max.requiredLevel)
  console.log('cooldownSec:', minCd._min.cooldownSec, '-', maxCd._max.cooldownSec)
  console.log('animationDurationMs:', minAnim._min.animationDurationMs, '-', maxAnim._max.animationDurationMs)
  console.log('skillPoints:', maxSp._max.skillPoints)
  
  // Check damage max
  const withDamage = await db.skill.findMany({ where: { damageRowsJson: { not: null } }, select: { damageRowsJson: true, pvpDamagePercent: true } })
  let maxDmg = 0
  for (const s of withDamage) {
    const rows = JSON.parse(s.damageRowsJson!)
    for (const r of rows) {
      if (r.kind === 'damage' && r.value) {
        const m = r.value.match(/([\d,]+)%/)
        if (m) maxDmg = Math.max(maxDmg, parseFloat(m[1].replace(/,/g, '')))
      }
    }
  }
  console.log('max single damage percent:', maxDmg)
  
  await db.$disconnect()
}
main().catch(console.error)
