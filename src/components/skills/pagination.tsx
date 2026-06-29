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
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-amber-900/40 px-1 py-3">
      <div className="flex items-center gap-3 text-xs text-amber-200/60">
        <span>
          Showing{' '}
          <span className="font-mono font-semibold text-amber-100">{from}</span>
          {' – '}
          <span className="font-mono font-semibold text-amber-100">{to}</span>
          {' of '}
          <span className="font-mono font-semibold text-amber-100">
            {total.toLocaleString()}
          </span>{' '}
          skills
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-amber-200/40">Per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => setPageSize(Number(v))}
          >
            <SelectTrigger
              size="sm"
              className="bdo-input h-7 w-[72px] text-xs"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bdo-recessed border-amber-800/50 text-amber-100">
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
          className="bdo-btn size-8 p-0"
          onClick={() => setPage(1)}
          disabled={page <= 1}
          title="First page"
        >
          <ChevronsLeft className="size-4" />
        </Button>
        <Button
          className="bdo-btn size-8 p-0"
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
              className="px-2 text-xs text-amber-700/60"
              aria-hidden
            >
              …
            </span>
          ) : (
            <Button
              key={p}
              className={cn(
                'bdo-btn h-8 w-8 p-0 text-xs tabular-nums',
                p === page && 'bdo-chip-on',
              )}
              onClick={() => setPage(p)}
            >
              {p}
            </Button>
          ),
        )}

        <Button
          className="bdo-btn size-8 p-0"
          onClick={() => setPage(page + 1)}
          disabled={page >= totalPages}
          title="Next page"
        >
          <ChevronRight className="size-4" />
        </Button>
        <Button
          className="bdo-btn size-8 p-0"
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
