import { describe, it, expect } from 'vitest'
import { calculateDamage, formatDamage, type DamageRow } from './damage'

describe('calculateDamage', () => {
  it('returns empty result for null rows', () => {
    const result = calculateDamage(null, null)
    expect(result.totalPvE).toBe(0)
    expect(result.hasDamage).toBe(false)
    expect(result.modes).toHaveLength(0)
  })

  it('calculates single attack damage', () => {
    const rows: DamageRow[] = [
      { label: 'Attack damage 1000% x2', kind: 'note', pvpOnly: false, pveOnly: false },
    ]
    const result = calculateDamage(rows, 50)
    expect(result.totalPvE).toBe(2000) // 1000 * 2 * 1
    expect(result.totalPvP).toBe(1000) // 2000 * 0.5
    expect(result.hasDamage).toBe(true)
    expect(result.modes).toHaveLength(1)
  })

  it('calculates multi-attack damage (same phase merged)', () => {
    const rows: DamageRow[] = [
      { label: 'Attack damage 1000% x2', kind: 'note', pvpOnly: false, pveOnly: false },
      { label: 'Attack damage 500% x1', kind: 'note', pvpOnly: false, pveOnly: false },
    ]
    const result = calculateDamage(rows, null)
    // Both have phase 'Attack' → merged: 1000*2 + 500*1 = 2500
    expect(result.totalPvE).toBe(2500)
  })

  it('calculates damage with max hits', () => {
    const rows: DamageRow[] = [
      { label: 'Attack 1 damage', value: '1000% x2, max 3 hits', kind: 'damage', pvpOnly: false, pveOnly: false },
    ]
    const result = calculateDamage(rows, null)
    expect(result.totalPvE).toBe(6000) // 1000 * 2 * 3
  })

  it('detects real special modes (different damage values)', () => {
    const rows: DamageRow[] = [
      { label: 'Attack 1 damage', value: '5000% x2', kind: 'damage', pvpOnly: false, pveOnly: false },
      { label: 'Attack 2 damage', value: '3000% x1', kind: 'damage', pvpOnly: false, pveOnly: false },
      { label: 'Attack 1 damage', value: '4000% x2', kind: 'damage', pvpOnly: false, pveOnly: false },
      { label: 'Attack 2 damage', value: '2000% x1', kind: 'damage', pvpOnly: false, pveOnly: false },
    ]
    const result = calculateDamage(rows, null)
    expect(result.hasSpecialMode).toBe(true)
    expect(result.modes).toHaveLength(2)
    // Mode 1: 5000*2 + 3000*1 = 13000
    // Mode 2: 4000*2 + 2000*1 = 10000
    // Best mode = 13000
    expect(result.totalPvE).toBe(13000)
  })

  it('does NOT split into modes when damage values are the same', () => {
    const rows: DamageRow[] = [
      { label: 'Attack 1 damage', value: '5000% x2', kind: 'damage', pvpOnly: false, pveOnly: false },
      { label: 'Attack 1 damage', value: '5000% x1', kind: 'damage', pvpOnly: false, pveOnly: false },
      { label: 'Attack 2 damage', value: '5000% x2', kind: 'damage', pvpOnly: false, pveOnly: false },
    ]
    const result = calculateDamage(rows, null)
    expect(result.hasSpecialMode).toBe(false)
    expect(result.modes).toHaveLength(1)
    // All 3 attacks summed: 5000*2 + 5000*1 + 5000*2 = 25000
    expect(result.totalPvE).toBe(25000)
  })

  it('handles damage rows with kind=note', () => {
    const rows: DamageRow[] = [
      { label: 'Attack damage 2518% x2', kind: 'note', pvpOnly: false, pveOnly: false },
      { label: 'Attack damage 2014% x2 after Night Crow', kind: 'note', pvpOnly: false, pveOnly: false },
    ]
    const result = calculateDamage(rows, 52.17)
    // Both have phase 'Attack' → merged: 2518*2 + 2014*2 = 9064
    expect(result.totalPvE).toBe(9064)
    expect(result.totalPvP).toBe(4728.69) // 9064 * 0.5217
  })
})

describe('formatDamage', () => {
  it('formats 0 as dash', () => {
    expect(formatDamage(0)).toBe('—')
  })

  it('formats thousands as K', () => {
    expect(formatDamage(1500)).toBe('1.5K%')
  })

  it('formats millions as M', () => {
    expect(formatDamage(1500000)).toBe('1.5M%')
  })

  it('formats small numbers directly', () => {
    expect(formatDamage(500)).toBe('500%')
  })
})
