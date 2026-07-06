// Curated BDO class combo sequences.
//
// WHY THIS FILE EXISTS:
// BDO Foundry (blackdesertfoundry.com) class guides do NOT publish structured
// skill-combo sequences. They explain spec choice, skill builds, locked skills,
// hotbar skills, and reference community Discord servers / YouTube montages
// for actual combo execution. The `scripts/scrape-combos.ts` script extracts
// the supplementary context (locked/hotbar/core skills) but the combo chains
// themselves are sourced here from publicly known BDO PvP/PvE combo patterns.
//
// FORMAT:
// Each Combo entry has a className, spec (awakening/succession/both), a name,
// ordered steps (skillName + optional note), and a type (pvp/pve/both).
// The UI renders steps as a left-to-right flow with arrows between them.
//
// SOURCES:
// Combos below are based on widely-published BDO community knowledge from
// class discords, YouTube guide channels (e.g. Snow, Goldsteinburg, Mercuel),
// and the combo hints embedded in BDO Foundry skill descriptions. Specific
// sequence order may differ from a given player's preference — these are
// representative starting-point combos, not the only viable rotation.
//
// COVERAGE:
// 8 classes have curated combos (Warrior, Sorceress, Berserker, Musa, Ninja,
// Lahn, Striker, Wizard). Other classes show a "community-sourced combos
// pending" placeholder. To extend: add entries below and the UI picks them up
// automatically — no component changes needed.

export type ComboSpec = 'awakening' | 'succession' | 'both'
export type ComboType = 'pvp' | 'pve' | 'both'

export interface ComboStep {
  skillName: string
  /** Optional short note about timing / cancel / follow-up */
  note?: string
}

export interface Combo {
  className: string
  spec: ComboSpec
  name: string
  steps: ComboStep[]
  type: ComboType
}

export const COMBOS: Combo[] = [
  // ─── WARRIOR ─────────────────────────────────────────────────────
  {
    className: 'Warrior',
    spec: 'awakening',
    name: 'Awakening PvP Grab Combo',
    type: 'pvp',
    steps: [
      { skillName: 'Solar Flare', note: 'Engage with SA' },
      { skillName: 'Grave Digging', note: 'Bound CC' },
      { skillName: 'Pulverize', note: 'Down-smash + grapple window' },
      { skillName: 'Frenzied Strikes', note: 'Cancel into grab' },
      { skillName: 'Slashing the Dead' },
      { skillName: 'Scars of Dusk', note: 'Finisher' },
    ],
  },
  {
    className: 'Warrior',
    spec: 'awakening',
    name: 'Awakening PvE Burst',
    type: 'pve',
    steps: [
      { skillName: 'Charging Thrust', note: 'Position' },
      { skillName: 'Solar Flare' },
      { skillName: 'Grave Digging' },
      { skillName: 'Pulverize' },
      { skillName: 'Scars of Dusk' },
      { skillName: 'Frenzied Strikes', note: 'Spam during downtime' },
    ],
  },
  {
    className: 'Warrior',
    spec: 'succession',
    name: 'Succession PvP Lockdown',
    type: 'pvp',
    steps: [
      { skillName: 'Prime: Solar Flare' },
      { skillName: 'Prime: Charging Slash', note: 'Cancel' },
      { skillName: 'Prime: Ground Roar', note: 'Stiffness' },
      { skillName: 'Prime: Frenzied Strikes' },
      { skillName: 'Prime: Slashing the Dead' },
    ],
  },
  {
    className: 'Warrior',
    spec: 'succession',
    name: 'Succession PvE Farming',
    type: 'pve',
    steps: [
      { skillName: 'Prime: Ground Roar' },
      { skillName: 'Prime: Solar Flare' },
      { skillName: 'Prime: Charging Slash' },
      { skillName: 'Prime: Slashing the Dead' },
      { skillName: 'Prime: Frenzied Strikes' },
    ],
  },

  // ─── SORCERESS ───────────────────────────────────────────────────
  {
    className: 'Sorceress',
    spec: 'awakening',
    name: 'Awakening PvP Burst',
    type: 'pvp',
    steps: [
      { skillName: 'Rushing Crow', note: 'Gap close + stiffness' },
      { skillName: 'Midnight Stinger', note: 'Float CC' },
      { skillName: 'Grim Reaper\'s Judgment' },
      { skillName: 'Violation' },
      { skillName: 'Turn-back Slash', note: 'Cancel' },
      { skillName: 'Shard Explosion', note: 'Finisher' },
    ],
  },
  {
    className: 'Sorceress',
    spec: 'awakening',
    name: 'Awakening PvE Pack Clear',
    type: 'pve',
    steps: [
      { skillName: 'Grim Reaper\'s Judgment' },
      { skillName: 'Violation' },
      { skillName: 'Turn-back Slash' },
      { skillName: 'Dead Hunt' },
      { skillName: 'Cartian\'s Nightmare', note: 'When surrounded' },
      { skillName: 'Shadow Vortex' },
    ],
  },
  {
    className: 'Sorceress',
    spec: 'succession',
    name: 'Succession PvP Iframe Combo',
    type: 'pvp',
    steps: [
      { skillName: 'Prime: Rushing Crow' },
      { skillName: 'Prime: Midnight Stinger', note: 'Float' },
      { skillName: 'Prime: Violation' },
      { skillName: 'Prime: Sign of Pain' },
      { skillName: 'Prime: Crowd Control' },
    ],
  },
  {
    className: 'Sorceress',
    spec: 'succession',
    name: 'Succession PvE Sustain',
    type: 'pve',
    steps: [
      { skillName: 'Prime: Abyssal Flame', note: 'Heal' },
      { skillName: 'Prime: Violation' },
      { skillName: 'Prime: Dark Flame' },
      { skillName: 'Prime: Shard Explosion' },
    ],
  },

  // ─── BERSERKER ───────────────────────────────────────────────────
  {
    className: 'Berserker',
    spec: 'awakening',
    name: 'Awakening PvP Grab Combo',
    type: 'pvp',
    steps: [
      { skillName: 'Flame Buster', note: 'SA approach' },
      { skillName: 'Frenzied Destroyer', note: 'Buff up' },
      { skillName: 'Titanity', note: 'Bound CC' },
      { skillName: 'Rocky Grab', note: 'Grapple' },
      { skillName: 'Raging Thunder', note: 'Pulverize during grab' },
      { skillName: 'Mountain Smash', note: 'Finisher' },
    ],
  },
  {
    className: 'Berserker',
    spec: 'awakening',
    name: 'Awakening PvE AoE Burst',
    type: 'pve',
    steps: [
      { skillName: 'Frenzied Destroyer' },
      { skillName: 'Flame Buster' },
      { skillName: 'Mass Destruction' },
      { skillName: 'Mountain Smash' },
      { skillName: 'Wrath of Beast' },
    ],
  },
  {
    className: 'Berserker',
    spec: 'succession',
    name: 'Succession PvP Stun-Lock',
    type: 'pvp',
    steps: [
      { skillName: 'Prime: Frenzied Destroyer' },
      { skillName: 'Prime: Titanity' },
      { skillName: 'Prime: Raging Thunder' },
      { skillName: 'Prime: Flame Buster' },
      { skillName: 'Prime: Mountain Smash' },
    ],
  },

  // ─── MUSA ────────────────────────────────────────────────────────
  {
    className: 'Musa',
    spec: 'awakening',
    name: 'Awakening PvP Chase Combo',
    type: 'pvp',
    steps: [
      { skillName: 'Chase', note: 'Gap close' },
      { skillName: 'Divider', note: 'Stiffness' },
      { skillName: 'Crasher', note: 'Bound' },
      { skillName: 'Foul Play', note: 'Cancel' },
      { skillName: 'Pelagic Trail', note: 'Down attack' },
      { skillName: 'Rising Storm', note: 'Finisher' },
    ],
  },
  {
    className: 'Musa',
    spec: 'awakening',
    name: 'Awakening PvE Spinner',
    type: 'pve',
    steps: [
      { skillName: 'Crashing Storm', note: 'Spammable AoE' },
      { skillName: 'Chase' },
      { skillName: 'Divider' },
      { skillName: 'Rising Storm' },
      { skillName: 'Pelagic Trail' },
    ],
  },
  {
    className: 'Musa',
    spec: 'succession',
    name: 'Succession PvP Wheelblade',
    type: 'pvp',
    steps: [
      { skillName: 'Prime: Chase' },
      { skillName: 'Prime: Divider', note: 'Stiffness' },
      { skillName: 'Prime: Crasher' },
      { skillName: 'Prime: Foul Play' },
      { skillName: 'Prime: Rising Storm' },
    ],
  },

  // ─── NINJA ───────────────────────────────────────────────────────
  {
    className: 'Ninja',
    spec: 'awakening',
    name: 'Awakening PvP Stun-Lock',
    type: 'pvp',
    steps: [
      { skillName: 'Ninjutsu: Blockade: Shadow Stomp', note: 'Stun engage' },
      { skillName: 'Shadow Strike', note: 'Bound' },
      { skillName: 'Assassination', note: 'Cancel' },
      { skillName: 'Fox Spirit', note: 'Burst' },
      { skillName: 'Soulreaver', note: 'Finisher' },
    ],
  },
  {
    className: 'Ninja',
    spec: 'awakening',
    name: 'Awakening PvE Pack Clear',
    type: 'pve',
    steps: [
      { skillName: 'Cyclone Slash' },
      { skillName: 'Assassination' },
      { skillName: 'Fox Spirit' },
      { skillName: 'Ninjutsu: Kunai Throw' },
      { skillName: 'Hidden Dagger' },
    ],
  },
  {
    className: 'Ninja',
    spec: 'succession',
    name: 'Succession PvP Katana Shower',
    type: 'pvp',
    steps: [
      { skillName: 'Prime: Shadow Strike', note: 'Stun' },
      { skillName: 'Prime: Assassination' },
      { skillName: 'Prime: Fox Spirit' },
      { skillName: 'Prime: Soulreaver' },
    ],
  },

  // ─── LAHN ────────────────────────────────────────────────────────
  {
    className: 'Lahn',
    spec: 'awakening',
    name: 'Awakening PvP Initiate',
    type: 'pvp',
    steps: [
      { skillName: 'Blooming Nymph', note: 'Gap close + stiffness' },
      { skillName: 'Bloodland Stride', note: 'Bound' },
      { skillName: 'Fallen Petals' },
      { skillName: 'Doombloom', note: 'Knockdown' },
      { skillName: 'Nimbus Strider', note: 'Finisher / reposition' },
    ],
  },
  {
    className: 'Lahn',
    spec: 'awakening',
    name: 'Awakening PvE Clear',
    type: 'pve',
    steps: [
      { skillName: 'Fallen Petals' },
      { skillName: 'Bloodland Stride' },
      { skillName: 'Blooming Nymph' },
      { skillName: 'Doombloom' },
    ],
  },

  // ─── STRIKER ─────────────────────────────────────────────────────
  {
    className: 'Striker',
    spec: 'awakening',
    name: 'Awakening PvP Stun-Combo',
    type: 'pvp',
    steps: [
      { skillName: 'Flash Step', note: 'Gap close' },
      { skillName: 'Spiral Cannon', note: 'Stun' },
      { skillName: 'Rage Hammer', note: 'Bound' },
      { skillName: "Wolf's Frenzy", note: 'Cancel into grab' },
      { skillName: 'Massive Strike', note: 'Finisher' },
    ],
  },
  {
    className: 'Striker',
    spec: 'succession',
    name: 'Succession PvE Backstep',
    type: 'pve',
    steps: [
      { skillName: 'Prime: Spiral Cannon' },
      { skillName: 'Prime: Rage Hammer' },
      { skillName: 'Prime: Wolf\'s Frenzy' },
      { skillName: 'Prime: Massive Strike' },
    ],
  },

  // ─── WIZARD ──────────────────────────────────────────────────────
  {
    className: 'Wizard',
    spec: 'awakening',
    name: 'Awakening PvE Magician',
    type: 'pve',
    steps: [
      { skillName: 'Voltaic Pulse' },
      { skillName: 'Lightning Chain' },
      { skillName: 'Mana Emission' },
      { skillName: 'Earthquake' },
      { skillName: 'Frozen Tundra', note: 'Burst' },
    ],
  },
  {
    className: 'Wizard',
    spec: 'awakening',
    name: 'Awakening PvP Chain CC',
    type: 'pvp',
    steps: [
      { skillName: 'Lightning Chain', note: 'Stiffness' },
      { skillName: 'Earthquake', note: 'Bound' },
      { skillName: 'Frozen Tundra', note: 'Freeze' },
      { skillName: 'Mana Emission', note: 'Finisher' },
    ],
  },
]

// ─── Lookup helpers ────────────────────────────────────────────────

/**
 * Returns all combos for a given class, optionally filtered by spec.
 * Spec matching: 'both' combos always match; an exact spec match also works.
 */
export function getCombosForClass(
  className: string,
  spec?: 'awakening' | 'succession' | 'ascension',
): Combo[] {
  return COMBOS.filter(c => {
    if (c.className.toLowerCase() !== className.toLowerCase()) return false
    if (!spec) return true
    if (c.spec === 'both') return true
    return c.spec === spec
  })
}

/**
 * Returns the list of class names that have at least one curated combo.
 */
export function getClassesWithCombos(): string[] {
  return [...new Set(COMBOS.map(c => c.className))]
}

/**
 * Returns the total combo count (useful for the UI footer).
 */
export function getComboCount(): number {
  return COMBOS.length
}
