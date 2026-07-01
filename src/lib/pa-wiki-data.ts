// PA Wiki class data — combat types, class groups, and SA damage reduction per spec.
// Source: https://www.naeu.playblackdesert.com/en-us/Wiki?wikiNo=225
// Official PA Wiki table — groups are Vanguard, Pulverizer, Skirmisher
// Group synergy: Vanguard > Pulverizer > Skirmisher > Vanguard (+5% damage)
// SA DR default is 10%; only classes with special values are listed in the wiki table.

interface PAClassData {
  className: string
  combatType: 'Melee' | 'Ranged' | 'Magic'
  successionGroup: 'Vanguard' | 'Pulverizer' | 'Skirmisher'
  awakeningGroup: 'Vanguard' | 'Pulverizer' | 'Skirmisher'
  ascensionGroup: 'Vanguard' | 'Pulverizer' | 'Skirmisher' | null
  successionSaDr: number
  awakeningSaDr: number
  ascensionSaDr: number | null
  isAscension: boolean
}

// Data transcribed directly from PA Wiki wikiNo=225 table (verified 2025-07-01)
export const PA_CLASS_DATA: PAClassData[] = [
  // Classes with spec-dependent groups
  { className: 'Warrior',      combatType: 'Melee',  successionGroup: 'Vanguard',   awakeningGroup: 'Skirmisher',  ascensionGroup: null,          successionSaDr: 15, awakeningSaDr: 20, ascensionSaDr: null, isAscension: false },
  { className: 'Ranger',       combatType: 'Ranged', successionGroup: 'Pulverizer', awakeningGroup: 'Skirmisher',  ascensionGroup: null,          successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: null, isAscension: false },
  { className: 'Sorceress',    combatType: 'Magic',  successionGroup: 'Pulverizer', awakeningGroup: 'Skirmisher',  ascensionGroup: null,          successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: null, isAscension: false },
  { className: 'Berserker',    combatType: 'Melee',  successionGroup: 'Vanguard',   awakeningGroup: 'Skirmisher',  ascensionGroup: null,          successionSaDr: 15, awakeningSaDr: 10, ascensionSaDr: null, isAscension: false },
  { className: 'Tamer',        combatType: 'Magic',  successionGroup: 'Pulverizer', awakeningGroup: 'Skirmisher',  ascensionGroup: null,          successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: null, isAscension: false },
  { className: 'Musa',         combatType: 'Melee',  successionGroup: 'Pulverizer', awakeningGroup: 'Skirmisher',  ascensionGroup: null,          successionSaDr: 10, awakeningSaDr: 15, ascensionSaDr: null, isAscension: false },
  { className: 'Maehwa',       combatType: 'Melee',  successionGroup: 'Pulverizer', awakeningGroup: 'Skirmisher',  ascensionGroup: null,          successionSaDr: 10, awakeningSaDr: 15, ascensionSaDr: null, isAscension: false },
  { className: 'Valkyrie',     combatType: 'Melee',  successionGroup: 'Vanguard',   awakeningGroup: 'Vanguard',    ascensionGroup: null,          successionSaDr: 20, awakeningSaDr: 15, ascensionSaDr: null, isAscension: false },
  { className: 'Kunoichi',     combatType: 'Melee',  successionGroup: 'Pulverizer', awakeningGroup: 'Skirmisher',  ascensionGroup: null,          successionSaDr: 10, awakeningSaDr: 15, ascensionSaDr: null, isAscension: false },
  { className: 'Ninja',        combatType: 'Melee',  successionGroup: 'Pulverizer', awakeningGroup: 'Skirmisher',  ascensionGroup: null,          successionSaDr: 10, awakeningSaDr: 15, ascensionSaDr: null, isAscension: false },
  { className: 'Wizard',       combatType: 'Magic',  successionGroup: 'Pulverizer', awakeningGroup: 'Skirmisher',  ascensionGroup: null,          successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: null, isAscension: false },
  { className: 'Witch',        combatType: 'Magic',  successionGroup: 'Pulverizer', awakeningGroup: 'Skirmisher',  ascensionGroup: null,          successionSaDr: 10, awakeningSaDr: 20, ascensionSaDr: null, isAscension: false },
  { className: 'Dark Knight',  combatType: 'Magic',  successionGroup: 'Skirmisher', awakeningGroup: 'Pulverizer',  ascensionGroup: null,          successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: null, isAscension: false },
  { className: 'Striker',      combatType: 'Melee',  successionGroup: 'Vanguard',   awakeningGroup: 'Skirmisher',  ascensionGroup: null,          successionSaDr: 25, awakeningSaDr: 25, ascensionSaDr: null, isAscension: false },
  { className: 'Mystic',       combatType: 'Melee',  successionGroup: 'Skirmisher', awakeningGroup: 'Vanguard',    ascensionGroup: null,          successionSaDr: 25, awakeningSaDr: 25, ascensionSaDr: null, isAscension: false },
  { className: 'Lahn',         combatType: 'Melee',  successionGroup: 'Pulverizer', awakeningGroup: 'Skirmisher',  ascensionGroup: null,          successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: null, isAscension: false },
  { className: 'Guardian',     combatType: 'Melee',  successionGroup: 'Vanguard',   awakeningGroup: 'Vanguard',    ascensionGroup: null,          successionSaDr: 15, awakeningSaDr: 20, ascensionSaDr: null, isAscension: false },
  { className: 'Hashashin',    combatType: 'Magic',  successionGroup: 'Pulverizer', awakeningGroup: 'Skirmisher',  ascensionGroup: null,          successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: null, isAscension: false },
  { className: 'Nova',         combatType: 'Melee',  successionGroup: 'Vanguard',   awakeningGroup: 'Skirmisher',  ascensionGroup: null,          successionSaDr: 15, awakeningSaDr: 10, ascensionSaDr: null, isAscension: false },
  { className: 'Sage',         combatType: 'Magic',  successionGroup: 'Pulverizer', awakeningGroup: 'Skirmisher',  ascensionGroup: null,          successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: null, isAscension: false },
  { className: 'Corsair',      combatType: 'Melee',  successionGroup: 'Vanguard',   awakeningGroup: 'Pulverizer',  ascensionGroup: null,          successionSaDr: 20, awakeningSaDr: 10, ascensionSaDr: null, isAscension: false },
  { className: 'Drakania',     combatType: 'Melee',  successionGroup: 'Vanguard',   awakeningGroup: 'Skirmisher',  ascensionGroup: null,          successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: null, isAscension: false },
  { className: 'Woosa',        combatType: 'Magic',  successionGroup: 'Skirmisher', awakeningGroup: 'Pulverizer',  ascensionGroup: null,          successionSaDr: 10, awakeningSaDr: 15, ascensionSaDr: null, isAscension: false },
  { className: 'Maegu',        combatType: 'Magic',  successionGroup: 'Skirmisher', awakeningGroup: 'Pulverizer',  ascensionGroup: null,          successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: null, isAscension: false },
  { className: 'Dosa',         combatType: 'Magic',  successionGroup: 'Skirmisher', awakeningGroup: 'Pulverizer',  ascensionGroup: null,          successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: null, isAscension: false },

  // Ascension-only classes (single group, no spec choice)
  { className: 'Archer',       combatType: 'Ranged', successionGroup: 'Pulverizer', awakeningGroup: 'Pulverizer',  ascensionGroup: 'Pulverizer',  successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: 10, isAscension: true },
  { className: 'Shai',         combatType: 'Melee',  successionGroup: 'Vanguard',   awakeningGroup: 'Vanguard',    ascensionGroup: 'Vanguard',    successionSaDr: 20, awakeningSaDr: 20, ascensionSaDr: 20, isAscension: true },
  { className: 'Scholar',      combatType: 'Melee',  successionGroup: 'Vanguard',   awakeningGroup: 'Vanguard',    ascensionGroup: 'Vanguard',    successionSaDr: 20, awakeningSaDr: 20, ascensionSaDr: 20, isAscension: true },
  { className: 'Deadeye',      combatType: 'Ranged', successionGroup: 'Pulverizer', awakeningGroup: 'Pulverizer',  ascensionGroup: 'Pulverizer',  successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: 10, isAscension: true },
  { className: 'Wukong',       combatType: 'Melee',  successionGroup: 'Skirmisher', awakeningGroup: 'Skirmisher',  ascensionGroup: 'Skirmisher',  successionSaDr: 15, awakeningSaDr: 15, ascensionSaDr: 15, isAscension: true },
  { className: 'Seraph',       combatType: 'Melee',  successionGroup: 'Skirmisher', awakeningGroup: 'Skirmisher',  ascensionGroup: 'Skirmisher',  successionSaDr: 20, awakeningSaDr: 20, ascensionSaDr: 20, isAscension: true },
]

// Group counter relationships (rock-paper-scissors)
// Vanguard > Pulverizer > Skirmisher > Vanguard
// Counter advantage: +5% damage to the countering group
export const GROUP_COUNTERS: Record<string, string> = {
  Vanguard: 'Pulverizer',
  Pulverizer: 'Skirmisher',
  Skirmisher: 'Vanguard',
}

export function getGroupCounter(group: string | null): string | null {
  if (!group) return null
  return GROUP_COUNTERS[group] || null
}

export function hasCounterAdvantage(attackerGroup: string | null, defenderGroup: string | null): boolean {
  if (!attackerGroup || !defenderGroup) return false
  return GROUP_COUNTERS[attackerGroup] === defenderGroup
}
