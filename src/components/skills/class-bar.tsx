'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'

import { fetchClasses, fetchStats, classColor, type BdoClass } from '@/lib/skills'
import { useSkillStore } from '@/lib/skill-store'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

function ClassChip({
  cls,
  active,
  count,
  onClick,
}: {
  cls: BdoClass
  active: boolean
  count: number
  onClick: () => void
}) {
  const color = classColor(cls.name)
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all',
        active
          ? 'border-transparent text-zinc-50 shadow-lg'
          : 'border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/60',
      )}
      style={
        active
          ? {
              backgroundColor: `${color}26`,
              borderColor: `${color}cc`,
              boxShadow: `0 0 0 1px ${color}55, 0 4px 14px -4px ${color}55`,
            }
          : undefined
      }
      title={`${cls.name} — ${count} skills`}
    >
      <span
        className="size-2.5 shrink-0 rounded-full"
        style={{
          backgroundColor: color,
          boxShadow: active ? `0 0 8px ${color}` : undefined,
        }}
      />
      <span className="font-medium">{cls.name}</span>
      <span
        className={cn(
          'rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums',
          active ? 'bg-zinc-950/40 text-zinc-200' : 'bg-zinc-800 text-zinc-400',
        )}
      >
        {count}
      </span>
    </button>
  )
}

export function ClassBar() {
  const classId = useSkillStore((s) => s.filters.classId)
  const setClassId = useSkillStore((s) => s.setClassId)

  const classesQuery = useQuery({
    queryKey: ['classes'],
    queryFn: fetchClasses,
    staleTime: 5 * 60_000,
  })
  const statsQuery = useQuery({
    queryKey: ['stats'],
    queryFn: fetchStats,
    staleTime: 30_000,
  })

  // The /api/classes endpoint may return skillCount=0 (a backend bug),
  // so we merge in counts from /api/stats.classBreakdown when available.
  const countMap = React.useMemo(() => {
    const m = new Map<number, number>()
    for (const c of statsQuery.data?.classBreakdown ?? []) {
      if (c.classId != null) m.set(c.classId, c.count)
    }
    for (const c of classesQuery.data?.classes ?? []) {
      if (!m.has(c.id) && c.skillCount) m.set(c.id, c.skillCount)
    }
    return m
  }, [classesQuery.data, statsQuery.data])

  const totalCount = statsQuery.data?.total ?? 0
  const classes = classesQuery.data?.classes ?? []

  return (
    <div className="sticky top-[97px] z-20 border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/70">
      <div className="flex items-center gap-2 px-4 py-2 lg:px-6">
        <button
          type="button"
          onClick={() => setClassId('all')}
          className={cn(
            'flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all',
            classId === 'all'
              ? 'border-amber-500/60 bg-amber-500/15 text-amber-200 shadow-[0_0_0_1px_rgba(245,158,11,0.25)]'
              : 'border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/60',
          )}
        >
          <span className="font-semibold">All Classes</span>
          <span
            className={cn(
              'rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums',
              classId === 'all'
                ? 'bg-amber-500/20 text-amber-200'
                : 'bg-zinc-800 text-zinc-400',
            )}
          >
            {totalCount.toLocaleString()}
          </span>
        </button>

        <div
          className="flex flex-1 items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
        >
          {classesQuery.isLoading
            ? Array.from({ length: 10 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-8 w-28 shrink-0 rounded-full bg-zinc-900"
                />
              ))
            : classes
                .filter((c) => !c.name.startsWith('NEW_CLASS'))
                .map((c) => (
                  <ClassChip
                    key={c.id}
                    cls={c}
                    count={countMap.get(c.id) ?? c.skillCount ?? 0}
                    active={classId === c.id}
                    onClick={() =>
                      setClassId(classId === c.id ? 'all' : c.id)
                    }
                  />
                ))}
        </div>
      </div>
    </div>
  )
}
