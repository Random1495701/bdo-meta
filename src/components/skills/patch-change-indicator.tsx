'use client'

import * as React from 'react'
import { TrendingUp, TrendingDown, CircleDot } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export interface PatchChange {
  direction: 'up' | 'down' | 'changed'
  fields: string[]
  before?: string
  after?: string
}

/**
 * Compact patch-change indicator. Renders a small lucide icon next to a skill
 * name when the skill was touched by the latest patch:
 *   - TrendingUp (green)  → buffed (direction: 'up')
 *   - TrendingDown (red)  → nerfed (direction: 'down')
 *   - CircleDot (yellow)  → reworked/changed (direction: 'changed')
 *
 * Hover the icon for a tooltip with the direction, changed fields, and an
 * optional before → after diff.
 *
 * Returns null when `patchChange` is null/undefined so callers can sprinkle
 * `<PatchChangeIndicator patchChange={skill.patchChange} />` without guards.
 */
export function PatchChangeIndicator({
  patchChange,
  className,
}: {
  patchChange: PatchChange | null | undefined
  className?: string
}) {
  if (!patchChange) return null

  const { direction, fields, before, after } = patchChange

  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : CircleDot
  const color =
    direction === 'up'
      ? 'text-emerald-400'
      : direction === 'down'
        ? 'text-red-400'
        : 'text-amber-300'

  const dirLabel =
    direction === 'up' ? 'Buffed' : direction === 'down' ? 'Nerfed' : 'Changed'

  const tooltipLines: React.ReactNode[] = [
    <div key="dir" className="font-bold text-amber-200">
      {dirLabel} in latest patch
    </div>,
  ]
  if (fields.length > 0) {
    tooltipLines.push(
      <div key="fields" className="text-amber-200/70">
        Fields: {fields.join(', ')}
      </div>,
    )
  }
  if (before != null || after != null) {
    tooltipLines.push(
      <div key="diff" className="mt-1 flex items-center gap-1.5 font-mono text-[10px]">
        {before != null && (
          <span className="text-red-300/80 line-through">{before}</span>
        )}
        <span className="text-amber-300/60">→</span>
        {after != null && <span className="text-emerald-300">{after}</span>}
      </div>,
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('inline-flex shrink-0 items-center', color, className)}>
          <Icon className="size-3.5" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px]">
        <div className="space-y-0.5">{tooltipLines}</div>
      </TooltipContent>
    </Tooltip>
  )
}
