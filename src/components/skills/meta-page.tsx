'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Swords, Skull, Zap, Shield, ArrowUpDown, TrendingUp } from 'lucide-react'

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
}

type SortKey = 'className' | 'avgPvpDamage' | 'medianPvpDamage' | 'pvpCcSkillCount' | 'superArmorCount' | 'forwardGuardCount' | 'iFrameCount'
type SpecView = 'awakening' | 'succession'

async function fetchMeta(): Promise<{ classes: ClassStats[] }> {
  const res = await fetch('/api/meta', { cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed to fetch meta: ${res.status}`)
  return res.json()
}

function StatChip({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-sm border px-2 py-1 text-xs"
      style={{ borderColor: `${color}44`, backgroundColor: `${color}11` }}
      title={label}
    >
      <span style={{ color }}>{icon}</span>
      <span className="font-mono font-bold tabular-nums" style={{ color }}>{value}</span>
    </div>
  )
}

function ClassCard({ cls, spec, sortKey }: { cls: ClassStats; spec: SpecView; sortKey: SortKey }) {
  const stats = cls[spec]
  const color = classColor(cls.className)
  const iconUrl = classIconUrl(cls.slug)

  const isHighlighted = (key: SortKey) => key === sortKey

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
      {/* Header: icon + name */}
      <div className="flex items-center gap-3">
        {iconUrl && (
          <div
            className="shrink-0 overflow-hidden rounded-sm border-2"
            style={{
              width: 48,
              height: 48,
              borderColor: `${color}88`,
              background: 'linear-gradient(135deg, #1a1612 0%, #0a0908 100%)',
              boxShadow: `inset 0 0 0 1px ${color}33`,
            }}
          >
            <img src={iconUrl} alt={cls.className} className="h-full w-full object-cover" loading="lazy" />
          </div>
        )}
        <div>
          <h3 className="bdo-title text-lg font-bold" style={{ color }}>
            {cls.className}
          </h3>
          <span className="text-xs text-amber-200/50">{stats.skillCount} skills ({spec})</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Avg PvP Damage */}
        <div
          className={cn(
            'bdo-stat-box flex flex-col gap-0.5 rounded-sm border px-2.5 py-1.5',
            isHighlighted('avgPvpDamage') && 'ring-1 ring-amber-400/60',
          )}
          style={{ borderColor: 'rgba(244,114,182,0.3)', background: 'rgba(244,114,182,0.05)' }}
        >
          <span className="text-[9px] font-semibold uppercase tracking-wider text-pink-300/60">Avg PvP Dmg</span>
          <span className="font-mono text-sm font-bold tabular-nums text-pink-300">
            {stats.avgPvpDamage > 0 ? formatDamage(stats.avgPvpDamage) : '—'}
          </span>
        </div>

        {/* Median PvP Damage */}
        <div
          className={cn(
            'bdo-stat-box flex flex-col gap-0.5 rounded-sm border px-2.5 py-1.5',
            isHighlighted('medianPvpDamage') && 'ring-1 ring-amber-400/60',
          )}
          style={{ borderColor: 'rgba(244,114,182,0.3)', background: 'rgba(244,114,182,0.05)' }}
        >
          <span className="text-[9px] font-semibold uppercase tracking-wider text-pink-300/60">Median PvP Dmg</span>
          <span className="font-mono text-sm font-bold tabular-nums text-pink-300">
            {stats.medianPvpDamage > 0 ? formatDamage(stats.medianPvpDamage) : '—'}
          </span>
        </div>

        {/* PvP CC Skills */}
        <div
          className={cn(
            'bdo-stat-box flex flex-col gap-0.5 rounded-sm border px-2.5 py-1.5',
            isHighlighted('pvpCcSkillCount') && 'ring-1 ring-amber-400/60',
          )}
          style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}
        >
          <span className="text-[9px] font-semibold uppercase tracking-wider text-red-300/60">PvP CC Skills</span>
          <span className="font-mono text-sm font-bold tabular-nums text-red-300">{stats.pvpCcSkillCount}</span>
        </div>

        {/* Protection: SA + FG + IF */}
        <div
          className={cn(
            'bdo-stat-box flex flex-col gap-0.5 rounded-sm border px-2.5 py-1.5',
            (isHighlighted('superArmorCount') || isHighlighted('forwardGuardCount') || isHighlighted('iFrameCount')) && 'ring-1 ring-amber-400/60',
          )}
          style={{ borderColor: 'rgba(200,170,68,0.3)', background: 'rgba(200,170,68,0.05)' }}
        >
          <span className="text-[9px] font-semibold uppercase tracking-wider text-amber-300/60">Protection</span>
          <div className="flex items-center gap-2 text-sm font-bold tabular-nums">
            <span title="Super Armor" className="text-amber-400">💪{stats.superArmorCount}</span>
            <span title="Forward Guard" className="text-blue-400">🛡{stats.forwardGuardCount}</span>
            <span title="I-Frame" className="text-purple-400">✦{stats.iFrameCount}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function MetaPage() {
  const [spec, setSpec] = React.useState<SpecView>('awakening')
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
      let valA: number | string
      let valB: number | string
      if (sortKey === 'className') {
        valA = a.className
        valB = b.className
      } else {
        valA = a[spec][sortKey]
        valB = b[spec][sortKey]
      }
      const dir = sortDir === 'asc' ? 1 : -1
      if (typeof valA === 'string') return valA.localeCompare(valB as string) * dir
      return ((valA as number) - (valB as number)) * dir
    })
    return sorted
  }, [classes, sortKey, sortDir, spec])

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
    { key: 'avgPvpDamage', label: 'Avg PvP Dmg', icon: <Skull className="size-3" /> },
    { key: 'medianPvpDamage', label: 'Median PvP Dmg', icon: <TrendingUp className="size-3" /> },
    { key: 'pvpCcSkillCount', label: 'CC Skills', icon: <Zap className="size-3" /> },
    { key: 'superArmorCount', label: 'SA', icon: <span>💪</span> },
    { key: 'forwardGuardCount', label: 'FG', icon: <span>🛡</span> },
    { key: 'iFrameCount', label: 'IF', icon: <span>✦</span> },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-bdo-ink text-zinc-100">
      {/* Meta header */}
      <div className="sticky top-0 z-30 border-b border-amber-900/50 bg-bdo-ink/95 backdrop-blur">
        <div className="flex flex-wrap items-center gap-4 px-4 py-3 lg:px-6">
          <h1 className="bdo-title text-2xl font-bold text-amber-400">BDO Meta</h1>
          <span className="text-xs text-amber-200/50">Class statistics — PvP damage, CC, and protection per spec</span>

          {/* Spec toggle */}
          <div className="ml-auto flex items-center gap-2">
            <div className="flex rounded-sm border border-amber-800/50 overflow-hidden">
              <button
                onClick={() => setSpec('awakening')}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold transition-all',
                  spec === 'awakening'
                    ? 'bg-amber-500/20 text-amber-200'
                    : 'bg-bdo-leather-dark text-amber-300/50 hover:text-amber-200',
                )}
              >
                Awakening
              </button>
              <button
                onClick={() => setSpec('succession')}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold transition-all',
                  spec === 'succession'
                    ? 'bg-emerald-500/20 text-emerald-200'
                    : 'bg-bdo-leather-dark text-amber-300/50 hover:text-amber-200',
                )}
              >
                Succession
              </button>
            </div>
          </div>

          {/* Sort buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-amber-300/40">Sort by:</span>
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
                {sortKey === opt.key && (
                  <ArrowUpDown className="size-2.5 opacity-60" style={{ transform: sortDir === 'asc' ? 'rotate(180deg)' : 'none' }} />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Class cards grid */}
      <div className="flex-1 px-4 py-6 lg:px-6">
        {metaQuery.isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-sm border-2 border-amber-900/30 bg-bdo-leather-dark" />
            ))}
          </div>
        ) : metaQuery.isError ? (
          <div className="flex items-center justify-center py-20 text-amber-300/60">
            Failed to load meta data. Make sure the database is restored.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedClasses.map((cls) => (
              <ClassCard key={cls.classId} cls={cls} spec={spec} sortKey={sortKey} />
            ))}
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="border-t border-amber-900/30 bg-bdo-ink px-4 py-2 text-center text-[10px] text-amber-300/30">
        Stats computed from {classes.length} classes · Black Spirit rage skills excluded from damage · PvE-only CC/protection excluded · Max-rank skills only
      </div>
    </div>
  )
}
