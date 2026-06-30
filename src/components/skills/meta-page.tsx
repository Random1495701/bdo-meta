'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Zap, ArrowUpDown, Table2, LayoutGrid } from 'lucide-react'

import { classColor, classIconUrl, SPEC_COLORS } from '@/lib/skills'
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
  topPvpDamageSkill: { skillId: number; name: string; damage: number } | null
  dpsEstimate: number
  protectedCoverage: number
}

interface ClassStats {
  classId: number
  className: string
  slug: string
  awakening: SpecStats
  succession: SpecStats
  ascension: SpecStats
}

type SortKey = 'className' | 'avgPvpDamage' | 'medianPvpDamage' | 'pvpCcSkillCount' | 'superArmorCount' | 'forwardGuardCount' | 'iFrameCount' | 'dpsEstimate' | 'protectedCoverage'

// Spec display metadata — Red=Awakening, Blue=Succession, Yellow=Ascension
const SPEC_META: Record<string, { label: string; color: string; shortLabel: string }> = {
  awakening: { label: 'Awakening', color: SPEC_COLORS.awakening, shortLabel: 'AWK' },
  succession: { label: 'Succession', color: SPEC_COLORS.succession, shortLabel: 'SUCC' },
  ascension: { label: 'Ascension', color: SPEC_COLORS.ascension, shortLabel: 'ASC' },
}

async function fetchMeta(): Promise<{ classes: ClassStats[] }> {
  const res = await fetch('/api/meta', { cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed to fetch meta: ${res.status}`)
  return res.json()
}

// A single spec card — one per class×spec combination
// Portrait is the card background, with a dark gradient overlay for readability.
// Framed class icon in top-right corner with spec-colored border.
function SpecCard({ cls, specName, stats, sortKey, onClick }: {
  cls: ClassStats
  specName: 'awakening' | 'succession' | 'ascension'
  stats: SpecStats
  sortKey: SortKey
  onClick: () => void
}) {
  const iconUrl = classIconUrl(cls.slug)
  // Use spec-specific portrait as background
  const specPortraitUrl = `/icons/portraits/specs/${cls.slug}-${specName}.jpg`
  const mainPortraitUrl = `/icons/portraits/${cls.slug}.jpg`
  const bgPortraitUrl = specName === 'awakening' || specName === 'succession'
    ? specPortraitUrl
    : mainPortraitUrl
  const specMeta = SPEC_META[specName]
  const specColor = specMeta.color

  // Skip empty specs (0 skills = not available for this class)
  if (stats.skillCount === 0) return null

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="group relative flex cursor-pointer flex-col gap-2 overflow-hidden rounded-sm border-2 text-left transition-shadow hover:shadow-lg"
      style={{
        borderColor: `${specColor}88`,
        boxShadow: `0 4px 12px rgba(0,0,0,0.6), inset 0 0 0 1px ${specColor}33`,
        minHeight: 200,
      }}
      title={`${cls.className} ${specMeta.label} — click to view skills in Data tab`}
    >
      {/* Background portrait */}
      <div className="absolute inset-0 z-0">
        <img
          src={bgPortraitUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          onError={(e) => {
            const img = e.target as HTMLImageElement
            if (img.src !== mainPortraitUrl) img.src = mainPortraitUrl
            else img.style.display = 'none'
          }}
        />
        {/* Dark gradient overlay for readability — stronger at bottom */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom,
              rgba(10,9,8,0.85) 0%,
              rgba(10,9,8,0.6) 30%,
              rgba(10,9,8,0.85) 70%,
              rgba(10,9,8,0.95) 100%)`,
          }}
        />
        {/* Spec color tint at top */}
        <div
          className="absolute inset-x-0 top-0 h-1"
          style={{ background: `linear-gradient(to bottom, ${specColor}66, transparent)` }}
        />
      </div>

      {/* Content layer */}
      <div className="relative z-10 flex flex-col gap-2 p-3">
        {/* Header: class name + spec badge + framed icon */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <h3 className="bdo-title text-base font-bold leading-tight text-amber-50 drop-shadow-lg">
              {cls.className}
            </h3>
            <span
              className="w-fit rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider backdrop-blur-sm"
              style={{
                color: specColor,
                backgroundColor: `${specColor}22`,
                border: `1px solid ${specColor}66`,
              }}
            >
              {specMeta.label}
            </span>
          </div>

          {/* Framed class icon — spec-colored border */}
          {iconUrl && (
            <div
              className="shrink-0 overflow-hidden rounded-sm border-2"
              style={{
                width: 36,
                height: 36,
                borderColor: specColor,
                boxShadow: `0 0 8px ${specColor}44, inset 0 0 0 1px ${specColor}33`,
                background: 'rgba(10,9,8,0.8)',
              }}
            >
              <img src={iconUrl} alt={cls.className} className="h-full w-full object-cover" loading="lazy" />
            </div>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-1">
          <StatBox label="Avg PvP" value={stats.avgPvpDamage > 0 ? fmtDmg(stats.avgPvpDamage) : '—'} color="#f472b6" highlighted={sortKey === 'avgPvpDamage'} />
          <StatBox label="Med PvP" value={stats.medianPvpDamage > 0 ? fmtDmg(stats.medianPvpDamage) : '—'} color="#f472b6" highlighted={sortKey === 'medianPvpDamage'} />
          <StatBox label="CC" value={String(stats.pvpCcSkillCount)} color="#f87171" highlighted={sortKey === 'pvpCcSkillCount'} />
          <StatBox label="💪 SA" value={String(stats.superArmorCount)} color="#fbbf24" highlighted={sortKey === 'superArmorCount'} />
          <StatBox label="🛡 FG" value={String(stats.forwardGuardCount)} color="#60a5fa" highlighted={sortKey === 'forwardGuardCount'} />
          <StatBox label="✦ IF" value={String(stats.iFrameCount)} color="#a78bfa" highlighted={sortKey === 'iFrameCount'} />
        </div>

        {/* New metrics: DPS estimate + Protected coverage */}
        <div className="grid grid-cols-2 gap-1">
          <StatBox label="DPS Est." value={stats.dpsEstimate > 0 ? fmtDmg(stats.dpsEstimate) : '—'} color="#34d399" />
          <StatBox label="Prot %" value={`${stats.protectedCoverage}%`} color="#60a5fa" />
        </div>

        {/* Top PvP damage skill */}
        {stats.topPvpDamageSkill && (
          <div
            className="flex items-center gap-1.5 rounded-sm border px-2 py-1"
            style={{ borderColor: '#f472b644', backgroundColor: '#f472b60a' }}
            title={`Top PvP damage skill: ${stats.topPvpDamageSkill.name} (${fmtDmg(stats.topPvpDamageSkill.damage)} PvP damage)`}
          >
            <span className="text-[8px] font-semibold uppercase tracking-wider text-pink-300/60">Top Skill</span>
            <span className="truncate text-[10px] font-medium text-pink-200">
              {stats.topPvpDamageSkill.name}
            </span>
            <span className="ml-auto shrink-0 font-mono text-[10px] font-bold tabular-nums text-pink-300">
              {fmtDmg(stats.topPvpDamageSkill.damage)}
            </span>
          </div>
        )}

        {/* Skill count footer */}
        <div className="text-[10px] text-amber-200/40">{stats.skillCount} skills</div>
      </div>
    </motion.button>
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

function MetaTable({ classes, sortKey, sortDir, onSort, onRowClick }: {
  classes: ClassStats[]
  sortKey: SortKey
  sortDir: 'asc' | 'desc'
  onSort: (key: SortKey) => void
  onRowClick?: (classId: number, spec: 'awakening' | 'succession' | 'ascension') => void
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
    { key: 'dpsEstimate', label: 'DPS' },
    { key: 'pvpCcSkillCount', label: 'CC' },
    { key: 'superArmorCount', label: '💪 SA' },
    { key: 'forwardGuardCount', label: '🛡 FG' },
    { key: 'iFrameCount', label: '✦ IF' },
    { key: 'protectedCoverage', label: 'Prot %' },
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
              <tr
                key={`${row.cls.classId}-${row.spec}`}
                onClick={() => onRowClick?.(row.cls.classId, row.spec)}
                className={cn('border-b border-amber-900/20 hover:bg-amber-500/5', onRowClick && 'cursor-pointer')}
              >
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
                <td className="px-2 py-1 text-right font-mono text-xs tabular-nums text-emerald-300">{row.stats.dpsEstimate > 0 ? fmtDmg(row.stats.dpsEstimate) : '—'}</td>
                <td className="px-2 py-1 text-right font-mono text-xs tabular-nums text-red-300">{row.stats.pvpCcSkillCount}</td>
                <td className="px-2 py-1 text-right font-mono text-xs tabular-nums text-amber-300">{row.stats.superArmorCount}</td>
                <td className="px-2 py-1 text-right font-mono text-xs tabular-nums text-blue-300">{row.stats.forwardGuardCount}</td>
                <td className="px-2 py-1 text-right font-mono text-xs tabular-nums text-purple-300">{row.stats.iFrameCount}</td>
                <td className="px-2 py-1 text-right font-mono text-xs tabular-nums text-blue-300">{row.stats.protectedCoverage}%</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function MetaPage({ onCardClick }: { onCardClick?: (classId: number, spec: 'awakening' | 'succession' | 'ascension') => void }) {
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
    { key: 'dpsEstimate', label: 'DPS', icon: null },
    { key: 'pvpCcSkillCount', label: 'CC Skills', icon: <Zap className="size-3" /> },
    { key: 'superArmorCount', label: 'SA', icon: <span>💪</span> },
    { key: 'forwardGuardCount', label: 'FG', icon: <span>🛡</span> },
    { key: 'iFrameCount', label: 'IF', icon: <span>✦</span> },
    { key: 'protectedCoverage', label: 'Prot %', icon: null },
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
              <SpecCard
                key={`${cls.classId}-${spec}`}
                cls={cls}
                specName={spec}
                stats={stats}
                sortKey={sortKey}
                onClick={() => onCardClick?.(cls.classId, spec)}
              />
            ))}
          </div>
        ) : (
          <MetaTable classes={classes} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} onRowClick={onCardClick} />
        )}
      </div>

      {/* Disclaimer */}
      <div className="border-t border-amber-900/30 bg-bdo-ink px-4 py-2 text-center text-[10px] text-amber-300/30">
        {specCards.length} spec cards · Each class×spec = separate card · Black Spirit rage skills excluded · PvE-only CC/protection excluded · Max-rank skills only
      </div>
    </div>
  )
}
