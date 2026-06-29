'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { LayoutGrid } from 'lucide-react'

import {
  fetchClasses,
  fetchStats,
  classColor,
  classIconUrl,
  type BdoClass,
} from '@/lib/skills'
import { useSkillStore } from '@/lib/skill-store'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

// Renders the bdocodex class icon for a class, falling back to a colored
// circle with the class initial if the image fails to load.
function ClassIcon({
  cls,
  size,
  active,
}: {
  cls: BdoClass
  size: number
  active: boolean
}) {
  const [errored, setErrored] = React.useState(false)
  const color = classColor(cls.name)
  const url = classIconUrl(cls.slug)
  const initial = cls.name?.[0] ?? '?'

  if (!url || errored) {
    return (
      <div
        className="flex items-center justify-center rounded-sm border font-bold"
        style={{
          width: size,
          height: size,
          backgroundColor: `${color}26`,
          borderColor: `${color}aa`,
          color,
          fontSize: size * 0.45,
          boxShadow: active ? `0 0 8px ${color}66` : undefined,
        }}
      >
        {initial}
      </div>
    )
  }

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-sm border-2"
      style={{
        width: size,
        height: size,
        borderColor: active ? 'rgba(240,208,96,0.85)' : 'rgba(156,126,46,0.55)',
        background:
          'linear-gradient(135deg, #1a1612 0%, #0a0908 100%)',
        boxShadow: active
          ? 'inset 0 0 0 1px rgba(240,208,96,0.4), 0 0 10px rgba(200,170,68,0.4)'
          : 'inset 0 0 0 1px rgba(240,208,96,0.15), inset 0 0 6px rgba(0,0,0,0.6)',
      }}
    >
      <img
        src={url}
        alt={cls.name}
        loading="lazy"
        onError={() => setErrored(true)}
        className="h-full w-full object-cover"
      />
    </div>
  )
}

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
      title={`${cls.name} — ${count} skills`}
      className={cn(
        'group flex shrink-0 flex-col items-center gap-1 rounded-sm border px-2 py-1.5 transition-all',
        active
          ? 'border-amber-400/80 bg-amber-500/10'
          : 'border-amber-900/40 bg-bdo-leather-dark hover:border-amber-600/60 hover:bg-amber-900/10',
      )}
      style={
        active
          ? {
              boxShadow:
                'inset 0 0 0 1px rgba(240,208,96,0.45), 0 0 12px rgba(200,170,68,0.3)',
            }
          : {
              boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.6)',
              backgroundImage:
                'linear-gradient(to bottom, #1a1612, #0d0a08)',
            }
      }
    >
      <ClassIcon cls={cls} size={32} active={active} />
      <span
        className={cn(
          'max-w-[60px] truncate text-[10px] font-medium leading-tight',
          active
            ? 'text-amber-200'
            : 'text-amber-100/70 group-hover:text-amber-200',
        )}
      >
        {cls.name}
      </span>
      <span
        className={cn(
          'rounded-sm px-1.5 text-[9px] font-semibold tabular-nums',
          active
            ? 'bg-amber-500/25 text-amber-200'
            : 'bg-amber-950/60 text-amber-300/60',
        )}
        style={
          !active
            ? { boxShadow: `inset 0 0 0 1px ${color}33` }
            : undefined
        }
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

  // Merge counts: prefer the per-classId counts from /api/stats (which groups
  // by classId and picks the canonical className), falling back to /api/classes.
  const countMap = React.useMemo(() => {
    const m = new Map<number, number>()
    // /api/classes counts (grouped by classId in the DB)
    for (const c of classesQuery.data?.classes ?? []) {
      if (c.skillCount) m.set(c.id, c.skillCount)
    }
    // Override with /api/stats counts if available (more reliable)
    for (const c of statsQuery.data?.classBreakdown ?? []) {
      if (c.classId != null) m.set(c.classId, c.count)
    }
    return m
  }, [classesQuery.data, statsQuery.data])

  const totalCount = statsQuery.data?.total ?? 0
  const classes = classesQuery.data?.classes ?? []

  const allActive = classId === 'all'

  return (
    <div className="sticky top-[97px] z-20 border-b border-amber-900/50 bg-bdo-ink/95 backdrop-blur supports-[backdrop-filter]:bg-bdo-ink/85">
      <div className="flex items-stretch gap-2 px-4 py-2 lg:px-6">
        {/* "All Classes" chip — distinctive grid icon */}
        <button
          type="button"
          onClick={() => setClassId('all')}
          className={cn(
            'flex shrink-0 flex-col items-center gap-1 rounded-sm border px-2.5 py-1.5 transition-all',
            allActive
              ? 'border-amber-400/80 bg-amber-500/10'
              : 'border-amber-900/40 bg-bdo-leather-dark hover:border-amber-600/60 hover:bg-amber-900/10',
          )}
          style={
            allActive
              ? {
                  boxShadow:
                    'inset 0 0 0 1px rgba(240,208,96,0.45), 0 0 12px rgba(200,170,68,0.3)',
                }
              : {
                  boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.6)',
                  backgroundImage:
                    'linear-gradient(to bottom, #1a1612, #0d0a08)',
                }
          }
        >
          <div
            className="flex size-8 items-center justify-center rounded-sm border-2"
            style={{
              borderColor: allActive
                ? 'rgba(240,208,96,0.85)'
                : 'rgba(156,126,46,0.55)',
              background:
                'radial-gradient(circle at center, #2a2218 0%, #0a0908 70%)',
              boxShadow: allActive
                ? 'inset 0 0 0 1px rgba(240,208,96,0.4), 0 0 8px rgba(200,170,68,0.4)'
                : 'inset 0 0 0 1px rgba(240,208,96,0.15), inset 0 0 6px rgba(0,0,0,0.6)',
            }}
          >
            <LayoutGrid
              className={cn(
                'size-4',
                allActive ? 'text-amber-300' : 'text-amber-500/70',
              )}
            />
          </div>
          <span
            className={cn(
              'text-[10px] font-semibold leading-tight',
              allActive ? 'text-amber-200' : 'text-amber-100/70',
            )}
          >
            All
          </span>
          <span
            className={cn(
              'rounded-sm px-1.5 text-[9px] font-semibold tabular-nums',
              allActive
                ? 'bg-amber-500/25 text-amber-200'
                : 'bg-amber-950/60 text-amber-300/60',
            )}
          >
            {totalCount.toLocaleString()}
          </span>
        </button>

        {/* Divider */}
        <div className="my-1 w-px self-stretch bg-gradient-to-b from-transparent via-amber-800/40 to-transparent" />

        {/* Class chips — horizontally scrollable */}
        <div
          className="flex flex-1 items-stretch gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-amber-900/40 [&::-webkit-scrollbar-track]:bg-transparent"
          role="tablist"
        >
          {classesQuery.isLoading
            ? Array.from({ length: 10 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-[78px] w-[68px] shrink-0 rounded-sm bg-bdo-leather-dark"
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
