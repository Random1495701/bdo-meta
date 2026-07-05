// Validate PA Wiki data in DB against expected values.
// Uses the same WIKI_DATA as import-pa-wiki.ts to ensure consistency.
// Usage: bun run scripts/validate-matchups.ts

import { db } from '../src/lib/db'

// Same data as import-pa-wiki.ts — keep in sync
const WIKI_DATA = [
  { className: 'Warrior', combatType: 'Melee', successionGroup: 'Vanguard', awakeningGroup: 'Skirmisher', ascensionGroup: null, successionSaDr: 15, awakeningSaDr: 20, ascensionSaDr: 10 },
  { className: 'Ranger', combatType: 'Ranged', successionGroup: 'Pulverizer', awakeningGroup: 'Skirmisher', ascensionGroup: null, successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: 10 },
  { className: 'Sorceress', combatType: 'Magic', successionGroup: 'Pulverizer', awakeningGroup: 'Skirmisher', ascensionGroup: null, successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: 10 },
  { className: 'Berserker', combatType: 'Melee', successionGroup: 'Vanguard', awakeningGroup: 'Skirmisher', ascensionGroup: null, successionSaDr: 15, awakeningSaDr: 10, ascensionSaDr: 10 },
  { className: 'Tamer', combatType: 'Magic', successionGroup: 'Pulverizer', awakeningGroup: 'Skirmisher', ascensionGroup: null, successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: 10 },
  { className: 'Valkyrie', combatType: 'Melee', successionGroup: 'Vanguard', awakeningGroup: 'Vanguard', ascensionGroup: null, successionSaDr: 20, awakeningSaDr: 15, ascensionSaDr: 10 },
  { className: 'Kunoichi', combatType: 'Melee', successionGroup: 'Pulverizer', awakeningGroup: 'Skirmisher', ascensionGroup: null, successionSaDr: 10, awakeningSaDr: 15, ascensionSaDr: 10 },
  { className: 'Ninja', combatType: 'Melee', successionGroup: 'Pulverizer', awakeningGroup: 'Skirmisher', ascensionGroup: null, successionSaDr: 10, awakeningSaDr: 15, ascensionSaDr: 10 },
  { className: 'Wizard', combatType: 'Magic', successionGroup: 'Pulverizer', awakeningGroup: 'Skirmisher', ascensionGroup: null, successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: 10 },
  { className: 'Witch', combatType: 'Magic', successionGroup: 'Pulverizer', awakeningGroup: 'Skirmisher', ascensionGroup: null, successionSaDr: 10, awakeningSaDr: 20, ascensionSaDr: 10 },
  { className: 'Dark Knight', combatType: 'Magic', successionGroup: 'Skirmisher', awakeningGroup: 'Pulverizer', ascensionGroup: null, successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: 10 },
  { className: 'Striker', combatType: 'Melee', successionGroup: 'Vanguard', awakeningGroup: 'Skirmisher', ascensionGroup: null, successionSaDr: 25, awakeningSaDr: 25, ascensionSaDr: 10 },
  { className: 'Mystic', combatType: 'Melee', successionGroup: 'Skirmisher', awakeningGroup: 'Vanguard', ascensionGroup: null, successionSaDr: 25, awakeningSaDr: 25, ascensionSaDr: 10 },
  { className: 'Lahn', combatType: 'Melee', successionGroup: 'Pulverizer', awakeningGroup: 'Skirmisher', ascensionGroup: null, successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: 10 },
  { className: 'Archer', combatType: 'Ranged', successionGroup: null, awakeningGroup: null, ascensionGroup: 'Pulverizer', successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: 10 },
  { className: 'Shai', combatType: 'Melee', successionGroup: null, awakeningGroup: null, ascensionGroup: 'Vanguard', successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: 20 },
  { className: 'Guardian', combatType: 'Melee', successionGroup: 'Vanguard', awakeningGroup: 'Vanguard', ascensionGroup: null, successionSaDr: 15, awakeningSaDr: 20, ascensionSaDr: 10 },
  { className: 'Hashashin', combatType: 'Magic', successionGroup: 'Pulverizer', awakeningGroup: 'Skirmisher', ascensionGroup: null, successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: 10 },
  { className: 'Nova', combatType: 'Melee', successionGroup: 'Vanguard', awakeningGroup: 'Skirmisher', ascensionGroup: null, successionSaDr: 15, awakeningSaDr: 10, ascensionSaDr: 10 },
  { className: 'Sage', combatType: 'Magic', successionGroup: 'Pulverizer', awakeningGroup: 'Skirmisher', ascensionGroup: null, successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: 10 },
  { className: 'Corsair', combatType: 'Melee', successionGroup: 'Vanguard', awakeningGroup: 'Pulverizer', ascensionGroup: null, successionSaDr: 20, awakeningSaDr: 10, ascensionSaDr: 10 },
  { className: 'Drakania', combatType: 'Melee', successionGroup: 'Vanguard', awakeningGroup: 'Skirmisher', ascensionGroup: null, successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: 10 },
  { className: 'Woosa', combatType: 'Magic', successionGroup: 'Skirmisher', awakeningGroup: 'Pulverizer', ascensionGroup: null, successionSaDr: 10, awakeningSaDr: 15, ascensionSaDr: 10 },
  { className: 'Maegu', combatType: 'Magic', successionGroup: 'Skirmisher', awakeningGroup: 'Pulverizer', ascensionGroup: null, successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: 10 },
  { className: 'Scholar', combatType: 'Melee', successionGroup: null, awakeningGroup: null, ascensionGroup: 'Vanguard', successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: 20 },
  { className: 'Dosa', combatType: 'Magic', successionGroup: 'Skirmisher', awakeningGroup: 'Pulverizer', ascensionGroup: null, successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: 10 },
  { className: 'Deadeye', combatType: 'Ranged', successionGroup: null, awakeningGroup: null, ascensionGroup: 'Pulverizer', successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: 10 },
  { className: 'Wukong', combatType: 'Melee', successionGroup: null, awakeningGroup: null, ascensionGroup: 'Skirmisher', successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: 15 },
  { className: 'Seraph', combatType: 'Melee', successionGroup: null, awakeningGroup: null, ascensionGroup: 'Skirmisher', successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: 20 },
  // Musa + Maehwa missing from import script — known gap
]

async function main() {
  console.log('=== Matchup Validation ===')
  console.log('Comparing DB PA Wiki data against pa-wiki-data.ts source...\n')

  const classes = await db.bdoClass.findMany({
    where: { name: { not: { startsWith: 'NEW_CLASS' } } },
    select: { id: true, name: true, combatType: true, successionGroup: true, awakeningGroup: true, ascensionGroup: true, successionSaDr: true, awakeningSaDr: true, ascensionSaDr: true, isAscension: true },
  })

  let pass = 0
  let fail = 0
  const issues: string[] = []

  for (const cls of classes) {
    const expected = WIKI_DATA.find((d: any) => d.className === cls.name)
    if (!expected) {
      issues.push(`⚠️  ${cls.name}: not found in pa-wiki-data.ts`)
      fail++
      continue
    }

    const checks: { field: string; db: any; expected: any }[] = [
      { field: 'combatType', db: cls.combatType, expected: expected.combatType },
      { field: 'successionGroup', db: cls.successionGroup, expected: expected.successionGroup },
      { field: 'awakeningGroup', db: cls.awakeningGroup, expected: expected.awakeningGroup },
      { field: 'ascensionGroup', db: cls.ascensionGroup, expected: expected.ascensionGroup },
      { field: 'successionSaDr', db: cls.successionSaDr, expected: expected.successionSaDr },
      { field: 'awakeningSaDr', db: cls.awakeningSaDr, expected: expected.awakeningSaDr },
      { field: 'ascensionSaDr', db: cls.ascensionSaDr, expected: expected.ascensionSaDr },
      { field: 'isAscension', db: cls.isAscension, expected: !expected.successionGroup && !expected.awakeningGroup && !!expected.ascensionGroup },
    ]

    const mismatches = checks.filter(c => String(c.db) !== String(c.expected))
    if (mismatches.length === 0) {
      pass++
    } else {
      fail++
      for (const m of mismatches) {
        issues.push(`❌ ${cls.name} ${m.field}: DB=${m.db} expected=${m.expected}`)
      }
    }
  }

  console.log(`Results: ${pass} passed, ${fail} failed (out of ${classes.length} classes)\n`)
  if (issues.length > 0) {
    console.log('Issues:')
    for (const i of issues) console.log(`  ${i}`)
    console.log('\nFix: bun run scripts/import-pa-wiki.ts')
  } else {
    console.log('✅ All class data matches pa-wiki-data.ts')
  }

  await db.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
