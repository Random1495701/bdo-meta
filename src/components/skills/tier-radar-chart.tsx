'use client'

// Tier Radar Chart — visualizes one class at a time across all weighted
// score parameters (the 12 params defined in SCORE_PARAMS).
// All available spec entries (Awakening / Succession / Ascension) for the
// selected class are overlaid as separate radar polygons so the user can
// compare specs at a glance.
//
// Values are normalized 0-100 across ALL class/spec entries (using the
// same min-max ranges computed by the parent TierListPage), so the outer
// ring represents the best value in the dataset and the center the worst.
// The Tooltip also surfaces the raw value (e.g. "12.3k", "5", "70%").

import * as React from 'react'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { Radar as RadarIcon, Info, ChevronRight } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { classColor, classIconUrl, SPEC_COLORS } from '@/lib/skills'
import { cn } from '@/lib/utils'
import {
  SCORE_PARAMS,
  CATEGORY_META,
  getParamValue,
  formatParamValue,
} from './tier-list-page'
import type { ParamKey, TierEntry, SpecName } from './tier-list-page'

// ─── Props ─────────────────────────────────────────────────────────

interface NormalizedRange {
  min: number
  max: number
}

interface TierRadarChartProps {
  entries: TierEntry[]
  ranges: Record<ParamKey, NormalizedRange>
}

// ─── Constants ─────────────────────────────────────────────────────

const SPEC_ORDER: SpecName[] = ['awakening', 'succession', 'ascension']

const SPEC_LABEL: Record<SpecName, string> = {
  awakening: 'Awakening',
  succession: 'Succession',
  ascension: 'Ascension',
}

// ─── Recharts data shape ───────────────────────────────────────────
// One datum per score parameter; the dynamic spec keys
// (e.g. `awakening`, `succession`, `ascension`) carry the normalized
// 0-100 values that recharts plots. The `<spec>__raw` keys hold the
// original raw values used by the Tooltip for display.

interface RadarDatum {
  paramKey: ParamKey
  param: string // short label, used by PolarAngleAxis
  fullName: string
  category: string
  [specOrRaw: string]: ParamKey | string | number
}

// ─── Custom Tooltip ────────────────────────────────────────────────

interface TooltipPayloadEntry {
  dataKey: string
  value: number
  color: string
  name?: string
  payload: RadarDatum
}

interface RadarTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string | number
}

function RadarTooltip({ active, payload }: RadarTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0].payload
  const paramKey = point.paramKey
  return (
    <div className="rounded-sm border border-amber-800/60 bg-bdo-ink/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <div className="mb-1 font-semibold text-amber-200">{point.fullName}</div>
      <div className="mb-1.5 text-[9px] uppercase tracking-wider text-amber-300/50">
        {point.category}
      </div>
      <div className="space-y-1">
        {payload.map(entry => {
          const specName = entry.dataKey as SpecName
          const rawKey = `${specName}__raw`
          const raw = (point[rawKey] as number) ?? 0
          return (
            <div key={specName} className="flex items-center gap-2">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-amber-100">{SPEC_LABEL[specName]}</span>
              <span className="ml-auto font-mono font-bold text-amber-200">
                {formatParamValue(paramKey, raw)}
              </span>
              <span className="text-[9px] text-amber-300/40">
                ({entry.value}/100)
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────

export function TierRadarChart({ entries, ranges }: TierRadarChartProps) {
  // Group entries by class name (sorted alphabetically)
  const classGroups = React.useMemo(() => {
    const map = new Map<string, TierEntry[]>()
    for (const e of entries) {
      if (!map.has(e.className)) map.set(e.className, [])
      map.get(e.className)!.push(e)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [entries])

  // Currently selected class (defaults to the first one)
  const [selectedClass, setSelectedClass] = React.useState<string>(
    classGroups[0]?.[0] ?? '',
  )

  // Reset selection if it's no longer in the list (e.g. after a data
  // reload that returns a different class set)
  React.useEffect(() => {
    if (!classGroups.some(([n]) => n === selectedClass)) {
      setSelectedClass(classGroups[0]?.[0] ?? '')
    }
  }, [classGroups, selectedClass])

  const selectedSpecs: TierEntry[] = React.useMemo(
    () => classGroups.find(([n]) => n === selectedClass)?.[1] ?? [],
    [classGroups, selectedClass],
  )

  // Build the radar data — one entry per score parameter, with each
  // available spec for the selected class getting its own normalized
  // 0-100 value (and a `__raw` companion for the Tooltip).
  const radarData: RadarDatum[] = React.useMemo(() => {
    return SCORE_PARAMS.map(p => {
      const point: RadarDatum = {
        paramKey: p.key,
        param: p.short,
        fullName: p.label,
        category: p.category,
      }
      for (const specEntry of selectedSpecs) {
        const raw = getParamValue(specEntry, p.key)
        const r = ranges[p.key] ?? { min: 0, max: 1 }
        const norm = r.max > r.min ? (raw - r.min) / (r.max - r.min) : 0
        point[`${specEntry.spec}__raw`] = raw
        point[specEntry.spec] = Math.round(norm * 100)
      }
      return point
    })
  }, [selectedSpecs, ranges])

  // Empty state — data still loading
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <RadarIcon className="mb-4 size-12 text-amber-400/30" />
        <p className="text-sm font-semibold text-amber-200">
          No data available
        </p>
        <p className="mt-1 text-xs text-amber-300/40">
          Waiting for class metadata to load…
        </p>
      </div>
    )
  }

  const color = classColor(selectedClass)
  const iconUrl = selectedSpecs[0] ? classIconUrl(selectedSpecs[0].slug) : null

  return (
    <div className="space-y-4">
      {/* Intro / info banner */}
      <div className="rounded-sm border border-amber-800/30 bg-bdo-leather-dark/20 p-3">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 size-3.5 shrink-0 text-amber-400/70" />
          <p className="text-[10px] leading-relaxed text-amber-300/50">
            Radar chart shows the selected class&apos;s spec entries (Awakening /
            Succession / Ascension) across all {SCORE_PARAMS.length} scoring
            parameters. Values are{' '}
            <span className="text-amber-300">normalized 0–100</span> across all
            classes for each parameter — the outer ring is the best in the
            dataset, the center is the worst. Hover any axis point for exact
            values.
          </p>
        </div>
      </div>

      {/* Class selector + spec legend */}
      <div className="flex flex-wrap items-center gap-3 rounded-sm border border-amber-800/30 bg-bdo-leather-dark/30 p-3">
        <div className="flex items-center gap-2">
          <RadarIcon className="size-4 text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
            Class
          </span>
        </div>
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger
            className="w-[220px] border-amber-800/50 bg-bdo-ink/60 text-sm text-amber-100 hover:border-amber-500/50"
            aria-label="Select class"
          >
            <SelectValue placeholder="Select a class…" />
          </SelectTrigger>
          <SelectContent className="max-h-[320px] border-amber-800/60 bg-bdo-ink text-amber-100">
            {classGroups.map(([name]) => (
              <SelectItem
                key={name}
                value={name}
                className="focus:bg-amber-500/15 focus:text-amber-200 data-[highlighted]:bg-amber-500/15"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: classColor(name) }}
                  />
                  {name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Spec legend */}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {SPEC_ORDER.map(spec => {
            const has = selectedSpecs.some(e => e.spec === spec)
            const specColor = SPEC_COLORS[spec]
            return (
              <div
                key={spec}
                className={cn(
                  'flex items-center gap-1.5 rounded-sm border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider transition-all',
                  has
                    ? 'border-amber-800/40 text-amber-100'
                    : 'border-amber-900/30 text-amber-300/30 opacity-60',
                )}
                style={
                  has ? { boxShadow: `inset 0 0 0 1px ${specColor}33` } : undefined
                }
                title={has ? `${SPEC_LABEL[spec]} available` : `${SPEC_LABEL[spec]} not available for this class`}
              >
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: has ? specColor : 'rgba(180,83,9,0.3)' }}
                />
                {SPEC_LABEL[spec]}
              </div>
            )
          })}
        </div>
      </div>

      {/* Chart + parameter breakdown */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        {/* Radar chart card */}
        <div className="rounded-sm border border-amber-800/40 bg-bdo-leather-dark/30 p-3">
          <div className="mb-2 flex items-center gap-2">
            {iconUrl && (
              <div
                className="size-7 shrink-0 overflow-hidden rounded-sm border"
                style={{ borderColor: `${color}55` }}
              >
                <img
                  src={iconUrl}
                  alt={selectedClass}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-sm font-bold" style={{ color }}>
                {selectedClass || '—'}
              </div>
              <div className="truncate text-[10px] text-amber-300/40">
                {selectedSpecs.length} spec
                {selectedSpecs.length === 1 ? '' : 's'} available ·{' '}
                {selectedSpecs.map(s => SPEC_LABEL[s.spec]).join(' / ') || 'none'}
              </div>
            </div>
          </div>

          <div className="h-[450px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart
                data={radarData}
                outerRadius="78%"
                margin={{ top: 16, right: 32, bottom: 16, left: 32 }}
              >
                <PolarGrid
                  stroke="#92400e"
                  strokeOpacity={0.45}
                  strokeDasharray="2 3"
                />
                <PolarAngleAxis
                  dataKey="param"
                  tick={{ fill: '#fcd34d', fontSize: 11, fontWeight: 600 }}
                  stroke="#92400e"
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: 'rgba(252,211,77,0.4)', fontSize: 9 }}
                  tickCount={5}
                  stroke="rgba(146,64,14,0.3)"
                  axisLine={false}
                />
                <Tooltip
                  content={<RadarTooltip />}
                  cursor={{
                    stroke: '#fcd34d',
                    strokeOpacity: 0.4,
                    strokeWidth: 1,
                  }}
                />
                {SPEC_ORDER.map(spec => {
                  const specEntry = selectedSpecs.find(e => e.spec === spec)
                  if (!specEntry) return null
                  const specColor = SPEC_COLORS[spec]
                  return (
                    <Radar
                      key={spec}
                      name={SPEC_LABEL[spec]}
                      dataKey={spec}
                      stroke={specColor}
                      strokeWidth={2}
                      fill={specColor}
                      fillOpacity={0.18}
                      dot={{
                        r: 3,
                        fill: specColor,
                        stroke: '#0a0908',
                        strokeWidth: 1,
                      }}
                      activeDot={{
                        r: 5,
                        fill: specColor,
                        stroke: '#fcd34d',
                        strokeWidth: 1.5,
                      }}
                      isAnimationActive
                      animationDuration={400}
                    />
                  )
                })}
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Parameter breakdown table — raw values + mini bars per spec */}
        <div className="rounded-sm border border-amber-800/40 bg-bdo-leather-dark/30 p-3">
          <div className="mb-2 flex items-center gap-2">
            <ChevronRight className="size-3.5 text-amber-400/70" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Parameter Breakdown
            </h3>
          </div>
          <div className="space-y-1">
            {SCORE_PARAMS.map(p => {
              const catMeta = CATEGORY_META[p.category]
              return (
                <div
                  key={p.key}
                  className="rounded-sm border border-amber-900/20 bg-bdo-ink/40 p-1.5"
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: catMeta.color }}
                    />
                    <span
                      className="truncate text-[10px] font-semibold text-amber-100/80"
                      title={p.description}
                    >
                      {p.label}
                    </span>
                  </div>
                  <div className="mt-1 flex items-stretch gap-1.5">
                    {SPEC_ORDER.map(spec => {
                      const specEntry = selectedSpecs.find(e => e.spec === spec)
                      const specColor = SPEC_COLORS[spec]
                      const raw = specEntry ? getParamValue(specEntry, p.key) : null
                      const r = ranges[p.key] ?? { min: 0, max: 1 }
                      const norm =
                        raw != null && r.max > r.min
                          ? (raw - r.min) / (r.max - r.min)
                          : 0
                      return (
                        <div key={spec} className="flex-1">
                          <div className="flex items-center gap-1">
                            <span
                              className="size-1.5 rounded-full"
                              style={{
                                backgroundColor: specEntry
                                  ? specColor
                                  : 'rgba(180,83,9,0.3)',
                              }}
                            />
                            <span className="text-[8px] uppercase text-amber-300/40">
                              {spec.slice(0, 4)}
                            </span>
                            <span className="ml-auto font-mono text-[10px] font-bold text-amber-200">
                              {specEntry ? formatParamValue(p.key, raw!) : '—'}
                            </span>
                          </div>
                          <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-amber-900/30">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${norm * 100}%`,
                                backgroundColor: specEntry ? specColor : 'transparent',
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
