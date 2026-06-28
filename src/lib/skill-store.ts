import { create } from 'zustand'
import type { SkillFilters, SkillType, SkillSort } from './skills'

interface SkillStore {
  filters: SkillFilters
  selectedSkillId: number | null
  detailOpen: boolean
  filtersOpen: boolean
  setQ: (q: string) => void
  setClassId: (c: number | 'all') => void
  setType: (t: SkillType | 'all') => void
  setProtection: (p: string | null) => void
  toggleCc: (c: string) => void
  setLevelRange: (min: number | undefined, max: number | undefined) => void
  setCooldownRange: (min: number | undefined, max: number | undefined) => void
  setAnimRange: (min: number | undefined, max: number | undefined) => void
  toggleHasVideo: () => void
  toggleHasAnim: () => void
  toggleQuickslot: () => void
  setSort: (s: SkillSort) => void
  toggleOrder: () => void
  setPage: (p: number) => void
  setPageSize: (n: number) => void
  resetFilters: () => void
  selectSkill: (id: number | null) => void
  setDetailOpen: (open: boolean) => void
  setFiltersOpen: (open: boolean) => void
}

const DEFAULT_FILTERS: SkillFilters = {
  q: '',
  classId: 'all',
  type: 'all',
  protection: null,
  cc: [],
  sort: 'skillId',
  order: 'asc',
  page: 1,
  pageSize: 24,
}

export const useSkillStore = create<SkillStore>((set) => ({
  filters: { ...DEFAULT_FILTERS },
  selectedSkillId: null,
  detailOpen: false,
  filtersOpen: false,
  setQ: (q) =>
    set((s) => ({ filters: { ...s.filters, q, page: 1 } })),
  setClassId: (c) =>
    set((s) => ({ filters: { ...s.filters, classId: c, page: 1 } })),
  setType: (t) =>
    set((s) => ({ filters: { ...s.filters, type: t, page: 1 } })),
  setProtection: (p) =>
    set((s) => ({
      filters: { ...s.filters, protection: s.filters.protection === p ? null : p, page: 1 },
    })),
  toggleCc: (c) =>
    set((s) => {
      const cur = s.filters.cc || []
      const next = cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]
      return { filters: { ...s.filters, cc: next, page: 1 } }
    }),
  setLevelRange: (min, max) =>
    set((s) => ({ filters: { ...s.filters, minLvl: min, maxLvl: max, page: 1 } })),
  setCooldownRange: (min, max) =>
    set((s) => ({ filters: { ...s.filters, minCd: min, maxCd: max, page: 1 } })),
  setAnimRange: (min, max) =>
    set((s) => ({ filters: { ...s.filters, minAnim: min, maxAnim: max, page: 1 } })),
  toggleHasVideo: () =>
    set((s) => ({
      filters: { ...s.filters, hasVideo: !s.filters.hasVideo ? true : undefined, page: 1 },
    })),
  toggleHasAnim: () =>
    set((s) => ({
      filters: { ...s.filters, hasAnim: !s.filters.hasAnim ? true : undefined, page: 1 },
    })),
  toggleQuickslot: () =>
    set((s) => ({
      filters: { ...s.filters, quickslot: !s.filters.quickslot ? true : undefined, page: 1 },
    })),
  setSort: (sort) =>
    set((s) => ({ filters: { ...s.filters, sort, page: 1 } })),
  toggleOrder: () =>
    set((s) => ({
      filters: { ...s.filters, order: s.filters.order === 'asc' ? 'desc' : 'asc', page: 1 },
    })),
  setPage: (p) => set((s) => ({ filters: { ...s.filters, page: p } })),
  setPageSize: (n) => set((s) => ({ filters: { ...s.filters, pageSize: n, page: 1 } })),
  resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),
  selectSkill: (id) =>
    set({ selectedSkillId: id, detailOpen: id != null }),
  setDetailOpen: (open) => set({ detailOpen: open }),
  setFiltersOpen: (open) => set({ filtersOpen: open }),
}))
