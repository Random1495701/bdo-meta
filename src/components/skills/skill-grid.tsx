'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, SearchX, RotateCcw } from 'lucide-react'

import { fetchSkills, type SkillFilters } from '@/lib/skills'
import { useSkillStore } from '@/lib/skill-store'
import { SkillCard } from './skill-card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3"
        >
          <div className="flex items-start gap-2.5">
            <Skeleton className="size-12 shrink-0 rounded-md bg-zinc-800" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/4 bg-zinc-800" />
              <Skeleton className="h-3 w-1/2 bg-zinc-800" />
            </div>
          </div>
          <div className="flex gap-1.5">
            <Skeleton className="h-4 w-16 rounded-full bg-zinc-800" />
            <Skeleton className="h-4 w-12 rounded-full bg-zinc-800" />
          </div>
          <div className="mt-2 flex justify-between border-t border-zinc-800/60 pt-2">
            <Skeleton className="h-3 w-10 bg-zinc-800" />
            <Skeleton className="h-3 w-10 bg-zinc-800" />
            <Skeleton className="h-3 w-10 bg-zinc-800" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-500">
        <SearchX className="size-6" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-zinc-200">
          No skills match your filters
        </h3>
        <p className="mt-1 max-w-sm text-sm text-zinc-500">
          Try widening level/cooldown ranges, clearing CC types, or switching
          the skill type filter to <span className="text-amber-300">All</span>.
        </p>
      </div>
      <Button
        variant="outline"
        onClick={onReset}
        className="border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200"
      >
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
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-red-500/30 bg-red-500/5 px-6 py-12 text-center">
      <AlertCircle className="size-8 text-red-400" />
      <div>
        <h3 className="text-base font-semibold text-red-200">
          Failed to load skills
        </h3>
        <p className="mt-1 text-sm text-red-300/80">{message}</p>
      </div>
      <Button
        variant="outline"
        onClick={onRetry}
        className="border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200"
      >
        <RotateCcw className="size-4" />
        Retry
      </Button>
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
    // Leave undefined entries out — filtersToQuery already handles them.
    return out
  }, [filters])

  const query = useQuery({
    queryKey,
    queryFn: () => fetchSkills(cleanFilters),
    placeholderData: (prev) => prev,
  })

  if (query.isPending) return <GridSkeleton />
  if (query.isError) {
    return (
      <ErrorState
        message={
          query.error instanceof Error
            ? query.error.message
            : 'Unknown error fetching skills.'
        }
        onRetry={() => query.refetch()}
      />
    )
  }

  const items = query.data?.items ?? []
  if (items.length === 0) return <EmptyState onReset={resetFilters} />

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((skill) => (
        <SkillCard key={skill.id} skill={skill} />
      ))}
    </div>
  )
}
