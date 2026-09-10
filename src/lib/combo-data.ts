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
// All 31 classes have curated combos (Warrior, Ranger, Sorceress, Berserker,
// Tamer, Valkyrie, Musa, Maehwa, Ninja, Kunoichi, Witch, Wizard, Lahn,
// Striker, Dark Knight, Mystic, Archer, Shai, Guardian, Hashashin, Nova,
// Sage, Corsair, Drakania, Woosa, Maegu, Scholar, Dosa, Deadeye, Wukong,
// Seraph). Ascension-only classes (Archer, Shai, Scholar, Dosa, Deadeye,
// Wukong, Seraph) use spec: 'both' since they don't have awakening/succession.
// To extend: add entries below and the UI picks them up automatically — no
// component changes needed.

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

  // ─── RANGER ──────────────────────────────────────────────────────
  {
    className: 'Ranger',
    spec: 'awakening',
    name: 'Awakening PvP Bow Burst',
    type: 'pvp',
    steps: [
      { skillName: 'Blasting Gust', note: 'Stiffness engage' },
      { skillName: 'Descending Current', note: 'Bound CC' },
      { skillName: 'Penetrating Wind', note: 'Down attack' },
      { skillName: 'Will of the Wind', note: 'Burst' },
      { skillName: 'Razor Wind', note: 'Cancel / finisher' },
    ],
  },
  {
    className: 'Ranger',
    spec: 'awakening',
    name: 'Awakening PvE Pack Clear',
    type: 'pve',
    steps: [
      { skillName: 'Charging Wind', note: 'Gap close' },
      { skillName: 'Will of the Wind', note: 'AoE burst' },
      { skillName: 'Wailing Wind', note: 'Cancel' },
      { skillName: 'Descending Current' },
      { skillName: 'Razor Wind' },
    ],
  },
  {
    className: 'Ranger',
    spec: 'succession',
    name: 'Succession PvP Snipe Combo',
    type: 'pvp',
    steps: [
      { skillName: 'Prime: Blasting Gust', note: 'Stiffness' },
      { skillName: 'Prime: Descending Current', note: 'Bound' },
      { skillName: 'Prime: Penetrating Wind' },
      { skillName: 'Prime: Tearing Arrow', note: 'Finisher' },
      { skillName: 'Prime: Razor Wind', note: 'Cancel' },
    ],
  },

  // ─── TAMER ───────────────────────────────────────────────────────
  {
    className: 'Tamer',
    spec: 'awakening',
    name: 'Awakening PvP Grab Combo',
    type: 'pvp',
    steps: [
      { skillName: 'Void Lightning', note: 'Stiffness' },
      { skillName: 'Flash', note: 'Gap close' },
      { skillName: 'Fearful Trembling', note: 'Grab' },
      { skillName: 'Legendary Beast Dance', note: 'Burst during grab' },
      { skillName: 'Allround Spinner', note: 'Finisher' },
    ],
  },
  {
    className: 'Tamer',
    spec: 'awakening',
    name: 'Awakening PvE Pack Clear',
    type: 'pve',
    steps: [
      { skillName: 'Surging Tide' },
      { skillName: 'Bolt Wave' },
      { skillName: 'Allround Spinner' },
      { skillName: 'Legendary Beast Dance' },
      { skillName: 'Beast Rampage' },
    ],
  },
  {
    className: 'Tamer',
    spec: 'succession',
    name: 'Succession PvP Heuklang Lockdown',
    type: 'pvp',
    steps: [
      { skillName: 'Prime: Void Lightning', note: 'Stiffness' },
      { skillName: 'Prime: Fearful Trembling', note: 'Grab' },
      { skillName: 'Prime: Legendary Beast Dance' },
      { skillName: 'Prime: Allround Spinner' },
    ],
  },

  // ─── VALKYRIE ────────────────────────────────────────────────────
  {
    className: 'Valkyrie',
    spec: 'awakening',
    name: 'Awakening PvP Lancia Combo',
    type: 'pvp',
    steps: [
      { skillName: 'Shield Chase', note: 'Gap close' },
      { skillName: 'Celestial Spear', note: 'Stiffness' },
      { skillName: 'Purificatione', note: 'Bound' },
      { skillName: 'Castigatio', note: 'Down attack' },
      { skillName: 'Verdict: Lancia Iustitiae', note: 'Finisher' },
    ],
  },
  {
    className: 'Valkyrie',
    spec: 'awakening',
    name: 'Awakening PvE Sweep',
    type: 'pve',
    steps: [
      { skillName: 'Sanctitas de Enslar' },
      { skillName: 'Castigatio' },
      { skillName: 'Hastiludium' },
      { skillName: 'Sacrum Ferit' },
      { skillName: 'Verdict: Lancia Iustitiae' },
    ],
  },
  {
    className: 'Valkyrie',
    spec: 'succession',
    name: 'Succession PvP Sword & Shield',
    type: 'pvp',
    steps: [
      { skillName: 'Prime: Celestial Spear', note: 'Stiffness' },
      { skillName: 'Prime: Divine Power', note: 'Bound' },
      { skillName: 'Prime: Severing Light' },
      { skillName: 'Prime: Sword of Judgment', note: 'Finisher' },
    ],
  },

  // ─── KUNOICHI ────────────────────────────────────────────────────
  {
    className: 'Kunoichi',
    spec: 'awakening',
    name: 'Awakening PvP Sah Chakram Combo',
    type: 'pvp',
    steps: [
      { skillName: 'Ninjutsu: Shadow Explosion', note: 'Gap close' },
      { skillName: 'Shadow Stomp', note: 'Stun' },
      { skillName: 'Wheel of Wrath', note: 'Bound' },
      { skillName: 'Lunar Dash', note: 'Burst' },
      { skillName: 'Sah Spree of Sonan', note: 'Finisher' },
    ],
  },
  {
    className: 'Kunoichi',
    spec: 'awakening',
    name: 'Awakening PvE Pack Clear',
    type: 'pve',
    steps: [
      { skillName: 'Wheel of Wrath' },
      { skillName: 'Lethal Spin Spree' },
      { skillName: 'Sah Spree of Sonan' },
      { skillName: 'Half Moon Slash' },
      { skillName: 'Danse Macabre' },
    ],
  },
  {
    className: 'Kunoichi',
    spec: 'succession',
    name: 'Succession PvP Ninjutsu Burst',
    type: 'pvp',
    steps: [
      { skillName: 'Prime: Shadow Stomp', note: 'Stun' },
      { skillName: 'Prime: Wheel of Wrath', note: 'Bound' },
      { skillName: 'Prime: Shadow Explosion' },
      { skillName: 'Prime: Fatal Blow', note: 'Finisher' },
    ],
  },

  // ─── WITCH ───────────────────────────────────────────────────────
  {
    className: 'Witch',
    spec: 'awakening',
    name: 'Awakening PvP Chain CC',
    type: 'pvp',
    steps: [
      { skillName: 'Teleport', note: 'Gap close' },
      { skillName: 'Voltaic Pulse', note: 'Stiffness' },
      { skillName: 'Equilibrium Break', note: 'Bound' },
      { skillName: 'Thunder Storm', note: 'Freeze' },
      { skillName: 'Fissure Wave', note: 'Finisher' },
    ],
  },
  {
    className: 'Witch',
    spec: 'awakening',
    name: 'Awakening PvE Spell Combo',
    type: 'pve',
    steps: [
      { skillName: 'Lightning Storm' },
      { skillName: 'Blizzard' },
      { skillName: 'Earthquake' },
      { skillName: 'Meteor Shower', note: 'Burst' },
      { skillName: 'Residual Lightning' },
    ],
  },
  {
    className: 'Witch',
    spec: 'succession',
    name: 'Succession PvE Spell Rotation',
    type: 'pve',
    steps: [
      { skillName: 'Prime: Blizzard: Domain' },
      { skillName: "Prime: Earth's Response: Destruction" },
      { skillName: 'Prime: Voltaic Pulse' },
      { skillName: 'Prime: Thunder Storm' },
    ],
  },

  // ─── DARK KNIGHT ─────────────────────────────────────────────────
  {
    className: 'Dark Knight',
    spec: 'awakening',
    name: 'Awakening PvP Wheel of Fortune',
    type: 'pvp',
    steps: [
      { skillName: 'Twilight Dash', note: 'Gap close' },
      { skillName: 'Wheel of Fortune', note: 'Bound' },
      { skillName: 'Ravage Rake', note: 'Down attack' },
      { skillName: 'Pervasive Darkness', note: 'Burst' },
      { skillName: 'Imperious Command', note: 'Finisher' },
    ],
  },
  {
    className: 'Dark Knight',
    spec: 'awakening',
    name: 'Awakening PvE Pack Clear',
    type: 'pve',
    steps: [
      { skillName: 'Pervasive Darkness' },
      { skillName: 'Wheel of Fortune' },
      { skillName: 'Ravage Rake' },
      { skillName: 'Obsidian Ashes' },
      { skillName: 'Lunacy of Vedir' },
    ],
  },
  {
    className: 'Dark Knight',
    spec: 'succession',
    name: 'Succession PvP Kriegsmesser Burst',
    type: 'pvp',
    steps: [
      { skillName: 'Prime: Wheel of Fortune', note: 'Bound' },
      { skillName: 'Prime: Ravage Rake' },
      { skillName: 'Prime: Pervasive Darkness' },
      { skillName: 'Prime: Kamasylvia Slash', note: 'Finisher' },
    ],
  },

  // ─── MYSTIC ──────────────────────────────────────────────────────
  {
    className: 'Mystic',
    spec: 'awakening',
    name: 'Awakening PvP Cestus Combo',
    type: 'pvp',
    steps: [
      { skillName: 'Flash Step', note: 'Gap close' },
      { skillName: 'Rising Dragon', note: 'Stun' },
      { skillName: 'Spiral Torpedo', note: 'Bound' },
      { skillName: "Dragon's Rip", note: 'Grab' },
      { skillName: 'Doombringer', note: 'Finisher' },
    ],
  },
  {
    className: 'Mystic',
    spec: 'awakening',
    name: 'Awakening PvE Pack Clear',
    type: 'pve',
    steps: [
      { skillName: 'Tidal Burst' },
      { skillName: 'Rising Dragon' },
      { skillName: 'Spiral Torpedo' },
      { skillName: 'Wave Orb' },
      { skillName: 'Doombringer' },
    ],
  },
  {
    className: 'Mystic',
    spec: 'succession',
    name: 'Succession PvP Wave Orb Burst',
    type: 'pvp',
    steps: [
      { skillName: 'Prime: Wave Orb', note: 'Stiffness' },
      { skillName: 'Prime: Sea Burial', note: 'Bound' },
      { skillName: 'Prime: Thunder Pound' },
      { skillName: 'Prime: Soul Basher', note: 'Finisher' },
    ],
  },

  // ─── ARCHER ──────────────────────────────────────────────────────
  {
    className: 'Archer',
    spec: 'both',
    name: 'Ascension PvP Ranged Burst',
    type: 'pvp',
    steps: [
      { skillName: "Luthraghon's Call", note: 'Gap close + stiffness' },
      { skillName: 'Spear of Sylvia', note: 'Bound' },
      { skillName: 'Radiant Explosion', note: 'Down attack' },
      { skillName: 'Storm of Light', note: 'Burst' },
      { skillName: 'Piercing Light', note: 'Finisher' },
    ],
  },
  {
    className: 'Archer',
    spec: 'both',
    name: 'Ascension PvE Pack Clear',
    type: 'pve',
    steps: [
      { skillName: 'Storm of Light' },
      { skillName: 'Spear of Sylvia' },
      { skillName: 'Radiant Explosion' },
      { skillName: 'Earth Shatter' },
      { skillName: 'Full Bloom' },
    ],
  },

  // ─── SHAI ────────────────────────────────────────────────────────
  {
    className: 'Shai',
    spec: 'both',
    name: 'Ascension PvP Boomerang Combo',
    type: 'pvp',
    steps: [
      { skillName: 'Outta My Way!', note: 'Stiffness' },
      { skillName: "Earth's Tremble", note: 'Bound' },
      { skillName: 'Eat This!', note: 'Down attack' },
      { skillName: "Sun's Fury", note: 'Burst' },
      { skillName: 'Time to Shine!', note: 'Finisher' },
    ],
  },
  {
    className: 'Shai',
    spec: 'both',
    name: 'Ascension PvE Pack Clear',
    type: 'pve',
    steps: [
      { skillName: 'Swing Swing', note: 'Boomerang clear' },
      { skillName: 'Twirl' },
      { skillName: 'One-Two-Three' },
      { skillName: "Sun's Fury" },
      { skillName: 'Outta My Way!' },
    ],
  },

  // ─── GUARDIAN ────────────────────────────────────────────────────
  {
    className: 'Guardian',
    spec: 'awakening',
    name: 'Awakening PvP Jordun Combo',
    type: 'pvp',
    steps: [
      { skillName: 'Frost Slide', note: 'Gap close + grab' },
      { skillName: 'Cleansing Flame', note: 'Bound' },
      { skillName: 'Mountain Slam', note: 'Down attack' },
      { skillName: "Dragon's Maw", note: 'Burst' },
      { skillName: 'Glorious Advance', note: 'Finisher' },
    ],
  },
  {
    className: 'Guardian',
    spec: 'awakening',
    name: 'Awakening PvE Pack Clear',
    type: 'pve',
    steps: [
      { skillName: 'God Incinerator' },
      { skillName: 'Cleansing Flame' },
      { skillName: 'Mountain Slam' },
      { skillName: "Dragon's Maw" },
      { skillName: 'Mutilation' },
    ],
  },
  {
    className: 'Guardian',
    spec: 'succession',
    name: 'Succession PvP Axe Burst',
    type: 'pvp',
    steps: [
      { skillName: 'Prime: Boulder Crush', note: 'Stiffness' },
      { skillName: 'Prime: Mountain Slam', note: 'Bound' },
      { skillName: 'Prime: Black Blood Slaughter' },
      { skillName: 'Prime: Infernal Nemesis', note: 'Finisher' },
    ],
  },

  // ─── HASHASHIN ───────────────────────────────────────────────────
  {
    className: 'Hashashin',
    spec: 'awakening',
    name: 'Awakening PvP Dual Glaives Combo',
    type: 'pvp',
    steps: [
      { skillName: 'Sand Warp', note: 'Gap close' },
      { skillName: "Aal's Dominion", note: 'Stiffness' },
      { skillName: 'Descent', note: 'Bound' },
      { skillName: 'Rupture', note: 'Down attack' },
      { skillName: 'Piercing Tornado', note: 'Finisher' },
    ],
  },
  {
    className: 'Hashashin',
    spec: 'awakening',
    name: 'Awakening PvE Pack Clear',
    type: 'pve',
    steps: [
      { skillName: "Aal's Breath" },
      { skillName: 'Rupture' },
      { skillName: 'Sand Divider' },
      { skillName: 'Piercing Tornado' },
      { skillName: 'Hourglass of Death' },
    ],
  },
  {
    className: 'Hashashin',
    spec: 'succession',
    name: 'Succession PvP Shamshir Burst',
    type: 'pvp',
    steps: [
      { skillName: 'Prime: Sand Warp', note: 'Gap close' },
      { skillName: 'Prime: Piercing Tornado', note: 'Bound' },
      { skillName: 'Prime: Descent' },
      { skillName: 'Prime: Aal\'s Dominion', note: 'Finisher' },
    ],
  },

  // ─── NOVA ────────────────────────────────────────────────────────
  {
    className: 'Nova',
    spec: 'awakening',
    name: 'Awakening PvP Quoratum Combo',
    type: 'pvp',
    steps: [
      { skillName: 'Royal Fencing: Fleche', note: 'Gap close' },
      { skillName: 'Swooping Ring', note: 'Stiffness' },
      { skillName: 'Frozen Ring', note: 'Bound' },
      { skillName: 'Storming Star', note: 'Down attack' },
      { skillName: 'Starfall', note: 'Finisher' },
    ],
  },
  {
    className: 'Nova',
    spec: 'awakening',
    name: 'Awakening PvE Pack Clear',
    type: 'pve',
    steps: [
      { skillName: 'Storming Star' },
      { skillName: 'Swooping Ring' },
      { skillName: 'Starfall' },
      { skillName: 'Frozen Ring' },
      { skillName: 'Bitter Reign' },
    ],
  },
  {
    className: 'Nova',
    spec: 'succession',
    name: 'Succession PvP Ice Queen Burst',
    type: 'pvp',
    steps: [
      { skillName: 'Prime: Swooping Ring', note: 'Stiffness' },
      { skillName: 'Prime: Frozen Earth', note: 'Bound' },
      { skillName: 'Prime: Bitter Reign' },
      { skillName: 'Prime: Stamma\'s Mate', note: 'Finisher' },
    ],
  },

  // ─── SAGE ────────────────────────────────────────────────────────
  {
    className: 'Sage',
    spec: 'awakening',
    name: 'Awakening PvP Kibelius Combo',
    type: 'pvp',
    steps: [
      { skillName: 'Rift Chain', note: 'Gap close' },
      { skillName: 'Divine Executioner', note: 'Bound' },
      { skillName: 'Lightning Prison', note: 'Down attack' },
      { skillName: "Ator's Spear", note: 'Burst' },
      { skillName: 'Rift Storm', note: 'Finisher' },
    ],
  },
  {
    className: 'Sage',
    spec: 'awakening',
    name: 'Awakening PvE Pack Clear',
    type: 'pve',
    steps: [
      { skillName: "Ator's Energy" },
      { skillName: 'Rift Storm' },
      { skillName: 'Divine Executioner' },
      { skillName: 'Spatial Collapse' },
      { skillName: 'Void Gateways' },
    ],
  },
  {
    className: 'Sage',
    spec: 'succession',
    name: 'Succession PvP Kyve Burst',
    type: 'pvp',
    steps: [
      { skillName: 'Prime: Rift Chain', note: 'Gap close' },
      { skillName: 'Prime: Rift Storm', note: 'Bound' },
      { skillName: 'Prime: Spatial Collapse' },
      { skillName: 'Prime: Ator\'s Fist', note: 'Finisher' },
    ],
  },

  // ─── CORSAIR ─────────────────────────────────────────────────────
  {
    className: 'Corsair',
    spec: 'awakening',
    name: 'Awakening PvP Patraca Combo',
    type: 'pvp',
    steps: [
      { skillName: 'Sun-shielder Patraca', note: 'Gap close' },
      { skillName: 'Heart-catcher Patraca', note: 'Stiffness' },
      { skillName: 'Wave-breaker Patraca', note: 'Bound' },
      { skillName: 'Tide-splitter Patraca', note: 'Down attack' },
      { skillName: 'Surface-slicer Patraca', note: 'Finisher' },
    ],
  },
  {
    className: 'Corsair',
    spec: 'awakening',
    name: 'Awakening PvE Pack Clear',
    type: 'pve',
    steps: [
      { skillName: 'Spare No Quarter!' },
      { skillName: 'Storm Surge' },
      { skillName: 'Tidal Slash' },
      { skillName: 'Whirlpool' },
      { skillName: 'Wipe Out' },
    ],
  },
  {
    className: 'Corsair',
    spec: 'succession',
    name: 'Succession PvP Mareca Combo',
    type: 'pvp',
    steps: [
      { skillName: 'Prime: Mareca: Sea Stroll', note: 'Stiffness' },
      { skillName: 'Prime: Wave Lash', note: 'Bound' },
      { skillName: 'Prime: Storming Gale' },
      { skillName: 'Prime: Wipe Out', note: 'Finisher' },
    ],
  },

  // ─── DRAKANIA ────────────────────────────────────────────────────
  {
    className: 'Drakania',
    spec: 'awakening',
    name: 'Awakening PvP Trion Combo',
    type: 'pvp',
    steps: [
      { skillName: 'Abyssal Advance', note: 'Gap close' },
      { skillName: 'Brimbolt Strike', note: 'Stiffness' },
      { skillName: "Markthanan's Dominion", note: 'Bound' },
      { skillName: 'Omnislash', note: 'Down attack' },
      { skillName: 'Azure Onslaught', note: 'Finisher' },
    ],
  },
  {
    className: 'Drakania',
    spec: 'awakening',
    name: 'Awakening PvE Pack Clear',
    type: 'pve',
    steps: [
      { skillName: 'Tectonic Slam' },
      { skillName: "Markthanan's Dominion" },
      { skillName: 'Omnislash' },
      { skillName: 'Brimbolt Raze' },
      { skillName: 'Azure Onslaught' },
    ],
  },
  {
    className: 'Drakania',
    spec: 'succession',
    name: 'Succession PvP Slayer Burst',
    type: 'pvp',
    steps: [
      { skillName: 'Prime: Blazing Strike', note: 'Stiffness' },
      { skillName: 'Prime: Markthanan\'s Flourish', note: 'Bound' },
      { skillName: 'Prime: Eviscerate' },
      { skillName: 'Prime: Omnislash', note: 'Finisher' },
    ],
  },

  // ─── WOOSA ───────────────────────────────────────────────────────
  {
    className: 'Woosa',
    spec: 'awakening',
    name: 'Awakening PvP Sahee Combo',
    type: 'pvp',
    steps: [
      { skillName: 'Flitting Step', note: 'Gap close' },
      { skillName: 'Wingbeat', note: 'Stiffness' },
      { skillName: 'Stormfall', note: 'Bound' },
      { skillName: "Sahee's Descent", note: 'Down attack' },
      { skillName: 'Theophany of Sahee', note: 'Finisher' },
    ],
  },
  {
    className: 'Woosa',
    spec: 'awakening',
    name: 'Awakening PvE Pack Clear',
    type: 'pve',
    steps: [
      { skillName: 'Stormfall' },
      { skillName: 'Wingbeat' },
      { skillName: 'Thunderstroke' },
      { skillName: 'Cloudrise' },
      { skillName: "Sahee's Descent" },
    ],
  },
  {
    className: 'Woosa',
    spec: 'succession',
    name: 'Succession PvP Fan Burst',
    type: 'pvp',
    steps: [
      { skillName: 'Prime: Cloudrise', note: 'Stiffness' },
      { skillName: 'Prime: Stormfall', note: 'Bound' },
      { skillName: 'Prime: Wingbeat' },
      { skillName: 'Prime: Cloudcarve', note: 'Finisher' },
    ],
  },

  // ─── MAEGU ───────────────────────────────────────────────────────
  {
    className: 'Maegu',
    spec: 'awakening',
    name: 'Awakening PvP Foxspirit Combo',
    type: 'pvp',
    steps: [
      { skillName: 'Spirit Step', note: 'Gap close' },
      { skillName: 'Foxflare', note: 'Stiffness' },
      { skillName: 'Heavenward Dance', note: 'Bound' },
      { skillName: 'Emberclaw Torrent', note: 'Down attack' },
      { skillName: 'Emberclaw Finale', note: 'Finisher' },
    ],
  },
  {
    className: 'Maegu',
    spec: 'awakening',
    name: 'Awakening PvE Pack Clear',
    type: 'pve',
    steps: [
      { skillName: 'Emberclaw Torrent' },
      { skillName: 'Heavenward Dance' },
      { skillName: 'Spirit Swirl' },
      { skillName: 'Petalblast' },
      { skillName: 'Twirling Rhapsody' },
    ],
  },
  {
    className: 'Maegu',
    spec: 'succession',
    name: 'Succession PvP Charm Burst',
    type: 'pvp',
    steps: [
      { skillName: 'Prime: Foxflare', note: 'Stiffness' },
      { skillName: 'Prime: Heavenward Dance', note: 'Bound' },
      { skillName: 'Prime: Spirit Swirl' },
      { skillName: 'Prime: Petal Play', note: 'Finisher' },
    ],
  },

  // ─── SCHOLAR ─────────────────────────────────────────────────────
  {
    className: 'Scholar',
    spec: 'both',
    name: 'Ascension PvP Hammer Combo',
    type: 'pvp',
    steps: [
      { skillName: 'Gravity Rush', note: 'Gap close' },
      { skillName: 'One Giant Leap', note: 'Bound' },
      { skillName: 'Hammer Smash', note: 'Down attack' },
      { skillName: 'Hammer Spin', note: 'Burst' },
      { skillName: 'Hammerfall', note: 'Finisher' },
    ],
  },
  {
    className: 'Scholar',
    spec: 'both',
    name: 'Ascension PvE Pack Clear',
    type: 'pve',
    steps: [
      { skillName: 'Gravity Field' },
      { skillName: 'Hammer Spin' },
      { skillName: 'Hammerfall' },
      { skillName: 'One Giant Leap' },
      { skillName: 'Infinite Power' },
    ],
  },

  // ─── DOSA ────────────────────────────────────────────────────────
  {
    className: 'Dosa',
    spec: 'both',
    name: 'Ascension PvP Hwando Combo',
    type: 'pvp',
    steps: [
      { skillName: 'Cloud Step', note: 'Gap close' },
      { skillName: 'Taeguk', note: 'Stiffness' },
      { skillName: 'Spring Frost', note: 'Bound' },
      { skillName: 'Sundering Sweep', note: 'Down attack' },
      { skillName: 'Winter Squall', note: 'Finisher' },
    ],
  },
  {
    className: 'Dosa',
    spec: 'both',
    name: 'Ascension PvE Pack Clear',
    type: 'pve',
    steps: [
      { skillName: 'Spring Frost' },
      { skillName: 'Summer Breeze' },
      { skillName: 'Autumnal Blitz' },
      { skillName: 'Winter Squall' },
      { skillName: 'Taeguk' },
    ],
  },

  // ─── DEADEYE ─────────────────────────────────────────────────────
  {
    className: 'Deadeye',
    spec: 'both',
    name: 'Ascension PvP Revolver Combo',
    type: 'pvp',
    steps: [
      { skillName: 'Sidewinder', note: 'Gap close + stiffness' },
      { skillName: 'Quick Draw', note: 'Bound' },
      { skillName: 'Max Pain', note: 'Down attack' },
      { skillName: "Hell's Spread", note: 'Burst' },
      { skillName: 'Bulletstorm', note: 'Finisher' },
    ],
  },
  {
    className: 'Deadeye',
    spec: 'both',
    name: 'Ascension PvE Pack Clear',
    type: 'pve',
    steps: [
      { skillName: 'Bulletstorm' },
      { skillName: "Hell's Spread" },
      { skillName: 'Star-Spangled Barrage' },
      { skillName: 'Mayhem' },
      { skillName: "Doom 'N Gloom" },
    ],
  },

  // ─── WUKONG ──────────────────────────────────────────────────────
  {
    className: 'Wukong',
    spec: 'both',
    name: 'Ascension PvP Power Pole Combo',
    type: 'pvp',
    steps: [
      { skillName: 'Flying Nimbus', note: 'Gap close' },
      { skillName: 'Stretch Kick', note: 'Stiffness' },
      { skillName: 'Pierce', note: 'Bound' },
      { skillName: 'Crush', note: 'Down attack' },
      { skillName: 'Tormenting Spike', note: 'Finisher' },
    ],
  },
  {
    className: 'Wukong',
    spec: 'both',
    name: 'Ascension PvE Pack Clear',
    type: 'pve',
    steps: [
      { skillName: 'Smash' },
      { skillName: 'Pierce' },
      { skillName: 'Impale' },
      { skillName: 'Scorch' },
      { skillName: 'Upheaval' },
    ],
  },

  // ─── SERAPH ──────────────────────────────────────────────────────
  {
    className: 'Seraph',
    spec: 'both',
    name: 'Ascension PvP Greatsword Combo',
    type: 'pvp',
    steps: [
      { skillName: 'Vanguard Chase', note: 'Gap close' },
      { skillName: 'Crossing Slash', note: 'Stiffness' },
      { skillName: 'Grave Sundering', note: 'Bound' },
      { skillName: 'Poena Divina', note: 'Down attack' },
      { skillName: 'Purga: Judgment of Justice', note: 'Finisher' },
    ],
  },
  {
    className: 'Seraph',
    spec: 'both',
    name: 'Ascension PvE Pack Clear',
    type: 'pve',
    steps: [
      { skillName: 'Purga: Whirling Wrath' },
      { skillName: 'Purga: Seething Hatred' },
      { skillName: 'Horizon Slash' },
      { skillName: 'Grave Sundering' },
      { skillName: 'Purga: Bursting Rancor' },
    ],
  },

  // ─── MAEHWA ──────────────────────────────────────────────────────
  {
    className: 'Maehwa',
    spec: 'awakening',
    name: 'Awakening PvP Kerispear Combo',
    type: 'pvp',
    steps: [
      { skillName: 'Blooming Stride', note: 'Gap close' },
      { skillName: 'Red Moon', note: 'Stiffness' },
      { skillName: 'Petal Bloom', note: 'Bound' },
      { skillName: 'Decapitation', note: 'Down attack' },
      { skillName: 'Maehwa: Decapitation', note: 'Finisher' },
    ],
  },
  {
    className: 'Maehwa',
    spec: 'awakening',
    name: 'Awakening PvE Pack Clear',
    type: 'pve',
    steps: [
      { skillName: 'Red Moon' },
      { skillName: 'Decapitation' },
      { skillName: 'Petal Drill' },
      { skillName: 'Frost Pillars' },
      { skillName: 'Whirlwind Cut' },
    ],
  },
  {
    className: 'Maehwa',
    spec: 'succession',
    name: 'Succession PvP Petal Burst',
    type: 'pvp',
    steps: [
      { skillName: 'Prime: Red Moon', note: 'Stiffness' },
      { skillName: 'Prime: Decapitation', note: 'Bound' },
      { skillName: 'Prime: Petal Swirl' },
      { skillName: 'Prime: Divider', note: 'Finisher' },
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
