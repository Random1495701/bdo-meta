'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, ArrowUp, ArrowDown, Plus, Minus, RefreshCw,
  Clock, X, ChevronDown, Filter, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChangeLogEntry {
  id: string
  skillId: number
  skillName: string
  className: string | null
  field: string
  changeType: string
  oldValue: string | null
  newValue: string | null
  source: string
  patchDate: string | null
  createdAt: string
}

interface ChangeLogStats {
  last24h: number
  last7d: number
  uniqueSkillsChanged: number
  bySource: Record<string, number>
}

const SOURCE_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  lurker:       { label: 'Lurker',      color: '#22c55e', icon: <RefreshCw className="size-3" /> },
  patch_apply:  { label: 'Patch',       color: '#fbbf24', icon: <Zap className="size-3" /> },
  manual:       { label: 'Manual',      color: '#3b82f6', icon: <Activity className="size-3" /> },
  import:       { label: 'Import',      color: '#a78bfa', icon: <ArrowDown className="size-3" /> },
  garmoth:      { label: 'Garmoth',     color: '#06b6d4', icon: <ArrowDown className="size-3" /> },
}

const FIELD_LABELS: Record<string, string> = {
  damageRowsJson: 'Damage',
  ccTypes: 'CC Types',
  cooldownSec: 'Cooldown',
  cooldown: 'Cooldown',
  pvpDamagePercent: 'PvP %',
  protectionTypes: 'Protection',
  animationDurationMs: 'Animation',
  description: 'Description',
  videoUrl: 'Video',
  iconPath: 'Icon',
  name: 'Name',
  krName: 'KR Name',
  className: 'Class',
  classId: 'Class ID',
  command: 'Command',
  requiredLevel: 'Level',
  maxLevel: 'Max Level',
  skillPoints: 'SP',
  isQuickSlot: 'Quick Slot',
  isAbsolute: 'Absolute',
  isAwakening: 'Awakening',
  isSuccession: 'Succession',
  isBlackSpirit: 'Black Spirit',
  isPassive: 'Passive',
  groupId: 'Group ID',
  prerequisiteIds: 'Prereqs',
}

function formatValue(value: string | null, field: string): string {
  if (!value) return '—'
  // Try to parse JSON for complex fields
  if (field === 'damageRowsJson') {
    try {
      const rows = JSON.parse(value)
      if (Array.isArray(rows)) return `${rows.length} rows`
    } catch {}
    return value.slice(0, 30)
  }
  if (field === 'ccTypes' || field === 'protectionTypes') {
    return value.split(',').filter(Boolean).join(', ') || 'none'
  }
  if (field === 'cooldownSec') {
    const sec = parseFloat(value)
    return isNaN(sec) ? value : `${sec}s`
  }
  if (field === 'animationDurationMs') {
    const ms = parseInt(value, 10)
    return isNaN(ms) ? value : `${ms}ms`
  }
  if (field === 'pvpDamagePercent') {
    return `${value}%`
  }
  return value.length > 40 ? value.slice(0, 40) + '…' : value
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  return `${day}d ago`
}

export function ChangeLogBanner() {
  const [entries, setEntries] = React.useState<ChangeLogEntry[]>([])
  const [stats, setStats] = React.useState<ChangeLogStats | null>(null)
  const [expanded, setExpanded] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [sourceFilter, setSourceFilter] = React.useState<string | null>(null)
  const [error, setError] = React.useState(false)

  const fetchLog = React.useCallback(() => {
    const params = new URLSearchParams({ limit: '50' })
    if (sourceFilter) params.set('source', sourceFilter)
    fetch(`/api/change-log?${params}`)
      .then(res => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then(data => {
        setEntries(data.entries || [])
        setStats(data.stats || null)
        setError(false)
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [sourceFilter])

  // Poll every 10s when expanded, every 30s when collapsed
  React.useEffect(() => {
    fetchLog()
    const interval = setInterval(fetchLog, expanded ? 10000 : 30000)
    return () => clearInterval(interval)
  }, [fetchLog, expanded])

  const recentCount = stats?.last24h || 0
  const hasRecent = recentCount > 0

  return (
    <div className="border-b border-amber-900/40 bg-bdo-leather-dark/30">
      {/* Compact bar — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-1.5 text-left transition-colors hover:bg-amber-500/5 lg:px-6"
      >
        <div className="flex items-center gap-2">
          <Activity className={cn('size-3.5', hasRecent ? 'text-emerald-400' : 'text-amber-400/40')} />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-300/50">Change Log</span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <Clock className="size-3 text-amber-400/40" />
            <span className="font-mono font-bold" style={{ color: hasRecent ? '#22c55e' : '#a1a1aa' }}>
              {recentCount}
            </span>
            <span className="text-amber-300/40">24h</span>
          </span>
          {stats && (
            <>
              <span className="hidden items-center gap-1 sm:flex">
                <span className="font-mono font-bold text-amber-300/70">{stats.last7d}</span>
                <span className="text-amber-300/40">7d</span>
              </span>
              <span className="hidden items-center gap-1 md:flex">
                <span className="font-mono font-bold text-blue-400/70">{stats.uniqueSkillsChanged}</span>
                <span className="text-amber-300/40">skills</span>
              </span>
            </>
          )}
          {/* Source breakdown dots */}
          {stats?.bySource && Object.entries(stats.bySource).slice(0, 4).map(([src, count]) => {
            const meta = SOURCE_META[src]
            if (!meta || count === 0) return null
            return (
              <span key={src} className="hidden items-center gap-1 lg:flex" title={`${meta.label}: ${count}`}>
                <span className="size-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
                <span className="font-mono text-amber-300/50">{count}</span>
              </span>
            )
          })}
        </div>

        {/* Latest entry preview */}
        {!expanded && entries.length > 0 && (
          <div className="ml-2 hidden min-w-0 flex-1 truncate text-[10px] text-amber-300/40 lg:block">
            Latest: <span className="text-amber-300/70">{entries[0].skillName}</span>
            <span className="text-amber-400/40"> · </span>
            {entries[0].field}
            <span className="text-amber-400/40"> · </span>
            {timeAgo(entries[0].createdAt)}
          </div>
        )}

        <ChevronDown className={cn('ml-auto size-3.5 text-amber-400/40 transition-transform', expanded && 'rotate-180')} />
      </button>

      {/* Expanded panel — live log */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-amber-900/30"
          >
            <div className="max-h-80 overflow-y-auto">
              {/* Filter bar */}
              <div className="flex items-center gap-1.5 border-b border-amber-900/20 px-4 py-1.5 lg:px-6">
                <Filter className="size-3 text-amber-400/40" />
                <button
                  onClick={() => setSourceFilter(null)}
                  className={cn(
                    'rounded-sm border px-2 py-0.5 text-[9px] font-semibold transition-all',
                    !sourceFilter ? 'border-amber-400/60 bg-amber-500/15 text-amber-200' : 'border-amber-800/40 text-amber-300/40 hover:text-amber-200',
                  )}
                >
                  All
                </button>
                {Object.entries(SOURCE_META).map(([src, meta]) => (
                  <button
                    key={src}
                    onClick={() => setSourceFilter(sourceFilter === src ? null : src)}
                    className={cn(
                      'flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[9px] font-semibold transition-all',
                      sourceFilter === src ? 'text-amber-200' : 'border-amber-800/40 text-amber-300/40 hover:text-amber-200',
                    )}
                    style={sourceFilter === src ? { borderColor: meta.color, backgroundColor: `${meta.color}15`, color: meta.color } : undefined}
                  >
                    {meta.icon}
                    {meta.label}
                  </button>
                ))}
                <span className="ml-auto text-[9px] text-amber-300/40">
                  {loading ? 'loading…' : `${entries.length} entries`}
                </span>
                <button
                  onClick={fetchLog}
                  className="rounded-sm border border-amber-800/40 px-1.5 py-0.5 text-amber-300/50 transition-all hover:text-amber-200"
                  title="Refresh"
                >
                  <RefreshCw className="size-3" />
                </button>
              </div>

              {/* Log entries */}
              {error ? (
                <div className="px-4 py-8 text-center text-[10px] text-red-400/50">
                  Failed to load change log. Database may not have the change log table yet.
                </div>
              ) : entries.length === 0 ? (
                <div className="px-4 py-8 text-center text-[10px] text-amber-300/40">
                  No changes logged yet. Changes will appear here when the lurker or patch applier modifies skill data.
                </div>
              ) : (
                <div className="divide-y divide-amber-900/10">
                  {entries.map((entry, idx) => {
                    const sourceMeta = SOURCE_META[entry.source] || SOURCE_META.manual
                    const isCreate = entry.changeType === 'create'
                    const fieldLabel = FIELD_LABELS[entry.field] || entry.field

                    return (
                      <motion.div
                        key={entry.id}
                        initial={idx === 0 ? { opacity: 0, backgroundColor: `${sourceMeta.color}11` } : false}
                        animate={{ opacity: 1, backgroundColor: 'transparent' }}
                        transition={{ duration: 1 }}
                        className="flex items-center gap-2 px-4 py-1.5 text-[10px] hover:bg-amber-500/5 lg:px-6"
                      >
                        {/* Source dot */}
                        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: sourceMeta.color }} title={sourceMeta.label} />

                        {/* Change icon */}
                        <span className="shrink-0" style={{ color: isCreate ? '#22c55e' : sourceMeta.color }}>
                          {isCreate ? <Plus className="size-3" /> : <ArrowUp className="size-3" />}
                        </span>

                        {/* Skill name + class */}
                        <span className="min-w-0 max-w-[200px] truncate font-semibold text-amber-200" title={entry.skillName}>
                          {entry.skillName}
                        </span>
                        {entry.className && (
                          <span className="hidden shrink-0 text-amber-300/30 sm:inline">{entry.className}</span>
                        )}

                        {/* Field */}
                        <span className="shrink-0 rounded-sm bg-amber-900/20 px-1.5 py-0.5 font-mono text-[9px] text-amber-300/60">
                          {fieldLabel}
                        </span>

                        {/* Old → New */}
                        <div className="hidden min-w-0 flex-1 items-center gap-1 font-mono md:flex">
                          {entry.oldValue && (
                            <span className="truncate text-red-300/50" title={entry.oldValue}>
                              {formatValue(entry.oldValue, entry.field)}
                            </span>
                          )}
                          {entry.oldValue && entry.newValue && <span className="text-amber-400/40">→</span>}
                          {entry.newValue && (
                            <span className="truncate text-emerald-300/60" title={entry.newValue}>
                              {formatValue(entry.newValue, entry.field)}
                            </span>
                          )}
                        </div>

                        {/* Patch date badge */}
                        {entry.patchDate && (
                          <span className="hidden shrink-0 rounded-sm border border-amber-700/40 bg-amber-900/20 px-1.5 py-0.5 text-[8px] text-amber-300/50 lg:inline">
                            {entry.patchDate}
                          </span>
                        )}

                        {/* Time */}
                        <span className="ml-auto shrink-0 text-amber-300/30">
                          {timeAgo(entry.createdAt)}
                        </span>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
