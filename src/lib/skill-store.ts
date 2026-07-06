import { create } from 'zustand'
import type { SkillFilters, SkillType, SkillSort } from './skills'

// Manual localStorage persistence for sort/view preferences AND key filters.
// We don't use zustand persist middleware because it causes hydration mismatches.
// Instead, we load from localStorage on first client render and save on change.

const SORT_STORAGE_KEY = 'bdo-meta-sort-prefs'
const FILTERS_STORAGE_KEY = 'bdo-meta-filters'

function loadSortPrefs(): { sort?: SkillSort; order?: 'asc' | 'desc'; viewMode?: 'grid' | 'list' | 'table' | 'tree' } {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(SORT_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {}
}

function saveSortPrefs(prefs: { sort: SkillSort; order: 'asc' | 'desc'; viewMode: 'grid' | 'list' | 'table' | 'tree' }) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(prefs))
  } catch {}
}

// Persisted filters (classIds, specs, q, excludedClassIds) — loaded on first client render.
type PersistedFilters = Pick<SkillFilters, 'classIds' | 'specs' | 'q' | 'excludedClassIds'>

function loadPersistedFilters(): PersistedFilters {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(FILTERS_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {}
}

function savePersistedFilters(f: PersistedFilters) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(f))
  } catch {}
}

const savedPrefs = loadSortPrefs()
const savedFilters = loadPersistedFilters()

interface SkillStore {
  filters: SkillFilters
  selectedSkillId: number | null
  compareSkillId: number | null
  detailOpen: boolean
  compareOpen: boolean
  filtersOpen: boolean
  viewMode: 'grid' | 'list' | 'table' | 'tree'
  setQ: (q: string) => void
  toggleClass: (classId: number) => void
  toggleExcludeClass: (classId: number) => void
  clearExcludedClasses: () => void
  clearClasses: () => void
  toggleType: (t: SkillType) => void
  cycleType: (t: SkillType) => void
  clearTypes: () => void
  toggleProtection: (p: string) => void
  cycleProtection: (p: string) => void
  clearProtections: () => void
  toggleCc: (c: string) => void
  cycleCc: (c: string) => void
  clearCc: () => void
  setLevelRange: (min: number | undefined, max: number | undefined) => void
  setCooldownRange: (min: number | undefined, max: number | undefined) => void
  setAnimRange: (min: number | undefined, max: number | undefined) => void
  setSpRange: (min: number | undefined, max: number | undefined) => void
  setDamageRange: (min: number | undefined, max: number | undefined) => void
  toggleHasVideo: () => void
  toggleHasAnim: () => void
  toggleQuickslot: () => void
  toggleHasPrereqs: () => void
  toggleHasPatchChange: () => void
  setSpec: (spec: 'all' | 'succession' | 'awakening' | 'ascension') => void
  toggleSpec: (spec: 'succession' | 'awakening' | 'ascension') => void
  setSort: (s: SkillSort) => void
  toggleOrder: () => void
  setPage: (p: number) => void
  setPageSize: (n: number) => void
  setViewMode: (m: 'grid' | 'list' | 'table' | 'tree') => void
  resetFilters: () => void
  selectSkill: (id: number | null) => void
  setDetailOpen: (open: boolean) => void
  setCompareSkill: (id: number | null) => void
  setCompareOpen: (open: boolean) => void
  setFiltersOpen: (open: boolean) => void
}

const DEFAULT_FILTERS: SkillFilters = {
  q: savedFilters.q ?? '',
  classIds: savedFilters.classIds ?? [],
  excludedClassIds: savedFilters.excludedClassIds ?? [],
  types: [],
  protections: [],
  cc: [],
  specs: savedFilters.specs ?? [],
  sort: savedPrefs.sort || 'skillId',
  order: savedPrefs.order || 'desc',
  page: 1,
  pageSize: 24,
}

export const useSkillStore = create<SkillStore>((set) => ({
  filters: { ...DEFAULT_FILTERS },
  selectedSkillId: null,
  compareSkillId: null,
  detailOpen: false,
  compareOpen: false,
  filtersOpen: false,
  viewMode: savedPrefs.viewMode || 'table',
  setQ: (q) => set((s) => {
    savePersistedFilters({ q, classIds: s.filters.classIds, specs: s.filters.specs, excludedClassIds: s.filters.excludedClassIds })
    return { filters: { ...s.filters, q, page: 1 } }
  }),
  toggleClass: (classId) =>
    set((s) => {
      const cur = s.filters.classIds || []
      const next = cur.includes(classId) ? cur.filter((x) => x !== classId) : [...cur, classId]
      savePersistedFilters({ q: s.filters.q, classIds: next, specs: s.filters.specs, excludedClassIds: s.filters.excludedClassIds })
      return { filters: { ...s.filters, classIds: next, page: 1 } }
    }),
  clearClasses: () => set((s) => {
    savePersistedFilters({ q: s.filters.q, classIds: [], specs: s.filters.specs, excludedClassIds: s.filters.excludedClassIds })
    return { filters: { ...s.filters, classIds: [], page: 1 } }
  }),
  toggleExcludeClass: (classId) =>
    set((s) => {
      const cur = s.filters.excludedClassIds || []
      const next = cur.includes(classId) ? cur.filter((x) => x !== classId) : [...cur, classId]
      savePersistedFilters({ q: s.filters.q, classIds: s.filters.classIds, specs: s.filters.specs, excludedClassIds: next })
      return { filters: { ...s.filters, excludedClassIds: next, page: 1 } }
    }),
  clearExcludedClasses: () => set((s) => {
    savePersistedFilters({ q: s.filters.q, classIds: s.filters.classIds, specs: s.filters.specs, excludedClassIds: [] })
    return { filters: { ...s.filters, excludedClassIds: [], page: 1 } }
  }),
  toggleType: (t) =>
    set((s) => {
      const cur = s.filters.types || []
      const next = cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]
      return { filters: { ...s.filters, types: next, page: 1 } }
    }),
  cycleType: (t) =>
    set((s) => {
      // 3-state: off → filter → exclude → off
      const cur = s.filters.types || []
      const exCur = s.filters.excludedTypes || []
      if (cur.includes(t)) {
        // Currently filtering → switch to exclude
        return { filters: { ...s.filters, types: cur.filter((x) => x !== t), excludedTypes: [...exCur, t], page: 1 } }
      } else if (exCur.includes(t)) {
        // Currently excluding → turn off
        return { filters: { ...s.filters, excludedTypes: exCur.filter((x) => x !== t), page: 1 } }
      } else {
        // Off → filter
        return { filters: { ...s.filters, types: [...cur, t], page: 1 } }
      }
    }),
  clearTypes: () => set((s) => ({ filters: { ...s.filters, types: [], excludedTypes: [], page: 1 } })),
  toggleProtection: (p) =>
    set((s) => {
      const cur = s.filters.protections || []
      const next = cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]
      return { filters: { ...s.filters, protections: next, page: 1 } }
    }),
  cycleProtection: (p) =>
    set((s) => {
      const cur = s.filters.protections || []
      const exCur = s.filters.excludedProtections || []
      if (cur.includes(p)) {
        return { filters: { ...s.filters, protections: cur.filter((x) => x !== p), excludedProtections: [...exCur, p], page: 1 } }
      } else if (exCur.includes(p)) {
        return { filters: { ...s.filters, excludedProtections: exCur.filter((x) => x !== p), page: 1 } }
      } else {
        return { filters: { ...s.filters, protections: [...cur, p], page: 1 } }
      }
    }),
  clearProtections: () => set((s) => ({ filters: { ...s.filters, protections: [], excludedProtections: [], page: 1 } })),
  toggleCc: (c) =>
    set((s) => {
      const cur = s.filters.cc || []
      const next = cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]
      return { filters: { ...s.filters, cc: next, page: 1 } }
    }),
  cycleCc: (c) =>
    set((s) => {
      const cur = s.filters.cc || []
      const exCur = s.filters.excludedCc || []
      if (cur.includes(c)) {
        return { filters: { ...s.filters, cc: cur.filter((x) => x !== c), excludedCc: [...exCur, c], page: 1 } }
      } else if (exCur.includes(c)) {
        return { filters: { ...s.filters, excludedCc: exCur.filter((x) => x !== c), page: 1 } }
      } else {
        return { filters: { ...s.filters, cc: [...cur, c], page: 1 } }
      }
    }),
  clearCc: () => set((s) => ({ filters: { ...s.filters, cc: [], excludedCc: [], page: 1 } })),
  setLevelRange: (min, max) => set((s) => ({ filters: { ...s.filters, minLvl: min, maxLvl: max, page: 1 } })),
  setCooldownRange: (min, max) => set((s) => ({ filters: { ...s.filters, minCd: min, maxCd: max, page: 1 } })),
  setAnimRange: (min, max) => set((s) => ({ filters: { ...s.filters, minAnim: min, maxAnim: max, page: 1 } })),
  setSpRange: (min, max) => set((s) => ({ filters: { ...s.filters, minSp: min, maxSp: max, page: 1 } })),
  setDamageRange: (min, max) => set((s) => ({ filters: { ...s.filters, minDamage: min, maxDamage: max, page: 1 } })),
  toggleHasVideo: () => set((s) => ({ filters: { ...s.filters, hasVideo: !s.filters.hasVideo ? true : undefined, page: 1 } })),
  toggleHasAnim: () => set((s) => ({ filters: { ...s.filters, hasAnim: !s.filters.hasAnim ? true : undefined, page: 1 } })),
  toggleQuickslot: () => set((s) => ({ filters: { ...s.filters, quickslot: !s.filters.quickslot ? true : undefined, page: 1 } })),
  toggleHasPrereqs: () => set((s) => ({ filters: { ...s.filters, hasPrereqs: !s.filters.hasPrereqs ? true : undefined, page: 1 } })),
  toggleHasPatchChange: () => set((s) => ({ filters: { ...s.filters, hasPatchChange: !s.filters.hasPatchChange ? true : undefined, page: 1 } })),
  setSpec: (spec) => set((s) => {
    // Legacy single-spec setter — maps to specs array
    const nextSpecs = spec === 'all' ? [] : [spec]
    savePersistedFilters({ q: s.filters.q, classIds: s.filters.classIds, specs: nextSpecs, excludedClassIds: s.filters.excludedClassIds })
    return { filters: { ...s.filters, specs: nextSpecs, types: [], page: 1 } }
  }),
  toggleSpec: (spec) => set((s) => {
    const cur = s.filters.specs || []
    const next = cur.includes(spec) ? cur.filter((x) => x !== spec) : [...cur, spec]
    savePersistedFilters({ q: s.filters.q, classIds: s.filters.classIds, specs: next, excludedClassIds: s.filters.excludedClassIds })
    return { filters: { ...s.filters, specs: next, types: [], page: 1 } }
  }),
  setSort: (sort) => set((s) => {
    saveSortPrefs({ sort, order: s.filters.order || 'desc', viewMode: s.viewMode })
    return { filters: { ...s.filters, sort, page: 1 } }
  }),
  toggleOrder: () => set((s) => {
    const order: 'asc' | 'desc' = s.filters.order === 'asc' ? 'desc' : 'asc'
    saveSortPrefs({ sort: s.filters.sort || 'skillId', order, viewMode: s.viewMode })
    return { filters: { ...s.filters, order, page: 1 } }
  }),
  setPage: (p) => set((s) => ({ filters: { ...s.filters, page: p } })),
  setPageSize: (n) => set((s) => ({ filters: { ...s.filters, pageSize: n, page: 1 } })),
  setViewMode: (m) => {
    const state = useSkillStore.getState()
    saveSortPrefs({ sort: state.filters.sort || 'skillId', order: state.filters.order || 'desc', viewMode: m })
    set({ viewMode: m })
  },
  resetFilters: () => {
    savePersistedFilters({ q: '', classIds: [], specs: [], excludedClassIds: [] })
    return set({ filters: { ...DEFAULT_FILTERS, q: '', classIds: [], specs: [], excludedClassIds: [] } })
  },
  selectSkill: (id) => set({ selectedSkillId: id, detailOpen: id != null }),
  setDetailOpen: (open) => set({ detailOpen: open }),
  setCompareSkill: (id) => set({ compareSkillId: id }),
  setCompareOpen: (open) => set({ compareOpen: open }),
  setFiltersOpen: (open) => set({ filtersOpen: open }),
}))
