'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { fetchSkills, type SkillFilters } from '@/lib/skills'
import { useSkillStore } from '@/lib/skill-store'
import { cn } from '@/lib/utils'

const PAGE_SIZE_OPTIONS = [12, 24, 48, 96]

function pageRange(page: number, totalPages: number): number[] {
  const range: number[] = []
  const max = 7
  if (totalPages <= max) {
    for (let i = 1; i <= totalPages; i++) range.push(i)
    return range
  }
  const left = Math.max(1, page - 2)
  const right = Math.min(totalPages, left + 4)
  range.push(1)
  if (left > 2) range.push(-1) // ellipsis
  for (let i = Math.max(2, left); i <= right; i++) range.push(i)
  if (right < totalPages - 1) range.push(-2)
  range.push(totalPages)
  return range
}

export function Pagination() {
  const filters = useSkillStore((s) => s.filters)
  const setPage = useSkillStore((s) => s.setPage)
  const setPageSize = useSkillStore((s) => s.setPageSize)

  const query = useQuery({
    queryKey: ['skills-meta', filters],
    queryFn: () => fetchSkills(filters as SkillFilters),
    placeholderData: (prev) => prev,
  })

  const data = query.data
  const total = data?.total ?? 0
  const page = data?.page ?? filters.page ?? 1
  const pageSize = data?.pageSize ?? filters.pageSize ?? 24
  const totalPages = data?.totalPages ?? 1
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  const range = pageRange(page, totalPages)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800/80 px-1 py-3">
      <div className="flex items-center gap-3 text-xs text-zinc-400">
        <span>
          Showing{' '}
          <span className="font-mono font-semibold text-zinc-200">{from}</span>
          {' – '}
          <span className="font-mono font-semibold text-zinc-200">{to}</span>
          {' of '}
          <span className="font-mono font-semibold text-zinc-200">
            {total.toLocaleString()}
          </span>{' '}
          skills
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500">Per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => setPageSize(Number(v))}
          >
            <SelectTrigger
              size="sm"
              className="h-7 w-[72px] border-zinc-800 bg-zinc-900/60 text-xs text-zinc-200"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-zinc-800 bg-zinc-900 text-zinc-100">
              {PAGE_SIZE_OPTIONS.map((n) => (
                <SelectItem
                  key={n}
                  value={String(n)}
                  className="focus:bg-amber-500/15 focus:text-amber-200"
                >
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="size-8 border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-300 disabled:opacity-30"
          onClick={() => setPage(1)}
          disabled={page <= 1}
          title="First page"
        >
          <ChevronsLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-8 border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-300 disabled:opacity-30"
          onClick={() => setPage(page - 1)}
          disabled={page <= 1}
          title="Previous page"
        >
          <ChevronLeft className="size-4" />
        </Button>

        {range.map((p) =>
          p < 0 ? (
            <span
              key={`gap-${p}`}
              className="px-2 text-xs text-zinc-600"
              aria-hidden
            >
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'default' : 'outline'}
              size="icon"
              className={cn(
                'h-8 w-8 text-xs tabular-nums',
                p === page
                  ? 'border-amber-500/60 bg-amber-500 text-zinc-950 hover:bg-amber-400'
                  : 'border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-300',
              )}
              onClick={() => setPage(p)}
            >
              {p}
            </Button>
          ),
        )}

        <Button
          variant="outline"
          size="icon"
          className="size-8 border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-300 disabled:opacity-30"
          onClick={() => setPage(page + 1)}
          disabled={page >= totalPages}
          title="Next page"
        >
          <ChevronRight className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-8 border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-300 disabled:opacity-30"
          onClick={() => setPage(totalPages)}
          disabled={page >= totalPages}
          title="Last page"
        >
          <ChevronsRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
