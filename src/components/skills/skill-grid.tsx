'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, SearchX, RotateCcw } from 'lucide-react'

import { fetchSkills, type SkillFilters } from '@/lib/skills'
import { useSkillStore } from '@/lib/skill-store'
import { SkillCard } from './skill-card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

// 15-second background refresh interval — keeps the grid up to date with
// lurker enrichment WITHOUT losing the user's scroll/filters/open drawer.
// placeholderData: (prev) => prev keeps old data visible while new data
// loads (no flicker, no full-screen loading state).
const REFETCH_INTERVAL_MS = 15_000

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 rounded-sm border border-amber-900/40 bg-bdo-leather p-3"
          style={{ boxShadow: 'inset 0 0 14px rgba(0,0,0,0.6)' }}
        >
          <div className="flex items-start gap-2.5">
            <Skeleton className="size-12 shrink-0 rounded-sm bg-amber-950/40" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/4 bg-amber-950/40" />
              <Skeleton className="h-3 w-1/2 bg-amber-950/40" />
            </div>
          </div>
          <div className="flex gap-1.5">
            <Skeleton className="h-4 w-16 rounded-sm bg-amber-950/40" />
            <Skeleton className="h-4 w-12 rounded-sm bg-amber-950/40" />
          </div>
          <div className="mt-2 flex justify-between border-t border-amber-900/30 pt-2">
            <Skeleton className="h-3 w-10 bg-amber-950/40" />
            <Skeleton className="h-3 w-10 bg-amber-950/40" />
            <Skeleton className="h-3 w-10 bg-amber-950/40" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-sm border border-dashed border-amber-800/50 bg-bdo-leather-dark px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-sm border border-amber-800/50 bg-bdo-leather text-amber-500/70">
        <SearchX className="size-6" />
      </div>
      <div>
        <h3 className="bdo-heading text-base text-amber-100">
          No skills match your filters
        </h3>
        <p className="mt-1 max-w-sm text-sm text-amber-200/50">
          Try widening level/cooldown ranges, clearing CC types, or switching
          the skill type filter to <span className="text-amber-300">All</span>.
        </p>
      </div>
      <Button className="bdo-btn" onClick={onReset}>
        <RotateCcw className="size-4" />
        Reset filters
      </Button>
    </div>
  )
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-sm border border-red-800/50 bg-red-950/20 px-6 py-12 text-center">
      <AlertCircle className="size-8 text-red-400" />
      <div>
        <h3 className="bdo-heading text-base text-red-200">
          Failed to load skills
        </h3>
        <p className="mt-1 text-sm text-red-300/70">{message}</p>
      </div>
      <Button
        className="bdo-btn"
        onClick={onRetry}
      >
        <RotateCcw className="size-4" />
        Retry
      </Button>
    </div>
  )
}

// Top loading bar — a 2px gold strip that animates across the top of the
// grid while a background refetch is in-flight. NOT a full-screen loading
// state (placeholderData keeps old data visible).
function TopLoadBar({ visible }: { visible: boolean }) {
  if (!visible) return null
  return (
    <div
      className="relative h-0.5 w-full overflow-hidden rounded-t-sm bg-amber-950/30"
      aria-hidden
    >
      <div className="bdo-loadbar absolute inset-0" />
    </div>
  )
}

export function SkillGrid() {
  const filters = useSkillStore((s) => s.filters)
  const resetFilters = useSkillStore((s) => s.resetFilters)

  // Filter out undefined values so the query key is stable.
  const queryKey = React.useMemo(() => {
    return ['skills', filters] as const
  }, [filters])

  // Strip undefined fields from the actual fetch payload.
  const cleanFilters: SkillFilters = React.useMemo(() => {
    const out: SkillFilters = { ...filters }
    return out
  }, [filters])

  const query = useQuery({
    queryKey,
    queryFn: () => fetchSkills(cleanFilters),
    placeholderData: (prev) => prev,
    refetchInterval: REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: true,
  })

  // Show the top load bar only on background refetches (not the initial
  // pending load, which uses the full skeleton instead).
  const showTopBar =
    query.isFetching && !query.isPending && !!query.data

  if (query.isPending) return <GridSkeleton />
  if (query.isError) {
    return (
      <>
        <TopLoadBar visible={showTopBar} />
        <ErrorState
          message={
            query.error instanceof Error
              ? query.error.message
              : 'Unknown error fetching skills.'
          }
          onRetry={() => query.refetch()}
        />
      </>
    )
  }

  const items = query.data?.items ?? []
  if (items.length === 0)
    return (
      <>
        <TopLoadBar visible={showTopBar} />
        <EmptyState onReset={resetFilters} />
      </>
    )

  return (
    <div className="relative">
      <TopLoadBar visible={showTopBar} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((skill) => (
          <SkillCard key={skill.id} skill={skill} />
        ))}
      </div>
    </div>
  )
}
