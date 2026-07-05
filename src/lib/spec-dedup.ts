// Shared spec-aware skill deduplication.
//
// Used by /api/skills, /api/meta, and the Tiers page so that all three views
// agree on which skills belong to which spec.
//
// BDO spec mechanics (confirmed by user, 2026-07-04):
//
// 1. Every pre-56 "Main" skill can be upgraded into one of:
//    - Absolute:  (Awakening-spec enhanced version)
//    - Prime: / Succession: (Succession-spec enhanced version)
//    - Core:  (level-60 player-pick enhancement, separate from spec chain)
//    - Flow:  (combo continuation, separate)
//
// 2. Spec selection rules:
//    - Awakening spec: use ALL Absolute: variants. For Main skills that have
//      no Absolute variant, keep the Main. Main skills that are PREREQUISITES
//      for Awakening-weapon skills are REPLACED by those awakening skills
//      (so they're excluded from the Awakening spec list).
//    - Succession spec: use Prime: / Succession: variants. For Main skills
//      that have no Prime variant, fall back to Absolute: (only if no Prime
//      exists for the same baseName). For Main skills with no Prime AND no
//      Absolute, keep the Main. NEVER use both Prime AND Absolute for the
//      same baseName.
//    - Ascension spec: ascension-only classes have a single spec — show all
//      skills (no dedup, no spec exclusion).
//
// 3. Shared across all specs:
//    - Black Spirit skills: always kept (separate skill, consumes BS rage).
//    - Passive skills: kept (if a passive and active share a baseName, only
//      the active is kept in the dedup).
//    - Core: / Flow: skills: always kept EXCEPT Awakening-flagged Core/Flow
//      in Succession spec (they require the Awakening weapon).
//
// 4. Default (no spec selected): prefer Prime > Absolute > Core > Flow > Main,
//    one row per baseName. Awakening-weapon skills are excluded (they require
//    the Awakening weapon).

const RANK_SUFFIX = /\s+(XXX|XXIX|XXVIII|XXVII|XXVI|XXV|XXIV|XXIII|XXII|XXI|XX|XIX|XVIII|XVII|XVI|XV|XIV|XIII|XII|XI|X|IX|VIII|VII|VI|IV|V|III|II|I)$/

export function getBaseName(name: string): string {
  let base = name
  // Strip spec/Core/Flow prefixes repeatedly to handle "Black Spirit: Prime: X" → "Black Spirit: X"
  for (let i = 0; i < 3; i++) {
    const before = base
    base = base.replace(/^(Black Spirit:\s*)?(Prime:\s*|Succession:\s*|Absolute:\s*|Core:\s*|Flow:\s*)/i, (_m, bs) => bs || '')
    if (base === before) break
  }
  base = base.replace(RANK_SUFFIX, '')
  return base.trim()
}

export type SpecName = 'awakening' | 'succession' | 'ascension'

export interface DedupInputSkill {
  skillId: number
  name: string
  classId: number | null
  className: string | null
  isAbsolute: boolean
  isAwakening: boolean
  isSuccession: boolean
  isBlackSpirit: boolean
  isPassive: boolean
  isFlow: boolean
  isCore: boolean
  isMaxRank: boolean
  prerequisiteIds: string | null
}

export interface DedupOptions {
  spec?: SpecName | null
  applyPrereqExclusion?: boolean
}

interface GroupInfo {
  skillIds: number[]
  hasSuccession: boolean
  hasAbsolute: boolean
  hasAwakening: boolean
  hasCore: boolean
  hasFlow: boolean
  isBlackSpirit: boolean
  hasPassive: boolean
  hasNonPassive: boolean
}

export function dedupSkillsBySpec<T extends DedupInputSkill>(
  skills: T[],
  options: DedupOptions = {}
): T[] {
  const { spec = null, applyPrereqExclusion = true } = options
  const byId = new Map<number, T>(skills.map((s) => [s.skillId, s]))

  // Build prereq-replacement sets
  const replacedByAwakening = new Set<number>()
  const replacedByPrime = new Set<number>()
  if (applyPrereqExclusion) {
    for (const s of skills) {
      if (!s.prerequisiteIds) continue
      const prereqIds = s.prerequisiteIds
        .split(',')
        .map((x) => parseInt(x.trim(), 10))
        .filter((x) => !isNaN(x) && x > 0)
      if (s.isAwakening) {
        for (const pid of prereqIds) replacedByAwakening.add(pid)
      }
      const isPrime = s.isSuccession || s.name.includes('Prime: ') || s.name.startsWith('Succession:')
      if (isPrime) {
        for (const pid of prereqIds) replacedByPrime.add(pid)
      }
    }
  }

  // Build spec base name map
  const specMap = new Map<string, GroupInfo>()
  for (const s of skills) {
    if (!s.isMaxRank) continue
    const specBase = getBaseName(s.name)
    const isSucc = s.isSuccession || s.name.includes('Prime: ') || s.name.startsWith('Succession:')
    const isAbs = s.isAbsolute || s.name.includes('Absolute: ')
    const isCore = s.name.includes('Core: ')
    const isFlow = s.isFlow || s.name.includes('Flow: ')
    const isAwk = s.isAwakening
    const existing = specMap.get(specBase) || {
      skillIds: [], hasSuccession: false, hasAbsolute: false, hasAwakening: false,
      hasCore: false, hasFlow: false, isBlackSpirit: false, hasPassive: false, hasNonPassive: false,
    }
    existing.skillIds.push(s.skillId)
    if (isSucc) existing.hasSuccession = true
    if (isAbs) existing.hasAbsolute = true
    if (isAwk) existing.hasAwakening = true
    if (isCore) existing.hasCore = true
    if (isFlow) existing.hasFlow = true
    if (s.isBlackSpirit) existing.isBlackSpirit = true
    if (s.isPassive) existing.hasPassive = true
    if (!s.isPassive) existing.hasNonPassive = true
    specMap.set(specBase, existing)
  }

  const pickWhere = (info: GroupInfo, pred: (s: T) => boolean): T[] =>
    info.skillIds
      .map((id) => byId.get(id))
      .filter((s): s is T => !!s && pred(s))

  const result: T[] = []
  const added = new Set<number>()

  for (const [, info] of specMap) {
    // Black Spirit skills: spec-filtered like regular skills.
    // - BS Prime: → Succession only (not Awakening, not default)
    // - BS Absolute: → Awakening only (not Succession, not default if Prime exists)
    // - BS Awakening-weapon skills (isAwakening=true, no Prime/Abs prefix) → Awakening only
    // - BS skills without spec prefix and isAwakening=false → both specs
    if (info.isBlackSpirit) {
      for (const s of pickWhere(info, (s) => s.isBlackSpirit)) {
        const innerName = s.name.replace(/^Black Spirit:\s*/i, '')
        const isBSPrime = innerName.includes('Prime: ') || innerName.startsWith('Succession:')
        const isBSAbs = innerName.includes('Absolute: ')
        const isBSAwk = s.isAwakening // Awakening-weapon BS skill

        if (isBSPrime && spec === 'awakening') continue // Prime → Succession only
        if (isBSAbs && spec === 'succession') continue // Absolute → Awakening only
        if (isBSAbs && spec === null && info.hasSuccession) continue // Absolute → skip in default if Prime exists
        if (isBSAwk && !isBSPrime && !isBSAbs && spec === 'succession') continue // Awakening-weapon BS → Awakening only
        if (isBSAwk && !isBSPrime && !isBSAbs && spec === null) continue // Awakening-weapon BS → not in default view
        if (!added.has(s.skillId)) { result.push(s); added.add(s.skillId) }
      }
      continue
    }

    // Passive-vs-active collision
    let workingInfo = info
    if (info.hasPassive && info.hasNonPassive) {
      const nonPassiveIds = info.skillIds.filter((id) => !byId.get(id)?.isPassive)
      workingInfo = { ...info, skillIds: nonPassiveIds, hasPassive: false }
    }

    // Core:/Flow: skills — kept EXCEPT Awakening-flagged ones in Succession/default
    for (const s of pickWhere(workingInfo, (s) => s.name.includes('Core: ') || s.isCore)) {
      if (spec === 'succession' && s.isAwakening) continue
      if (spec === null && s.isAwakening) continue
      if (!added.has(s.skillId)) { result.push(s); added.add(s.skillId) }
    }
    for (const s of pickWhere(workingInfo, (s) => s.name.includes('Flow: ') || s.isFlow)) {
      if (spec === 'succession' && s.isAwakening) continue
      if (spec === null && s.isAwakening) continue
      if (!added.has(s.skillId)) { result.push(s); added.add(s.skillId) }
    }

    // Pick from the spec chain
    const picked = pickVariant(workingInfo, spec, byId, replacedByAwakening, replacedByPrime)
    for (const s of picked) {
      if (!added.has(s.skillId)) { result.push(s); added.add(s.skillId) }
    }
  }

  return result
}

function pickVariant<T extends DedupInputSkill>(
  info: GroupInfo,
  spec: SpecName | null | undefined,
  byId: Map<number, T>,
  replacedByAwakening: Set<number>,
  replacedByPrime: Set<number>
): T[] {
  const pickWhere = (pred: (s: T) => boolean): T[] =>
    info.skillIds
      .map((id) => byId.get(id))
      .filter((s): s is T => !!s && pred(s))

  if (spec === 'awakening') {
    if (info.hasAbsolute) {
      return pickWhere((s) => s.isAbsolute || s.name.includes('Absolute: '))
    }
    return pickWhere((s) => {
      if (s.isAwakening) return true
      if (s.isAbsolute) return false
      if (s.name.includes('Prime: ') || s.name.startsWith('Succession:')) return false
      if (replacedByAwakening.has(s.skillId)) return false
      return true
    })
  }

  if (spec === 'succession') {
    if (info.hasSuccession) {
      return pickWhere((s) => s.isSuccession || s.name.includes('Prime: ') || s.name.startsWith('Succession:'))
    }
    if (info.hasAbsolute) {
      return pickWhere((s) => s.isAbsolute || s.name.includes('Absolute: '))
    }
    return pickWhere((s) => {
      if (s.isAwakening) return false
      if (s.isAbsolute) return false
      if (s.name.includes('Prime: ') || s.name.startsWith('Succession:')) return false
      if (replacedByPrime.has(s.skillId)) return false
      return true
    })
  }

  // Default (no spec) or Ascension
  if (info.hasSuccession) {
    return pickWhere((s) => s.isSuccession || s.name.includes('Prime: ') || s.name.startsWith('Succession:'))
  }
  if (info.hasAbsolute) {
    return pickWhere((s) => s.isAbsolute || s.name.includes('Absolute: '))
  }
  return pickWhere((s) => {
    if (s.isAwakening) return false
    if (s.name.includes('Core: ') || s.isCore) return false
    if (s.name.includes('Flow: ') || s.isFlow) return false
    return true
  })
}
