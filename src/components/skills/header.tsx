'use client'

import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  Swords,
  SlidersHorizontal,
  ArrowUpDown,
  RefreshCw,
  Film,
  FileText,
  Database,
  Sparkles,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { fetchStats, type SkillSort } from '@/lib/skills'
import { useSkillStore } from '@/lib/skill-store'
import { LayoutGrid, List, Table as TableIcon } from 'lucide-react'

const SORT_OPTIONS: { value: SkillSort; label: string }[] = [
  { value: 'skillId', label: 'Skill ID' },
  { value: 'name', label: 'Name' },
  { value: 'level', label: 'Level' },
  { value: 'cooldown', label: 'Cooldown' },
  { value: 'anim', label: 'Animation' },
  { value: 'class', label: 'Class' },
  { value: 'type', label: 'Skill Type' },
  { value: 'damage', label: 'Damage (PvE)' },
  { value: 'pvpDamage', label: 'Damage (PvP)' },
  { value: 'ccCounters', label: 'CC Counters' },
]

// View-mode toggle: Grid / List / Table. Each is a small icon button styled
// with the BDO chip aesthetic. Active mode gets the gold-glow treatment.
function ViewModeToggle() {
  const viewMode = useSkillStore((s) => s.viewMode)
  const setViewMode = useSkillStore((s) => s.setViewMode)
  const modes: { key: 'grid' | 'list' | 'table'; label: string; icon: React.ReactNode }[] = [
    { key: 'grid', label: 'Grid', icon: <LayoutGrid className="size-3.5" /> },
    { key: 'list', label: 'List', icon: <List className="size-3.5" /> },
    { key: 'table', label: 'Table', icon: <TableIcon className="size-3.5" /> },
  ]
  return (
    <div
      className="flex items-center gap-0.5 rounded-sm border border-amber-800/50 bg-bdo-leather-dark p-0.5"
      style={{ boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.6)' }}
      role="group"
      aria-label="View mode"
    >
      {modes.map((m) => {
        const active = viewMode === m.key
        return (
          <button
            key={m.key}
            type="button"
            onClick={() => setViewMode(m.key)}
            title={`${m.label} view`}
            aria-pressed={active}
            className={cn(
              'flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium transition-all',
              active
                ? 'bdo-chip-on text-amber-200'
                : 'text-amber-200/50 hover:text-amber-200',
            )}
          >
            {m.icon}
            <span className="hidden sm:inline">{m.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function StatPill({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs',
        accent
          ? 'border-amber-500/60 bg-amber-500/10 text-amber-300 shadow-[0_0_8px_-2px_rgba(200,170,68,0.4)]'
          : 'border-amber-800/40 bg-bdo-leather-dark text-amber-200/80',
      )}
      title={label}
      style={{
        backgroundImage: accent
          ? undefined
          : 'linear-gradient(to bottom, #1a1612, #0d0a08)',
        boxShadow: accent
          ? 'inset 0 0 0 1px rgba(240,208,96,0.18)'
          : 'inset 0 1px 1px rgba(0,0,0,0.6)',
      }}
    >
      <span className="shrink-0 opacity-90">{icon}</span>
      <span className="font-mono font-semibold tabular-nums">{value}</span>
      <span className="hidden text-amber-200/50 sm:inline">{label}</span>
    </div>
  )
}

// Compact "Updated Ns ago" indicator that fades in when the skills list query
// receives fresh data. Reads dataUpdatedAt from the global query cache.
function UpdatedIndicator() {
  const queryClient = useQueryClient()
  const [updatedAt, setUpdatedAt] = React.useState<number | null>(null)
  const [tick, setTick] = React.useState(0)
  const [flashKey, setFlashKey] = React.useState(0)

  // Subscribe to query cache changes for the skills list.
  React.useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (
        event.query.queryKey[0] === 'skills' &&
        (event.type === 'updated' || event.type === 'fetched')
      ) {
        const state = event.query.state
        if (state.status === 'success' && state.dataUpdatedAt) {
          setUpdatedAt(state.dataUpdatedAt)
          setFlashKey((k) => k + 1)
        }
      }
    })
    return () => unsubscribe()
  }, [queryClient])

  // Tick every second so "Ns ago" stays fresh.
  React.useEffect(() => {
    const t = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(t)
  }, [])

  if (!updatedAt) return null
  void tick // referenced so the linter keeps the interval
  const ago = Math.max(0, Math.floor((Date.now() - updatedAt) / 1000))
  const label =
    ago < 5 ? 'just now' : ago < 60 ? `${ago}s ago` : `${Math.floor(ago / 60)}m ago`

  return (
    <span
      key={flashKey}
      className="bdo-fade-in flex items-center gap-1 text-[10px] text-amber-300/80"
      title={`Last refreshed ${new Date(updatedAt).toLocaleTimeString()}`}
    >
      <Sparkles className="size-2.5" />
      Updated {label}
    </span>
  )
}

export function Header() {
  const q = useSkillStore((s) => s.filters.q)
  const setQ = useSkillStore((s) => s.setQ)
  const sort = useSkillStore((s) => s.filters.sort)
  const setSort = useSkillStore((s) => s.setSort)
  const order = useSkillStore((s) => s.filters.order)
  const toggleOrder = useSkillStore((s) => s.toggleOrder)
  const setFiltersOpen = useSkillStore((s) => s.setFiltersOpen)

  // Debounced search input.
  const [input, setInput] = React.useState(q ?? '')
  React.useEffect(() => {
    setInput(q ?? '')
  }, [q])
  React.useEffect(() => {
    const t = setTimeout(() => setQ(input), 300)
    return () => clearTimeout(t)
  }, [input, setQ])

  const statsQuery = useQuery({
    queryKey: ['stats'],
    queryFn: fetchStats,
    refetchInterval: 30_000,
  })

  const stats = statsQuery.data
  const total = stats?.total ?? 0
  const withDesc = stats?.withDescription ?? 0
  const withAnim = stats?.withAnimation ?? 0

  return (
    <header className="sticky top-0 z-30 border-b border-amber-900/50 bg-bdo-ink/95 backdrop-blur supports-[backdrop-filter]:bg-bdo-ink/85">
      {/* Top ornate double-border accent */}
      <div className="h-px bg-gradient-to-r from-transparent via-amber-700/60 to-transparent" />
      <div className="flex flex-col gap-3 px-4 py-3 lg:px-6">
        {/* Top row: title + actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className="flex size-10 items-center justify-center rounded-sm border-2"
              style={{
                borderColor: 'rgba(156,126,46,0.7)',
                background:
                  'radial-gradient(circle at center, #2a2218 0%, #0a0908 70%)',
                boxShadow:
                  'inset 0 0 0 1px rgba(240,208,96,0.3), 0 0 12px rgba(200,170,68,0.2)',
              }}
            >
              <Swords className="size-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <h1 className="bdo-title truncate text-xl tracking-wide">
                BDO Meta
              </h1>
              <p className="hidden text-[11px] text-amber-200/50 sm:block">
                Black Desert Online skill database — synced from bdocodex.com
              </p>
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="hidden items-center md:flex">
              <UpdatedIndicator />
            </div>

            <ViewModeToggle />

            <Button
              variant="outline"
              size="sm"
              className="bdo-btn lg:hidden"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal className="size-4" />
              Filters
            </Button>

            <Select value={sort} onValueChange={(v) => setSort(v as SkillSort)}>
              <SelectTrigger
                size="sm"
                className="bdo-input w-[140px] py-1.5 text-xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bdo-recessed border-amber-800/50 text-amber-100">
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="focus:bg-amber-500/15 focus:text-amber-200"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              title={`Sort ${order === 'asc' ? 'ascending' : 'descending'}`}
              onClick={toggleOrder}
              className="bdo-btn size-8 p-0"
            >
              <ArrowUpDown
                className={cn('size-4 transition-transform', order === 'desc' && 'rotate-180')}
              />
            </Button>

            <Button
              variant="outline"
              size="icon"
              title="Refresh stats"
              onClick={() => statsQuery.refetch()}
              className="bdo-btn size-8 p-0"
            >
              <RefreshCw
                className={cn('size-4', statsQuery.isFetching && 'animate-spin')}
              />
            </Button>
          </div>
        </div>

        {/* Second row: search + stat pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-amber-500/70" />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search by name, KR name, description, or skill ID…"
              className="bdo-input h-9 pl-9 font-serif text-sm placeholder:font-sans"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <StatPill
              icon={<Database className="size-3.5" />}
              label="skills"
              value={total.toLocaleString()}
            />
            <StatPill
              icon={<FileText className="size-3.5" />}
              label="enriched"
              value={withDesc.toLocaleString()}
            />
            <StatPill
              icon={<Film className="size-3.5" />}
              label="w/ animation"
              value={withAnim.toLocaleString()}
              accent
            />
            {statsQuery.isError && (
              <Badge
                variant="outline"
                className="border-red-700/50 bg-red-900/20 text-red-300"
              >
                stats offline
              </Badge>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
