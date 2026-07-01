'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Swords, Zap, Shield, ShieldHalf, Grab, Gauge,
  RotateCcw, SlidersHorizontal, Table2, LayoutList, Crown,
  TrendingUp, Info, ChevronDown, Search, Medal, Award, Skull,
} from 'lucide-react'
import { classColor, classIconUrl, SPEC_COLORS } from '@/lib/skills'
import { cn } from '@/lib/utils'
import { Slider } from '@/components/ui/slider'
import {
  Sheet, SheetContent, SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

// ─── Types (mirror the /api/meta response) ───────────────────────────

interface SpecStats {
  skillCount: number
  avgPvpDamage: number
  medianPvpDamage: number
  pvpCcSkillCount: number
  grabCount: number
  superArmorCount: number
  forwardGuardCount: number
  iFrameCount: number
  coreSaCount: number
  coreFgCount: number
  topPvpDamageSkill: { skillId: number; name: string; damage: number } | null
  dpsEstimate: number
  protectedCoverage: number
}

interface ClassStats {
  classId: number
  className: string
  slug: string
  combatType: string | null
  successionGroup: string | null
  awakeningGroup: string | null
  ascensionGroup: string | null
  successionSaDr: number
  awakeningSaDr: number
  ascensionSaDr: number
  awakening: SpecStats
  succession: SpecStats
  ascension: SpecStats
}

type SpecName = 'awakening' | 'succession' | 'ascension'

// ─── Scoring parameter definitions ──────────────────────────────────
// Every parameter that can contribute to the composite score.
// Users set the weight (0–100) for each. All values are normalized
// 0→1 across all entries before weighting, so weights are directly
// comparable regardless of the raw unit (damage vs. count vs. %).

type ParamKey =
  | 'avgPvpDamage' | 'medianPvpDamage' | 'dpsEstimate'
  | 'pvpCcSkillCount' | 'grabCount'
  | 'superArmorCount' | 'forwardGuardCount' | 'iFrameCount'
  | 'coreSaCount' | 'coreFgCount' | 'protectedCoverage'
  | 'saDr'

interface ScoreParam {
  key: ParamKey
  label: string
  short: string
  category: 'damage' | 'cc' | 'protection' | 'defense'
  icon: React.ReactNode
  description: string
}

const SCORE_PARAMS: ScoreParam[] = [
  // Damage
  { key: 'avgPvpDamage', label: 'Avg PvP Damage', short: 'Avg DMG', category: 'damage', icon: <Swords className="size-3.5" />, description: 'Average PvP damage per skill (excludes Black Spirit rage skills).' },
  { key: 'medianPvpDamage', label: 'Median PvP Damage', short: 'Med DMG', category: 'damage', icon: <Swords className="size-3.5" />, description: 'Median PvP damage — less skewed by outlier nukes.' },
  { key: 'dpsEstimate', label: 'DPS Estimate', short: 'DPS', category: 'damage', icon: <Gauge className="size-3.5" />, description: 'Average PvP damage ÷ average animation duration. Rewards fast, hard-hitting skills.' },
  // CC
  { key: 'pvpCcSkillCount', label: 'PvP CC Skills', short: 'CC Skills', category: 'cc', icon: <Zap className="size-3.5" />, description: 'Number of skills that apply at least one PvP CC.' },
  { key: 'grabCount', label: 'Grabs', short: 'Grab', category: 'cc', icon: <Grab className="size-3.5" />, description: 'Skills with Grapple CC — bypasses Super Armor.' },
  // Protection
  { key: 'superArmorCount', label: 'Super Armor', short: 'SA', category: 'protection', icon: <Shield className="size-3.5" />, description: 'Skills with Super Armor (immune to CC, take reduced damage).' },
  { key: 'forwardGuardCount', label: 'Forward Guard', short: 'FG', category: 'protection', icon: <Shield className="size-3.5" />, description: 'Skills with Forward Guard (block frontal attacks).' },
  { key: 'iFrameCount', label: 'I-Frames', short: 'IF', category: 'protection', icon: <ShieldHalf className="size-3.5" />, description: 'Skills with Invincibility frames — dodge everything.' },
  { key: 'coreSaCount', label: 'Core SA', short: 'Core SA', category: 'protection', icon: <Shield className="size-3.5" />, description: 'Core: skills granting Super Armor (player picks only 1).' },
  { key: 'coreFgCount', label: 'Core FG', short: 'Core FG', category: 'protection', icon: <Shield className="size-3.5" />, description: 'Core: skills granting Forward Guard (player picks only 1).' },
  { key: 'protectedCoverage', label: 'Protected %', short: 'Prot%', category: 'protection', icon: <Shield className="size-3.5" />, description: 'Percentage of the spec\'s skills that have any protection.' },
  // Defense
  { key: 'saDr', label: 'SA Damage Reduction', short: 'SA DR', category: 'defense', icon: <ShieldHalf className="size-3.5" />, description: 'Damage reduction while in Super Armor (from PA Wiki, per spec).' },
]

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  damage: { label: 'Damage', color: '#ef4444' },
  cc: { label: 'Crowd Control', color: '#eab308' },
  protection: { label: 'Protection', color: '#3b82f6' },
  defense: { label: 'Defense', color: '#22c55e' },
}

// ─── Presets ────────────────────────────────────────────────────────

type Weights = Record<ParamKey, number>

const ZERO_WEIGHTS: Weights = SCORE_PARAMS.reduce((acc, p) => {
  acc[p.key] = 0
  return acc
}, {} as Weights)

const PRESETS: Record<string, { label: string; weights: Weights; description: string }> = {
  balanced: {
    label: 'Balanced',
    description: 'Equal weight to every parameter.',
    weights: SCORE_PARAMS.reduce((acc, p) => { acc[p.key] = 50; return acc }, {} as Weights),
  },
  damage: {
    label: 'Damage',
    description: 'Prioritize raw and burst damage.',
    weights: { ...ZERO_WEIGHTS, avgPvpDamage: 80, medianPvpDamage: 60, dpsEstimate: 100 },
  },
  control: {
    label: 'CC / Control',
    description: 'Prioritize crowd control and grabs.',
    weights: { ...ZERO_WEIGHTS, pvpCcSkillCount: 100, grabCount: 90 },
  },
  defense: {
    label: 'Defense',
    description: 'Prioritize protection and SA damage reduction.',
    weights: { ...ZERO_WEIGHTS, superArmorCount: 80, forwardGuardCount: 70, iFrameCount: 90, coreSaCount: 60, coreFgCount: 50, protectedCoverage: 75, saDr: 100 },
  },
  burst: {
    label: 'Burst (DPS)',
    description: 'Fast, hard-hitting skills with some CC.',
    weights: { ...ZERO_WEIGHTS, dpsEstimate: 100, avgPvpDamage: 70, pvpCcSkillCount: 40 },
  },
  bruiser: {
    label: 'Bruiser',
    description: 'Balance damage, protection, and grabs.',
    weights: { ...ZERO_WEIGHTS, avgPvpDamage: 50, superArmorCount: 60, forwardGuardCount: 50, grabCount: 70, pvpCcSkillCount: 50, saDr: 60, protectedCoverage: 50 },
  },
}

// ─── Helpers ────────────────────────────────────────────────────────

function getSpecSaDr(cls: ClassStats, spec: SpecName): number {
  if (spec === 'awakening') return cls.awakeningSaDr
  if (spec === 'succession') return cls.successionSaDr
  return cls.ascensionSaDr
}

function getSpecGroup(cls: ClassStats, spec: SpecName): string | null {
  if (spec === 'awakening') return cls.awakeningGroup
  if (spec === 'succession') return cls.successionGroup
  return cls.ascensionGroup
}

interface TierEntry {
  classId: number
  className: string
  slug: string
  spec: SpecName
  stats: SpecStats
  saDr: number
  combatType: string | null
  group: string | null
}

function buildEntries(classes: ClassStats[]): TierEntry[] {
  const entries: TierEntry[] = []
  for (const cls of classes) {
    for (const spec of ['awakening', 'succession', 'ascension'] as SpecName[]) {
      const stats = cls[spec]
      if (stats.skillCount > 0) {
        entries.push({
          classId: cls.classId,
          className: cls.className,
          slug: cls.slug,
          spec,
          stats,
          saDr: getSpecSaDr(cls, spec),
          combatType: cls.combatType,
          group: getSpecGroup(cls, spec),
        })
      }
    }
  }
  return entries
}

function getParamValue(entry: TierEntry, key: ParamKey): number {
  if (key === 'saDr') return entry.saDr
  return entry.stats[key] as number
}

function formatParamValue(key: ParamKey, value: number): string {
  if (value === 0) return '0'
  switch (key) {
    case 'avgPvpDamage':
    case 'medianPvpDamage':
    case 'dpsEstimate':
      return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value)
    case 'protectedCoverage':
    case 'saDr':
      return `${value}%`
    default:
      return String(value)
  }
}

// ─── localStorage persistence ───────────────────────────────────────

const WEIGHTS_STORAGE_KEY = 'bdo-meta-tier-weights-v1'

function loadWeights(): Weights {
  if (typeof window === 'undefined') return { ...PRESETS.balanced.weights }
  try {
    const raw = localStorage.getItem(WEIGHTS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...ZERO_WEIGHTS, ...parsed }
    }
  } catch {}
  return { ...PRESETS.balanced.weights }
}

function saveWeights(w: Weights) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(WEIGHTS_STORAGE_KEY, JSON.stringify(w))
  } catch {}
}

// ─── Data fetch ─────────────────────────────────────────────────────

async function fetchMeta(): Promise<{ classes: ClassStats[] }> {
  const res = await fetch('/api/meta', { cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed: ${res.status}`)
  return res.json()
}

// ═════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════

export function TierListPage() {
  const metaQuery = useQuery({ queryKey: ['meta'], queryFn: fetchMeta, staleTime: 60_000 })
  const [weights, setWeights] = React.useState<Weights>(loadWeights)
  const [viewMode, setViewMode] = React.useState<'ranked' | 'table' | 'portraits' | 'tiers'>('ranked')
  const [sortBy, setSortBy] = React.useState<ParamKey | 'score'>('score')
  const [sortDir, setSortDir] = React.useState<'desc' | 'asc'>('desc')
  const [mobileWeightsOpen, setMobileWeightsOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [activePreset, setActivePreset] = React.useState<string | null>(null)

  const classes = metaQuery.data?.classes ?? []
  const entries = React.useMemo(() => buildEntries(classes), [classes])

  // Normalize each parameter across all entries → 0..1
  const normalized = React.useMemo(() => {
    const ranges: Record<ParamKey, { min: number; max: number }> = {} as any
    for (const p of SCORE_PARAMS) {
      let min = Infinity, max = -Infinity
      for (const e of entries) {
        const v = getParamValue(e, p.key)
        if (v < min) min = v
        if (v > max) max = v
      }
      ranges[p.key] = { min, max: max === min ? min + 1 : max }
    }
    return { ranges }
  }, [entries])

  // Compute score for each entry
  const scored = React.useMemo(() => {
    const totalWeight = SCORE_PARAMS.reduce((sum, p) => sum + (weights[p.key] || 0), 0)
    if (totalWeight === 0) {
      return entries.map(e => ({ entry: e, score: 0, contributions: {} as Record<ParamKey, number> }))
    }
    return entries.map(e => {
      let score = 0
      const contributions: Record<ParamKey, number> = {} as any
      for (const p of SCORE_PARAMS) {
        const w = weights[p.key] || 0
        if (w === 0) { contributions[p.key] = 0; continue }
        const { min, max } = normalized.ranges[p.key]
        const raw = getParamValue(e, p.key)
        const norm = max > min ? (raw - min) / (max - min) : 0
        const contribution = (norm * w) / totalWeight
        score += contribution
        contributions[p.key] = contribution
      }
      return { entry: e, score: Math.round(score * 1000) / 10, contributions }
    })
  }, [entries, weights, normalized])

  // Sort
  const sorted = React.useMemo(() => {
    const filtered = search.trim()
      ? scored.filter(s =>
          s.entry.className.toLowerCase().includes(search.toLowerCase()) ||
          s.entry.spec.toLowerCase().includes(search.toLowerCase()))
      : scored

    const getVal = (s: typeof scored[0]): number => {
      if (sortBy === 'score') return s.score
      return getParamValue(s.entry, sortBy)
    }

    return [...filtered].sort((a, b) => {
      const diff = getVal(a) - getVal(b)
      return sortDir === 'desc' ? -diff : diff
    })
  }, [scored, sortBy, sortDir, search])

  // Max score for bar scaling
  const maxScore = React.useMemo(() => {
    if (sorted.length === 0) return 1
    return Math.max(...sorted.map(s => s.score), 1)
  }, [sorted])

  const totalWeight = SCORE_PARAMS.reduce((sum, p) => sum + (weights[p.key] || 0), 0)

  const updateWeight = React.useCallback((key: ParamKey, value: number) => {
    setWeights(prev => {
      const next = { ...prev, [key]: value }
      saveWeights(next)
      return next
    })
    setActivePreset(null)
  }, [])

  const applyPreset = React.useCallback((presetKey: string) => {
    const preset = PRESETS[presetKey]
    if (!preset) return
    setWeights({ ...preset.weights })
    saveWeights({ ...preset.weights })
    setActivePreset(presetKey)
  }, [])

  const resetWeights = React.useCallback(() => {
    setWeights({ ...ZERO_WEIGHTS })
    saveWeights({ ...ZERO_WEIGHTS })
    setActivePreset(null)
  }, [])

  const toggleSort = React.useCallback((key: ParamKey | 'score') => {
    if (sortBy === key) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortBy(key)
      setSortDir('desc')
    }
  }, [sortBy])

  return (
    <div className="flex min-h-screen flex-col bg-bdo-ink text-zinc-100">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-amber-900/50 bg-bdo-ink/95 px-4 py-3 backdrop-blur lg:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Crown className="size-5 text-amber-400" />
            <h1 className="bdo-title text-xl font-bold text-amber-400 sm:text-2xl">Tier Builder</h1>
          </div>
          <span className="hidden text-xs text-amber-200/50 md:inline">
            All specs in one list · You set the weights · Score updates live
          </span>

          <div className="ml-auto flex items-center gap-2">
            <div className="flex rounded-sm border border-amber-800/50 overflow-hidden">
              <button
                onClick={() => setViewMode('ranked')}
                className={cn('flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold transition-all',
                  viewMode === 'ranked' ? 'bg-amber-500/20 text-amber-200' : 'bg-bdo-leather-dark text-amber-300/50 hover:text-amber-200')}
              >
                <LayoutList className="size-3.5" /> Ranked
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={cn('flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold transition-all',
                  viewMode === 'table' ? 'bg-amber-500/20 text-amber-200' : 'bg-bdo-leather-dark text-amber-300/50 hover:text-amber-200')}
              >
                <Table2 className="size-3.5" /> Table
              </button>
              <button
                onClick={() => setViewMode('portraits')}
                className={cn('flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold transition-all',
                  viewMode === 'portraits' ? 'bg-amber-500/20 text-amber-200' : 'bg-bdo-leather-dark text-amber-300/50 hover:text-amber-200')}
              >
                <Crown className="size-3.5" /> Portraits
              </button>
              <button
                onClick={() => setViewMode('tiers')}
                className={cn('flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold transition-all',
                  viewMode === 'tiers' ? 'bg-amber-500/20 text-amber-200' : 'bg-bdo-leather-dark text-amber-300/50 hover:text-amber-200')}
              >
                <Crown className="size-3.5" /> Tiers
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="bdo-btn lg:hidden"
              onClick={() => setMobileWeightsOpen(true)}
            >
              <SlidersHorizontal className="size-4" /> Weights
            </Button>
          </div>
        </div>
      </div>

      {/* Body: sidebar + main */}
      <div className="flex flex-1">
        {/* Desktop weight sidebar */}
        <aside className="sticky top-[60px] hidden h-[calc(100vh-60px)] w-[320px] shrink-0 overflow-y-auto border-r border-amber-900/40 bg-bdo-ink lg:block">
          <WeightPanel
            weights={weights}
            updateWeight={updateWeight}
            applyPreset={applyPreset}
            resetWeights={resetWeights}
            activePreset={activePreset}
            totalWeight={totalWeight}
            entriesCount={entries.length}
          />
        </aside>

        {/* Mobile weight sheet */}
        <Sheet open={mobileWeightsOpen} onOpenChange={setMobileWeightsOpen}>
          <SheetContent
            side="left"
            className="w-[88%] gap-0 border-r-2 border-amber-800/60 bg-bdo-ink p-0 sm:max-w-[360px]"
            aria-describedby={undefined}
          >
            <SheetTitle className="sr-only">Scoring Weights</SheetTitle>
            <div className="h-full overflow-y-auto">
              <WeightPanel
                weights={weights}
                updateWeight={updateWeight}
                applyPreset={applyPreset}
                resetWeights={resetWeights}
                activePreset={activePreset}
                totalWeight={totalWeight}
                entriesCount={entries.length}
              />
            </div>
          </SheetContent>
        </Sheet>

        {/* Main content */}
        <main className="flex min-w-0 flex-1 flex-col">
          {/* Search bar */}
          <div className="flex items-center gap-2 border-b border-amber-900/30 px-4 py-2 lg:px-6">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-amber-300/40" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Filter by class or spec..."
                className="w-full rounded-sm border border-amber-800/40 bg-bdo-leather-dark/50 py-1.5 pl-7 pr-3 text-xs text-amber-100 placeholder:text-amber-300/30 focus:border-amber-500/50 focus:outline-none"
              />
            </div>
            <span className="ml-auto text-[10px] text-amber-300/40">
              {sorted.length} of {entries.length} spec entries
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 px-4 py-4 lg:px-6">
            {metaQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-sm border border-amber-900/30 bg-bdo-leather-dark/50" />
                ))}
              </div>
            ) : totalWeight === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <SlidersHorizontal className="mb-4 size-12 text-amber-400/30" />
                <p className="text-sm font-semibold text-amber-200">All weights are zero</p>
                <p className="mt-1 max-w-sm text-xs text-amber-300/40">
                  Move the sliders in the weight panel to start scoring.
                  Every parameter is normalized across all {entries.length} spec entries,
                  so even a weight of 1 makes a difference.
                </p>
                <Button className="bdo-btn mt-4" onClick={() => applyPreset('balanced')}>
                  Apply Balanced Preset
                </Button>
              </div>
            ) : viewMode === 'ranked' ? (
              <RankedView
                sorted={sorted}
                weights={weights}
                maxScore={maxScore}
                sortBy={sortBy}
                toggleSort={toggleSort}
              />
            ) : viewMode === 'portraits' ? (
              <PortraitsView
                sorted={sorted}
                weights={weights}
                maxScore={maxScore}
              />
            ) : viewMode === 'tiers' ? (
              <AutoTierView sorted={sorted} weights={weights} maxScore={maxScore} />
            ) : (
              <TableView
                sorted={sorted}
                weights={weights}
                sortBy={sortBy}
                sortDir={sortDir}
                toggleSort={toggleSort}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════
// WEIGHT PANEL
// ═════════════════════════════════════════════════════════════════════

function WeightPanel({
  weights, updateWeight, applyPreset, resetWeights, activePreset, totalWeight, entriesCount,
}: {
  weights: Weights
  updateWeight: (key: ParamKey, value: number) => void
  applyPreset: (key: string) => void
  resetWeights: () => void
  activePreset: string | null
  totalWeight: number
  entriesCount: number
}) {
  const categories = ['damage', 'cc', 'protection', 'defense'] as const

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-amber-400" />
          <h2 className="bdo-title text-sm font-bold uppercase tracking-wider text-amber-300">Scoring Weights</h2>
        </div>
        <p className="mt-1 text-[10px] leading-relaxed text-amber-300/40">
          Set how much each parameter matters to you. Scores are computed live and normalized across all {entriesCount} spec entries.
          No tiers are assumed — you infer the rankings from the data.
        </p>
      </div>

      <div>
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300/50">Presets</div>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              title={preset.description}
              className={cn(
                'rounded-sm border px-2 py-1 text-[10px] font-semibold transition-all',
                activePreset === key
                  ? 'border-amber-400/60 bg-amber-500/20 text-amber-200'
                  : 'border-amber-800/40 bg-bdo-leather-dark/50 text-amber-300/50 hover:border-amber-500/40 hover:text-amber-200',
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-sm border border-amber-800/30 bg-bdo-leather-dark/30 p-2.5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-amber-300/50">Total Weight</span>
          <span className={cn('font-mono font-bold', totalWeight > 0 ? 'text-amber-300' : 'text-red-400/60')}>
            {totalWeight}
          </span>
        </div>
        {totalWeight === 0 && (
          <p className="mt-1 text-[9px] text-red-400/50">Set at least one weight to start scoring.</p>
        )}
      </div>

      {categories.map(cat => {
        const catParams = SCORE_PARAMS.filter(p => p.category === cat)
        if (catParams.length === 0) return null
        const meta = CATEGORY_META[cat]
        return (
          <div key={cat}>
            <div className="mb-2 flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: meta.color }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: meta.color }}>
                {meta.label}
              </span>
            </div>
            <div className="space-y-2.5">
              {catParams.map(param => (
                <WeightSlider
                  key={param.key}
                  param={param}
                  value={weights[param.key] || 0}
                  onChange={v => updateWeight(param.key, v)}
                />
              ))}
            </div>
          </div>
        )
      })}

      <button
        onClick={resetWeights}
        className="flex items-center justify-center gap-1.5 rounded-sm border border-red-800/40 bg-red-900/10 py-1.5 text-[10px] font-semibold text-red-300/60 transition-all hover:border-red-500/50 hover:text-red-300"
      >
        <RotateCcw className="size-3" /> Reset All Weights
      </button>

      <div className="rounded-sm border border-amber-800/20 bg-bdo-ink/50 p-2.5">
        <div className="flex gap-1.5">
          <Info className="mt-0.5 size-3 shrink-0 text-amber-400/50" />
          <p className="text-[9px] leading-relaxed text-amber-300/40">
            Each parameter is normalized 0→1 across all entries before applying your weight.
            The composite score = Σ(normalized × weight) ÷ Σ(weights).
            Higher weight = more influence. Weight 0 = parameter ignored.
          </p>
        </div>
      </div>
    </div>
  )
}

function WeightSlider({
  param, value, onChange,
}: {
  param: ScoreParam
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="rounded-sm border border-amber-800/20 bg-bdo-leather-dark/20 p-2">
      <div className="mb-1 flex items-center gap-1.5">
        <span className="text-amber-400/60">{param.icon}</span>
        <span className="text-[11px] font-semibold text-amber-100/80" title={param.description}>
          {param.label}
        </span>
        <input
          type="number"
          min={0}
          max={100}
          value={value}
          onChange={e => onChange(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
          className="ml-auto w-10 rounded-sm border border-amber-800/30 bg-bdo-ink/60 py-0.5 text-right text-[10px] font-mono text-amber-300 focus:border-amber-500/50 focus:outline-none"
        />
      </div>
      <Slider
        value={[value]}
        min={0}
        max={100}
        step={1}
        onValueChange={v => onChange(v[0])}
        className="py-0.5"
      />
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════
// RANKED VIEW
// ═════════════════════════════════════════════════════════════════════

function RankedView({
  sorted, weights, maxScore, sortBy, toggleSort,
}: {
  sorted: { entry: TierEntry; score: number; contributions: Record<ParamKey, number> }[]
  weights: Weights
  maxScore: number
  sortBy: ParamKey | 'score'
  toggleSort: (key: ParamKey | 'score') => void
}) {
  const [expanded, setExpanded] = React.useState<number | null>(null)

  return (
    <div className="space-y-1.5">
      <div className="mb-2 flex items-center gap-2 text-[10px] text-amber-300/40">
        <TrendingUp className="size-3" />
        <span>Sorted by {sortBy === 'score' ? 'composite score' : SCORE_PARAMS.find(p => p.key === sortBy)?.label}. Click a row to see parameter breakdown.</span>
      </div>

      {sorted.map((item, idx) => {
        const { entry, score, contributions } = item
        const color = classColor(entry.className)
        const iconUrl = classIconUrl(entry.slug)
        const specColor = SPEC_COLORS[entry.spec]
        const scorePct = maxScore > 0 ? (score / maxScore) * 100 : 0
        const isExpanded = expanded === idx

        return (
          <motion.div
            key={`${entry.classId}-${entry.spec}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(idx * 0.015, 0.3) }}
            className="overflow-hidden rounded-sm border border-amber-800/30 bg-bdo-leather-dark/20"
          >
            <button
              onClick={() => setExpanded(isExpanded ? null : idx)}
              className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-amber-500/5"
            >
              <span className="w-7 shrink-0 text-center font-mono text-sm font-bold text-amber-300/60">
                {idx + 1}
              </span>

              {iconUrl && (
                <div className="size-8 shrink-0 overflow-hidden rounded-sm border" style={{ borderColor: `${color}55` }}>
                  <img src={iconUrl} alt={entry.className} className="h-full w-full object-cover" loading="lazy" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-bold" style={{ color }}>{entry.className}</span>
                  <span
                    className="rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase"
                    style={{ color: specColor, backgroundColor: `${specColor}15`, border: `1px solid ${specColor}44` }}
                  >
                    {entry.spec.slice(0, 4)}
                  </span>
                </div>
                <div className="text-[9px] text-amber-300/30">
                  {entry.combatType || '—'}{entry.group ? ` · ${entry.group}` : ''}
                </div>
              </div>

              {/* Mini param bars (top weighted) */}
              <div className="hidden items-center gap-1 md:flex">
                {SCORE_PARAMS
                  .filter(p => weights[p.key] > 0)
                  .sort((a, b) => weights[b.key] - weights[a.key])
                  .slice(0, 4)
                  .map(p => {
                    const raw = getParamValue(entry, p.key)
                    const { min, max } = getRanges(p.key, sorted)
                    const norm = max > min ? (raw - min) / (max - min) : 0
                    return (
                      <div key={p.key} className="flex flex-col items-center gap-0.5" title={`${p.label}: ${formatParamValue(p.key, raw)}`}>
                        <div className="h-8 w-1.5 rounded-full bg-amber-900/30">
                          <div
                            className="rounded-full transition-all"
                            style={{ height: `${norm * 100}%`, marginTop: `${(1 - norm) * 100}%`, backgroundColor: CATEGORY_META[p.category].color }}
                          />
                        </div>
                      </div>
                    )
                  })}
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="font-mono text-sm font-bold tabular-nums text-amber-300">
                  {score.toFixed(1)}
                </span>
                <div className="h-1 w-16 overflow-hidden rounded-full bg-amber-900/30">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${scorePct}%`, backgroundColor: scoreColor(scorePct) }}
                  />
                </div>
              </div>

              <ChevronDown className={cn('size-4 shrink-0 text-amber-300/40 transition-transform', isExpanded && 'rotate-180')} />
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-amber-900/20"
                >
                  <div className="grid grid-cols-2 gap-1.5 p-3 sm:grid-cols-3 lg:grid-cols-4">
                    {SCORE_PARAMS.map(p => {
                      const raw = getParamValue(entry, p.key)
                      const { min, max } = getRanges(p.key, sorted)
                      const norm = max > min ? (raw - min) / (max - min) : 0
                      const w = weights[p.key] || 0
                      const catMeta = CATEGORY_META[p.category]
                      return (
                        <div key={p.key} className="rounded-sm border border-amber-800/20 bg-bdo-ink/40 p-2">
                          <div className="flex items-center gap-1 text-[9px] text-amber-300/40">
                            <span style={{ color: catMeta.color }}>{p.icon}</span>
                            <span className="truncate">{p.short}</span>
                            {w > 0 && <span className="ml-auto font-mono text-amber-400/40">×{w}</span>}
                          </div>
                          <div className="mt-0.5 flex items-baseline gap-1">
                            <span className="font-mono text-sm font-bold text-amber-200">{formatParamValue(p.key, raw)}</span>
                          </div>
                          <div className="mt-1 h-1 overflow-hidden rounded-full bg-amber-900/20">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${norm * 100}%`, backgroundColor: catMeta.color }}
                            />
                          </div>
                          {w > 0 && (
                            <div className="mt-0.5 text-[8px] text-amber-300/30">
                              contributes {((contributions[p.key] / Math.max(score, 0.001)) * 100).toFixed(0)}%
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )
      })}
    </div>
  )
}

// Compute min/max for a param from the sorted list
function getRanges(key: ParamKey, sorted: { entry: TierEntry }[]): { min: number; max: number } {
  let min = Infinity, max = -Infinity
  for (const s of sorted) {
    const v = getParamValue(s.entry, key)
    if (v < min) min = v
    if (v > max) max = v
  }
  return { min, max: max === min ? min + 1 : max }
}

function scoreColor(pct: number): string {
  if (pct >= 80) return '#fbbf24'
  if (pct >= 60) return '#34d399'
  if (pct >= 40) return '#60a5fa'
  if (pct >= 20) return '#a78bfa'
  return '#f87171'
}

// ═════════════════════════════════════════════════════════════════════
// TABLE VIEW
// ═════════════════════════════════════════════════════════════════════

function TableView({
  sorted, weights, sortBy, sortDir, toggleSort,
}: {
  sorted: { entry: TierEntry; score: number; contributions: Record<ParamKey, number> }[]
  weights: Weights
  sortBy: ParamKey | 'score'
  sortDir: 'desc' | 'asc'
  toggleSort: (key: ParamKey | 'score') => void
}) {
  const activeParams = SCORE_PARAMS.filter(p => weights[p.key] > 0)
  const displayParams = activeParams.length > 0 ? activeParams : SCORE_PARAMS

  return (
    <div className="overflow-x-auto rounded-sm border border-amber-800/30">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-amber-800/40 bg-bdo-leather-dark/50">
            <th className="sticky left-0 z-10 bg-bdo-leather-dark/50 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-amber-300/50">
              #
            </th>
            <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-amber-300/50">
              Class
            </th>
            <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-amber-300/50">
              Spec
            </th>
            <th
              className={cn('cursor-pointer px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wider hover:text-amber-200', sortBy === 'score' ? 'text-amber-300' : 'text-amber-300/50')}
              onClick={() => toggleSort('score')}
            >
              Score {sortBy === 'score' && (sortDir === 'desc' ? '↓' : '↑')}
            </th>
            {displayParams.map(p => (
              <th
                key={p.key}
                className={cn('cursor-pointer px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wider hover:text-amber-200', sortBy === p.key ? 'text-amber-300' : 'text-amber-300/50')}
                onClick={() => toggleSort(p.key)}
                title={p.description}
              >
                {p.short} {sortBy === p.key && (sortDir === 'desc' ? '↓' : '↑')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((item, idx) => {
            const { entry, score } = item
            const color = classColor(entry.className)
            const specColor = SPEC_COLORS[entry.spec]
            return (
              <tr key={`${entry.classId}-${entry.spec}`} className="border-b border-amber-900/15 hover:bg-amber-500/5">
                <td className="sticky left-0 z-10 bg-bdo-ink/80 px-2 py-1.5 text-center font-mono text-amber-300/40">
                  {idx + 1}
                </td>
                <td className="px-2 py-1.5">
                  <span className="font-semibold" style={{ color }}>{entry.className}</span>
                </td>
                <td className="px-2 py-1.5">
                  <span
                    className="rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase"
                    style={{ color: specColor, backgroundColor: `${specColor}15` }}
                  >
                    {entry.spec.slice(0, 4)}
                  </span>
                </td>
                <td className="px-2 py-1.5 text-right font-mono font-bold text-amber-300">
                  {score.toFixed(1)}
                </td>
                {displayParams.map(p => {
                  const raw = getParamValue(entry, p.key)
                  const { min, max } = getRanges(p.key, sorted)
                  const norm = max > min ? (raw - min) / (max - min) : 0
                  return (
                    <td key={p.key} className="px-2 py-1.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="font-mono text-amber-100/70">{formatParamValue(p.key, raw)}</span>
                        <div className="h-3 w-8 shrink-0 overflow-hidden rounded-full bg-amber-900/20">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${norm * 100}%`, backgroundColor: CATEGORY_META[p.category].color }}
                          />
                        </div>
                      </div>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════
// PORTRAITS VIEW — fun visual ranking with character portraits
// ═════════════════════════════════════════════════════════════════════

function PortraitsView({
  sorted, weights, maxScore,
}: {
  sorted: { entry: TierEntry; score: number; contributions: Record<ParamKey, number> }[]
  weights: Weights
  maxScore: number
}) {
  const [hovered, setHovered] = React.useState<number | null>(null)

  // Precompute ranges for all params (for mini bars)
  const ranges = React.useMemo(() => {
    const r: Record<ParamKey, { min: number; max: number }> = {} as any
    for (const p of SCORE_PARAMS) {
      let min = Infinity, max = -Infinity
      for (const s of sorted) {
        const v = getParamValue(s.entry, p.key)
        if (v < min) min = v
        if (v > max) max = v
      }
      r[p.key] = { min, max: max === min ? min + 1 : max }
    }
    return r
  }, [sorted])

  // Group into medal tiers for a podium-like feel
  const top3 = sorted.slice(0, 3)
  const rest = sorted.slice(3)

  return (
    <div className="space-y-6">
      {/* Podium — top 3 */}
      {top3.length >= 3 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {/* 2nd place */}
          <PortraitCard item={top3[1]} rank={2} weights={weights} maxScore={maxScore} onHover={setHovered} isHovered={hovered === 1} ranges={ranges} />
          {/* 1st place — taller */}
          <PortraitCard item={top3[0]} rank={1} weights={weights} maxScore={maxScore} onHover={setHovered} isHovered={hovered === 0} isFirst ranges={ranges} />
          {/* 3rd place */}
          <PortraitCard item={top3[2]} rank={3} weights={weights} maxScore={maxScore} onHover={setHovered} isHovered={hovered === 2} ranges={ranges} />
        </div>
      )}

      {/* Rest — grid */}
      {rest.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {rest.map((item, idx) => (
            <PortraitCard
              key={`${item.entry.classId}-${item.entry.spec}`}
              item={item}
              rank={idx + 4}
              weights={weights}
              maxScore={maxScore}
              onHover={setHovered}
              isHovered={hovered === idx + 3}
              compact
              ranges={ranges}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PortraitCard({
  item, rank, weights, maxScore, onHover, isHovered, isFirst, compact, ranges,
}: {
  item: { entry: TierEntry; score: number; contributions: Record<ParamKey, number> }
  rank: number
  weights: Weights
  maxScore: number
  onHover: (idx: number | null) => void
  isHovered: boolean
  isFirst?: boolean
  compact?: boolean
  ranges: Record<ParamKey, { min: number; max: number }>
}) {
  const { entry, score } = item
  const color = classColor(entry.className)
  const specColor = SPEC_COLORS[entry.spec]
  const scorePct = maxScore > 0 ? (score / maxScore) * 100 : 0

  // Portrait URLs
  const specPortraitUrl = `/icons/portraits/specs/${entry.slug}-${entry.spec}.jpg`
  const mainPortraitUrl = `/icons/portraits/${entry.slug}.jpg`

  // Medal colors
  const medalColors: Record<number, string> = {
    1: '#fbbf24', // gold
    2: '#cbd5e1', // silver
    3: '#d97706', // bronze
  }
  const medalColor = medalColors[rank] || specColor

  // Top weighted params for mini bars
  const topParams = SCORE_PARAMS
    .filter(p => weights[p.key] > 0)
    .sort((a, b) => weights[b.key] - weights[a.key])
    .slice(0, compact ? 3 : 5)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: Math.min(rank * 0.03, 0.5) }}
      onMouseEnter={() => onHover(rank - 1)}
      onMouseLeave={() => onHover(null)}
      whileHover={{ scale: 1.04, y: -4, zIndex: 10 }}
      className={cn(
        'group relative overflow-hidden rounded-sm border-2 transition-all',
        isFirst && 'sm:-mt-6',
        isHovered && 'shadow-2xl',
      )}
      style={{
        borderColor: medalColor,
        boxShadow: `0 4px 16px rgba(0,0,0,0.7), inset 0 0 0 1px ${medalColor}33`,
      }}
    >
      {/* Rank medal badge */}
      <div
        className="absolute left-1.5 top-1.5 z-20 flex size-7 items-center justify-center rounded-full border-2 font-mono text-xs font-black"
        style={{ borderColor: medalColor, backgroundColor: 'rgba(10,9,8,0.9)', color: medalColor }}
      >
        {rank}
      </div>

      {/* Score badge */}
      <div
        className="absolute right-1.5 top-1.5 z-20 rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-bold backdrop-blur-sm"
        style={{ borderColor: `${medalColor}66`, backgroundColor: 'rgba(10,9,8,0.8)', color: medalColor }}
      >
        {score.toFixed(1)}
      </div>

      {/* Portrait */}
      <div className={cn('relative overflow-hidden', compact ? 'aspect-[3/4]' : isFirst ? 'aspect-[3/4.5]' : 'aspect-[3/4.2]')}>
        <img
          src={specPortraitUrl}
          alt={`${entry.className} ${entry.spec}`}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            const img = e.target as HTMLImageElement
            if (img.src !== mainPortraitUrl) img.src = mainPortraitUrl
          }}
        />
        {/* Gradient overlay for text readability */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom,
              rgba(10,9,8,0.3) 0%,
              transparent 30%,
              rgba(10,9,8,0.85) 75%,
              rgba(10,9,8,0.97) 100%)`,
          }}
        />
        {/* Spec color tint at top */}
        <div
          className="absolute inset-x-0 top-0 h-1"
          style={{ background: `linear-gradient(to bottom, ${specColor}aa, transparent)` }}
        />
        {/* Hover glow */}
        {isHovered && (
          <div
            className="absolute inset-0"
            style={{ background: `radial-gradient(circle at 50% 30%, ${medalColor}22, transparent 60%)` }}
          />
        )}
      </div>

      {/* Info overlay at bottom */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-2">
        <div className="flex items-center gap-1">
          <span className="truncate text-sm font-black drop-shadow-lg" style={{ color }}>
            {entry.className}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className="rounded-sm px-1 py-0.5 text-[7px] font-bold uppercase leading-none"
            style={{ color: specColor, backgroundColor: `${specColor}22`, border: `1px solid ${specColor}66` }}
          >
            {entry.spec.slice(0, 4)}
          </span>
          {!compact && entry.combatType && (
            <span className="truncate text-[8px] text-amber-300/40">{entry.combatType}</span>
          )}
        </div>

        {/* Score bar */}
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-amber-900/40">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${scorePct}%` }}
            transition={{ duration: 0.5, delay: rank * 0.03 }}
            className="h-full rounded-full"
            style={{ backgroundColor: medalColor }}
          />
        </div>

        {/* Mini param bars (only on non-compact or hover) */}
        {topParams.length > 0 && (!compact || isHovered) && (
          <div className="mt-1.5 flex items-end gap-0.5" style={{ height: compact ? 16 : 24 }}>
            {topParams.map(p => {
              const raw = getParamValue(entry, p.key)
              const { min, max } = ranges[p.key]
              const norm = max > min ? (raw - min) / (max - min) : 0
              return (
                <div
                  key={p.key}
                  className="flex-1 rounded-t-sm"
                  title={`${p.label}: ${formatParamValue(p.key, raw)}`}
                  style={{
                    height: `${Math.max(norm * 100, 4)}%`,
                    backgroundColor: CATEGORY_META[p.category].color,
                    opacity: 0.6 + norm * 0.4,
                    minHeight: 2,
                  }}
                />
              )
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ═════════════════════════════════════════════════════════════════════
// AUTO TIER VIEW — percentile-based S/A/B/C/D tiers
// ═════════════════════════════════════════════════════════════════════

const TIER_META: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  S: { color: '#fbbf24', label: 'Top',    icon: <Crown className="size-4" /> },
  A: { color: '#34d399', label: 'Strong', icon: <Medal className="size-4" /> },
  B: { color: '#60a5fa', label: 'Viable', icon: <Award className="size-4" /> },
  C: { color: '#a78bfa', label: 'Niche',  icon: <Shield className="size-4" /> },
  D: { color: '#f87171', label: 'Weak',   icon: <Skull className="size-4" /> },
}

function AutoTierView({
  sorted, weights,
}: {
  sorted: { entry: TierEntry; score: number; contributions: Record<ParamKey, number> }[]
  weights: Weights
  maxScore: number
}) {
  const total = sorted.length
  const tiered = React.useMemo(() => {
    const result: Record<string, typeof sorted> = { S: [], A: [], B: [], C: [], D: [] }
    sorted.forEach((item, idx) => {
      const pct = (idx / total) * 100
      if (pct < 10) result.S.push(item)
      else if (pct < 30) result.A.push(item)
      else if (pct < 60) result.B.push(item)
      else if (pct < 85) result.C.push(item)
      else result.D.push(item)
    })
    return result
  }, [sorted, total])

  const topParams = SCORE_PARAMS.filter(p => weights[p.key] > 0).sort((a, b) => weights[b.key] - weights[a.key]).slice(0, 4)

  return (
    <div className="space-y-4">
      <div className="rounded-sm border border-amber-800/30 bg-bdo-leather-dark/20 p-3">
        <p className="text-[10px] leading-relaxed text-amber-300/50">
          Auto-generated S/A/B/C/D tiers based on your current weights.
          Tiers are percentile-based: <span className="text-amber-300">S (top 10%)</span>,
          <span className="text-emerald-300"> A (top 30%)</span>,
          <span className="text-blue-300"> B (top 60%)</span>,
          <span className="text-purple-300"> C (top 85%)</span>,
          <span className="text-red-300"> D (bottom 15%)</span>.
          Change your weights in the sidebar to see tiers shift.
        </p>
      </div>

      <div className="space-y-3">
        {['S', 'A', 'B', 'C', 'D'].map(tier => {
          const meta = TIER_META[tier]
          const items = tiered[tier]
          if (items.length === 0) return null
          return (
            <motion.div
              key={tier}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div
                className="flex w-20 shrink-0 flex-col items-center justify-center rounded-sm border-2"
                style={{ borderColor: meta.color, backgroundColor: `${meta.color}11` }}
              >
                <div className="text-3xl font-black" style={{ color: meta.color }}>{tier}</div>
                <div className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: `${meta.color}99` }}>{meta.label}</div>
                <div className="mt-0.5 text-[9px] text-amber-300/30">{items.length} specs</div>
              </div>

              <div className="flex flex-1 flex-wrap items-center gap-2 rounded-sm border border-amber-900/20 bg-bdo-leather-dark/10 p-2">
                {items.map(({ entry, score }) => {
                  const color = classColor(entry.className)
                  const iconUrl = classIconUrl(entry.slug)
                  const specColor = SPEC_COLORS[entry.spec]
                  return (
                    <motion.div
                      key={`${entry.classId}-${entry.spec}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="group relative flex items-center gap-2 rounded-sm border px-3 py-2 transition-all hover:scale-105"
                      style={{ borderColor: `${meta.color}44`, backgroundColor: `${meta.color}08` }}
                      title={`${entry.className} ${entry.spec} — Score: ${score}`}
                    >
                      {iconUrl && (
                        <div className="size-7 shrink-0 overflow-hidden rounded-sm border" style={{ borderColor: `${color}55` }}>
                          <img src={iconUrl} alt={entry.className} className="h-full w-full object-cover" loading="lazy" />
                        </div>
                      )}
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-bold" style={{ color }}>{entry.className}</span>
                          <span
                            className="rounded-sm px-1 py-0.5 text-[8px] font-bold uppercase"
                            style={{ color: specColor, backgroundColor: `${specColor}15` }}
                          >
                            {entry.spec.slice(0, 4)}
                          </span>
                        </div>
                        {topParams.length > 0 && (
                          <div className="mt-0.5 flex items-end gap-0.5" style={{ height: 12 }}>
                            {topParams.map(p => {
                              const raw = getParamValue(entry, p.key)
                              const { min, max } = getRanges(p.key, sorted)
                              const norm = max > min ? (raw - min) / (max - min) : 0
                              return (
                                <div
                                  key={p.key}
                                  className="w-1 rounded-t-sm"
                                  title={`${p.label}: ${formatParamValue(p.key, raw)}`}
                                  style={{ height: `${Math.max(norm * 100, 10)}%`, backgroundColor: CATEGORY_META[p.category].color, opacity: 0.5 + norm * 0.5 }}
                                />
                              )
                            })}
                          </div>
                        )}
                      </div>
                      <span className="ml-1 font-mono text-[10px] font-bold tabular-nums" style={{ color: meta.color }}>{score.toFixed(1)}</span>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 border-t border-amber-900/30 pt-3">
        {Object.entries(TIER_META).map(([tier, meta]) => (
          <div key={tier} className="flex items-center gap-1.5 text-[10px]">
            <span className="flex size-6 items-center justify-center rounded-sm border font-black" style={{ borderColor: meta.color, color: meta.color }}>
              {tier}
            </span>
            <span className="text-amber-300/50">{meta.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
