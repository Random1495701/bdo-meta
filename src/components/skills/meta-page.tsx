'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Zap, ArrowUpDown, Table2, LayoutGrid } from 'lucide-react'

import { classColor, classIconUrl, formatDamage } from '@/lib/skills'
import { formatDamage as fmtDmg } from '@/lib/damage'
import { cn } from '@/lib/utils'

interface SpecStats {
  skillCount: number
  avgPvpDamage: number
  medianPvpDamage: number
  pvpCcSkillCount: number
  superArmorCount: number
  forwardGuardCount: number
  iFrameCount: number
}

interface ClassStats {
  classId: number
  className: string
  slug: string
  awakening: SpecStats
  succession: SpecStats
  ascension: SpecStats
}

type SortKey = 'className' | 'avgPvpDamage' | 'medianPvpDamage' | 'pvpCcSkillCount' | 'superArmorCount' | 'forwardGuardCount' | 'iFrameCount'

// Spec display metadata
const SPEC_META: Record<string, { label: string; color: string; shortLabel: string }> = {
  awakening: { label: 'Awakening', color: '#fbbf24', shortLabel: 'AWK' },
  succession: { label: 'Succession', color: '#34d399', shortLabel: 'SUCC' },
  ascension: { label: 'Ascension', color: '#a78bfa', shortLabel: 'ASC' },
}

async function fetchMeta(): Promise<{ classes: ClassStats[] }> {
  const res = await fetch('/api/meta', { cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed to fetch meta: ${res.status}`)
  return res.json()
}

// A single spec card — one per class×spec combination
function SpecCard({ cls, specName, stats, sortKey }: {
  cls: ClassStats
  specName: 'awakening' | 'succession' | 'ascension'
  stats: SpecStats
  sortKey: SortKey
}) {
  const color = classColor(cls.className)
  const iconUrl = classIconUrl(cls.slug)
  // Use spec-specific portrait if available, fall back to main portrait, then class icon
  const specPortraitUrl = `/icons/portraits/specs/${cls.slug}-${specName}.jpg`
  const mainPortraitUrl = `/icons/portraits/${cls.slug}.jpg`
  const portraitUrl = specName === 'awakening' || specName === 'succession'
    ? specPortraitUrl
    : mainPortraitUrl
  const specMeta = SPEC_META[specName]

  // Skip empty specs (0 skills = not available for this class)
  if (stats.skillCount === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bdo-frame group relative flex flex-col gap-3 rounded-sm border-2 p-4"
      style={{
        borderColor: `${specMeta.color}44`,
        background: 'linear-gradient(135deg, #1a1612 0%, #0a0908 100%)',
        boxShadow: `inset 0 0 0 1px ${specMeta.color}15, 0 2px 8px rgba(0,0,0,0.5)`,
      }}
    >
      {/* Header: portrait + class icon + name + spec badge */}
      <div className="flex items-center gap-3">
        {/* Spec-specific portrait */}
        <div
          className="relative shrink-0 overflow-hidden rounded-sm border-2"
          style={{
            width: 64,
            height: 64,
            borderColor: `${color}88`,
            boxShadow: `inset 0 0 0 1px ${color}33`,
          }}
        >
          <img
            src={portraitUrl}
            alt={`${cls.className} ${specMeta.label}`}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={(e) => {
              const img = e.target as HTMLImageElement
              // Try main portrait first, then class icon
              if (img.src !== mainPortraitUrl) {
                img.src = mainPortraitUrl
              } else if (iconUrl) {
                img.src = iconUrl
              }
            }}
          />
          {/* Spec color overlay */}
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(to top, ${specMeta.color}40 0%, transparent 50%)` }}
          />
        </div>

        <div className="flex flex-col gap-0.5">
          <h3 className="bdo-title text-base font-bold leading-tight" style={{ color }}>
            {cls.className}
          </h3>
          <span
            className="rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
            style={{
              color: specMeta.color,
              backgroundColor: `${specMeta.color}1a`,
              border: `1px solid ${specMeta.color}44`,
            }}
          >
            {specMeta.label}
          </span>
          <span className="text-[10px] text-amber-200/40">{stats.skillCount} skills</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-1.5">
        <StatBox label="Avg PvP" value={stats.avgPvpDamage > 0 ? fmtDmg(stats.avgPvpDamage) : '—'} color="#f472b6" highlighted={sortKey === 'avgPvpDamage'} />
        <StatBox label="Med PvP" value={stats.medianPvpDamage > 0 ? fmtDmg(stats.medianPvpDamage) : '—'} color="#f472b6" highlighted={sortKey === 'medianPvpDamage'} />
        <StatBox label="CC" value={String(stats.pvpCcSkillCount)} color="#f87171" highlighted={sortKey === 'pvpCcSkillCount'} />
        <StatBox label="💪 SA" value={String(stats.superArmorCount)} color="#fbbf24" highlighted={sortKey === 'superArmorCount'} />
        <StatBox label="🛡 FG" value={String(stats.forwardGuardCount)} color="#60a5fa" highlighted={sortKey === 'forwardGuardCount'} />
        <StatBox label="✦ IF" value={String(stats.iFrameCount)} color="#a78bfa" highlighted={sortKey === 'iFrameCount'} />
      </div>
    </motion.div>
  )
}

function StatBox({ label, value, color, highlighted }: { label: string; value: string; color: string; highlighted?: boolean }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-0.5 rounded-sm border px-2 py-1',
        highlighted && 'ring-1 ring-amber-400/60',
      )}
      style={{ borderColor: `${color}44`, backgroundColor: `${color}0a` }}
      title={label}
    >
      <span className="text-[8px] font-semibold uppercase tracking-wider" style={{ color: `${color}99` }}>{label}</span>
      <span className="font-mono text-xs font-bold tabular-nums" style={{ color }}>{value}</span>
    </div>
  )
}

function MetaTable({ classes, sortKey, sortDir, onSort }: {
  classes: ClassStats[]
  sortKey: SortKey
  sortDir: 'asc' | 'desc'
  onSort: (key: SortKey) => void
}) {
  // Flatten into spec rows
  const rows: { cls: ClassStats; spec: 'awakening' | 'succession' | 'ascension'; stats: SpecStats }[] = []
  for (const cls of classes) {
    if (cls.awakening.skillCount > 0) rows.push({ cls, spec: 'awakening', stats: cls.awakening })
    if (cls.succession.skillCount > 0) rows.push({ cls, spec: 'succession', stats: cls.succession })
    if (cls.ascension.skillCount > 0) rows.push({ cls, spec: 'ascension', stats: cls.ascension })
  }

  // Sort rows
  rows.sort((a, b) => {
    if (sortKey === 'className') {
      const dir = sortDir === 'asc' ? 1 : -1
      const cmp = a.cls.className.localeCompare(b.cls.className)
      if (cmp !== 0) return cmp * dir
      return a.spec.localeCompare(b.spec) * dir
    }
    const dir = sortDir === 'asc' ? 1 : -1
    return ((a.stats[sortKey] as number) - (b.stats[sortKey] as number)) * dir
  })

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'className', label: 'Class' },
    { key: 'avgPvpDamage', label: 'Avg PvP' },
    { key: 'medianPvpDamage', label: 'Med PvP' },
    { key: 'pvpCcSkillCount', label: 'CC' },
    { key: 'superArmorCount', label: '💪 SA' },
    { key: 'forwardGuardCount', label: '🛡 FG' },
    { key: 'iFrameCount', label: '✦ IF' },
  ]

  const renderSortHeader = (key: SortKey, label: string) => (
    <th
      key={key}
      onClick={() => onSort(key)}
      className={cn(
        'cursor-pointer px-2 py-1.5 text-right font-semibold transition-colors hover:bg-amber-500/10',
        sortKey === key && 'bg-amber-500/15 text-amber-200',
      )}
    >
      <span className="flex items-center justify-end gap-1">
        {label}
        {sortKey === key && <ArrowUpDown className="size-2.5" style={{ transform: sortDir === 'asc' ? 'rotate(180deg)' : 'none' }} />}
      </span>
    </th>
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b-2 border-amber-800/50 bg-bdo-leather-dark">
            <th onClick={() => onSort('className')} className={cn('cursor-pointer px-2 py-1.5 text-left font-semibold hover:bg-amber-500/10', sortKey === 'className' && 'bg-amber-500/15 text-amber-200')}>
              <span className="flex items-center gap-1">Class / Spec{sortKey === 'className' && <ArrowUpDown className="size-2.5" />}</span>
            </th>
            {sortOptions.slice(1).map((o) => renderSortHeader(o.key, o.label))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const color = classColor(row.cls.className)
            const specPortraitUrl = `/icons/portraits/specs/${row.cls.slug}-${row.spec}.jpg`
            const mainPortraitUrl = `/icons/portraits/${row.cls.slug}.jpg`
            const specMeta = SPEC_META[row.spec]
            return (
              <tr key={`${row.cls.classId}-${row.spec}`} className="border-b border-amber-900/20 hover:bg-amber-500/5">
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <div className="size-8 shrink-0 overflow-hidden rounded-sm border" style={{ borderColor: `${color}55` }}>
                      <img src={specPortraitUrl} alt="" className="h-full w-full object-cover" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).src = mainPortraitUrl }} />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold" style={{ color }}>{row.cls.className}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: specMeta.color }}>{specMeta.label}</span>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-1 text-right font-mono text-xs tabular-nums text-pink-300">{row.stats.avgPvpDamage > 0 ? fmtDmg(row.stats.avgPvpDamage) : '—'}</td>
                <td className="px-2 py-1 text-right font-mono text-xs tabular-nums text-pink-300">{row.stats.medianPvpDamage > 0 ? fmtDmg(row.stats.medianPvpDamage) : '—'}</td>
                <td className="px-2 py-1 text-right font-mono text-xs tabular-nums text-red-300">{row.stats.pvpCcSkillCount}</td>
                <td className="px-2 py-1 text-right font-mono text-xs tabular-nums text-amber-300">{row.stats.superArmorCount}</td>
                <td className="px-2 py-1 text-right font-mono text-xs tabular-nums text-blue-300">{row.stats.forwardGuardCount}</td>
                <td className="px-2 py-1 text-right font-mono text-xs tabular-nums text-purple-300">{row.stats.iFrameCount}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function MetaPage() {
  const [viewMode, setViewMode] = React.useState<'cards' | 'table'>('cards')
  const [sortKey, setSortKey] = React.useState<SortKey>('avgPvpDamage')
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc')

  const metaQuery = useQuery({
    queryKey: ['meta'],
    queryFn: fetchMeta,
    staleTime: 60_000,
  })

  const classes = metaQuery.data?.classes ?? []

  // Flatten into spec cards for sorting
  const specCards = React.useMemo(() => {
    const cards: { cls: ClassStats; spec: 'awakening' | 'succession' | 'ascension'; stats: SpecStats }[] = []
    for (const cls of classes) {
      if (cls.awakening.skillCount > 0) cards.push({ cls, spec: 'awakening', stats: cls.awakening })
      if (cls.succession.skillCount > 0) cards.push({ cls, spec: 'succession', stats: cls.succession })
      if (cls.ascension.skillCount > 0) cards.push({ cls, spec: 'ascension', stats: cls.ascension })
    }
    cards.sort((a, b) => {
      if (sortKey === 'className') {
        const dir = sortDir === 'asc' ? 1 : -1
        const cmp = a.cls.className.localeCompare(b.cls.className)
        if (cmp !== 0) return cmp * dir
        return a.spec.localeCompare(b.spec) * dir
      }
      const dir = sortDir === 'asc' ? 1 : -1
      return ((b.stats[sortKey] as number) - (a.stats[sortKey] as number)) * dir
    })
    return cards
  }, [classes, sortKey, sortDir])

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sortOptions: { key: SortKey; label: string; icon: React.ReactNode }[] = [
    { key: 'className', label: 'Class', icon: null },
    { key: 'avgPvpDamage', label: 'Avg PvP', icon: null },
    { key: 'medianPvpDamage', label: 'Med PvP', icon: null },
    { key: 'pvpCcSkillCount', label: 'CC Skills', icon: <Zap className="size-3" /> },
    { key: 'superArmorCount', label: 'SA', icon: <span>💪</span> },
    { key: 'forwardGuardCount', label: 'FG', icon: <span>🛡</span> },
    { key: 'iFrameCount', label: 'IF', icon: <span>✦</span> },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-bdo-ink text-zinc-100">
      {/* Meta header */}
      <div className="sticky top-0 z-30 border-b border-amber-900/50 bg-bdo-ink/95 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 lg:px-6">
          <h1 className="bdo-title text-2xl font-bold text-amber-400">BDO Meta</h1>
          <span className="hidden text-xs text-amber-200/50 sm:inline">
            {specCards.length} spec cards · {classes.length} classes
          </span>

          {/* View toggle */}
          <div className="ml-auto flex items-center gap-2">
            <div className="flex rounded-sm border border-amber-800/50 overflow-hidden">
              <button
                onClick={() => setViewMode('cards')}
                className={cn('flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold transition-all', viewMode === 'cards' ? 'bg-amber-500/20 text-amber-200' : 'bg-bdo-leather-dark text-amber-300/50 hover:text-amber-200')}
              >
                <LayoutGrid className="size-3.5" /> Cards
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={cn('flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold transition-all', viewMode === 'table' ? 'bg-amber-500/20 text-amber-200' : 'bg-bdo-leather-dark text-amber-300/50 hover:text-amber-200')}
              >
                <Table2 className="size-3.5" /> Table
              </button>
            </div>
          </div>

          {/* Sort buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-amber-300/40">Sort:</span>
            {sortOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => handleSort(opt.key)}
                className={cn(
                  'flex items-center gap-1 rounded-sm border px-2 py-1 text-[11px] font-semibold transition-all',
                  sortKey === opt.key
                    ? 'border-amber-400/60 bg-amber-500/15 text-amber-200'
                    : 'border-amber-900/40 bg-bdo-leather-dark text-amber-300/50 hover:border-amber-600/40 hover:text-amber-200',
                )}
              >
                {opt.icon}
                {opt.label}
                {sortKey === opt.key && <ArrowUpDown className="size-2.5 opacity-60" style={{ transform: sortDir === 'asc' ? 'rotate(180deg)' : 'none' }} />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6 lg:px-6">
        {metaQuery.isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-sm border-2 border-amber-900/30 bg-bdo-leather-dark" />
            ))}
          </div>
        ) : metaQuery.isError ? (
          <div className="flex items-center justify-center py-20 text-amber-300/60">
            Failed to load meta data. Make sure the database is restored.
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {specCards.map(({ cls, spec, stats }) => (
              <SpecCard key={`${cls.classId}-${spec}`} cls={cls} specName={spec} stats={stats} sortKey={sortKey} />
            ))}
          </div>
        ) : (
          <MetaTable classes={classes} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
        )}
      </div>

      {/* Disclaimer */}
      <div className="border-t border-amber-900/30 bg-bdo-ink px-4 py-2 text-center text-[10px] text-amber-300/30">
        {specCards.length} spec cards · Each class×spec = separate card · Black Spirit rage skills excluded · PvE-only CC/protection excluded · Max-rank skills only
      </div>
    </div>
  )
}
