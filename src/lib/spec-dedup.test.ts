import { describe, it, expect } from 'vitest'
import { dedupSkillsBySpec, getBaseName, type DedupInputSkill } from './spec-dedup'

// Helper to create a test skill
function skill(overrides: Partial<DedupInputSkill>): DedupInputSkill {
  return {
    skillId: Math.floor(Math.random() * 100000),
    name: 'Test Skill',
    classId: 1,
    className: 'Warrior',
    isAbsolute: false,
    isAwakening: false,
    isSuccession: false,
    isBlackSpirit: false,
    isPassive: false,
    isFlow: false,
    isCore: false,
    isMaxRank: true,
    prerequisiteIds: null,
    ...overrides,
  }
}

describe('getBaseName', () => {
  it('strips rank suffix', () => {
    expect(getBaseName('Slash X')).toBe('Slash')
    expect(getBaseName('Bolt Wave IV')).toBe('Bolt Wave')
  })

  it('strips Prime: prefix', () => {
    expect(getBaseName('Prime: Slash')).toBe('Slash')
  })

  it('strips Absolute: prefix', () => {
    expect(getBaseName('Absolute: Slash')).toBe('Slash')
  })

  it('strips Core: prefix', () => {
    expect(getBaseName('Core: Slash')).toBe('Slash')
  })

  it('strips Flow: prefix', () => {
    expect(getBaseName('Flow: Slash')).toBe('Slash')
  })

  it('strips Black Spirit: + Prime: combined', () => {
    expect(getBaseName('Black Spirit: Prime: Slash')).toBe('Black Spirit: Slash')
  })

  it('keeps Black Spirit: prefix', () => {
    expect(getBaseName('Black Spirit: Slash')).toBe('Black Spirit: Slash')
  })
})

describe('dedupSkillsBySpec', () => {
  it('returns empty for empty input', () => {
    expect(dedupSkillsBySpec([], { spec: 'awakening' })).toHaveLength(0)
  })

  it('keeps Black Spirit skills in both specs (no spec prefix)', () => {
    const skills = [
      skill({ skillId: 1, name: 'Black Spirit: Slash', isBlackSpirit: true }),
    ]
    const awk = dedupSkillsBySpec(skills, { spec: 'awakening' })
    const succ = dedupSkillsBySpec(skills, { spec: 'succession' })
    expect(awk).toHaveLength(1)
    expect(succ).toHaveLength(1)
  })

  it('BS Prime: skills only in Succession', () => {
    const skills = [
      skill({ skillId: 1, name: 'Black Spirit: Prime: Slash', isBlackSpirit: true }),
    ]
    const awk = dedupSkillsBySpec(skills, { spec: 'awakening' })
    const succ = dedupSkillsBySpec(skills, { spec: 'succession' })
    expect(awk).toHaveLength(0)
    expect(succ).toHaveLength(1)
  })

  it('BS Absolute: skills only in Awakening', () => {
    const skills = [
      skill({ skillId: 1, name: 'Black Spirit: Absolute: Slash', isBlackSpirit: true }),
    ]
    const awk = dedupSkillsBySpec(skills, { spec: 'awakening' })
    const succ = dedupSkillsBySpec(skills, { spec: 'succession' })
    expect(awk).toHaveLength(1)
    expect(succ).toHaveLength(0)
  })

  it('BS awakening-weapon skills only in Awakening', () => {
    const skills = [
      skill({ skillId: 1, name: 'Black Spirit: Nightmare', isBlackSpirit: true, isAwakening: true }),
    ]
    const awk = dedupSkillsBySpec(skills, { spec: 'awakening' })
    const succ = dedupSkillsBySpec(skills, { spec: 'succession' })
    expect(awk).toHaveLength(1)
    expect(succ).toHaveLength(0)
  })

  it('Awakening spec keeps Absolute over Main', () => {
    const skills = [
      skill({ skillId: 1, name: 'Slash', isAwakening: false, isAbsolute: false }),
      skill({ skillId: 2, name: 'Absolute: Slash', isAbsolute: true }),
    ]
    const awk = dedupSkillsBySpec(skills, { spec: 'awakening' })
    expect(awk).toHaveLength(1)
    expect(awk[0].name).toBe('Absolute: Slash')
  })

  it('Succession spec keeps Prime over Absolute', () => {
    const skills = [
      skill({ skillId: 1, name: 'Slash', isAwakening: false, isAbsolute: false }),
      skill({ skillId: 2, name: 'Absolute: Slash', isAbsolute: true }),
      skill({ skillId: 3, name: 'Prime: Slash', isSuccession: true }),
    ]
    const succ = dedupSkillsBySpec(skills, { spec: 'succession' })
    expect(succ).toHaveLength(1)
    expect(succ[0].name).toBe('Prime: Slash')
  })

  it('excludes isAwakening Core:/Flow: from Succession', () => {
    const skills = [
      skill({ skillId: 1, name: 'Core: Slash', isCore: true, isAwakening: true }),
      skill({ skillId: 2, name: 'Flow: Slash', isFlow: true, isAwakening: true }),
    ]
    const succ = dedupSkillsBySpec(skills, { spec: 'succession' })
    expect(succ).toHaveLength(0)
  })

  it('excludes isSuccession Flow: from Awakening', () => {
    const skills = [
      skill({ skillId: 1, name: 'Succession: Flow: Slash', isFlow: true, isSuccession: true }),
    ]
    const awk = dedupSkillsBySpec(skills, { spec: 'awakening' })
    expect(awk).toHaveLength(0)
  })

  it('default (no spec) prefers Prime > Absolute > Main', () => {
    const skills = [
      skill({ skillId: 1, name: 'Slash' }),
      skill({ skillId: 2, name: 'Absolute: Slash', isAbsolute: true }),
      skill({ skillId: 3, name: 'Prime: Slash', isSuccession: true }),
    ]
    const result = dedupSkillsBySpec(skills, { spec: null })
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Prime: Slash')
  })

  it('both specs mode shows Prime AND Absolute', () => {
    const skills = [
      skill({ skillId: 1, name: 'Slash' }),
      skill({ skillId: 2, name: 'Absolute: Slash', isAbsolute: true }),
      skill({ skillId: 3, name: 'Prime: Slash', isSuccession: true }),
    ]
    // Both specs: union of awakening + succession dedup
    const awkIds = new Set(dedupSkillsBySpec(skills, { spec: 'awakening' }).map(s => s.skillId))
    const succIds = new Set(dedupSkillsBySpec(skills, { spec: 'succession' }).map(s => s.skillId))
    const union = skills.filter(s => awkIds.has(s.skillId) || succIds.has(s.skillId))
    // Should have Absolute (from awakening) AND Prime (from succession), but NOT Main
    expect(union.some(s => s.name === 'Absolute: Slash')).toBe(true)
    expect(union.some(s => s.name === 'Prime: Slash')).toBe(true)
    expect(union.some(s => s.name === 'Slash')).toBe(false)
  })

  it('excludes isAwakening skills from default view', () => {
    const skills = [
      skill({ skillId: 1, name: 'Nightmare', isAwakening: true }),
      skill({ skillId: 2, name: 'Slash' }),
    ]
    const result = dedupSkillsBySpec(skills, { spec: null })
    // Nightmare (isAwakening) should be excluded from default
    expect(result.some(s => s.name === 'Nightmare')).toBe(false)
    expect(result.some(s => s.name === 'Slash')).toBe(true)
  })

  it('passive-vs-active collision keeps only active', () => {
    const skills = [
      skill({ skillId: 1, name: 'Training I', isPassive: true }),
      skill({ skillId: 2, name: 'Training II', isPassive: false }),
    ]
    const result = dedupSkillsBySpec(skills, { spec: null })
    // Both have same baseName 'Training' → passive dropped, active kept
    expect(result).toHaveLength(1)
    expect(result[0].isPassive).toBe(false)
  })
})
