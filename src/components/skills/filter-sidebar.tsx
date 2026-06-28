'use client'

import * as React from 'react'
import {
  RotateCcw,
  Filter,
  Shield,
  Zap,
  Clock,
  Film,
  Video,
  MousePointerClick,
  Crosshair,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import {
  PROTECTION_TYPES,
  CC_TYPES,
  SKILL_TYPE_META,
  type SkillType,
} from '@/lib/skills'
import { useSkillStore } from '@/lib/skill-store'
import { cn } from '@/lib/utils'

// Local helper to render a section header
function SectionTitle({
  icon,
  children,
  hint,
}: {
  icon?: React.ReactNode
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div className="mb-2 flex items-center gap-1.5">
      {icon && <span className="text-zinc-500">{icon}</span>}
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        {children}
      </h3>
      {hint && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="ml-auto cursor-help text-[10px] text-zinc-600">
              ⓘ
            </span>
          </TooltipTrigger>
          <TooltipContent side="left">{hint}</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

function Chip({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean
  color?: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all',
        active
          ? 'border-transparent text-zinc-50'
          : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800/60 hover:text-zinc-200',
      )}
      style={
        active && color
          ? {
              backgroundColor: `${color}26`,
              borderColor: `${color}80`,
              color: color,
            }
          : undefined
      }
    >
      {color && (
        <span
          className="size-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      {children}
    </button>
  )
}

function RangeInputs({
  min,
  max,
  minVal,
  maxVal,
  onMin,
  onMax,
  step = 1,
  suffix,
}: {
  min: number
  max: number
  minVal: number | undefined
  maxVal: number | undefined
  onMin: (v: number | undefined) => void
  onMax: (v: number | undefined) => void
  step?: number
  suffix?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={min}
        max={max}
        step={step}
        value={minVal ?? ''}
        placeholder={String(min)}
        onChange={(e) =>
          onMin(e.target.value === '' ? undefined : Number(e.target.value))
        }
        className="h-8 border-zinc-800 bg-zinc-900/60 text-xs text-zinc-200 focus-visible:border-amber-500/50"
      />
      <span className="text-zinc-600">–</span>
      <Input
        type="number"
        min={min}
        max={max}
        step={step}
        value={maxVal ?? ''}
        placeholder={String(max)}
        onChange={(e) =>
          onMax(e.target.value === '' ? undefined : Number(e.target.value))
        }
        className="h-8 border-zinc-800 bg-zinc-900/60 text-xs text-zinc-200 focus-visible:border-amber-500/50"
      />
      {suffix && <span className="text-[10px] text-zinc-500">{suffix}</span>}
    </div>
  )
}

function ToggleRow({
  icon,
  label,
  hint,
  checked,
  onToggle,
}: {
  icon: React.ReactNode
  label: string
  hint?: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <div className="flex items-center gap-2 text-sm text-zinc-300">
        <span className="text-zinc-500">{icon}</span>
        <span>{label}</span>
        {hint && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help text-[10px] text-zinc-600">ⓘ</span>
            </TooltipTrigger>
            <TooltipContent side="top">{hint}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onToggle}
        className={cn(
          'data-[state=checked]:bg-amber-500 data-[state=unchecked]:bg-zinc-700',
        )}
      />
    </div>
  )
}

export function FilterSidebar() {
  const filters = useSkillStore((s) => s.filters)
  const setType = useSkillStore((s) => s.setType)
  const setProtection = useSkillStore((s) => s.setProtection)
  const toggleCc = useSkillStore((s) => s.toggleCc)
  const setLevelRange = useSkillStore((s) => s.setLevelRange)
  const setCooldownRange = useSkillStore((s) => s.setCooldownRange)
  const setAnimRange = useSkillStore((s) => s.setAnimRange)
  const toggleHasVideo = useSkillStore((s) => s.toggleHasVideo)
  const toggleHasAnim = useSkillStore((s) => s.toggleHasAnim)
  const toggleQuickslot = useSkillStore((s) => s.toggleQuickslot)
  const resetFilters = useSkillStore((s) => s.resetFilters)

  // Compute active filter count for the badge
  const activeCount = React.useMemo(() => {
    let n = 0
    if (filters.type && filters.type !== 'all') n++
    if (filters.protection) n++
    if (filters.cc && filters.cc.length) n++
    if (filters.minLvl != null || filters.maxLvl != null) n++
    if (filters.minCd != null || filters.maxCd != null) n++
    if (filters.minAnim != null || filters.maxAnim != null) n++
    if (filters.hasVideo) n++
    if (filters.hasAnim) n++
    if (filters.quickslot) n++
    return n
  }, [filters])

  const typeEntries = Object.entries(SKILL_TYPE_META) as [
    SkillType,
    (typeof SKILL_TYPE_META)[SkillType],
  ][]

  const levelVals: [number, number] = [
    filters.minLvl ?? 1,
    filters.maxLvl ?? 100,
  ]
  const cdVals: [number, number] = [
    filters.minCd ?? 0,
    filters.maxCd ?? 600,
  ]
  const animVals: [number, number] = [
    filters.minAnim ?? 0,
    filters.maxAnim ?? 10000,
  ]

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-zinc-100">Filters</h2>
            {activeCount > 0 && (
              <Badge className="border-amber-500/30 bg-amber-500/15 text-amber-300">
                {activeCount} active
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-7 px-2 text-xs text-zinc-400 hover:text-amber-300"
          >
            <RotateCcw className="size-3.5" />
            Reset
          </Button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          {/* Skill Type */}
          <section>
            <SectionTitle icon={<Crosshair className="size-3.5" />}>
              Skill Type
            </SectionTitle>
            <div className="flex flex-wrap gap-1.5">
              <Chip
                active={filters.type === 'all' || !filters.type}
                color="#f59e0b"
                onClick={() => setType('all')}
              >
                All
              </Chip>
              {typeEntries.map(([key, meta]) => (
                <Chip
                  key={key}
                  active={filters.type === key}
                  color={meta.color}
                  onClick={() =>
                    setType(filters.type === key ? 'all' : key)
                  }
                >
                  {meta.label}
                </Chip>
              ))}
            </div>
          </section>

          <Separator className="bg-zinc-800/60" />

          {/* Protection */}
          <section>
            <SectionTitle icon={<Shield className="size-3.5" />}>
              Protection
            </SectionTitle>
            <div className="flex flex-wrap gap-1.5">
              <Chip
                active={filters.protection === 'none'}
                color="#71717a"
                onClick={() => setProtection('none')}
              >
                None
              </Chip>
              {PROTECTION_TYPES.map((p) => (
                <Chip
                  key={p}
                  active={filters.protection === p}
                  color="#22d3ee"
                  onClick={() => setProtection(p)}
                >
                  {p}
                </Chip>
              ))}
            </div>
          </section>

          <Separator className="bg-zinc-800/60" />

          {/* CC Types */}
          <section>
            <SectionTitle
              icon={<Zap className="size-3.5" />}
              hint="Multi-select — match skills with ANY of these CC effects"
            >
              CC Types
            </SectionTitle>
            <div className="flex flex-wrap gap-1.5">
              {CC_TYPES.map((c) => (
                <Chip
                  key={c}
                  active={filters.cc?.includes(c) ?? false}
                  color="#ef4444"
                  onClick={() => toggleCc(c)}
                >
                  {c}
                </Chip>
              ))}
            </div>
          </section>

          <Separator className="bg-zinc-800/60" />

          {/* Required Level */}
          <section>
            <SectionTitle icon={<Crosshair className="size-3.5" />}>
              Required Level
            </SectionTitle>
            <Slider
              min={1}
              max={100}
              step={1}
              value={levelVals}
              onValueChange={(v) =>
                setLevelRange(
                  v[0] === 1 ? undefined : v[0],
                  v[1] === 100 ? undefined : v[1],
                )
              }
              className="my-2"
            />
            <RangeInputs
              min={1}
              max={100}
              minVal={filters.minLvl}
              maxVal={filters.maxLvl}
              onMin={(v) => setLevelRange(v, filters.maxLvl)}
              onMax={(v) => setLevelRange(filters.minLvl, v)}
            />
          </section>

          <Separator className="bg-zinc-800/60" />

          {/* Cooldown */}
          <section>
            <SectionTitle icon={<Clock className="size-3.5" />}>
              Cooldown (sec)
            </SectionTitle>
            <Slider
              min={0}
              max={600}
              step={1}
              value={cdVals}
              onValueChange={(v) =>
                setCooldownRange(
                  v[0] === 0 ? undefined : v[0],
                  v[1] === 600 ? undefined : v[1],
                )
              }
              className="my-2"
            />
            <RangeInputs
              min={0}
              max={600}
              minVal={filters.minCd}
              maxVal={filters.maxCd}
              onMin={(v) => setCooldownRange(v, filters.maxCd)}
              onMax={(v) => setCooldownRange(filters.minCd, v)}
              suffix="s"
            />
          </section>

          <Separator className="bg-zinc-800/60" />

          {/* Animation Duration */}
          <section>
            <SectionTitle
              icon={<Film className="size-3.5" />}
              hint="Measured via ffprobe from the bdocodex preview video"
            >
              Animation Duration (ms)
            </SectionTitle>
            <Slider
              min={0}
              max={10000}
              step={50}
              value={animVals}
              onValueChange={(v) =>
                setAnimRange(
                  v[0] === 0 ? undefined : v[0],
                  v[1] === 10000 ? undefined : v[1],
                )
              }
              className="my-2"
            />
            <RangeInputs
              min={0}
              max={10000}
              step={50}
              minVal={filters.minAnim}
              maxVal={filters.maxAnim}
              onMin={(v) => setAnimRange(v, filters.maxAnim)}
              onMax={(v) => setAnimRange(filters.minAnim, v)}
              suffix="ms"
            />
          </section>

          <Separator className="bg-zinc-800/60" />

          {/* Toggles */}
          <section className="space-y-1">
            <SectionTitle>Toggles</SectionTitle>
            <ToggleRow
              icon={<Video className="size-4" />}
              label="Has video preview"
              checked={!!filters.hasVideo}
              onToggle={toggleHasVideo}
            />
            <ToggleRow
              icon={<Film className="size-4" />}
              label="Has animation duration"
              hint="Skill has been measured by ffprobe"
              checked={!!filters.hasAnim}
              onToggle={toggleHasAnim}
            />
            <ToggleRow
              icon={<MousePointerClick className="size-4" />}
              label="Quick-slotable"
              checked={!!filters.quickslot}
              onToggle={toggleQuickslot}
            />
          </section>

          <Separator className="bg-zinc-800/60" />

          <Button
            variant="outline"
            className="w-full border-zinc-700 bg-zinc-900/60 text-zinc-200 hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-300"
            onClick={resetFilters}
          >
            <RotateCcw className="size-4" />
            Reset All Filters
          </Button>

          <Label className="block pb-2 text-center text-[10px] text-zinc-600">
            Filters apply instantly. Counts reset page to 1.
          </Label>
        </div>
      </div>
    </TooltipProvider>
  )
}
