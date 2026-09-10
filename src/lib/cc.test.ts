import { describe, it, expect } from 'vitest'
import { isRealCC, calculateCCCounters, formatCCCounters, getRealCCs, getNonCCEffects } from './cc'

describe('isRealCC', () => {
  it('returns true for real CCs', () => {
    expect(isRealCC('Stun')).toBe(true)
    expect(isRealCC('Knockdown')).toBe(true)
    expect(isRealCC('Float')).toBe(true)
    expect(isRealCC('Bound')).toBe(true)
    expect(isRealCC('Grapple')).toBe(true)
    expect(isRealCC('Freeze')).toBe(true)
    expect(isRealCC('Frostbite')).toBe(true)
    expect(isRealCC('Chill')).toBe(true)
  })

  it('returns false for non-CCs', () => {
    expect(isRealCC('Down Smash')).toBe(false)
    expect(isRealCC('Air Smash')).toBe(false)
    expect(isRealCC('Push the target')).toBe(false)
    expect(isRealCC('Spin the target')).toBe(false)
  })
})

describe('calculateCCCounters', () => {
  it('returns 0 for null input', () => {
    expect(calculateCCCounters(null)).toBe(0)
  })

  it('returns 0 for empty array', () => {
    expect(calculateCCCounters([])).toBe(0)
  })

  it('counts single real CC as 1', () => {
    expect(calculateCCCounters(['Stun'])).toBe(1)
  })

  it('counts multiple real CCs', () => {
    expect(calculateCCCounters(['Stun', 'Float', 'Bound'])).toBe(3)
  })

  it('counts Knockback and Stiffness as 0.7 each', () => {
    expect(calculateCCCounters(['Knockback'])).toBe(0.7)
    expect(calculateCCCounters(['Stiffness'])).toBe(0.7)
  })

  it('mixes real CCs and partial CCs', () => {
    // Stun(1) + Knockback(0.7) = 1.7 → 1+1 (X+Y format, 1 real + 1 partial)
    const result = calculateCCCounters(['Stun', 'Knockback'])
    expect(result).toBe(1.7)
  })

  it('ignores non-CC effects', () => {
    expect(calculateCCCounters(['Down Smash', 'Air Smash'])).toBe(0)
  })
})

describe('getRealCCs', () => {
  it('filters to only real CCs', () => {
    const result = getRealCCs(['Stun', 'Knockback', 'Down Smash', 'Float'])
    // Knockback IS a real CC (counterValue 0.7, in CC_TYPES)
    expect(result).toContain('Stun')
    expect(result).toContain('Float')
    expect(result).toContain('Knockback')
    expect(result).not.toContain('Down Smash')
  })
})

describe('getNonCCEffects', () => {
  it('filters to only non-CC effects', () => {
    const result = getNonCCEffects(['Stun', 'Knockback', 'Down Smash', 'Push the target'])
    // Knockback is a real CC, not a non-CC effect
    expect(result).not.toContain('Knockback')
    expect(result).toContain('Down Smash')
    expect(result).toContain('Push the target')
    expect(result).not.toContain('Stun')
  })
})
