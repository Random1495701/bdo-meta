import { db } from '../src/lib/db'

// Data parsed from https://www.naeu.playblackdesert.com/en-us/Wiki?wikiNo=225
// Combat Types, Class Groups, and Super Armor Damage Reduction per spec

interface ClassWikiData {
  className: string
  combatType: 'Melee' | 'Ranged' | 'Magic'
  // Groups per spec: succession group, awakening group
  successionGroup: 'Vanguard' | 'Pulverizer' | 'Skirmisher' | null
  awakeningGroup: 'Vanguard' | 'Pulverizer' | 'Skirmisher' | null
  ascensionGroup: 'Vanguard' | 'Pulverizer' | 'Skirmisher' | null
  // SA DR per spec (default is 10%)
  successionSaDr: number  // 10 = 10%
  awakeningSaDr: number
  ascensionSaDr: number
}

const WIKI_DATA: ClassWikiData[] = [
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
]

async function main() {
  console.log('Updating BdoClass table with PA Wiki data...')
  let updated = 0
  for (const data of WIKI_DATA) {
    const cls = await db.bdoClass.findFirst({ where: { name: data.className } })
    if (!cls) {
      console.warn(`  Class not found: ${data.className}`)
      continue
    }
    await db.bdoClass.update({
      where: { id: cls.id },
      data: {
        mainWeapon: data.combatType,
        awakeningWeapon: JSON.stringify({
          successionGroup: data.successionGroup,
          awakeningGroup: data.awakeningGroup,
          ascensionGroup: data.ascensionGroup,
          successionSaDr: data.successionSaDr,
          awakeningSaDr: data.awakeningSaDr,
          ascensionSaDr: data.ascensionSaDr,
        }),
      },
    })
    updated++
  }
  console.log(`Updated ${updated} classes with combat type, group, and SA DR data`)
  await db.$disconnect()
}
main().catch(console.error)
