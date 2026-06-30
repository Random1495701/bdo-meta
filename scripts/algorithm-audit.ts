import { db } from '../src/lib/db'
import { calculateDamage } from '../src/lib/damage'
import { calculateCCCounters, formatCCCounters, isRealCC, getRealCCs } from '../src/lib/cc'

async function main() {
  console.log('=== 1. Class filtering ===')
  // Verify: classId filter + className match
  const corsair = await db.bdoClass.findFirst({ where: { name: 'Corsair' } })
  const corsairSkills = await db.skill.findMany({ where: { classId: corsair!.id } })
  const wrongClass = corsairSkills.filter(s => s.className && !s.className.includes('Corsair'))
  console.log(`  Corsair (id=${corsair!.id}): ${corsairSkills.length} skills, ${wrongClass.length} wrong className`)
  
  console.log('\n=== 2. (Not in use) filtering ===')
  const notInUse = await db.skill.count({ where: { name: { contains: '(Not in use)' } } })
  const notInUse2 = await db.skill.count({ where: { name: { contains: '(Not in Use)' } } })
  console.log(`  (Not in use): ${notInUse}, (Not in Use): ${notInUse2} — should be excluded by API`)
  
  console.log('\n=== 3. Damage calculation ===')
  const testSkills = await db.skill.findMany({
    where: { damageRowsJson: { not: null }, pvpDamagePercent: { not: null } },
    select: { skillId: true, name: true, damageRowsJson: true, pvpDamagePercent: true },
    take: 5,
  })
  for (const s of testSkills) {
    const rows = JSON.parse(s.damageRowsJson!)
    const dmg = calculateDamage(rows, s.pvpDamagePercent)
    const damageRows = rows.filter((r: any) => r.kind === 'damage')
    if (damageRows.length > 0) {
      let manualTotal = 0
      for (const r of damageRows) {
        const m = r.value?.match(/([\d,]+)%\s*x\s*(\d+)/i)
        if (m) manualTotal += parseFloat(m[1].replace(/,/g, '')) * parseInt(m[2])
      }
      const match = manualTotal === dmg.totalPvE ? '✓' : '✗'
      console.log(`  ${match} ${s.skillId} ${s.name}: calc=${dmg.totalPvE}, manual=${manualTotal}`)
    }
  }
  
  console.log('\n=== 4. CC counter calculation ===')
  const ccSkills = await db.skill.findMany({
    where: { ccTypes: { not: null } },
    select: { skillId: true, name: true, ccTypes: true, damageRowsJson: true },
    take: 5,
  })
  for (const s of ccSkills) {
    const ccArr = s.ccTypes!.split(',').map(x => x.trim()).filter(Boolean)
    const pveOnly = new Set<string>()
    if (s.damageRowsJson) {
      const rows = JSON.parse(s.damageRowsJson)
      for (const r of rows) {
        if (r.kind === 'cc' && r.pveOnly) pveOnly.add(r.label)
      }
    }
    const pvpCCs = ccArr.filter(cc => !pveOnly.has(cc) && isRealCC(cc))
    const counters = calculateCCCounters(pvpCCs)
    const display = formatCCCounters(pvpCCs)
    console.log(`  ${s.skillId} ${s.name}: ccTypes=[${ccArr.join(',')}] pvpCCs=[${pvpCCs.join(',')}] counters=${counters} display="${display}"`)
  }
  
  console.log('\n=== 5. Max-rank filtering ===')
  // Check that rank suffixes are correctly stripped
  const RANK_SUFFIX = /\s+(XXX|XXIX|XXVIII|XXVII|XXVI|XXV|XXIV|XXIII|XXII|XXI|XX|XIX|XVIII|XVII|XVI|XV|XIV|XIII|XII|XI|IX|VIII|VII|VI|IV|V|III|II|I)$/
  const testNames = ['Slash X', 'Bolt Wave IV', 'Dark Maneuver XXX', 'Souldance IV', 'Counter I']
  for (const name of testNames) {
    const base = name.replace(RANK_SUFFIX, '')
    console.log(`  "${name}" → base="${base}" ${base !== name ? '✓' : '✗ (no strip)'}`)
  }
  
  console.log('\n=== 6. Spec deduplication ===')
  // Check that Prime: replaces Main/Absolute for succession spec
  const warriorSkills = await db.skill.findMany({
    where: { classId: 0, name: { startsWith: 'Prime: ' } },
    select: { skillId: true, name: true },
    take: 3,
  })
  for (const s of warriorSkills) {
    const baseName = s.name.replace('Prime: ', '')
    const hasMain = await db.skill.findFirst({ where: { classId: 0, name: { startsWith: baseName + ' ' } } })
    const hasAbs = await db.skill.findFirst({ where: { classId: 0, name: `Absolute: ${baseName}` } })
    console.log(`  Prime: ${baseName} → main=${hasMain ? 'yes' : 'no'}, abs=${hasAbs ? 'yes' : 'no'} (should be excluded in succession spec)`)
  }
  
  console.log('\n=== 7. Flow/Core typing ===')
  console.log(`  Flow: isAwakening: ${await db.skill.count({ where: { name: { startsWith: 'Flow:' }, isAwakening: true } })}/269`)
  console.log(`  Core: isAwakening: ${await db.skill.count({ where: { name: { startsWith: 'Core:' }, isAwakening: true } })}/160`)
  
  console.log('\n=== 8. Type flags summary ===')
  console.log(`  isAwakening: ${await db.skill.count({ where: { isAwakening: true } })}`)
  console.log(`  isSuccession: ${await db.skill.count({ where: { isSuccession: true } })}`)
  console.log(`  isAbsolute: ${await db.skill.count({ where: { isAbsolute: true } })}`)
  console.log(`  isBlackSpirit: ${await db.skill.count({ where: { isBlackSpirit: true } })}`)
  console.log(`  isPassive: ${await db.skill.count({ where: { isPassive: true } })}`)
  console.log(`  Untyped (main): ${await db.skill.count({ where: { isAwakening: false, isSuccession: false, isAbsolute: false, isBlackSpirit: false, isPassive: false } })}`)
  
  console.log('\n=== 9. Evasion filtering ===')
  const evasionCount = await db.skill.count({ where: { name: { contains: 'Evasion' } } })
  console.log(`  Skills with 'Evasion' in name: ${evasionCount} (should be excluded by default)`)
  
  console.log('\n=== 10. Ascension-only classes ===')
  const ascClasses = ['scholar', 'archer', 'shai', 'seraph', 'deadeye', 'wukong']
  for (const slug of ascClasses) {
    const cls = await db.bdoClass.findFirst({ where: { slug } })
    if (!cls) continue
    const succ = await db.skill.count({ where: { classId: cls.id, isSuccession: true } })
    const awk = await db.skill.count({ where: { classId: cls.id, isAwakening: true } })
    console.log(`  ${cls.name}: succession=${succ}, awakening=${awk} (both should be used as ascension)`)
  }
  
  await db.$disconnect()
  console.log('\n=== Audit complete ===')
}
main().catch(console.error)
