'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Search,
  Swords,
  SlidersHorizontal,
  ArrowUpDown,
  RefreshCw,
  Film,
  FileText,
  Database,
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

const SORT_OPTIONS: { value: SkillSort; label: string }[] = [
  { value: 'skillId', label: 'Skill ID' },
  { value: 'name', label: 'Name' },
  { value: 'level', label: 'Level' },
  { value: 'cooldown', label: 'Cooldown' },
  { value: 'anim', label: 'Animation' },
  { value: 'class', label: 'Class' },
  { value: 'sp', label: 'SP Cost' },
]

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
        'flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs',
        accent
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
          : 'border-zinc-800 bg-zinc-900/60 text-zinc-300',
      )}
      title={label}
    >
      <span className="shrink-0 opacity-80">{icon}</span>
      <span className="font-mono font-semibold tabular-nums">{value}</span>
      <span className="hidden text-zinc-500 sm:inline">{label}</span>
    </div>
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
    <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/70">
      <div className="flex flex-col gap-3 px-4 py-3 lg:px-6">
        {/* Top row: title + actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <Swords className="size-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight text-zinc-50">
                BDO Skills Codex
              </h1>
              <p className="hidden text-[11px] text-zinc-400 sm:block">
                Live skill database synced from bdocodex.com — including
                animation durations
              </p>
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden border-zinc-800 bg-zinc-900/60 text-zinc-200 hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-300"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal className="size-4" />
              Filters
            </Button>

            <Select value={sort} onValueChange={(v) => setSort(v as SkillSort)}>
              <SelectTrigger
                size="sm"
                className="w-[140px] border-zinc-800 bg-zinc-900/60 text-zinc-200 hover:border-amber-500/40"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-zinc-800 bg-zinc-900 text-zinc-100">
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
              className="border-zinc-800 bg-zinc-900/60 text-zinc-200 hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-300"
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
              className="border-zinc-800 bg-zinc-900/60 text-zinc-200 hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-300"
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
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search by name, KR name, description, or skill ID…"
              className="border-zinc-800 bg-zinc-900/60 pl-9 text-zinc-100 placeholder:text-zinc-500 focus-visible:border-amber-500/60 focus-visible:ring-amber-500/20"
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
                className="border-red-500/40 bg-red-500/10 text-red-300"
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
