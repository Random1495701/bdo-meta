'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
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
  Gem,
  Ban,
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
  fetchRanges,
  type SkillType,
} from '@/lib/skills'
import { useSkillStore } from '@/lib/skill-store'
import { cn } from '@/lib/utils'

// Local helper to render a BDO-style section header with ornate dividers
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
      {icon && <span className="text-amber-500/80">{icon}</span>}
      <h3 className="bdo-heading text-[11px] uppercase tracking-widest">
        {children}
      </h3>
      {hint && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="ml-auto cursor-help text-[10px] text-amber-700/70">
              ⓘ
            </span>
          </TooltipTrigger>
          <TooltipContent side="left">{hint}</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

// Ornate gold divider
function GoldDivider() {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="bdo-divider flex-1" />
      <span className="text-amber-700/60 text-[10px]">✦</span>
      <div className="bdo-divider flex-1" />
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
        'inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium transition-all',
        active ? 'bdo-chip-on' : 'bdo-chip',
      )}
      style={
        active && color
          ? {
              borderColor: `${color}aa`,
              color: color,
              background: `linear-gradient(to bottom, ${color}33, ${color}11)`,
              boxShadow: `inset 0 0 0 1px ${color}44, 0 0 8px ${color}33`,
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
        className="bdo-input h-7 px-2 text-xs"
      />
      <span className="text-amber-700/70">–</span>
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
        className="bdo-input h-7 px-2 text-xs"
      />
      {suffix && (
        <span className="text-[10px] text-amber-700/70">{suffix}</span>
      )}
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
      <div className="flex items-center gap-2 text-sm text-amber-100/80">
        <span className="text-amber-500/70">{icon}</span>
        <span>{label}</span>
        {hint && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help text-[10px] text-amber-700/70">ⓘ</span>
            </TooltipTrigger>
            <TooltipContent side="top">{hint}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onToggle}
        className={cn(
          'data-[state=checked]:bg-amber-600 data-[state=unchecked]:bg-zinc-800',
        )}
      />
    </div>
  )
}

// Sticky badges at the top of the sidebar — inform the user about the
// server-applied max-rank and evasion filters.
function FilterNotice() {
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-sm border border-amber-800/40 bg-bdo-leather-dark px-2.5 py-1.5">
      <span className="text-[10px] text-amber-200/50 uppercase tracking-wider">
        Auto-filtered:
      </span>
      <span
        className="flex items-center gap-1 rounded-sm border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-200"
        title="Only the highest rank of each skill is shown — duplicates like 'Bolt Wave I/II/III' are hidden."
      >
        <Gem className="size-2.5" />
        Max-rank only
      </span>
      <span
        className="flex items-center gap-1 rounded-sm border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-200"
        title="Evasion-related movement skills (dashes, back-steps, evades) are excluded from results."
      >
        <Ban className="size-2.5" />
        Evasion hidden
      </span>
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

  // Fetch dynamic slider ranges from the API so the max values match the
  // actual data distribution (level 0–62, cd 0–1200s, anim 0–25000ms).
  const rangesQuery = useQuery({
    queryKey: ['ranges'],
    queryFn: fetchRanges,
    staleTime: 5 * 60_000,
  })
  const ranges = rangesQuery.data
  const lvlMin = ranges?.requiredLevel.min ?? 0
  const lvlMax = ranges?.requiredLevel.max ?? 62
  const cdMin = ranges?.cooldownSec.min ?? 0
  const cdMax = ranges?.cooldownSec.max ?? 1200
  const animMin = ranges?.animationDurationMs.min ?? 0
  const animMax = ranges?.animationDurationMs.max ?? 25000

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

  // Slider values use the dynamic max for the "open end" sentinel.
  const levelVals: [number, number] = [
    filters.minLvl ?? lvlMin,
    filters.maxLvl ?? lvlMax,
  ]
  const cdVals: [number, number] = [
    filters.minCd ?? cdMin,
    filters.maxCd ?? cdMax,
  ]
  const animVals: [number, number] = [
    filters.minAnim ?? animMin,
    filters.maxAnim ?? animMax,
  ]

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-amber-900/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-amber-400" />
            <h2 className="bdo-heading text-sm">Filters</h2>
            {activeCount > 0 && (
              <Badge className="border-amber-500/40 bg-amber-500/15 text-amber-200">
                {activeCount} active
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-7 px-2 text-xs text-amber-300/70 hover:text-amber-200"
          >
            <RotateCcw className="size-3.5" />
            Reset
          </Button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <FilterNotice />

          <GoldDivider />

          {/* Skill Type */}
          <section>
            <SectionTitle icon={<Crosshair className="size-3.5" />}>
              Skill Type
            </SectionTitle>
            <div className="flex flex-wrap gap-1.5">
              <Chip
                active={filters.type === 'all' || !filters.type}
                color="#c8aa44"
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

          <GoldDivider />

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
                  color="#5cbfd6"
                  onClick={() => setProtection(p)}
                >
                  {p}
                </Chip>
              ))}
            </div>
          </section>

          <GoldDivider />

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
                  color="#d6533a"
                  onClick={() => toggleCc(c)}
                >
                  {c}
                </Chip>
              ))}
            </div>
          </section>

          <GoldDivider />

          {/* Required Level */}
          <section>
            <SectionTitle icon={<Crosshair className="size-3.5" />}>
              Required Level
            </SectionTitle>
            <Slider
              min={lvlMin}
              max={lvlMax}
              step={1}
              value={levelVals}
              onValueChange={(v) =>
                setLevelRange(
                  v[0] === lvlMin ? undefined : v[0],
                  v[1] === lvlMax ? undefined : v[1],
                )
              }
              className="my-2"
            />
            <RangeInputs
              min={lvlMin}
              max={lvlMax}
              minVal={filters.minLvl}
              maxVal={filters.maxLvl}
              onMin={(v) => setLevelRange(v, filters.maxLvl)}
              onMax={(v) => setLevelRange(filters.minLvl, v)}
            />
          </section>

          <GoldDivider />

          {/* Cooldown */}
          <section>
            <SectionTitle icon={<Clock className="size-3.5" />}>
              Cooldown (sec)
            </SectionTitle>
            <Slider
              min={cdMin}
              max={cdMax}
              step={1}
              value={cdVals}
              onValueChange={(v) =>
                setCooldownRange(
                  v[0] === cdMin ? undefined : v[0],
                  v[1] === cdMax ? undefined : v[1],
                )
              }
              className="my-2"
            />
            <RangeInputs
              min={cdMin}
              max={cdMax}
              minVal={filters.minCd}
              maxVal={filters.maxCd}
              onMin={(v) => setCooldownRange(v, filters.maxCd)}
              onMax={(v) => setCooldownRange(filters.minCd, v)}
              suffix="s"
            />
          </section>

          <GoldDivider />

          {/* Animation Duration */}
          <section>
            <SectionTitle
              icon={<Film className="size-3.5" />}
              hint="Measured via ffprobe from the bdocodex preview video"
            >
              Animation Duration (ms)
            </SectionTitle>
            <Slider
              min={animMin}
              max={animMax}
              step={100}
              value={animVals}
              onValueChange={(v) =>
                setAnimRange(
                  v[0] === animMin ? undefined : v[0],
                  v[1] === animMax ? undefined : v[1],
                )
              }
              className="my-2"
            />
            <RangeInputs
              min={animMin}
              max={animMax}
              step={100}
              minVal={filters.minAnim}
              maxVal={filters.maxAnim}
              onMin={(v) => setAnimRange(v, filters.maxAnim)}
              onMax={(v) => setAnimRange(filters.minAnim, v)}
              suffix="ms"
            />
          </section>

          <GoldDivider />

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

          <GoldDivider />

          <Button
            className="bdo-btn w-full"
            onClick={resetFilters}
          >
            <RotateCcw className="size-4" />
            Reset All Filters
          </Button>

          <Label className="block pb-2 text-center text-[10px] text-amber-700/60">
            Filters apply instantly. Counts reset page to 1.
          </Label>
        </div>
      </div>
    </TooltipProvider>
  )
}
