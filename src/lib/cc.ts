// BDO CC (Crowd Control) System Metadata
//
// In BDO's PvP, CCs fill a "CC counter" — at 2 counters, the target becomes
// CC-immune. Each CC fills 1 counter. The CCs are grouped into resistance
// categories.
//
// Sources: BDO PvP guides, garmoth.com combat guide, reddit r/blackdesertonline
//
// Non-CC effects (displacements, DoTs, damage modifiers) are separated from
// real CCs. These appear in skill tooltips but don't count toward the CC counter.

export interface CCTypeInfo {
  name: string
  shortName: string
  counterValue: number // how many CC counters this fills (1 = full, 0.7 = partial)
  resistanceCategory: 'Stun/Stiffness/Freeze' | 'Grapple' | 'Knockdown/Bound' | 'Knockback/Float'
  color: string
  symbol: string // short symbol for compact display
  description: string
}

// Real CCs that count toward the CC counter in PvP
export const CC_TYPES: Record<string, CCTypeInfo> = {
  Stun: {
    name: 'Stun',
    shortName: 'Stun',
    counterValue: 1,
    resistanceCategory: 'Stun/Stiffness/Freeze',
    color: '#fbbf24',
    symbol: '⚡',
    description: 'Target is unable to act. Broken by damage.',
  },
  Stiffness: {
    name: 'Stiffness',
    shortName: 'Stiff',
    counterValue: 1,
    resistanceCategory: 'Stun/Stiffness/Freeze',
    color: '#fbbf24',
    symbol: '✦',
    description: 'Brief stun. Shorter duration than Stun.',
  },
  Freeze: {
    name: 'Freeze',
    shortName: 'Freeze',
    counterValue: 1,
    resistanceCategory: 'Stun/Stiffness/Freeze',
    color: '#67e8f9',
    symbol: '❄',
    description: 'Target is frozen in place. Broken by damage.',
  },
  Knockdown: {
    name: 'Knockdown',
    shortName: 'KD',
    counterValue: 1,
    resistanceCategory: 'Knockdown/Bound',
    color: '#f87171',
    symbol: '↓↓',
    description: 'Target is knocked to the ground. Long CC duration.',
  },
  Float: {
    name: 'Float',
    shortName: 'Float',
    counterValue: 1,
    resistanceCategory: 'Knockback/Float',
    color: '#a78bfa',
    symbol: '↑↑',
    description: 'Target is launched into the air.',
  },
  Bound: {
    name: 'Bound',
    shortName: 'Bound',
    counterValue: 1,
    resistanceCategory: 'Knockdown/Bound',
    color: '#f87171',
    symbol: '⬇',
    description: 'Target is slammed to the ground from the air.',
  },
  Grapple: {
    name: 'Grapple',
    shortName: 'Grab',
    counterValue: 1,
    resistanceCategory: 'Grapple',
    color: '#fb923c',
    symbol: '✊',
    description: 'Target is grabbed. Cannot be chained into another grapple.',
  },
  Knockback: {
    name: 'Knockback',
    shortName: 'KB',
    counterValue: 1,
    resistanceCategory: 'Knockback/Float',
    color: '#60a5fa',
    symbol: '←',
    description: 'Target is pushed backward. Fills CC counter.',
  },
}

// Non-CC effects that appear in skill data but don't count toward the CC counter.
// These are displacements, damage-over-time effects, or damage modifiers.
export const NON_CC_EFFECTS: Record<string, { category: string; symbol: string; color: string }> = {
  'Push the target': { category: 'Displacement', symbol: '⇐', color: '#94a3b8' },
  'Spin the target': { category: 'Displacement', symbol: '↻', color: '#94a3b8' },
  'Pull the target': { category: 'Displacement', symbol: '⇒', color: '#94a3b8' },
  'Down Smash': { category: 'Damage Modifier', symbol: 'DS', color: '#f472b6' },
  'Air Smash': { category: 'Damage Modifier', symbol: 'AS', color: '#f472b6' },
  'Smash': { category: 'Damage Modifier', symbol: 'SM', color: '#f472b6' },
  'Bleeding': { category: 'DoT', symbol: '🩸', color: '#dc2626' },
  'Shock': { category: 'DoT', symbol: '⚡', color: '#facc15' },
  'Burn': { category: 'DoT', symbol: '🔥', color: '#f97316' },
  'Poison': { category: 'DoT', symbol: '☠', color: '#84cc16' },
  'Blind': { category: 'Debuff', symbol: '👁', color: '#64748b' },
}

// Frostbite is the same as Freeze in BDO
export const CC_ALIASES: Record<string, string> = {
  Frostbite: 'Freeze',
  Chill: 'Freeze',
}

// All valid CC names (including aliases) for filtering
export const ALL_CC_NAMES = new Set([
  ...Object.keys(CC_TYPES),
  ...Object.keys(CC_ALIASES),
  ...Object.keys(NON_CC_EFFECTS),
])

// Get CC info for a CC name (handles aliases)
export function getCCInfo(name: string): CCTypeInfo | { category: string; symbol: string; color: string } | null {
  // Check aliases first
  const canonical = CC_ALIASES[name] || name
  if (CC_TYPES[canonical]) return CC_TYPES[canonical]
  if (NON_CC_EFFECTS[name]) return NON_CC_EFFECTS[name]
  return null
}

// Check if a CC name is a real CC (counts toward the counter)
export function isRealCC(name: string): boolean {
  const canonical = CC_ALIASES[name] || name
  return canonical in CC_TYPES
}

// Calculate total CC counters for a skill's CC types
export function calculateCCCounters(ccTypes: string[] | null): number {
  if (!ccTypes || ccTypes.length === 0) return 0
  let total = 0
  for (const cc of ccTypes) {
    const info = getCCInfo(cc)
    if (info && 'counterValue' in info) {
      total += info.counterValue
    }
  }
  return total
}

// Get only real CCs from a list (prune non-CCs)
export function getRealCCs(ccTypes: string[] | null): string[] {
  if (!ccTypes) return []
  return ccTypes.filter(isRealCC)
}

// Get non-CC effects from a list
export function getNonCCEffects(ccTypes: string[] | null): string[] {
  if (!ccTypes) return []
  return ccTypes.filter((cc) => !isRealCC(cc) && cc in NON_CC_EFFECTS)
}

// Protection type metadata with symbols
export const PROTECTION_META: Record<string, { symbol: string; color: string; shortName: string; description: string }> = {
  'Super Armor': {
    symbol: '🛡',
    color: '#fbbf24',
    shortName: 'SA',
    description: 'Immune to CC. Can still take damage.',
  },
  'Forward Guard': {
    symbol: '⬛',
    color: '#60a5fa',
    shortName: 'FG',
    description: 'Blocks frontal attacks. Immune to frontal CC and damage.',
  },
  'I-Frame': {
    symbol: '✦',
    color: '#a78bfa',
    shortName: 'IF',
    description: 'Invincible. Immune to all damage and CC.',
  },
  'Invincible': {
    symbol: '✦',
    color: '#a78bfa',
    shortName: 'INV',
    description: 'Invincible. Immune to all damage and CC.',
  },
  'Crouching': {
    symbol: '↓',
    color: '#94a3b8',
    shortName: 'CR',
    description: 'Crouching stance. Reduced hitbox.',
  },
}
