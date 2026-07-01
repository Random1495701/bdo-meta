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
  specs,
  onClick,
  onSpecClick,
}: {
  cls: BdoClass
  active: boolean
  count: number
  specs: ('succession' | 'awakening' | 'ascension')[]
  onClick: () => void
  onSpecClick: (spec: 'succession' | 'awakening' | 'ascension') => void
}) {
  const color = classColor(cls.name)
  const isAsc = cls.isAscension
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${cls.name} — ${count} skills${active ? ' (click to deselect)' : ' (click to select)'}`}
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
      {/* Spec buttons: Asc for ascension-only classes, S/A for others */}
      <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
        {isAsc ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              onSpecClick('ascension')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                e.stopPropagation()
                onSpecClick('ascension')
              }
            }}
            className={cn(
              'flex h-4 w-8 items-center justify-center rounded-sm text-[9px] font-bold transition-all',
              specs.includes('ascension') && active
                ? 'bg-yellow-500/30 text-yellow-200 ring-1 ring-yellow-400/60'
                : 'bg-zinc-800/80 text-zinc-500 hover:bg-yellow-900/30 hover:text-yellow-300',
            )}
            title="Ascension spec — click to toggle"
          >
            Asc
          </span>
        ) : (
          <>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                onSpecClick('succession')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  onSpecClick('succession')
                }
              }}
              className={cn(
                'flex h-4 w-4 items-center justify-center rounded-sm text-[9px] font-bold transition-all',
                specs.includes('succession') && active
                  ? 'bg-blue-500/30 text-blue-200 ring-1 ring-blue-400/60'
                  : 'bg-zinc-800/80 text-zinc-500 hover:bg-blue-900/30 hover:text-blue-300',
              )}
              title="Succession spec — click to toggle"
            >
              S
            </span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                onSpecClick('awakening')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  onSpecClick('awakening')
                }
              }}
              className={cn(
                'flex h-4 w-4 items-center justify-center rounded-sm text-[9px] font-bold transition-all',
                specs.includes('awakening') && active
                  ? 'bg-red-500/30 text-red-200 ring-1 ring-red-400/60'
                  : 'bg-zinc-800/80 text-zinc-500 hover:bg-red-900/30 hover:text-red-300',
              )}
              title="Awakening spec — click to toggle"
            >
              A
            </span>
          </>
        )}
      </div>
    </button>
  )
}

export function ClassBar() {
  const classIds = useSkillStore((s) => s.filters.classIds) ?? []
  const toggleClass = useSkillStore((s) => s.toggleClass)
  const clearClasses = useSkillStore((s) => s.clearClasses)
  const specs = useSkillStore((s) => s.filters.specs) ?? []
  const toggleSpec = useSkillStore((s) => s.toggleSpec)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // Wheel-scroll support: when hovering over the class bar, vertical wheel
  // scrolls translate to horizontal scroll. Also supports shift+wheel.
  const handleWheel = React.useCallback((e: React.WheelEvent) => {
    const el = scrollRef.current
    if (!el) return
    // If shift is pressed, always scroll horizontally (browser default for shift+wheel)
    // Otherwise, convert vertical wheel to horizontal scroll
    if (e.shiftKey) return
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY
      e.preventDefault()
    }
  }, [])

  // Drag-to-scroll support (click and drag to scroll horizontally)
  const dragState = React.useRef<{ isDown: boolean; startX: number; scrollLeft: number }>({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
  })
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    const el = scrollRef.current
    if (!el) return
    // Only start drag if clicking on the scroll area (not a button)
    if (e.target === el || el.contains(e.target as Node)) {
      dragState.current = { isDown: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft }
      el.style.cursor = 'grabbing'
    }
  }, [])
  const handleMouseLeave = React.useCallback(() => {
    dragState.current.isDown = false
    if (scrollRef.current) scrollRef.current.style.cursor = ''
  }, [])
  const handleMouseUp = React.useCallback(() => {
    dragState.current.isDown = false
    if (scrollRef.current) scrollRef.current.style.cursor = ''
  }, [])
  const handleMouseMove = React.useCallback((e: React.MouseEvent) => {
    if (!dragState.current.isDown) return
    const el = scrollRef.current
    if (!el) return
    e.preventDefault()
    const x = e.pageX - el.offsetLeft
    const walk = (x - dragState.current.startX) * 1.5
    el.scrollLeft = dragState.current.scrollLeft - walk
  }, [])

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
    for (const c of classesQuery.data?.classes ?? []) {
      if (c.skillCount) m.set(c.id, c.skillCount)
    }
    for (const c of statsQuery.data?.classBreakdown ?? []) {
      if (c.classId != null) m.set(c.classId, c.count)
    }
    return m
  }, [classesQuery.data, statsQuery.data])

  const totalCount = statsQuery.data?.total ?? 0
  const classes = classesQuery.data?.classes ?? []
  // "All Classes" is active when nothing is selected.
  const allActive = classIds.length === 0
  const selectedCount = classIds.length

  return (
    <div className="sticky top-[97px] z-20 border-b border-amber-900/50 bg-bdo-ink/95 backdrop-blur supports-[backdrop-filter]:bg-bdo-ink/85">
      <div className="flex items-stretch gap-2 px-4 py-2 lg:px-6">
        {/* "All Classes" chip — distinctive grid icon. Clicking clears the selection. */}
        <button
          type="button"
          onClick={() => clearClasses()}
          className={cn(
            'relative flex shrink-0 flex-col items-center gap-1 rounded-sm border px-2.5 py-1.5 transition-all',
            allActive
              ? 'border-amber-400/80 bg-amber-500/10'
              : 'border-amber-900/40 bg-bdo-leather-dark hover:border-amber-600/60 hover:bg-amber-900/10',
          )}
          style={
            allActive
              ? { boxShadow: 'inset 0 0 0 1px rgba(240,208,96,0.45), 0 0 12px rgba(200,170,68,0.3)' }
              : { boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.6)', backgroundImage: 'linear-gradient(to bottom, #1a1612, #0d0a08)' }
          }
        >
          <div
            className="flex size-8 items-center justify-center rounded-sm border-2"
            style={{
              borderColor: allActive ? 'rgba(240,208,96,0.85)' : 'rgba(156,126,46,0.55)',
              background: 'radial-gradient(circle at center, #2a2218 0%, #0a0908 70%)',
              boxShadow: allActive
                ? 'inset 0 0 0 1px rgba(240,208,96,0.4), 0 0 8px rgba(200,170,68,0.4)'
                : 'inset 0 0 0 1px rgba(240,208,96,0.15), inset 0 0 6px rgba(0,0,0,0.6)',
            }}
          >
            <LayoutGrid className={cn('size-4', allActive ? 'text-amber-300' : 'text-amber-500/70')} />
          </div>
          <span className={cn('text-[10px] font-semibold leading-tight', allActive ? 'text-amber-200' : 'text-amber-100/70')}>
            All
          </span>
          {selectedCount > 0 ? (
            <span
              className="rounded-sm border border-amber-400/60 bg-amber-500/20 px-1.5 text-[9px] font-semibold tabular-nums text-amber-200"
              title={`${selectedCount} class${selectedCount === 1 ? '' : 'es'} selected — click to clear`}
            >
              {selectedCount} sel
            </span>
          ) : (
            <span className={cn('rounded-sm px-1.5 text-[9px] font-semibold tabular-nums', allActive ? 'bg-amber-500/25 text-amber-200' : 'bg-amber-950/60 text-amber-300/60')}>
              {totalCount.toLocaleString()}
            </span>
          )}
        </button>

        {/* Divider */}
        <div className="my-1 w-px self-stretch bg-gradient-to-b from-transparent via-amber-800/40 to-transparent" />

        {/* Class chips — horizontally scrollable with wheel + drag support. Multi-select: clicking toggles each class. */}
        <div
          ref={scrollRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          className="bdo-class-scroll flex flex-1 items-stretch gap-1.5 overflow-x-auto pb-1"
          style={{ cursor: 'grab' }}
          role="tablist"
          aria-multiselectable="true"
        >
          {classesQuery.isLoading
            ? Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-[78px] w-[68px] shrink-0 rounded-sm bg-bdo-leather-dark" />
              ))
            : classes
                .filter((c) => !c.name.startsWith('NEW_CLASS'))
                .map((c) => (
                  <ClassChip
                    key={c.id}
                    cls={c}
                    count={countMap.get(c.id) ?? c.skillCount ?? 0}
                    active={classIds.includes(c.id)}
                    specs={specs}
                    onClick={() => {
                      // Clicking the class icon selects it + activates appropriate specs
                      if (!classIds.includes(c.id)) {
                        clearClasses()
                        toggleClass(c.id)
                        // For ascension-only classes, activate ascension spec
                        // For normal classes, activate both succession + awakening
                        if (c.isAscension) {
                          if (!specs.includes('ascension')) toggleSpec('ascension')
                        } else {
                          if (!specs.includes('succession')) toggleSpec('succession')
                          if (!specs.includes('awakening')) toggleSpec('awakening')
                        }
                      } else {
                        toggleClass(c.id)
                      }
                    }}
                    onSpecClick={(s) => {
                      // Select the class if not already selected, then toggle spec
                      if (!classIds.includes(c.id)) {
                        clearClasses()
                        toggleClass(c.id)
                      }
                      toggleSpec(s)
                    }}
                  />
                ))}
        </div>
      </div>
    </div>
  )
}
