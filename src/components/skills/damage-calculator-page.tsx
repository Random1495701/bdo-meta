'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calculator,
  Search,
  Plus,
  X,
  Info,
  Swords,
  Zap,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

import { classColor } from '@/lib/skills'
import { formatDamage } from '@/lib/damage'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────

interface ScalarConfig {
  key: 'crit' | 'down' | 'air' | 'back' | 'speed' | 'counter'
  label: string
  multiplier: number
  color: string
  description: string
}

const SCALAR_CONFIGS: ScalarConfig[] = [
  { key: 'crit',   label: 'Critical', multiplier: 1.5, color: '#fbbf24', description: 'Critical Hit: +50% damage' },
  { key: 'down',   label: 'Down',     multiplier: 1.5, color: '#ef4444', description: 'Down Attack: +50% damage (target is knocked down)' },
  { key: 'air',    label: 'Air',      multiplier: 1.3, color: '#38bdf8', description: 'Air Attack: +30% damage (target is airborne)' },
  { key: 'back',   label: 'Back',     multiplier: 1.5, color: '#a78bfa', description: 'Back Attack: +50% damage (hitting from behind)' },
  { key: 'speed',  label: 'Speed',    multiplier: 1.2, color: '#34d399', description: 'Speed Attack: +20% damage (target moving)' },
  { key: 'counter', label: 'Counter', multiplier: 1.5, color: '#f472b6', description: 'Counter: +50% damage (target in mid-action)' },
]

interface Scalars {
  crit: boolean
  down: boolean
  air: boolean
  back: boolean
  speed: boolean
  counter: boolean
}

interface CalcResult {
  base: number
  withScalars: number
  perScalar: Record<ScalarConfig['key'], number>
  breakdown: string
  scalarMult: number
}

// ─── Calculation ─────────────────────────────────────────────────────

function calculatePvpDamage(
  ap: number,
  speciesAp: number,
  skillDamagePercent: number, // e.g., 1207 for 1207%
  pvpDamagePercent: number,   // e.g., 32 for 32%
  dr: number,
  drCoefficient: number,
  scalars: Scalars,
): CalcResult {
  const totalAp = ap + speciesAp
  const skillMultiplier = skillDamagePercent / 100 // 1207% = 12.07
  const pvpMod = pvpDamagePercent / 100 // 32% = 0.32

  const rawDamage = (totalAp * skillMultiplier * pvpMod) - (dr * drCoefficient)
  const base = Math.max(1, Math.round(rawDamage))

  const perScalar = {} as Record<ScalarConfig['key'], number>
  for (const cfg of SCALAR_CONFIGS) {
    perScalar[cfg.key] = Math.max(1, Math.round(rawDamage * cfg.multiplier))
  }

  let scalarMult = 1
  if (scalars.crit) scalarMult *= 1.5
  if (scalars.down) scalarMult *= 1.5
  if (scalars.air) scalarMult *= 1.3
  if (scalars.back) scalarMult *= 1.5
  if (scalars.speed) scalarMult *= 1.2
  if (scalars.counter) scalarMult *= 1.5

  const withScalars = Math.max(1, Math.round(rawDamage * scalarMult))

  const breakdown = `[(${totalAp} × ${skillMultiplier.toFixed(2)} × ${pvpMod.toFixed(2)}) - (${dr} × ${drCoefficient})] × ${scalarMult.toFixed(2)}`

  return { base, withScalars, perScalar, breakdown, scalarMult }
}

// ─── Skill search response (subset of fields we use) ─────────────────

interface SkillSearchItem {
  skillId: number
  name: string
  className: string | null
  classId: number | null
  iconUrl: string | null
  damage?: {
    totalPvE: number
    totalPvP: number | null
    hasSpecialMode: boolean
  }
  pvpDamagePercent: number | null
}

interface SkillSearchResponse {
  items: SkillSearchItem[]
  total: number
}

// ─── Skill icon (with fallback) ──────────────────────────────────────

function SkillIcon({ skill, size = 32 }: { skill: { iconUrl: string | null; name: string; className: string | null }; size?: number }) {
  const [errored, setErrored] = React.useState(false)
  const [loaded, setLoaded] = React.useState(false)
  const firstLetter = skill.name?.[0] ?? '?'
  const fallbackColor = classColor(skill.className)

  if (!skill.iconUrl || errored) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-sm border-2 font-bold"
        style={{
          width: size,
          height: size,
          borderColor: `${fallbackColor}aa`,
          backgroundColor: `${fallbackColor}1a`,
          color: fallbackColor,
          fontSize: size * 0.4,
        }}
      >
        {firstLetter}
      </div>
    )
  }

  return (
    <div
      className="bdo-icon-frame relative shrink-0 overflow-hidden"
      style={{ width: size, height: size }}
    >
      {!loaded && <div className="absolute inset-0 animate-pulse bg-bdo-leather" />}
      <img
        src={skill.iconUrl}
        alt={skill.name}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        className={cn('h-full w-full object-cover transition-opacity', loaded ? 'opacity-100' : 'opacity-0')}
      />
    </div>
  )
}

// ─── Number input with label ─────────────────────────────────────────

function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 100000,
  step = 1,
  hint,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  hint?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-amber-300/70">
        {label}
        {hint}
      </label>
      <input
        type="number"
        value={Number.isFinite(value) ? value : ''}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const v = parseFloat(e.target.value)
          onChange(Number.isFinite(v) ? v : 0)
        }}
        className="bdo-input h-9 w-full px-3 text-sm font-mono font-semibold text-amber-100 outline-none focus:border-amber-400/70"
      />
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────

export function DamageCalculatorPage() {
  // Input state
  const [ap, setAp] = React.useState(300)
  const [dr, setDr] = React.useState(350)
  const [drCoef, setDrCoef] = React.useState(5)
  const [speciesAp, setSpeciesAp] = React.useState(0)

  const [scalars, setScalars] = React.useState<Scalars>({
    crit: false,
    down: false,
    air: false,
    back: false,
    speed: false,
    counter: false,
  })

  // Search state
  const [searchQuery, setSearchQuery] = React.useState('')
  const [debouncedQuery, setDebouncedQuery] = React.useState('')

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  // Selected skills list
  const [selected, setSelected] = React.useState<SkillSearchItem[]>([])
  const [sortKey, setSortKey] = React.useState<'damage' | 'name' | 'pvpDmg'>('damage')
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc')
  const [expandedId, setExpandedId] = React.useState<number | null>(null)

  // Search query
  const { data: searchData, isLoading: searchLoading } = useQuery<SkillSearchResponse>({
    queryKey: ['dmgcalc-skill-search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return { items: [], total: 0 }
      const sp = new URLSearchParams({
        q: debouncedQuery,
        maxRank: 'true',
        filterEvasion: 'true',
        pageSize: '10',
      })
      const res = await fetch(`/api/skills?${sp.toString()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Search failed: ${res.status}`)
      return res.json()
    },
    enabled: debouncedQuery.length > 0,
    placeholderData: (prev) => prev,
  })

  const toggleScalar = (key: keyof Scalars) =>
    setScalars((s) => ({ ...s, [key]: !s[key] }))

  // Clamp DR Coefficient input to >= 0
  const setDRCoefWithClamp = React.useCallback((v: number) => {
    setDrCoef(Math.max(0, v))
  }, [])

  const addSkill = (skill: SkillSearchItem) => {
    setSelected((prev) => {
      if (prev.some((s) => s.skillId === skill.skillId)) return prev
      return [...prev, skill]
    })
    setSearchQuery('')
  }

  const removeSkill = (skillId: number) => {
    setSelected((prev) => prev.filter((s) => s.skillId !== skillId))
  }

  const toggleSort = (key: 'damage' | 'name' | 'pvpDmg') => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'name' ? 'asc' : 'desc')
    }
  }

  // Compute results for all selected skills
  const results = React.useMemo(() => {
    return selected
      .map((skill) => {
        const totalPvE = skill.damage?.totalPvE ?? 0
        const pvpPct = skill.pvpDamagePercent ?? 0
        const calc = calculatePvpDamage(ap, speciesAp, totalPvE, pvpPct, dr, drCoef, scalars)
        return { skill, calc }
      })
      .sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1
        if (sortKey === 'name') return dir * a.skill.name.localeCompare(b.skill.name)
        if (sortKey === 'pvpDmg') {
          const av = a.skill.pvpDamagePercent ?? 0
          const bv = b.skill.pvpDamagePercent ?? 0
          return dir * (av - bv)
        }
        return dir * (a.calc.withScalars - b.calc.withScalars)
      })
  }, [selected, ap, speciesAp, dr, drCoef, scalars, sortKey, sortDir])

  const activeScalarCount = Object.values(scalars).filter(Boolean).length

  return (
    <div className="flex min-h-screen flex-col bg-bdo-ink text-amber-50">
      {/* Page header */}
      <header className="border-b border-amber-900/40 bg-bdo-leather-dark/60 px-4 py-4 lg:px-8">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-sm border-2 border-amber-500/60 bg-amber-500/10 shadow-[0_0_12px_rgba(200,170,68,0.3)]">
            <Calculator className="size-5 text-amber-400" />
          </div>
          <div>
            <h1 className="bdo-title text-xl lg:text-2xl">PvP Damage Calculator</h1>
            <p className="text-[11px] uppercase tracking-widest text-amber-300/50">
              Estimate skill damage against an enemy with configurable stats
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 lg:px-8">
        {/* Validation banner */}
        <div className="mb-6 flex items-start gap-2.5 rounded-sm border border-amber-700/40 bg-amber-900/10 px-4 py-3">
          <Info className="mt-0.5 size-4 shrink-0 text-amber-400" />
          <p className="text-xs leading-relaxed text-amber-200/80">
            <span className="font-semibold text-amber-300">Formula is approximate and based on community research. Needs validation.</span>{' '}
            This calculator uses an estimated BDO PvP damage formula. The DR coefficient, AP-to-damage conversion, and scalar stacking rules should be verified against bigandshiny's documentation before relying on absolute numbers.
          </p>
        </div>

        {/* Input Panel */}
        <section className="mb-6 rounded-sm border border-amber-900/50 bg-bdo-leather-dark/40 p-4 lg:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Swords className="size-4 text-amber-400" />
            <h2 className="bdo-heading text-sm uppercase tracking-widest">Inputs</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <NumberField label="Total AP" value={ap} onChange={setAp} min={0} max={2000} step={1} />
            <NumberField label="Enemy DR" value={dr} onChange={setDr} min={0} max={2000} step={1} />
            <NumberField
              label="DR Coefficient"
              value={drCoef}
              onChange={setDRCoefWithClamp}
              min={0}
              max={20}
              step={0.5}
              hint={
                <span title="Multiplier applied to enemy DR before subtracting from raw damage. Default ~5 based on community research. Higher = DR matters more.">
                  <Info className="size-3 cursor-help text-amber-400/60" />
                </span>
              }
            />
            <NumberField label="Species AP" value={speciesAp} onChange={setSpeciesAp} min={0} max={200} step={1} />
          </div>

          {/* Scalar toggles */}
          <div className="mt-5">
            <div className="mb-2 flex items-center gap-2">
              <Zap className="size-3.5 text-amber-400" />
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-amber-300/70">
                Damage Scalars {activeScalarCount > 0 && (
                  <span className="ml-1 rounded-sm bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-200">
                    {activeScalarCount} active
                  </span>
                )}
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {SCALAR_CONFIGS.map((cfg) => {
                const on = scalars[cfg.key]
                return (
                  <button
                    key={cfg.key}
                    type="button"
                    onClick={() => toggleScalar(cfg.key)}
                    title={cfg.description}
                    className={cn(
                      'flex flex-col items-start gap-0.5 rounded-sm border px-3 py-2 text-left transition-all',
                      on
                        ? 'border-amber-400/70 bg-amber-500/15 shadow-[0_0_8px_rgba(200,170,68,0.2)]'
                        : 'border-amber-900/40 bg-bdo-ink hover:border-amber-700/60',
                    )}
                  >
                    <span
                      className="text-[11px] font-bold uppercase tracking-wider"
                      style={{ color: on ? cfg.color : '#9c8a5e' }}
                    >
                      {cfg.label}
                    </span>
                    <span className={cn('text-[10px] font-mono', on ? 'text-amber-200' : 'text-amber-400/40')}>
                      ×{cfg.multiplier.toFixed(1)}
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-[10px] text-amber-300/40">
              Scalars stack multiplicatively. Toggle any combination of combat modifiers.
            </p>
          </div>
        </section>

        {/* Skill Search */}
        <section className="mb-6 rounded-sm border border-amber-900/50 bg-bdo-leather-dark/40 p-4 lg:p-6">
          <div className="mb-3 flex items-center gap-2">
            <Search className="size-4 text-amber-400" />
            <h2 className="bdo-heading text-sm uppercase tracking-widest">Add Skills</h2>
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search skills by name (e.g., Blooming, Flow: Shadow..."
              className="bdo-input h-10 w-full px-4 pr-10 text-sm text-amber-100 placeholder:text-amber-300/30 outline-none focus:border-amber-400/70"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-amber-300/50 hover:bg-amber-500/10 hover:text-amber-200"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <AnimatePresence>
            {debouncedQuery && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="mt-3 overflow-hidden"
              >
                {searchLoading && (
                  <div className="rounded-sm border border-amber-900/40 bg-bdo-ink p-4 text-center text-xs text-amber-300/50">
                    Searching...
                  </div>
                )}
                {!searchLoading && searchData && searchData.items.length === 0 && (
                  <div className="rounded-sm border border-amber-900/40 bg-bdo-ink p-4 text-center text-xs text-amber-300/50">
                    No skills found for &ldquo;{debouncedQuery}&rdquo;
                  </div>
                )}
                {!searchLoading && searchData && searchData.items.length > 0 && (
                  <div className="max-h-96 overflow-y-auto rounded-sm border border-amber-900/40 bg-bdo-ink">
                    {searchData.items.map((skill) => {
                      const alreadyAdded = selected.some((s) => s.skillId === skill.skillId)
                      return (
                        <button
                          key={skill.skillId}
                          onClick={() => addSkill(skill)}
                          disabled={alreadyAdded}
                          className={cn(
                            'flex w-full items-center gap-3 border-b border-amber-900/20 px-3 py-2.5 text-left transition-colors last:border-b-0',
                            alreadyAdded
                              ? 'cursor-not-allowed opacity-40'
                              : 'hover:bg-amber-500/10',
                          )}
                        >
                          <SkillIcon skill={skill} size={36} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-semibold text-amber-100">
                                {skill.name}
                              </span>
                              {skill.damage?.hasSpecialMode && (
                                <span
                                  title="Has special mode (only first mode's damage used)"
                                  className="rounded-sm bg-purple-500/20 px-1 py-0.5 text-[9px] font-bold uppercase text-purple-300"
                                >
                                  SPM
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-amber-300/50">
                              <span
                                className="font-semibold"
                                style={{ color: classColor(skill.className) }}
                              >
                                {skill.className ?? '—'}
                              </span>
                              <span>·</span>
                              <span className="font-mono">PvE {formatDamage(skill.damage?.totalPvE ?? 0)}</span>
                              <span>·</span>
                              <span className="font-mono text-amber-400/60">PvP {skill.pvpDamagePercent ?? 0}%</span>
                            </div>
                          </div>
                          {alreadyAdded ? (
                            <span className="text-[10px] uppercase text-amber-300/40">Added</span>
                          ) : (
                            <Plus className="size-4 shrink-0 text-amber-400/70" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Results Table */}
        <section className="rounded-sm border border-amber-900/50 bg-bdo-leather-dark/40 p-4 lg:p-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calculator className="size-4 text-amber-400" />
              <h2 className="bdo-heading text-sm uppercase tracking-widest">Results</h2>
              {selected.length > 0 && (
                <span className="rounded-sm bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                  {selected.length} skill{selected.length === 1 ? '' : 's'}
                </span>
              )}
            </div>
            {selected.length > 0 && (
              <button
                onClick={() => setSelected([])}
                className="rounded-sm border border-amber-900/40 px-2 py-1 text-[10px] uppercase tracking-wider text-amber-300/50 transition-colors hover:border-red-700/50 hover:text-red-300"
              >
                Clear all
              </button>
            )}
          </div>

          {selected.length === 0 ? (
            <div className="rounded-sm border border-dashed border-amber-900/40 bg-bdo-ink/60 p-10 text-center">
              <Calculator className="mx-auto mb-3 size-8 text-amber-700/60" />
              <p className="text-sm text-amber-300/50">
                No skills added yet. Use the search above to add skills to the calculation.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-amber-900/50 text-[10px] uppercase tracking-wider text-amber-300/60">
                      <th className="px-2 py-2 text-left">
                        <SortButton label="Skill" active={sortKey === 'name'} dir={sortDir} onClick={() => toggleSort('name')} />
                      </th>
                      <th className="px-2 py-2 text-right">Skill Dmg %</th>
                      <th className="px-2 py-2 text-right">
                        <SortButton label="PvP %" active={sortKey === 'pvpDmg'} dir={sortDir} onClick={() => toggleSort('pvpDmg')} />
                      </th>
                      <th className="px-2 py-2 text-right">
                        <SortButton label="PvP Dmg" active={sortKey === 'damage'} dir={sortDir} onClick={() => toggleSort('damage')} />
                      </th>
                      {SCALAR_CONFIGS.map((cfg) => (
                        <th key={cfg.key} className="px-2 py-2 text-right" title={cfg.description}>
                          <span style={{ color: cfg.color }}>{cfg.label}</span>
                        </th>
                      ))}
                      <th className="px-2 py-2 text-center">·</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence initial={false}>
                      {results.map(({ skill, calc }) => {
                        const isExpanded = expandedId === skill.skillId
                        return (
                          <React.Fragment key={skill.skillId}>
                            <motion.tr
                              layout
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="border-b border-amber-900/20 transition-colors hover:bg-amber-500/5"
                            >
                              <td className="px-2 py-2">
                                <div className="flex items-center gap-2">
                                  <SkillIcon skill={skill} size={32} />
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-semibold text-amber-100">{skill.name}</div>
                                    <div
                                      className="text-[10px] font-semibold uppercase tracking-wider"
                                      style={{ color: classColor(skill.className) }}
                                    >
                                      {skill.className ?? '—'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 py-2 text-right font-mono text-xs text-amber-200/70">
                                {formatDamage(skill.damage?.totalPvE ?? 0)}
                              </td>
                              <td className="px-2 py-2 text-right font-mono text-xs text-amber-400/70">
                                {skill.pvpDamagePercent ?? 0}%
                              </td>
                              <td className="px-2 py-2 text-right">
                                <span className="font-mono text-sm font-bold text-amber-300">
                                  {calc.withScalars.toLocaleString()}
                                </span>
                              </td>
                              {SCALAR_CONFIGS.map((cfg) => (
                                <td
                                  key={cfg.key}
                                  className={cn(
                                    'px-2 py-2 text-right font-mono text-xs',
                                    scalars[cfg.key] ? 'font-bold' : 'opacity-50',
                                  )}
                                  style={{ color: scalars[cfg.key] ? cfg.color : undefined }}
                                >
                                  {calc.perScalar[cfg.key].toLocaleString()}
                                </td>
                              ))}
                              <td className="px-2 py-2">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => setExpandedId(isExpanded ? null : skill.skillId)}
                                    className="rounded-sm p-1 text-amber-300/50 hover:bg-amber-500/10 hover:text-amber-200"
                                    title={isExpanded ? 'Hide breakdown' : 'Show breakdown'}
                                    aria-label={isExpanded ? 'Hide breakdown' : 'Show breakdown'}
                                  >
                                    {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                                  </button>
                                  <button
                                    onClick={() => removeSkill(skill.skillId)}
                                    className="rounded-sm p-1 text-amber-300/50 hover:bg-red-500/15 hover:text-red-300"
                                    title="Remove skill"
                                    aria-label="Remove skill"
                                  >
                                    <X className="size-3.5" />
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                            <AnimatePresence initial={false}>
                              {isExpanded && (
                                <motion.tr
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="border-b border-amber-900/30 bg-bdo-ink/60"
                                >
                                  <td colSpan={4 + SCALAR_CONFIGS.length + 1} className="px-4 py-3">
                                    <div className="rounded-sm border border-amber-900/40 bg-bdo-ink p-3">
                                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-amber-300/60">
                                        Formula Breakdown
                                      </div>
                                      <code className="block text-xs font-mono leading-relaxed text-amber-200/90">
                                        {calc.breakdown} = <span className="font-bold text-amber-300">{calc.withScalars.toLocaleString()}</span>
                                      </code>
                                      <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-amber-300/50">
                                        <span>Total AP: <span className="font-mono text-amber-200">{ap + speciesAp}</span></span>
                                        <span>Skill Mult: <span className="font-mono text-amber-200">{((skill.damage?.totalPvE ?? 0) / 100).toFixed(2)}</span></span>
                                        <span>PvP Mod: <span className="font-mono text-amber-200">{((skill.pvpDamagePercent ?? 0) / 100).toFixed(2)}</span></span>
                                        <span>Base Dmg: <span className="font-mono text-amber-200">{calc.base.toLocaleString()}</span></span>
                                        <span>Scalar Mult: <span className="font-mono text-amber-200">×{calc.scalarMult.toFixed(2)}</span></span>
                                      </div>
                                    </div>
                                  </td>
                                </motion.tr>
                              )}
                            </AnimatePresence>
                          </React.Fragment>
                        )
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="space-y-3 lg:hidden">
                <AnimatePresence initial={false}>
                  {results.map(({ skill, calc }) => {
                    const isExpanded = expandedId === skill.skillId
                    return (
                      <motion.div
                        key={skill.skillId}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="rounded-sm border border-amber-900/40 bg-bdo-ink p-3"
                      >
                        <div className="flex items-start gap-3">
                          <SkillIcon skill={skill} size={40} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-amber-100">{skill.name}</div>
                            <div
                              className="text-[10px] font-semibold uppercase tracking-wider"
                              style={{ color: classColor(skill.className) }}
                            >
                              {skill.className ?? '—'}
                            </div>
                          </div>
                          <button
                            onClick={() => removeSkill(skill.skillId)}
                            className="rounded-sm p-1 text-amber-300/50 hover:bg-red-500/15 hover:text-red-300"
                            aria-label="Remove skill"
                          >
                            <X className="size-4" />
                          </button>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-sm bg-bdo-leather-dark/60 p-2">
                            <div className="text-[9px] uppercase tracking-wider text-amber-300/50">Skill Dmg</div>
                            <div className="font-mono text-amber-200">{formatDamage(skill.damage?.totalPvE ?? 0)}</div>
                          </div>
                          <div className="rounded-sm bg-bdo-leather-dark/60 p-2">
                            <div className="text-[9px] uppercase tracking-wider text-amber-300/50">PvP %</div>
                            <div className="font-mono text-amber-400">{skill.pvpDamagePercent ?? 0}%</div>
                          </div>
                        </div>

                        <div className="mt-2 rounded-sm border border-amber-700/40 bg-amber-500/5 p-2">
                          <div className="text-[9px] uppercase tracking-wider text-amber-300/60">PvP Damage</div>
                          <div className="font-mono text-lg font-bold text-amber-300">
                            {calc.withScalars.toLocaleString()}
                          </div>
                        </div>

                        <div className="mt-2 grid grid-cols-3 gap-1.5">
                          {SCALAR_CONFIGS.map((cfg) => (
                            <div
                              key={cfg.key}
                              className={cn(
                                'rounded-sm p-1.5 text-center transition-all',
                                scalars[cfg.key] ? 'bg-amber-500/10' : 'bg-bdo-leather-dark/40 opacity-50',
                              )}
                            >
                              <div className="text-[8px] uppercase tracking-wider" style={{ color: cfg.color }}>
                                {cfg.label}
                              </div>
                              <div className="font-mono text-[11px] text-amber-200">
                                {calc.perScalar[cfg.key].toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={() => setExpandedId(isExpanded ? null : skill.skillId)}
                          className="mt-2 flex w-full items-center justify-center gap-1 rounded-sm border border-amber-900/40 py-1.5 text-[10px] uppercase tracking-wider text-amber-300/60 hover:bg-amber-500/10"
                        >
                          {isExpanded ? 'Hide breakdown' : 'Show breakdown'}
                          {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                        </button>

                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <code className="mt-2 block rounded-sm border border-amber-900/40 bg-bdo-ink p-2 text-[10px] font-mono leading-relaxed text-amber-200/90">
                                {calc.breakdown} = <span className="font-bold text-amber-300">{calc.withScalars.toLocaleString()}</span>
                              </code>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </>
          )}
        </section>

        {/* Formula Display */}
        <section className="mt-6 rounded-sm border border-amber-900/50 bg-bdo-leather-dark/40 p-4 lg:p-6">
          <div className="mb-3 flex items-center gap-2">
            <Info className="size-4 text-amber-400" />
            <h2 className="bdo-heading text-sm uppercase tracking-widest">Formula</h2>
          </div>

          <div className="rounded-sm border border-amber-900/40 bg-bdo-ink p-4">
            <code className="block text-center font-mono text-sm text-amber-200 lg:text-base">
              <span className="text-amber-300">PvP Damage</span> ={' '}
              <span className="text-amber-100">[ (AP × Skill% × PvP%) - (DR × Coef) ]</span>{' '}
              <span className="text-amber-100">× Scalars</span>
            </code>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-amber-300/70 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-sm bg-bdo-ink/60 p-2">
              <span className="font-semibold text-amber-200">AP</span> = Total Attack Power + Species AP (user input)
            </div>
            <div className="rounded-sm bg-bdo-ink/60 p-2">
              <span className="font-semibold text-amber-200">Skill%</span> = skill.damage.totalPvE / 100 (e.g., 1207% = 12.07)
            </div>
            <div className="rounded-sm bg-bdo-ink/60 p-2">
              <span className="font-semibold text-amber-200">PvP%</span> = skill.pvpDamagePercent / 100 (e.g., 32% = 0.32)
            </div>
            <div className="rounded-sm bg-bdo-ink/60 p-2">
              <span className="font-semibold text-amber-200">DR</span> = Enemy Damage Reduction stat
            </div>
            <div className="rounded-sm bg-bdo-ink/60 p-2">
              <span className="font-semibold text-amber-200">Coef</span> = DR Coefficient (default 5, configurable)
            </div>
            <div className="rounded-sm bg-bdo-ink/60 p-2">
              <span className="font-semibold text-amber-200">Scalars</span> = Crit ×1.5, Down ×1.5, Air ×1.3, Back ×1.5, Speed ×1.2, Counter ×1.5
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-sm border border-amber-700/30 bg-amber-900/10 px-3 py-2">
            <Info className="mt-0.5 size-3.5 shrink-0 text-amber-400" />
            <p className="text-[11px] leading-relaxed text-amber-200/70">
              <span className="font-semibold text-amber-300">Validation needed.</span> This formula is approximate and based on community research. The DR coefficient (~5) and scalar stacking behavior should be verified against bigandshiny&apos;s BDO documentation. Real PvP damage may differ due to additional modifiers (additional damage, special attack, HP-based modifiers, species damage, etc.) not modeled here.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}

// ─── Sort button helper ──────────────────────────────────────────────

function SortButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string
  active: boolean
  dir: 'asc' | 'desc'
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 transition-colors hover:text-amber-200',
        active ? 'text-amber-300' : 'text-amber-300/60',
      )}
    >
      {label}
      {active ? (
        dir === 'asc' ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />
      ) : (
        <ArrowUpDown className="size-3 opacity-50" />
      )}
    </button>
  )
}


