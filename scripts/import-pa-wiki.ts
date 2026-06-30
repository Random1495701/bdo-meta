// Import PA Wiki class data (combat types, class groups, SA damage reduction) into the DB.
// Usage: bun run scripts/import-pa-wiki.ts
import { db } from '../src/lib/db'
import { PA_CLASS_DATA } from '../src/lib/pa-wiki-data'

async function main() {
  console.log('=== PA Wiki Data Import ===')
  console.log(`Importing data for ${PA_CLASS_DATA.length} class entries...\n`)

  let updated = 0
  let notFound = 0

  for (const data of PA_CLASS_DATA) {
    const cls = await db.bdoClass.findFirst({ where: { name: data.className } })
    if (!cls) {
      console.log(`  ✗ ${data.className} — not found in DB`)
      notFound++
      continue
    }

    await db.bdoClass.update({
      where: { id: cls.id },
      data: {
        combatType: data.combatType,
        successionGroup: data.successionGroup,
        awakeningGroup: data.awakeningGroup,
        ascensionGroup: data.ascensionGroup,
        successionSaDr: data.successionSaDr,
        awakeningSaDr: data.awakeningSaDr,
        ascensionSaDr: data.ascensionSaDr,
        isAscension: data.isAscension,
      },
    })
    console.log(`  ✓ ${data.className} — ${data.combatType}, ${data.successionGroup}, SA DR: Succ=${data.successionSaDr}% Awk=${data.awakeningSaDr}%${data.isAscension ? ' [Ascension]' : ''}`)
    updated++
  }

  console.log(`\n=== Done ===`)
  console.log(`  Updated: ${updated}`)
  console.log(`  Not found: ${notFound}`)

  // Verify
  const total = await db.bdoClass.count()
  const withCombatType = await db.bdoClass.count({ where: { combatType: { not: null } } })
  console.log(`  Classes in DB: ${total}`)
  console.log(`  With combat type: ${withCombatType}`)

  await db.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
