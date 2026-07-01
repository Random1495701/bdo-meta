import { create } from 'zustand'
import type { SkillFilters, SkillType, SkillSort } from './skills'

// Manual localStorage persistence for sort/view preferences.
// We don't use zustand persist middleware because it causes hydration mismatches.
// Instead, we load from localStorage on first client render and save on change.

const SORT_STORAGE_KEY = 'bdo-meta-sort-prefs'

function loadSortPrefs(): { sort?: SkillSort; order?: 'asc' | 'desc'; viewMode?: 'grid' | 'list' | 'table' } {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(SORT_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {}
}

function saveSortPrefs(prefs: { sort: SkillSort; order: 'asc' | 'desc'; viewMode: 'grid' | 'list' | 'table' }) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(prefs))
  } catch {}
}

const savedPrefs = loadSortPrefs()

interface SkillStore {
  filters: SkillFilters
  selectedSkillId: number | null
  compareSkillId: number | null
  detailOpen: boolean
  compareOpen: boolean
  filtersOpen: boolean
  viewMode: 'grid' | 'list' | 'table'
  setQ: (q: string) => void
  toggleClass: (classId: number) => void
  toggleExcludeClass: (classId: number) => void
  clearExcludedClasses: () => void
  clearClasses: () => void
  toggleType: (t: SkillType) => void
  clearTypes: () => void
  toggleProtection: (p: string) => void
  clearProtections: () => void
  toggleCc: (c: string) => void
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
  toggleHasAddon: () => void
  setSpec: (spec: 'all' | 'succession' | 'awakening' | 'ascension') => void
  toggleSpec: (spec: 'succession' | 'awakening' | 'ascension') => void
  setSort: (s: SkillSort) => void
  toggleOrder: () => void
  setPage: (p: number) => void
  setPageSize: (n: number) => void
  setViewMode: (m: 'grid' | 'list' | 'table') => void
  resetFilters: () => void
  selectSkill: (id: number | null) => void
  setDetailOpen: (open: boolean) => void
  setCompareSkill: (id: number | null) => void
  setCompareOpen: (open: boolean) => void
  setFiltersOpen: (open: boolean) => void
}

const DEFAULT_FILTERS: SkillFilters = {
  q: '',
  classIds: [],
  types: [],
  protections: [],
  cc: [],
  specs: [],
  sort: savedPrefs.sort || 'skillId',
  order: savedPrefs.order || 'asc',
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
  setQ: (q) => set((s) => ({ filters: { ...s.filters, q, page: 1 } })),
  toggleClass: (classId) =>
    set((s) => {
      const cur = s.filters.classIds || []
      const next = cur.includes(classId) ? cur.filter((x) => x !== classId) : [...cur, classId]
      return { filters: { ...s.filters, classIds: next, page: 1 } }
    }),
  clearClasses: () => set((s) => ({ filters: { ...s.filters, classIds: [], page: 1 } })),
  toggleExcludeClass: (classId) =>
    set((s) => {
      const cur = s.filters.excludedClassIds || []
      const next = cur.includes(classId) ? cur.filter((x) => x !== classId) : [...cur, classId]
      return { filters: { ...s.filters, excludedClassIds: next, page: 1 } }
    }),
  clearExcludedClasses: () => set((s) => ({ filters: { ...s.filters, excludedClassIds: [], page: 1 } })),
  toggleType: (t) =>
    set((s) => {
      const cur = s.filters.types || []
      const next = cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]
      return { filters: { ...s.filters, types: next, page: 1 } }
    }),
  clearTypes: () => set((s) => ({ filters: { ...s.filters, types: [], page: 1 } })),
  toggleProtection: (p) =>
    set((s) => {
      const cur = s.filters.protections || []
      const next = cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]
      return { filters: { ...s.filters, protections: next, page: 1 } }
    }),
  clearProtections: () => set((s) => ({ filters: { ...s.filters, protections: [], page: 1 } })),
  toggleCc: (c) =>
    set((s) => {
      const cur = s.filters.cc || []
      const next = cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]
      return { filters: { ...s.filters, cc: next, page: 1 } }
    }),
  clearCc: () => set((s) => ({ filters: { ...s.filters, cc: [], page: 1 } })),
  setLevelRange: (min, max) => set((s) => ({ filters: { ...s.filters, minLvl: min, maxLvl: max, page: 1 } })),
  setCooldownRange: (min, max) => set((s) => ({ filters: { ...s.filters, minCd: min, maxCd: max, page: 1 } })),
  setAnimRange: (min, max) => set((s) => ({ filters: { ...s.filters, minAnim: min, maxAnim: max, page: 1 } })),
  setSpRange: (min, max) => set((s) => ({ filters: { ...s.filters, minSp: min, maxSp: max, page: 1 } })),
  setDamageRange: (min, max) => set((s) => ({ filters: { ...s.filters, minDamage: min, maxDamage: max, page: 1 } })),
  toggleHasVideo: () => set((s) => ({ filters: { ...s.filters, hasVideo: !s.filters.hasVideo ? true : undefined, page: 1 } })),
  toggleHasAnim: () => set((s) => ({ filters: { ...s.filters, hasAnim: !s.filters.hasAnim ? true : undefined, page: 1 } })),
  toggleQuickslot: () => set((s) => ({ filters: { ...s.filters, quickslot: !s.filters.quickslot ? true : undefined, page: 1 } })),
  toggleHasPrereqs: () => set((s) => ({ filters: { ...s.filters, hasPrereqs: !s.filters.hasPrereqs ? true : undefined, page: 1 } })),
  toggleHasAddon: () => set((s) => ({ filters: { ...s.filters, hasAddon: !s.filters.hasAddon ? true : undefined, page: 1 } })),
  setSpec: (spec) => set((s) => {
    // Legacy single-spec setter — maps to specs array
    if (spec === 'all') return { filters: { ...s.filters, specs: [], types: [], page: 1 } }
    return { filters: { ...s.filters, specs: [spec], types: [], page: 1 } }
  }),
  toggleSpec: (spec) => set((s) => {
    const cur = s.filters.specs || []
    const next = cur.includes(spec) ? cur.filter((x) => x !== spec) : [...cur, spec]
    return { filters: { ...s.filters, specs: next, types: [], page: 1 } }
  }),
  setSort: (sort) => set((s) => {
    saveSortPrefs({ sort, order: s.filters.order, viewMode: s.viewMode })
    return { filters: { ...s.filters, sort, page: 1 } }
  }),
  toggleOrder: () => set((s) => {
    const order = s.filters.order === 'asc' ? 'desc' : 'asc'
    saveSortPrefs({ sort: s.filters.sort, order, viewMode: s.viewMode })
    return { filters: { ...s.filters, order, page: 1 } }
  }),
  setPage: (p) => set((s) => ({ filters: { ...s.filters, page: p } })),
  setPageSize: (n) => set((s) => ({ filters: { ...s.filters, pageSize: n, page: 1 } })),
  setViewMode: (m) => {
    const state = useSkillStore.getState()
    saveSortPrefs({ sort: state.filters.sort, order: state.filters.order, viewMode: m })
    set({ viewMode: m })
  },
  resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),
  selectSkill: (id) => set({ selectedSkillId: id, detailOpen: id != null }),
  setDetailOpen: (open) => set({ detailOpen: open }),
  setCompareSkill: (id) => set({ compareSkillId: id }),
  setCompareOpen: (open) => set({ compareOpen: open }),
  setFiltersOpen: (open) => set({ filtersOpen: open }),
}))
