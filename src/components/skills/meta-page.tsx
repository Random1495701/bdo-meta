'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Zap, ArrowUpDown, Table2, LayoutGrid } from 'lucide-react'

import { classColor, classIconUrl } from '@/lib/skills'
import { formatDamage } from '@/lib/damage'
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
type SpecView = 'awakening' | 'succession' | 'ascension'

async function fetchMeta(): Promise<{ classes: ClassStats[] }> {
  const res = await fetch('/api/meta', { cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed to fetch meta: ${res.status}`)
  return res.json()
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

function ClassCard({ cls, sortKey }: { cls: ClassStats; sortKey: SortKey }) {
  const color = classColor(cls.className)
  const iconUrl = classIconUrl(cls.slug)
  const hasAscension = cls.ascension.skillCount > 0

  const renderSpecStats = (stats: SpecStats, specName: string, specColor: string) => (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: specColor }}>{specName}</span>
        <span className="text-[8px] text-amber-200/30">{stats.skillCount} skills</span>
      </div>
      <div className="grid grid-cols-3 gap-1">
        <StatBox label="Avg PvP" value={stats.avgPvpDamage > 0 ? formatDamage(stats.avgPvpDamage) : '—'} color="#f472b6" highlighted={sortKey === 'avgPvpDamage'} />
        <StatBox label="Med PvP" value={stats.medianPvpDamage > 0 ? formatDamage(stats.medianPvpDamage) : '—'} color="#f472b6" highlighted={sortKey === 'medianPvpDamage'} />
        <StatBox label="CC" value={String(stats.pvpCcSkillCount)} color="#f87171" highlighted={sortKey === 'pvpCcSkillCount'} />
      </div>
      <div className="grid grid-cols-3 gap-1">
        <StatBox label="💪 SA" value={String(stats.superArmorCount)} color="#fbbf24" highlighted={sortKey === 'superArmorCount'} />
        <StatBox label="🛡 FG" value={String(stats.forwardGuardCount)} color="#60a5fa" highlighted={sortKey === 'forwardGuardCount'} />
        <StatBox label="✦ IF" value={String(stats.iFrameCount)} color="#a78bfa" highlighted={sortKey === 'iFrameCount'} />
      </div>
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bdo-frame group relative flex flex-col gap-3 rounded-sm border-2 p-4"
      style={{
        borderColor: `${color}55`,
        background: 'linear-gradient(135deg, #1a1612 0%, #0a0908 100%)',
        boxShadow: `inset 0 0 0 1px ${color}22, 0 2px 8px rgba(0,0,0,0.5)`,
      }}
    >
      {/* Header: portrait + icon + name */}
      <div className="flex items-center gap-3">
        {iconUrl && (
          <div
            className="shrink-0 overflow-hidden rounded-sm border-2"
            style={{
              width: 56,
              height: 56,
              borderColor: `${color}88`,
              background: 'linear-gradient(135deg, #1a1612 0%, #0a0908 100%)',
              boxShadow: `inset 0 0 0 1px ${color}33`,
            }}
          >
            <img src={iconUrl} alt={cls.className} className="h-full w-full object-cover" loading="lazy" />
          </div>
        )}
        <div>
          <h3 className="bdo-title text-lg font-bold" style={{ color }}>{cls.className}</h3>
          {hasAscension && (
            <span className="rounded-sm bg-violet-500/20 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-violet-300">
              Has Ascension
            </span>
          )}
        </div>
      </div>

      {/* All 3 specs side by side */}
      <div className="grid grid-cols-1 gap-3">
        {renderSpecStats(cls.awakening, 'Awakening', '#fbbf24')}
        {renderSpecStats(cls.succession, 'Succession', '#34d399')}
        {hasAscension && renderSpecStats(cls.ascension, 'Ascension', '#a78bfa')}
      </div>
    </motion.div>
  )
}

function MetaTable({ classes, sortKey, sortDir, onSort }: {
  classes: ClassStats[]
  sortKey: SortKey
  sortDir: 'asc' | 'desc'
  onSort: (key: SortKey) => void
}) {
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

  const renderSpecRow = (stats: SpecStats) => (
    <>
      <td className="px-2 py-1 text-right font-mono text-xs tabular-nums text-pink-300">{stats.avgPvpDamage > 0 ? formatDamage(stats.avgPvpDamage) : '—'}</td>
      <td className="px-2 py-1 text-right font-mono text-xs tabular-nums text-pink-300">{stats.medianPvpDamage > 0 ? formatDamage(stats.medianPvpDamage) : '—'}</td>
      <td className="px-2 py-1 text-right font-mono text-xs tabular-nums text-red-300">{stats.pvpCcSkillCount}</td>
      <td className="px-2 py-1 text-right font-mono text-xs tabular-nums text-amber-300">{stats.superArmorCount}</td>
      <td className="px-2 py-1 text-right font-mono text-xs tabular-nums text-blue-300">{stats.forwardGuardCount}</td>
      <td className="px-2 py-1 text-right font-mono text-xs tabular-nums text-purple-300">{stats.iFrameCount}</td>
    </>
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b-2 border-amber-800/50 bg-bdo-leather-dark">
            <th onClick={() => onSort('className')} className={cn('cursor-pointer px-2 py-1.5 text-left font-semibold hover:bg-amber-500/10', sortKey === 'className' && 'bg-amber-500/15 text-amber-200')}>
              <span className="flex items-center gap-1">Class{sortKey === 'className' && <ArrowUpDown className="size-2.5" />}</span>
            </th>
            <th className="px-2 py-1 text-center text-[9px] uppercase tracking-wider text-amber-300/50" colSpan={6}>Awakening</th>
            <th className="px-2 py-1 text-center text-[9px] uppercase tracking-wider text-emerald-300/50" colSpan={6}>Succession</th>
            <th className="px-2 py-1 text-center text-[9px] uppercase tracking-wider text-violet-300/50" colSpan={6}>Ascension</th>
          </tr>
          <tr className="border-b border-amber-800/30 bg-bdo-leather-dark/50">
            <th></th>
            {sortOptions.slice(1).map((o) => renderSortHeader(o.key, o.label))}
            {sortOptions.slice(1).map((o) => renderSortHeader(o.key, o.label))}
            {sortOptions.slice(1).map((o) => renderSortHeader(o.key, o.label))}
          </tr>
        </thead>
        <tbody>
          {classes.map((cls) => {
            const color = classColor(cls.className)
            const iconUrl = classIconUrl(cls.slug)
            return (
              <tr key={cls.classId} className="border-b border-amber-900/20 hover:bg-amber-500/5">
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    {iconUrl && (
                      <div className="size-6 shrink-0 overflow-hidden rounded-sm border" style={{ borderColor: `${color}55` }}>
                        <img src={iconUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                      </div>
                    )}
                    <span className="font-semibold" style={{ color }}>{cls.className}</span>
                  </div>
                </td>
                {renderSpecRow(cls.awakening)}
                {renderSpecRow(cls.succession)}
                {renderSpecRow(cls.ascension)}
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

  const sortedClasses = React.useMemo(() => {
    const sorted = [...classes]
    sorted.sort((a, b) => {
      // Sort by the max of all 3 specs' value for the sort key
      const getMax = (c: ClassStats) => {
        if (sortKey === 'className') return 0
        return Math.max(c.awakening[sortKey], c.succession[sortKey], c.ascension[sortKey])
      }
      if (sortKey === 'className') {
        const dir = sortDir === 'asc' ? 1 : -1
        return a.className.localeCompare(b.className) * dir
      }
      const dir = sortDir === 'asc' ? 1 : -1
      return (getMax(b) - getMax(a)) * dir
    })
    return sorted
  }, [classes, sortKey, sortDir, sortKey])

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
    { key: 'avgPvpDamage', label: 'Avg PvP Dmg', icon: null },
    { key: 'medianPvpDamage', label: 'Median PvP Dmg', icon: null },
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
          <span className="hidden text-xs text-amber-200/50 sm:inline">All specs compared across all classes</span>

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
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-sm border-2 border-amber-900/30 bg-bdo-leather-dark" />
            ))}
          </div>
        ) : metaQuery.isError ? (
          <div className="flex items-center justify-center py-20 text-amber-300/60">
            Failed to load meta data. Make sure the database is restored.
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedClasses.map((cls) => (
              <ClassCard key={cls.classId} cls={cls} sortKey={sortKey} />
            ))}
          </div>
        ) : (
          <MetaTable classes={sortedClasses} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
        )}
      </div>

      {/* Disclaimer */}
      <div className="border-t border-amber-900/30 bg-bdo-ink px-4 py-2 text-center text-[10px] text-amber-300/30">
        {classes.length} classes · All 3 specs shown · Black Spirit rage skills excluded from damage · PvE-only CC/protection excluded · Max-rank skills only · Ascension only available for Scholar & Archer
      </div>
    </div>
  )
}
