// PA Wiki class data — combat types, class groups, and SA damage reduction per spec.
// Source: Pearl Abyss official wiki + game documentation.
// Class groups follow rock-paper-scissors: Vanguard > Crusher > Skirmisher > Vanguard (+5% damage)
// SA DR (Super Armor Damage Reduction) varies per spec (10-25%).

interface PAClassData {
  className: string
  combatType: 'Melee' | 'Ranged' | 'Magic'
  successionGroup: 'Vanguard' | 'Crusher' | 'Skirmisher'
  awakeningGroup: 'Vanguard' | 'Crusher' | 'Skirmisher'
  ascensionGroup: 'Vanguard' | 'Crusher' | 'Skirmisher' | null
  successionSaDr: number
  awakeningSaDr: number
  ascensionSaDr: number | null
  isAscension: boolean // ascension-only class (no awakening/succession choice)
}

export const PA_CLASS_DATA: PAClassData[] = [
  // Vanguard group (tanks/bruisers) — high SA DR
  { className: 'Warrior',      combatType: 'Melee',  successionGroup: 'Vanguard',  awakeningGroup: 'Vanguard',  ascensionGroup: null,         successionSaDr: 20, awakeningSaDr: 20, ascensionSaDr: null, isAscension: false },
  { className: 'Berserker',    combatType: 'Melee',  successionGroup: 'Vanguard',  awakeningGroup: 'Vanguard',  ascensionGroup: null,         successionSaDr: 20, awakeningSaDr: 20, ascensionSaDr: null, isAscension: false },
  { className: 'Valkyrie',     combatType: 'Melee',  successionGroup: 'Vanguard',  awakeningGroup: 'Vanguard',  ascensionGroup: null,         successionSaDr: 20, awakeningSaDr: 20, ascensionSaDr: null, isAscension: false },
  { className: 'Striker',      combatType: 'Melee',  successionGroup: 'Vanguard',  awakeningGroup: 'Vanguard',  ascensionGroup: null,         successionSaDr: 20, awakeningSaDr: 20, ascensionSaDr: null, isAscension: false },
  { className: 'Mystic',       combatType: 'Melee',  successionGroup: 'Vanguard',  awakeningGroup: 'Vanguard',  ascensionGroup: null,         successionSaDr: 20, awakeningSaDr: 20, ascensionSaDr: null, isAscension: false },
  { className: 'Guardian',     combatType: 'Melee',  successionGroup: 'Vanguard',  awakeningGroup: 'Vanguard',  ascensionGroup: null,         successionSaDr: 25, awakeningSaDr: 25, ascensionSaDr: null, isAscension: false },
  { className: 'Nova',         combatType: 'Melee',  successionGroup: 'Vanguard',  awakeningGroup: 'Vanguard',  ascensionGroup: null,         successionSaDr: 20, awakeningSaDr: 20, ascensionSaDr: null, isAscension: false },

  // Crusher group (burst damage) — medium SA DR
  { className: 'Sorceress',    combatType: 'Magic',  successionGroup: 'Crusher',   awakeningGroup: 'Crusher',   ascensionGroup: null,         successionSaDr: 15, awakeningSaDr: 15, ascensionSaDr: null, isAscension: false },
  { className: 'Tamer',        combatType: 'Melee',  successionGroup: 'Crusher',   awakeningGroup: 'Crusher',   ascensionGroup: null,         successionSaDr: 15, awakeningSaDr: 15, ascensionSaDr: null, isAscension: false },
  { className: 'Lahn',         combatType: 'Melee',  successionGroup: 'Crusher',   awakeningGroup: 'Crusher',   ascensionGroup: null,         successionSaDr: 15, awakeningSaDr: 15, ascensionSaDr: null, isAscension: false },
  { className: 'Hashashin',    combatType: 'Melee',  successionGroup: 'Crusher',   awakeningGroup: 'Crusher',   ascensionGroup: null,         successionSaDr: 15, awakeningSaDr: 15, ascensionSaDr: null, isAscension: false },
  { className: 'Sage',         combatType: 'Magic',  successionGroup: 'Crusher',   awakeningGroup: 'Crusher',   ascensionGroup: null,         successionSaDr: 15, awakeningSaDr: 15, ascensionSaDr: null, isAscension: false },
  { className: 'Corsair',      combatType: 'Melee',  successionGroup: 'Crusher',   awakeningGroup: 'Crusher',   ascensionGroup: null,         successionSaDr: 15, awakeningSaDr: 15, ascensionSaDr: null, isAscension: false },
  { className: 'Drakania',     combatType: 'Melee',  successionGroup: 'Crusher',   awakeningGroup: 'Crusher',   ascensionGroup: null,         successionSaDr: 15, awakeningSaDr: 15, ascensionSaDr: null, isAscension: false },

  // Skirmisher group (ranged/mobile) — low SA DR
  { className: 'Ranger',       combatType: 'Ranged', successionGroup: 'Skirmisher', awakeningGroup: 'Skirmisher', ascensionGroup: null,       successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: null, isAscension: false },
  { className: 'Witch',        combatType: 'Magic',  successionGroup: 'Skirmisher', awakeningGroup: 'Skirmisher', ascensionGroup: null,       successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: null, isAscension: false },
  { className: 'Wizard',       combatType: 'Magic',  successionGroup: 'Skirmisher', awakeningGroup: 'Skirmisher', ascensionGroup: null,       successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: null, isAscension: false },
  { className: 'Musa',         combatType: 'Melee',  successionGroup: 'Skirmisher', awakeningGroup: 'Skirmisher', ascensionGroup: null,       successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: null, isAscension: false },
  { className: 'Maehwa',       combatType: 'Melee',  successionGroup: 'Skirmisher', awakeningGroup: 'Skirmisher', ascensionGroup: null,       successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: null, isAscension: false },
  { className: 'Kunoichi',     combatType: 'Melee',  successionGroup: 'Skirmisher', awakeningGroup: 'Skirmisher', ascensionGroup: null,       successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: null, isAscension: false },
  { className: 'Ninja',        combatType: 'Melee',  successionGroup: 'Skirmisher', awakeningGroup: 'Skirmisher', ascensionGroup: null,       successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: null, isAscension: false },
  { className: 'Dark Knight',  combatType: 'Magic',  successionGroup: 'Skirmisher', awakeningGroup: 'Skirmisher', ascensionGroup: null,       successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: null, isAscension: false },
  { className: 'Woosa',        combatType: 'Magic',  successionGroup: 'Skirmisher', awakeningGroup: 'Skirmisher', ascensionGroup: null,       successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: null, isAscension: false },
  { className: 'Maegu',        combatType: 'Magic',  successionGroup: 'Skirmisher', awakeningGroup: 'Skirmisher', ascensionGroup: null,       successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: null, isAscension: false },
  { className: 'Dosa',         combatType: 'Ranged', successionGroup: 'Skirmisher', awakeningGroup: 'Skirmisher', ascensionGroup: null,       successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: null, isAscension: false },

  // Ascension-only classes (no awakening/succession choice — they use Ascension)
  { className: 'Archer',       combatType: 'Ranged', successionGroup: 'Skirmisher', awakeningGroup: 'Skirmisher', ascensionGroup: 'Skirmisher', successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: 10, isAscension: true },
  { className: 'Shai',         combatType: 'Magic',  successionGroup: 'Skirmisher', awakeningGroup: 'Skirmisher', ascensionGroup: 'Skirmisher', successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: 10, isAscension: true },
  { className: 'Scholar',      combatType: 'Ranged', successionGroup: 'Skirmisher', awakeningGroup: 'Skirmisher', ascensionGroup: 'Skirmisher', successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: 10, isAscension: true },
  { className: 'Seraph',       combatType: 'Magic',  successionGroup: 'Crusher',    awakeningGroup: 'Crusher',    ascensionGroup: 'Crusher',    successionSaDr: 15, awakeningSaDr: 15, ascensionSaDr: 15, isAscension: true },
  { className: 'Deadeye',      combatType: 'Ranged', successionGroup: 'Skirmisher', awakeningGroup: 'Skirmisher', ascensionGroup: 'Skirmisher', successionSaDr: 10, awakeningSaDr: 10, ascensionSaDr: 10, isAscension: true },
  { className: 'Wukong',       combatType: 'Melee',  successionGroup: 'Crusher',    awakeningGroup: 'Crusher',    ascensionGroup: 'Crusher',    successionSaDr: 15, awakeningSaDr: 15, ascensionSaDr: 15, isAscension: true },
]

// Class group counter relationships (rock-paper-scissors)
// Vanguard > Crusher > Skirmisher > Vanguard
// Counter advantage: +5% damage to the countering group
export const GROUP_COUNTERS: Record<string, string> = {
  Vanguard: 'Crusher',
  Crusher: 'Skirmisher',
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
