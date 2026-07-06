'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor,
  useDraggable, useDroppable, closestCenter, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import {
  Swords, Pin, PinOff, X, ArrowUp,
  ShieldHalf, Search, Grip, Hand, Crown,
} from 'lucide-react'
import { classColor, classIconUrl, SPEC_COLORS } from '@/lib/skills'
import { cn } from '@/lib/utils'
import {
  Command, CommandInput, CommandList, CommandItem, CommandGroup, CommandEmpty,
} from '@/components/ui/command'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'

// ─── Spec entries (shared type) ─────────────────────────────────────

type SpecName = 'awakening' | 'succession' | 'ascension'

interface SpecEntry {
  classId: number
  className: string
  slug: string
  combatType: string | null
  spec: SpecName
  group: string | null
  saDr: number
  stats: SpecStats
  isAscension: boolean
}

// ─── SA DR heatmap helper ───────────────────────────────────────────
// Interpolates a color from amber (10% — lowest/default) to bright
// green (25% — best). Returns inline rgba() string for backgroundColor
// (kept for the Arena chips which still use the heatmap visual), plus a
// text color used by the redesigned matchup table to color the number
// itself (no background fill) — see task UI-REBUILD Feature 3.
function getSaDrColor(saDr: number): { bg: string; text: string; border: string } {
  // Clamp to 10..25 range; t = 0 at 10%, t = 1 at 25%
  const t = Math.max(0, Math.min(1, (saDr - 10) / 15))
  // amber (245,158,11) → bright green (34,197,94)
  const r = Math.round(245 + (34 - 245) * t)
  const g = Math.round(158 + (197 - 158) * t)
  const b = Math.round(11 + (94 - 11) * t)
  const alpha = 0.25 + t * 0.30 // 0.25 at 10%, 0.55 at 25%
  return {
    bg: `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`,
    text: `rgb(${r}, ${g}, ${b})`,
    border: `rgba(${r}, ${g}, ${b}, 0.75)`,
  }
}

// ─── Team entry helpers ─────────────────────────────────────────────

const entryKey = (e: SpecEntry) => `${e.classId}:${e.spec}`

interface SpecStats {
  skillCount: number
  avgPvpDamage: number
  medianPvpDamage: number
  pvpCcSkillCount: number
  // Granular CC breakdown — only populated for awakening/succession specs.
  specInheritedCcCount: number // Prime:/Succession: (Succ) or Absolute: (Awk) CC skills
  weaponOnlyCcCount: number    // Awakening-weapon CC skills (Awk only); 0 for Succession
  mainAbsoCcCount: number      // Main-weapon + Absolute fallback CC skills
  grabCount: number
  superArmorCount: number
  forwardGuardCount: number
  iFrameCount: number
  coreSaCount: number
  coreFgCount: number
  protectedSkillCount: number
  topPvpDamageSkill: { skillId: number; name: string; damage: number } | null
  dpsEstimate: number
  avgDpc: number
  protectedCoverage: number
}

interface ClassStats {
  classId: number
  className: string
  slug: string
  combatType: string | null
  successionGroup: string | null
  awakeningGroup: string | null
  ascensionGroup: string | null
  successionSaDr: number
  awakeningSaDr: number
  ascensionSaDr: number
  isAscension: boolean
  awakening: SpecStats
  succession: SpecStats
  ascension: SpecStats
}

const GROUP_COLORS: Record<string, string> = {
  Vanguard: '#ef4444',
  Pulverizer: '#f97316',
  Skirmisher: '#3b82f6',
}

const GROUP_ICONS: Record<string, string> = {
  Vanguard: '🛡',
  Pulverizer: '💥',
  Skirmisher: '⚔',
}

const COUNTER_CYCLE: Record<string, string> = {
  Vanguard: 'Pulverizer',
  Pulverizer: 'Skirmisher',
  Skirmisher: 'Vanguard',
}

async function fetchMeta(): Promise<{ classes: ClassStats[] }> {
  const res = await fetch('/api/meta', { cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed: ${res.status}`)
  return res.json()
}

// ─── Pinned-classes hook ────────────────────────────────────────────
// Persists a Set of class names that should sort to the top of the table
// and get a soft gold highlight. Stored under 'bdo-meta-pinned-classes'.
const PINNED_KEY = 'bdo-meta-pinned-classes'

function usePinnedClasses() {
  const [pinned, setPinned] = React.useState<Set<string>>(new Set())

  // Load from localStorage on first client render.
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(PINNED_KEY)
      if (raw) setPinned(new Set(JSON.parse(raw) as string[]))
    } catch {
      // ignore (private mode / corrupt JSON)
    }
  }, [])

  const persist = (next: Set<string>) => {
    setPinned(next)
    try {
      localStorage.setItem(PINNED_KEY, JSON.stringify(Array.from(next)))
    } catch {
      // ignore
    }
  }

  const toggle = (className: string) => {
    const next = new Set(pinned)
    if (next.has(className)) next.delete(className)
    else next.add(className)
    persist(next)
  }

  return { pinned, toggle }
}

// ─── buildClassRow ──────────────────────────────────────────────────
// Collapses a ClassStats into a single SpecEntry based on the active spec
// mode. 'all' picks the best spec per class (highest dpsEstimate, falling
// back to skillCount then saDr). For ascension-only classes, ascension is
// always returned (since they have no Awakening/Succession).
//
// Returns null when the requested spec has 0 skills on this class.
type SpecMode = 'all' | 'awakening' | 'succession' | 'ascension'

function buildClassRow(cls: ClassStats, specMode: SpecMode): SpecEntry | null {
  const make = (
    spec: SpecName,
    stats: SpecStats,
    group: string | null,
    saDr: number,
  ): SpecEntry => ({
    classId: cls.classId,
    className: cls.className,
    slug: cls.slug,
    combatType: cls.combatType,
    spec,
    group,
    saDr,
    stats,
    isAscension: cls.isAscension,
  })

  const candidates: SpecEntry[] = []
  if (cls.awakening.skillCount > 0) {
    candidates.push(make('awakening', cls.awakening, cls.awakeningGroup, cls.awakeningSaDr))
  }
  if (cls.succession.skillCount > 0) {
    candidates.push(make('succession', cls.succession, cls.successionGroup, cls.successionSaDr))
  }
  if (cls.ascension.skillCount > 0) {
    candidates.push(make('ascension', cls.ascension, cls.ascensionGroup, cls.ascensionSaDr))
  }
  if (candidates.length === 0) return null

  if (specMode === 'all') {
    // Best spec: highest dpsEstimate → skillCount → saDr
    candidates.sort((a, b) => {
      if (b.stats.dpsEstimate !== a.stats.dpsEstimate) {
        return b.stats.dpsEstimate - a.stats.dpsEstimate
      }
      if (b.stats.skillCount !== a.stats.skillCount) {
        return b.stats.skillCount - a.stats.skillCount
      }
      return b.saDr - a.saDr
    })
    return candidates[0]
  }

  const wanted: SpecName = specMode
  return candidates.find((c) => c.spec === wanted) ?? null
}

// ─── buildEntryFromSpec ────────────────────────────────────────────
// Builds a SpecEntry from a ClassStats + spec name. Used by the Arena
// drag-and-drop handler to materialize the dropped class into a team slot.
function buildEntryFromSpec(cls: ClassStats, spec: SpecName): SpecEntry | null {
  const stats = cls[spec]
  if (!stats || stats.skillCount === 0) return null
  const group = spec === 'awakening' ? cls.awakeningGroup
    : spec === 'succession' ? cls.successionGroup
    : cls.ascensionGroup
  const saDr = spec === 'awakening' ? cls.awakeningSaDr
    : spec === 'succession' ? cls.successionSaDr
    : cls.ascensionSaDr
  return {
    classId: cls.classId, className: cls.className, slug: cls.slug,
    combatType: cls.combatType, spec, group, saDr, stats,
    isAscension: cls.isAscension,
  }
}

// ─── Main component ─────────────────────────────────────────────────

export function MatchupsPage() {
  const metaQuery = useQuery({ queryKey: ['meta'], queryFn: fetchMeta, staleTime: 60_000 })
  // Arena of Solare is always expanded now — no arenaMode toggle.
  // Each team is a fixed-length 3-slot array (null = empty slot) so slots
  // are positionally stable for drag-and-drop targeting.
  const [teamA, setTeamA] = React.useState<(SpecEntry | null)[]>([null, null, null])
  const [teamB, setTeamB] = React.useState<(SpecEntry | null)[]>([null, null, null])
  // Per-class selected spec for the Arena class-grid cards (classId → spec).
  // Falls back to succession > awakening > ascension if unset.
  const [classSpec, setClassSpec] = React.useState<Record<number, SpecName>>({})
  // Active drag preview state — set on dragStart, cleared on dragEnd/cancel.
  const [activeDrag, setActiveDrag] = React.useState<{ classId: number; spec: SpecName } | null>(null)
  const [specMode, setSpecMode] = React.useState<SpecMode>('all')
  const [groupFilter, setGroupFilter] = React.useState<Set<string>>(new Set())

  const { pinned, toggle: togglePinned } = usePinnedClasses()

  const classes = metaQuery.data?.classes ?? []

  // Build spec-separated entries — each class×spec is a separate entry
  // because groups and SA DR differ per spec (per PA Wiki wikiNo=225).
  // Used by the Arena of Solare selector section (kept unchanged).
  const specEntries = React.useMemo<SpecEntry[]>(() => {
    const entries: SpecEntry[] = []
    for (const cls of classes) {
      if (cls.isAscension) {
        // Ascension-only class — single entry
        if (cls.ascension.skillCount > 0) {
          entries.push({
            classId: cls.classId, className: cls.className, slug: cls.slug,
            combatType: cls.combatType, spec: 'ascension',
            group: cls.ascensionGroup, saDr: cls.ascensionSaDr,
            stats: cls.ascension, isAscension: true,
          })
        }
      } else {
        // Normal class — separate entries for Succession and Awakening
        if (cls.succession.skillCount > 0) {
          entries.push({
            classId: cls.classId, className: cls.className, slug: cls.slug,
            combatType: cls.combatType, spec: 'succession',
            group: cls.successionGroup, saDr: cls.successionSaDr,
            stats: cls.succession, isAscension: false,
          })
        }
        if (cls.awakening.skillCount > 0) {
          entries.push({
            classId: cls.classId, className: cls.className, slug: cls.slug,
            combatType: cls.combatType, spec: 'awakening',
            group: cls.awakeningGroup, saDr: cls.awakeningSaDr,
            stats: cls.awakening, isAscension: false,
          })
        }
      }
    }
    // Sort by group, then class name, then spec
    return entries.sort((a, b) => {
      const groupCompare = (a.group || 'zzz').localeCompare(b.group || 'zzz')
      if (groupCompare !== 0) return groupCompare
      const nameCompare = a.className.localeCompare(b.className)
      if (nameCompare !== 0) return nameCompare
      return a.spec.localeCompare(b.spec)
    })
  }, [classes])

  // Group counts (from spec entries — for the Arena legend)
  const groupCounts = React.useMemo(() => {
    const counts: Record<string, number> = {}
    for (const c of specEntries) {
      if (c.group) counts[c.group] = (counts[c.group] || 0) + 1
    }
    return counts
  }, [specEntries])

  // Build the collapsed 31-row table — one entry per class, picked by specMode.
  const classRows = React.useMemo(() => {
    const rows: SpecEntry[] = []
    for (const cls of classes) {
      const row = buildClassRow(cls, specMode)
      if (row) rows.push(row)
    }
    return rows
  }, [classes, specMode])

  // Apply group filter — show classes whose ANY spec group matches a
  // selected filter group. When no filter is selected, all classes pass.
  const filteredRows = React.useMemo(() => {
    if (groupFilter.size === 0) return classRows
    return classRows.filter((row) => {
      const cls = classes.find((c) => c.classId === row.classId)
      if (!cls) return false
      const allGroups = new Set(
        [cls.awakeningGroup, cls.successionGroup, cls.ascensionGroup].filter(
          (g): g is string => !!g,
        ),
      )
      for (const g of groupFilter) {
        if (allGroups.has(g)) return true
      }
      return false
    })
  }, [classRows, groupFilter, classes])

  // Pinned classes sort to top, then by group → className.
  const sortedRows = React.useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      const ap = pinned.has(a.className) ? 0 : 1
      const bp = pinned.has(b.className) ? 0 : 1
      if (ap !== bp) return ap - bp
      const groupCompare = (a.group || 'zzz').localeCompare(b.group || 'zzz')
      if (groupCompare !== 0) return groupCompare
      return a.className.localeCompare(b.className)
    })
  }, [filteredRows, pinned])

  const toggleGroupFilter = (group: string) => {
    setGroupFilter((prev) => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }

  // Get counter relationship
  const getCounter = (group: string): string => COUNTER_CYCLE[group] || ''
  const getAdvantage = (attackerGroup: string, defenderGroup: string): 'up' | 'down' | 'neutral' => {
    if (!attackerGroup || !defenderGroup) return 'neutral'
    if (getCounter(attackerGroup) === defenderGroup) return 'up'
    if (getCounter(defenderGroup) === attackerGroup) return 'down'
    return 'neutral'
  }

  // ─── Arena of Solare: alphabetical class list + dnd-kit setup ──────
  // One card per class (with spec toggles on the card itself), sorted A→Z.
  const arenaClasses = React.useMemo(() => {
    return [...classes]
      .filter(c => c.awakening.skillCount > 0 || c.succession.skillCount > 0 || c.ascension.skillCount > 0)
      .sort((a, b) => a.className.localeCompare(b.className))
  }, [classes])

  // Non-null team entries (for the analysis section).
  const teamAEntries = React.useMemo(
    () => teamA.filter((e): e is SpecEntry => e !== null),
    [teamA],
  )
  const teamBEntries = React.useMemo(
    () => teamB.filter((e): e is SpecEntry => e !== null),
    [teamB],
  )

  // PointerSensor needs a small distance threshold so spec-toggle button
  // clicks don't accidentally start a drag.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  )

  const getCardSpec = (cls: ClassStats): SpecName => {
    const stored = classSpec[cls.classId]
    if (stored) return stored
    if (cls.isAscension) return 'ascension'
    if (cls.succession.skillCount > 0) return 'succession'
    return 'awakening'
  }

  const setCardSpec = (classId: number, spec: SpecName) => {
    setClassSpec(prev => ({ ...prev, [classId]: spec }))
  }

  const setSlot = (teamId: 'A' | 'B', slotIndex: number, entry: SpecEntry | null) => {
    const setter = teamId === 'A' ? setTeamA : setTeamB
    setter(prev => {
      const next = [...prev]
      next[slotIndex] = entry
      return next
    })
  }

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as
      | { type: string; classId: number; spec: SpecName }
      | undefined
    if (data?.type === 'class') {
      setActiveDrag({ classId: data.classId, spec: data.spec })
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDrag(null)
    const { active, over } = event
    if (!over) return
    const dragData = active.data.current as
      | { type: string; classId: number; spec: SpecName }
      | undefined
    const dropData = over.data.current as
      | { type: string; teamId: 'A' | 'B'; slotIndex: number }
      | undefined
    if (!dragData || dragData.type !== 'class' || !dropData || dropData.type !== 'slot') return
    const cls = classes.find(c => c.classId === dragData.classId)
    if (!cls) return
    const entry = buildEntryFromSpec(cls, dragData.spec)
    if (!entry) return
    setSlot(dropData.teamId, dropData.slotIndex, entry)
  }

  return (
    <div className="flex min-h-screen flex-col bg-bdo-ink text-zinc-100">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-amber-900/50 bg-bdo-ink/95 px-4 py-3 backdrop-blur lg:px-6">
        <div className="flex items-center gap-3">
          <Swords className="size-5 text-amber-400" />
          <div>
            <h1 className="bdo-title text-xl font-bold text-amber-400 sm:text-2xl">Class Matchups</h1>
            <p className="text-xs text-amber-200/50">
              One row per class · Pin classes to compare ratios · Filter by group · Toggle spec to collapse
            </p>
          </div>
        </div>

        {/* Counter cycle legend */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {['Vanguard', 'Pulverizer', 'Skirmisher'].map((group, i) => {
            const color = GROUP_COLORS[group]
            return (
              <React.Fragment key={group}>
                <div
                  className="flex items-center gap-1.5 rounded-sm border px-3 py-1"
                  style={{ borderColor: `${color}66`, backgroundColor: `${color}15` }}
                >
                  <span className="text-base">{GROUP_ICONS[group]}</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold" style={{ color }}>{group}</span>
                    <span className="text-[9px] text-amber-300/40">{groupCounts[group] || 0} specs</span>
                  </div>
                </div>
                {i < 2 && <span className="text-[10px] text-amber-400/40">→ counters →</span>}
              </React.Fragment>
            )
          })}
          <span className="text-[10px] text-amber-400/40">→ counters → (cycle)</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6 lg:px-6">
        {metaQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-sm border border-amber-900/30 bg-bdo-leather-dark" />
            ))}
          </div>
        ) : (
          <div className="mx-auto max-w-6xl space-y-4">
            {/* ═══ Arena of Solare (3v3) — always expanded, fully redesigned ═══ */}
            <ArenaOfSolareSection
              classes={classes}
              arenaClasses={arenaClasses}
              specEntries={specEntries}
              teamA={teamA}
              teamB={teamB}
              teamAEntries={teamAEntries}
              teamBEntries={teamBEntries}
              getCardSpec={getCardSpec}
              setCardSpec={setCardSpec}
              setSlot={setSlot}
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={() => setActiveDrag(null)}
              activeDrag={activeDrag}
              getAdvantage={getAdvantage}
              groupCounts={groupCounts}
            />

            {/* Spec selector + group filter chips */}
            <div className="flex flex-wrap items-center gap-2 rounded-sm border border-amber-800/30 bg-bdo-leather-dark/30 px-3 py-2">
              <span className="text-[10px] uppercase tracking-wider text-amber-300/40">Spec:</span>
              {(['all', 'awakening', 'succession', 'ascension'] as SpecMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setSpecMode(m)}
                  className={cn(
                    'rounded-sm border px-2.5 py-1 text-[10px] font-semibold uppercase transition-all',
                    specMode === m
                      ? 'text-amber-200'
                      : 'border-amber-800/40 bg-bdo-leather-dark/50 text-amber-300/50 hover:text-amber-200',
                  )}
                  style={
                    specMode === m
                      ? m === 'all'
                        ? { borderColor: '#c8aa44', backgroundColor: '#c8aa4415', color: '#f0d060' }
                        : { borderColor: SPEC_COLORS[m], backgroundColor: `${SPEC_COLORS[m]}15`, color: SPEC_COLORS[m] }
                      : undefined
                  }
                >
                  {m === 'all' ? 'ALL' : m === 'awakening' ? 'AWK' : m === 'succession' ? 'SUCC' : 'ASC'}
                </button>
              ))}

              <div className="mx-2 h-5 w-px bg-amber-800/40" />

              <span className="text-[10px] uppercase tracking-wider text-amber-300/40">Group:</span>
              {['Vanguard', 'Pulverizer', 'Skirmisher'].map((g) => {
                const color = GROUP_COLORS[g]
                const active = groupFilter.has(g)
                return (
                  <button
                    key={g}
                    onClick={() => toggleGroupFilter(g)}
                    className={cn(
                      'flex items-center gap-1 rounded-sm border px-2.5 py-1 text-[10px] font-semibold uppercase transition-all',
                      active ? 'text-amber-50' : 'bg-bdo-leather-dark/50 text-amber-300/50 hover:text-amber-200',
                    )}
                    style={
                      active
                        ? { borderColor: color, backgroundColor: `${color}22`, color }
                        : { borderColor: 'rgba(156,126,46,0.4)' }
                    }
                  >
                    <span>{GROUP_ICONS[g]}</span>
                    {g}
                  </button>
                )
              })}
              {groupFilter.size > 0 && (
                <button
                  onClick={() => setGroupFilter(new Set())}
                  className="ml-auto flex items-center gap-1 rounded-sm border border-amber-800/40 px-2 py-1 text-[10px] text-amber-300/60 hover:text-amber-200"
                >
                  <X className="size-3" /> Clear
                </button>
              )}

              <div className={cn('text-[10px] text-amber-300/40', groupFilter.size === 0 && 'ml-auto')}>
                {sortedRows.length} class{sortedRows.length === 1 ? '' : 'es'}
                {pinned.size > 0 && ` · ${pinned.size} pinned`}
              </div>
            </div>

            {/* Collapsed matchup table — one row per class */}
            <div className="overflow-x-auto rounded-sm border border-amber-800/30">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-amber-800/40 bg-bdo-leather-dark/50">
                    <th className="sticky left-0 z-10 bg-bdo-leather-dark/50 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-amber-300/50">
                      Class
                    </th>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-amber-300/50">Spec</th>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-amber-300/50">Group</th>
                    <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-amber-300/50">SA DR</th>
                    <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-amber-300/50">CC</th>
                    <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-amber-300/50">Grab</th>
                    <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-amber-300/50">DPC</th>
                    <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-amber-300/50">vs Vanguard</th>
                    <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-amber-300/50">vs Pulverizer</th>
                    <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-amber-300/50">vs Skirmisher</th>
                    <th className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-amber-300/50">Pin</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map(cls => {
                    const clsColor = classColor(cls.className)
                    const iconUrl = classIconUrl(cls.slug)
                    const isPinned = pinned.has(cls.className)
                    const saDrColor = getSaDrColor(cls.saDr)
                    const aboveAverage = cls.saDr > 10
                    return (
                      <tr
                        key={`${cls.classId}-${cls.spec}`}
                        className={cn(
                          'border-b border-amber-900/15 transition-colors',
                          isPinned ? 'bg-amber-500/10' : 'hover:bg-amber-500/5',
                        )}
                      >
                        <td className="sticky left-0 z-10 bg-bdo-ink/80 px-2 py-1.5">
                          <div className="flex items-center gap-2">
                            {iconUrl && (
                              <div className="size-6 shrink-0 overflow-hidden rounded-sm">
                                <img src={iconUrl} alt={cls.className} className="h-full w-full object-cover" loading="lazy" />
                              </div>
                            )}
                            <span className="font-semibold" style={{ color: clsColor }}>{cls.className}</span>
                            {isPinned && (
                              <Pin className="size-2.5 fill-amber-300 text-amber-300" aria-label="Pinned" />
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-1.5">
                          <span
                            className="rounded-sm px-1.5 py-0.5 text-[8px] font-bold uppercase"
                            style={{
                              color: SPEC_COLORS[cls.spec as keyof typeof SPEC_COLORS],
                              backgroundColor: `${SPEC_COLORS[cls.spec as keyof typeof SPEC_COLORS]}15`,
                            }}
                          >
                            {cls.spec === 'awakening' ? 'AWK' : cls.spec === 'succession' ? 'SUCC' : 'ASC'}
                          </span>
                        </td>
                        <td className="px-2 py-1.5">
                          {cls.group ? (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-semibold"
                              style={{ color: GROUP_COLORS[cls.group] }}
                              title={`${cls.group} — counters ${getCounter(cls.group)}`}
                            >
                              <span>{GROUP_ICONS[cls.group]}</span>
                              {cls.group}
                            </span>
                          ) : (
                            <span className="text-amber-300/30">—</span>
                          )}
                        </td>
                        {/* SA DR — colored number only (no background fill), with arrow when above-average */}
                        <td className="px-2 py-1.5 text-right">
                          <span
                            className="inline-flex items-center justify-end gap-0.5 font-mono text-xs font-bold tabular-nums"
                            style={{ color: saDrColor.text }}
                            title={`Super Armor Damage Reduction: ${cls.saDr}%`}
                          >
                            {aboveAverage && <ArrowUp className="size-2.5" strokeWidth={3} />}
                            {cls.saDr}%
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono text-xs tabular-nums text-red-300">{cls.stats.pvpCcSkillCount}</td>
                        <td className="px-2 py-1.5 text-right font-mono text-xs tabular-nums text-orange-300">{cls.stats.grabCount}</td>
                        <td className="px-2 py-1.5 text-right font-mono text-xs tabular-nums text-cyan-300">{cls.stats.avgDpc}</td>
                        {/* vs each group — counter advantage chips */}
                        {['Vanguard', 'Pulverizer', 'Skirmisher'].map(vsGroup => {
                          const adv = getAdvantage(cls.group || '', vsGroup)
                          return (
                            <td key={vsGroup} className="px-2 py-1.5 text-center">
                              <div className={cn(
                                'mx-auto flex size-6 items-center justify-center rounded-sm border text-[9px] font-bold',
                                adv === 'up' && 'border-emerald-500/50 bg-emerald-900/20 text-emerald-300',
                                adv === 'down' && 'border-red-500/50 bg-red-900/20 text-red-300',
                                adv === 'neutral' && 'border-amber-900/20 text-amber-300/30',
                              )}>
                                {adv === 'up' ? '+5%' : adv === 'down' ? '−5%' : '='}
                              </div>
                            </td>
                          )
                        })}
                        <td className="px-2 py-1.5 text-center">
                          <button
                            onClick={() => togglePinned(cls.className)}
                            className={cn(
                              'flex size-6 items-center justify-center rounded-sm border transition-all',
                              isPinned
                                ? 'border-amber-400/60 bg-amber-500/20 text-amber-200'
                                : 'border-amber-800/40 text-amber-300/30 hover:border-amber-500/40 hover:text-amber-200',
                            )}
                            title={isPinned ? 'Unpin' : 'Pin to top of table'}
                          >
                            {isPinned ? <PinOff className="size-3" /> : <Pin className="size-3" />}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {sortedRows.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-2 py-8 text-center text-xs text-amber-300/40">
                        No classes match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-[10px] text-amber-300/40">
              <span className="flex items-center gap-1">
                <ArrowUp className="size-3 text-emerald-400" strokeWidth={3} />
                Above-average SA DR (&gt;10%)
              </span>
              <span className="flex items-center gap-1">
                <span className="font-mono" style={{ color: getSaDrColor(10).text }}>10%</span>
                →
                <span className="font-mono" style={{ color: getSaDrColor(25).text }}>25%</span>
                : SA DR color scale (amber to green)
              </span>
              <span className="flex items-center gap-1">
                <Pin className="size-3 fill-amber-300 text-amber-300" />
                Pinned class
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════
// Arena of Solare (3v3) — Redesigned Sub-Components
// ═════════════════════════════════════════════════════════════════════
// Always-expanded section. Class selection grid is alphabetical, one big
// pretty card per class with spec toggles (S/A/Asc) + ratio-group color +
// SA-Advantage badge (SA DR > 10%) + Has-Grab badge. Drag-and-drop (or
// type-to-search in each slot) populates the two 3-slot team panels.
// A redesigned Team Advantage Analysis shows group-cycle matchup, SA DR
// comparison, grab count, and CC coverage as visual bars.

interface ArenaOfSolareSectionProps {
  classes: ClassStats[]
  arenaClasses: ClassStats[]
  specEntries: SpecEntry[]
  teamA: (SpecEntry | null)[]
  teamB: (SpecEntry | null)[]
  teamAEntries: SpecEntry[]
  teamBEntries: SpecEntry[]
  getCardSpec: (cls: ClassStats) => SpecName
  setCardSpec: (classId: number, spec: SpecName) => void
  setSlot: (teamId: 'A' | 'B', slotIndex: number, entry: SpecEntry | null) => void
  sensors: ReturnType<typeof useSensors>
  onDragStart: (event: DragStartEvent) => void
  onDragEnd: (event: DragEndEvent) => void
  onDragCancel: () => void
  activeDrag: { classId: number; spec: SpecName } | null
  getAdvantage: (a: string, b: string) => 'up' | 'down' | 'neutral'
  groupCounts: Record<string, number>
}

function ArenaOfSolareSection({
  classes, arenaClasses, specEntries, teamA, teamB,
  teamAEntries, teamBEntries,
  getCardSpec, setCardSpec, setSlot,
  sensors, onDragStart, onDragEnd, onDragCancel, activeDrag,
  getAdvantage, groupCounts,
}: ArenaOfSolareSectionProps) {
  const hasAnyTeamMember = teamAEntries.length > 0 || teamBEntries.length > 0

  return (
    <div className="rounded-sm border-2 border-amber-800/50 bg-bdo-leather-dark/30 p-4">
      {/* Header — always visible (no toggle) */}
      <div className="flex flex-wrap items-center gap-2">
        <Swords className="size-4 text-amber-400" />
        <h2 className="bdo-title text-sm font-bold text-amber-300">Arena of Solare (3v3)</h2>
        <span className="ml-auto flex flex-wrap items-center gap-2 text-[10px] text-amber-300/50">
          <span className="flex items-center gap-1"><Grip className="size-3" /> Drag class cards onto slots</span>
          <span className="text-amber-300/30">·</span>
          <span className="flex items-center gap-1"><Search className="size-3" /> Or type in a slot to search</span>
        </span>
      </div>

      {/* Group cycle legend */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {['Vanguard', 'Pulverizer', 'Skirmisher'].map((group, i) => {
          const color = GROUP_COLORS[group]
          return (
            <React.Fragment key={group}>
              <div
                className="flex items-center gap-1.5 rounded-sm border px-2.5 py-0.5"
                style={{ borderColor: `${color}66`, backgroundColor: `${color}15` }}
              >
                <span className="text-xs">{GROUP_ICONS[group]}</span>
                <span className="text-[10px] font-bold" style={{ color }}>{group}</span>
                <span className="text-[9px] text-amber-300/40">{groupCounts[group] || 0}</span>
              </div>
              {i < 2 && <span className="text-[9px] text-amber-400/40">counters ▸</span>}
            </React.Fragment>
          )
        })}
        <span className="text-[9px] text-amber-400/40">cycle</span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        {/* Teams side-by-side */}
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <TeamPanel
            teamId="A"
            team={teamA}
            specEntries={specEntries}
            onClearSlot={(i) => setSlot('A', i, null)}
            onPick={(i, e) => setSlot('A', i, e)}
          />
          <TeamPanel
            teamId="B"
            team={teamB}
            specEntries={specEntries}
            onClearSlot={(i) => setSlot('B', i, null)}
            onPick={(i, e) => setSlot('B', i, e)}
          />
        </div>

        {/* Team Advantage Analysis — visual bars, not just text */}
        {hasAnyTeamMember && (
          <TeamAdvantageAnalysis
            teamA={teamAEntries}
            teamB={teamBEntries}
            getAdvantage={getAdvantage}
          />
        )}

        {/* Class Selection Grid — alphabetical, big pretty cards */}
        <div className="mt-5">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="bdo-title text-xs font-bold uppercase tracking-wider text-amber-300/70">
              Class Selection ({arenaClasses.length})
            </h3>
            <span className="text-[10px] text-amber-300/40">
              Alphabetical · drag a card onto a team slot · click S/A/Asc to switch spec
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {arenaClasses.map(cls => (
              <ArenaClassCard
                key={cls.classId}
                cls={cls}
                selectedSpec={getCardSpec(cls)}
                onSpecChange={(spec) => setCardSpec(cls.classId, spec)}
              />
            ))}
          </div>
        </div>

        {/* Floating drag preview */}
        <DragOverlay dropAnimation={null}>
          {activeDrag && (() => {
            const cls = classes.find(c => c.classId === activeDrag.classId)
            if (!cls) return null
            return <ArenaClassCardPreview cls={cls} selectedSpec={activeDrag.spec} />
          })()}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

// ─── ArenaClassCard ────────────────────────────────────────────────
// One big pretty card per class. Portrait background, group-color border,
// spec toggles (S/A/Asc), SA-Advantage / Has-Grab badges, draggable.

interface ArenaClassCardProps {
  cls: ClassStats
  selectedSpec: SpecName
  onSpecChange: (spec: SpecName) => void
}

function ArenaClassCard({ cls, selectedSpec, onSpecChange }: ArenaClassCardProps) {
  const dragId = `arena-class-${cls.classId}`
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId,
    data: { type: 'class', classId: cls.classId, spec: selectedSpec },
  })

  const stats = cls[selectedSpec]
  const group = selectedSpec === 'awakening' ? cls.awakeningGroup
    : selectedSpec === 'succession' ? cls.successionGroup
    : cls.ascensionGroup
  const saDr = selectedSpec === 'awakening' ? cls.awakeningSaDr
    : selectedSpec === 'succession' ? cls.successionSaDr
    : cls.ascensionSaDr
  const iconUrl = classIconUrl(cls.slug)
  const groupColor = group ? GROUP_COLORS[group] : '#9c8a5e'
  const hasSaAdvantage = saDr > 10
  const hasGrab = stats.grabCount > 0
  const specColor = SPEC_COLORS[selectedSpec]

  // Which spec toggle buttons to render (only specs that exist for this class).
  const availableSpecs: { name: SpecName; label: string }[] = []
  if (cls.isAscension) {
    if (cls.ascension.skillCount > 0) availableSpecs.push({ name: 'ascension', label: 'Asc' })
  } else {
    if (cls.succession.skillCount > 0) availableSpecs.push({ name: 'succession', label: 'S' })
    if (cls.awakening.skillCount > 0) availableSpecs.push({ name: 'awakening', label: 'A' })
  }

  const portraitUrl = selectedSpec === 'awakening' || selectedSpec === 'succession'
    ? `/icons/portraits/specs/${cls.slug}-${selectedSpec}.jpg`
    : `/icons/portraits/${cls.slug}.jpg`
  const fallbackUrl = `/icons/portraits/${cls.slug}.jpg`

  const dragStyle: React.CSSProperties = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 100 }
    : {}

  return (
    <motion.div
      ref={setNodeRef}
      layout
      style={{
        ...dragStyle,
        borderColor: groupColor,
        boxShadow: `0 0 0 1px ${groupColor}33, 0 2px 8px rgba(0,0,0,0.5)`,
        opacity: isDragging ? 0.3 : 1,
      }}
      className="relative flex min-h-[150px] cursor-grab flex-col overflow-hidden rounded border-2 bg-bdo-leather-dark/60 transition-shadow hover:shadow-lg active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      {/* Portrait background */}
      <div className="absolute inset-0 z-0">
        <img
          src={portraitUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          onError={(e) => {
            const img = e.target as HTMLImageElement
            if (img.src !== fallbackUrl) img.src = fallbackUrl
          }}
        />
        <div className="absolute inset-0" style={{
          background: `linear-gradient(to bottom,
            rgba(10,9,8,0.85) 0%,
            rgba(10,9,8,0.45) 35%,
            rgba(10,9,8,0.85) 75%,
            rgba(10,9,8,0.97) 100%)`,
        }} />
        {/* Group color band on top */}
        <div className="absolute inset-x-0 top-0 h-1" style={{ background: groupColor }} />
      </div>

      {/* Drag handle indicator */}
      <div className="absolute right-1 top-1 z-20 flex items-center gap-0.5 rounded-sm bg-bdo-ink/60 px-1 py-0.5 text-amber-300/50">
        <Grip className="size-2.5" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-1 flex-col gap-1.5 p-2">
        {/* Header: class name + icon */}
        <div className="flex items-start gap-1.5">
          <div className="min-w-0 flex-1">
            <h4 className="bdo-title truncate text-sm font-bold text-amber-50 drop-shadow">{cls.className}</h4>
            {group && (
              <div className="mt-0.5 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: groupColor }}>
                <span>{GROUP_ICONS[group]}</span>
                {group}
              </div>
            )}
          </div>
          {iconUrl && (
            <div
              className="size-7 shrink-0 overflow-hidden rounded-sm border"
              style={{ borderColor: specColor, boxShadow: `0 0 4px ${specColor}55` }}
            >
              <img src={iconUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Spec toggles — click stops propagation so dnd-kit doesn't start a drag */}
        <div className="flex gap-1">
          {availableSpecs.map(s => (
            <button
              key={s.name}
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onSpecChange(s.name) }}
              className={cn(
                'rounded-sm border px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none transition-all',
                selectedSpec === s.name
                  ? 'text-amber-50'
                  : 'border-amber-800/40 bg-bdo-ink/40 text-amber-300/50 hover:text-amber-200',
              )}
              style={selectedSpec === s.name ? {
                borderColor: SPEC_COLORS[s.name],
                backgroundColor: `${SPEC_COLORS[s.name]}33`,
                color: SPEC_COLORS[s.name],
              } : undefined}
              title={s.name === 'awakening' ? 'Awakening' : s.name === 'succession' ? 'Succession' : 'Ascension'}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Indicator badges */}
        <div className="flex flex-wrap items-center gap-1">
          {hasSaAdvantage ? (
            <span
              className="inline-flex items-center gap-0.5 rounded-sm border border-emerald-700/50 bg-emerald-900/40 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-emerald-300"
              title={`SA Damage Reduction: ${saDr}% (above 10% default = advantage)`}
            >
              <ShieldHalf className="size-2.5" /> SA Adv
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-0.5 rounded-sm border border-amber-900/40 bg-amber-900/10 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-300/40"
              title={`SA Damage Reduction: ${saDr}% (default 10%)`}
            >
              Standard
            </span>
          )}
          {hasGrab && (
            <span
              className="inline-flex items-center gap-0.5 rounded-sm border border-orange-700/50 bg-orange-900/40 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-orange-300"
              title={`${stats.grabCount} grab skill${stats.grabCount > 1 ? 's' : ''}`}
            >
              <Hand className="size-2.5" /> Grab
            </span>
          )}
          <span
            className="ml-auto rounded-sm border border-amber-900/40 bg-bdo-ink/40 px-1 py-0.5 font-mono text-[8px] font-bold leading-none"
            style={{ color: getSaDrColor(saDr).text }}
            title="SA Damage Reduction %"
          >
            {saDr}%
          </span>
        </div>
      </div>
    </motion.div>
  )
}

// ─── ArenaClassCardPreview ─────────────────────────────────────────
// Compact floating preview rendered inside <DragOverlay> while dragging.

function ArenaClassCardPreview({ cls, selectedSpec }: { cls: ClassStats; selectedSpec: SpecName }) {
  const iconUrl = classIconUrl(cls.slug)
  const specColor = SPEC_COLORS[selectedSpec]
  const group = selectedSpec === 'awakening' ? cls.awakeningGroup
    : selectedSpec === 'succession' ? cls.successionGroup
    : cls.ascensionGroup
  const saDr = selectedSpec === 'awakening' ? cls.awakeningSaDr
    : selectedSpec === 'succession' ? cls.successionSaDr
    : cls.ascensionSaDr
  return (
    <div
      className="flex items-center gap-2 rounded border-2 bg-bdo-leather-dark px-3 py-2 shadow-2xl"
      style={{ borderColor: group ? GROUP_COLORS[group] : specColor }}
    >
      {iconUrl && (
        <div className="size-8 overflow-hidden rounded border" style={{ borderColor: specColor }}>
          <img src={iconUrl} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="flex flex-col">
        <span className="text-sm font-bold text-amber-50">{cls.className}</span>
        <span className="flex items-center gap-1 text-[9px] font-bold uppercase" style={{ color: specColor }}>
          {selectedSpec === 'awakening' ? 'Awakening' : selectedSpec === 'succession' ? 'Succession' : 'Ascension'}
          {group && (
            <span style={{ color: GROUP_COLORS[group] }}>· {group}</span>
          )}
          <span style={{ color: getSaDrColor(saDr).text }}>· {saDr}% SA</span>
        </span>
      </div>
    </div>
  )
}

// ─── TeamPanel ─────────────────────────────────────────────────────
// One team — header + 3 TeamSlots.

interface TeamPanelProps {
  teamId: 'A' | 'B'
  team: (SpecEntry | null)[]
  specEntries: SpecEntry[]
  onClearSlot: (slotIndex: number) => void
  onPick: (slotIndex: number, entry: SpecEntry) => void
}

function TeamPanel({ teamId, team, specEntries, onClearSlot, onPick }: TeamPanelProps) {
  const teamHex = teamId === 'A' ? '#10b981' : '#ef4444'
  const filledCount = team.filter(e => e !== null).length

  return (
    <div
      className="rounded-sm border-2 p-2"
      style={{
        borderColor: `${teamHex}66`,
        backgroundColor: `${teamHex}08`,
      }}
    >
      {/* Team header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ backgroundColor: teamHex }} />
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: teamHex }}>
            Team {teamId}
          </span>
          {filledCount === 3 && (
            <Crown className="size-3" style={{ color: teamHex }} />
          )}
        </div>
        <span className="font-mono text-[10px]" style={{ color: teamHex }}>
          {filledCount}/3
        </span>
      </div>

      {/* 3 slots */}
      <div className="space-y-1.5">
        {[0, 1, 2].map(i => (
          <TeamSlot
            key={i}
            teamId={teamId}
            slotIndex={i}
            entry={team[i]}
            onClear={() => onClearSlot(i)}
            onPick={(e) => onPick(i, e)}
            specEntries={specEntries}
          />
        ))}
      </div>
    </div>
  )
}

// ─── TeamSlot ──────────────────────────────────────────────────────
// One slot — droppable. Filled → CompactClassCard. Empty → search
// button (Popover + cmdk Command) + drop hint.

interface TeamSlotProps {
  teamId: 'A' | 'B'
  slotIndex: number
  entry: SpecEntry | null
  onClear: () => void
  onPick: (entry: SpecEntry) => void
  specEntries: SpecEntry[]
}

function TeamSlot({ teamId, slotIndex, entry, onClear, onPick, specEntries }: TeamSlotProps) {
  const [searchOpen, setSearchOpen] = React.useState(false)
  const dropId = `slot-${teamId}-${slotIndex}`
  const { setNodeRef, isOver } = useDroppable({
    id: dropId,
    data: { type: 'slot', teamId, slotIndex },
  })

  const teamHex = teamId === 'A' ? '#10b981' : '#ef4444'

  if (entry) {
    return (
      <div
        ref={setNodeRef}
        className={cn(
          'relative rounded-sm transition-all',
          isOver && 'ring-2 ring-amber-400 ring-offset-1 ring-offset-bdo-leather-dark',
        )}
      >
        <CompactClassCard entry={entry} teamHex={teamHex} onClear={onClear} />
      </div>
    )
  }

  // Empty slot — search button + drop hint
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-sm border-2 border-dashed p-1.5 transition-colors',
        isOver ? 'border-amber-400 bg-amber-500/10' : 'bg-bdo-ink/40',
      )}
      style={!isOver ? { borderColor: `${teamHex}44` } : undefined}
    >
      <Popover open={searchOpen} onOpenChange={setSearchOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-1.5 rounded-sm border border-amber-800/40 bg-bdo-leather-dark/60 px-2 py-1.5 text-[10px] text-amber-300/60 transition-colors hover:border-amber-500/50 hover:text-amber-200"
          >
            <Search className="size-3" />
            <span>Search class for slot {slotIndex + 1}…</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-80 border-amber-800/60 bg-bdo-leather-dark p-0 text-amber-100"
          align="start"
          sideOffset={4}
        >
          <Command className="bg-transparent text-amber-100">
            <CommandInput
              placeholder="Type a class name (e.g. Warrior, Musa)…"
              className="text-amber-100"
            />
            <CommandList className="max-h-72">
              <CommandEmpty className="py-4 text-center text-xs text-amber-300/40">
                No matching class.
              </CommandEmpty>
              <CommandGroup heading="Class × Spec" className="text-amber-100">
                {specEntries.map(e => {
                  const iconUrl = classIconUrl(e.slug)
                  const saDrColor = getSaDrColor(e.saDr)
                  return (
                    <CommandItem
                      key={entryKey(e)}
                      value={`${e.className} ${e.spec}`}
                      onSelect={() => {
                        onPick(e)
                        setSearchOpen(false)
                      }}
                      className="flex items-center gap-2 text-amber-100 data-[selected=true]:bg-amber-500/15 data-[selected=true]:text-amber-50"
                    >
                      {iconUrl && (
                        <img src={iconUrl} alt="" className="size-4 rounded-sm" loading="lazy" />
                      )}
                      <span className="text-xs">{e.className}</span>
                      <span
                        className="rounded-sm px-1 text-[8px] font-bold uppercase"
                        style={{
                          color: SPEC_COLORS[e.spec],
                          backgroundColor: `${SPEC_COLORS[e.spec]}22`,
                        }}
                      >
                        {e.spec === 'awakening' ? 'A' : e.spec === 'succession' ? 'S' : 'Asc'}
                      </span>
                      {e.group && (
                        <span
                          className="text-[8px] font-semibold uppercase"
                          style={{ color: GROUP_COLORS[e.group] }}
                        >
                          {e.group.slice(0, 3)}
                        </span>
                      )}
                      {e.stats.grabCount > 0 && (
                        <Hand className="size-2.5 text-orange-400" />
                      )}
                      <span
                        className="ml-auto font-mono text-[8px] font-bold"
                        style={{ color: saDrColor.text }}
                      >
                        {e.saDr}%
                      </span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <p className="mt-1 text-center text-[8px] text-amber-300/30">
        or drop a class here
      </p>
    </div>
  )
}

// ─── CompactClassCard ──────────────────────────────────────────────
// Mini SpecCard shown inside a filled team slot — portrait background,
// class name + spec + group badges, stat grid (Avg PvP / CC / SA / FG /
// IF / Grab), SA DR progress bar.

interface CompactClassCardProps {
  entry: SpecEntry
  teamHex: string
  onClear: () => void
}

function CompactClassCard({ entry, teamHex, onClear }: CompactClassCardProps) {
  const specColor = SPEC_COLORS[entry.spec]
  const iconUrl = classIconUrl(entry.slug)
  const portraitUrl = entry.spec === 'awakening' || entry.spec === 'succession'
    ? `/icons/portraits/specs/${entry.slug}-${entry.spec}.jpg`
    : `/icons/portraits/${entry.slug}.jpg`
  const fallbackUrl = `/icons/portraits/${entry.slug}.jpg`
  const saDrColor = getSaDrColor(entry.saDr)
  const stats = entry.stats

  const statCells: { label: string; value: number | string; color: string; title: string }[] = [
    { label: 'Avg PvP', value: stats.avgPvpDamage > 0 ? stats.avgPvpDamage.toLocaleString() : '—', color: '#f472b6', title: 'Average PvP damage' },
    { label: 'CC', value: stats.pvpCcSkillCount, color: '#f87171', title: 'PvP CC skill count' },
    { label: 'SA', value: stats.superArmorCount, color: '#fbbf24', title: 'Super Armor skills' },
    { label: 'FG', value: stats.forwardGuardCount, color: '#60a5fa', title: 'Forward Guard skills' },
    { label: 'IF', value: stats.iFrameCount, color: '#a78bfa', title: 'I-Frame skills' },
    { label: 'Grab', value: stats.grabCount, color: '#f97316', title: 'Grab skills' },
  ]

  return (
    <div
      className="group relative overflow-hidden rounded-sm border-2 bg-bdo-leather-dark"
      style={{ borderColor: specColor }}
    >
      {/* Portrait background */}
      <div className="absolute inset-0 z-0">
        <img
          src={portraitUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          onError={(e) => {
            const img = e.target as HTMLImageElement
            if (img.src !== fallbackUrl) img.src = fallbackUrl
          }}
        />
        <div className="absolute inset-0" style={{
          background: `linear-gradient(to bottom,
            rgba(10,9,8,0.85) 0%,
            rgba(10,9,8,0.5) 50%,
            rgba(10,9,8,0.95) 100%)`,
        }} />
        {/* Team color accent strip on the left edge */}
        <div className="absolute left-0 top-0 h-full w-0.5" style={{ backgroundColor: teamHex }} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col gap-1.5 p-2">
        {/* Header */}
        <div className="flex items-start gap-1.5">
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-sm font-bold text-amber-50 drop-shadow">{entry.className}</h4>
            <div className="mt-0.5 flex items-center gap-1">
              <span
                className="rounded-sm px-1 text-[8px] font-bold uppercase leading-none"
                style={{
                  color: specColor,
                  backgroundColor: `${specColor}22`,
                  border: `1px solid ${specColor}55`,
                }}
              >
                {entry.spec === 'awakening' ? 'AWK' : entry.spec === 'succession' ? 'SUCC' : 'ASC'}
              </span>
              {entry.group && (
                <span
                  className="rounded-sm px-1 text-[8px] font-semibold uppercase leading-none"
                  style={{
                    color: GROUP_COLORS[entry.group],
                    backgroundColor: `${GROUP_COLORS[entry.group]}15`,
                  }}
                >
                  {entry.group}
                </span>
              )}
              {entry.stats.grabCount > 0 && (
                <span
                  className="inline-flex items-center gap-0.5 rounded-sm border border-orange-700/50 bg-orange-900/40 px-1 py-0.5 text-[7px] font-bold uppercase tracking-wider text-orange-300"
                  title={`${entry.stats.grabCount} grab skill${entry.stats.grabCount > 1 ? 's' : ''}`}
                >
                  <Hand className="size-2" />
                </span>
              )}
            </div>
          </div>
          {/* Clear button */}
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 rounded-sm border border-amber-800/40 bg-bdo-ink/60 p-0.5 text-amber-300/60 transition-colors hover:border-red-700/60 hover:bg-red-900/30 hover:text-red-300"
            aria-label={`Remove ${entry.className} from team`}
          >
            <X className="size-3" />
          </button>
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-3 gap-1">
          {statCells.map(s => (
            <div
              key={s.label}
              className="rounded-sm border border-amber-900/30 bg-bdo-ink/60 px-1 py-0.5 text-center"
              title={s.title}
            >
              <div className="text-[8px] uppercase tracking-wider text-amber-300/50">{s.label}</div>
              <div className="font-mono text-xs font-bold" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* SA DR bar */}
        <div className="flex items-center gap-1.5 rounded-sm border border-amber-900/30 bg-bdo-ink/60 px-1.5 py-1">
          <span className="text-[8px] font-semibold uppercase tracking-wider text-amber-300/50">SA DR</span>
          <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-amber-900/30">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all"
              style={{
                width: `${Math.min(100, (entry.saDr / 25) * 100)}%`,
                backgroundColor: saDrColor.text,
              }}
            />
          </div>
          <span className="font-mono text-[10px] font-bold" style={{ color: saDrColor.text }}>
            {entry.saDr}%
          </span>
          {entry.saDr > 10 && (
            <ArrowUp className="size-2.5" strokeWidth={3} style={{ color: saDrColor.text }} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── TeamAdvantageAnalysis ─────────────────────────────────────────
// Redesigned analysis panel — group-cycle matchup stacked bar, SA DR /
// Grab / CC / SA comparison bars. Visual bars, not just text.

interface TeamAdvantageAnalysisProps {
  teamA: SpecEntry[]
  teamB: SpecEntry[]
  getAdvantage: (a: string, b: string) => 'up' | 'down' | 'neutral'
}

function TeamAdvantageAnalysis({ teamA, teamB, getAdvantage }: TeamAdvantageAnalysisProps) {
  // ── Compute metrics ──
  const avgSaDrA = teamA.length ? teamA.reduce((s, e) => s + e.saDr, 0) / teamA.length : 0
  const avgSaDrB = teamB.length ? teamB.reduce((s, e) => s + e.saDr, 0) / teamB.length : 0
  const saDrMax = 25

  const totalGrabA = teamA.reduce((s, e) => s + e.stats.grabCount, 0)
  const totalGrabB = teamB.reduce((s, e) => s + e.stats.grabCount, 0)

  const totalCcA = teamA.reduce((s, e) => s + e.stats.pvpCcSkillCount, 0)
  const totalCcB = teamB.reduce((s, e) => s + e.stats.pvpCcSkillCount, 0)

  const totalSaA = teamA.reduce((s, e) => s + e.stats.superArmorCount, 0)
  const totalSaB = teamB.reduce((s, e) => s + e.stats.superArmorCount, 0)

  // Pairwise group-cycle matchup counts
  let aUp = 0, bUp = 0, neutral = 0
  const totalPairs = teamA.length * teamB.length
  for (const a of teamA) for (const b of teamB) {
    const adv = getAdvantage(a.group || '', b.group || '')
    if (adv === 'up') aUp++
    else if (adv === 'down') bUp++
    else neutral++
  }

  // Group distribution per team (for the cycle legend chips)
  const GROUP_KEYS = ['Vanguard', 'Pulverizer', 'Skirmisher'] as const
  const groupDistA: Record<string, number> = { Vanguard: 0, Pulverizer: 0, Skirmisher: 0, None: 0 }
  const groupDistB: Record<string, number> = { Vanguard: 0, Pulverizer: 0, Skirmisher: 0, None: 0 }
  for (const e of teamA) {
    if (e.group && e.group in groupDistA) groupDistA[e.group]++
    else groupDistA.None++
  }
  for (const e of teamB) {
    if (e.group && e.group in groupDistB) groupDistB[e.group]++
    else groupDistB.None++
  }

  return (
    <div className="mt-4 rounded-sm border border-amber-800/40 bg-bdo-ink/60 p-3">
      <div className="mb-3 flex items-center gap-1.5">
        <Swords className="size-3.5 text-amber-400" />
        <h3 className="bdo-title text-xs font-bold uppercase tracking-wider text-amber-300/80">
          Team Advantage Analysis
        </h3>
        <span className="ml-auto text-[9px] text-amber-300/40">
          A: {teamA.length} · B: {teamB.length}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* Group-cycle matchup — stacked bar + group distribution */}
        <div className="rounded-sm border border-amber-900/30 bg-bdo-leather-dark/40 p-2 md:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300/60">
              Group Cycle Matchup
            </span>
            <span className="text-[9px] text-amber-300/40">
              {totalPairs} pair{totalPairs === 1 ? '' : 's'} · +5% per counter win
            </span>
          </div>

          {totalPairs > 0 ? (
            <>
              {/* Stacked horizontal bar */}
              <div className="flex h-7 overflow-hidden rounded-sm border border-amber-900/40">
                <div
                  className="flex items-center justify-center bg-emerald-700/70 text-[10px] font-bold text-emerald-50 transition-all"
                  style={{ width: `${(aUp / totalPairs) * 100}%` }}
                  title={`Team A wins ${aUp} matchup${aUp === 1 ? '' : 's'} (+${aUp * 5}% damage)`}
                >
                  {aUp > 0 && aUp}
                </div>
                <div
                  className="flex items-center justify-center bg-amber-800/40 text-[10px] font-bold text-amber-200"
                  style={{ width: `${(neutral / totalPairs) * 100}%` }}
                  title={`${neutral} neutral matchup${neutral === 1 ? '' : 's'}`}
                >
                  {neutral > 0 && neutral}
                </div>
                <div
                  className="flex items-center justify-center bg-red-700/70 text-[10px] font-bold text-red-50"
                  style={{ width: `${(bUp / totalPairs) * 100}%` }}
                  title={`Team B wins ${bUp} matchup${bUp === 1 ? '' : 's'} (+${bUp * 5}% damage)`}
                >
                  {bUp > 0 && bUp}
                </div>
              </div>

              <div className="mt-1 flex items-center justify-between text-[9px]">
                <span className="font-bold text-emerald-300">A: {aUp} counter wins (+{aUp * 5}%)</span>
                <span className="text-amber-300/40">{neutral} neutral</span>
                <span className="font-bold text-red-300">B: {bUp} counter wins (+{bUp * 5}%)</span>
              </div>

              {/* Group distribution per team */}
              <div className="mt-2 grid grid-cols-2 gap-2 text-[9px]">
                <div className="rounded-sm bg-emerald-950/30 px-2 py-1">
                  <div className="font-bold uppercase tracking-wider text-emerald-300/60">Team A groups</div>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {GROUP_KEYS.map(g => groupDistA[g] > 0 && (
                      <span
                        key={g}
                        className="inline-flex items-center gap-0.5 rounded-sm px-1 py-0.5"
                        style={{
                          color: GROUP_COLORS[g],
                          backgroundColor: `${GROUP_COLORS[g]}15`,
                        }}
                      >
                        {GROUP_ICONS[g]} {groupDistA[g]}
                      </span>
                    ))}
                    {groupDistA.None > 0 && (
                      <span className="rounded-sm px-1 py-0.5 text-zinc-400 bg-zinc-700/15">
                        ? {groupDistA.None}
                      </span>
                    )}
                    {teamA.length === 0 && <span className="text-emerald-300/30">empty</span>}
                  </div>
                </div>
                <div className="rounded-sm bg-red-950/30 px-2 py-1">
                  <div className="font-bold uppercase tracking-wider text-red-300/60">Team B groups</div>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {GROUP_KEYS.map(g => groupDistB[g] > 0 && (
                      <span
                        key={g}
                        className="inline-flex items-center gap-0.5 rounded-sm px-1 py-0.5"
                        style={{
                          color: GROUP_COLORS[g],
                          backgroundColor: `${GROUP_COLORS[g]}15`,
                        }}
                      >
                        {GROUP_ICONS[g]} {groupDistB[g]}
                      </span>
                    ))}
                    {groupDistB.None > 0 && (
                      <span className="rounded-sm px-1 py-0.5 text-zinc-400 bg-zinc-700/15">
                        ? {groupDistB.None}
                      </span>
                    )}
                    {teamB.length === 0 && <span className="text-red-300/30">empty</span>}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-7 items-center justify-center text-[10px] text-amber-300/40">
              Add classes to both teams to see group-cycle matchups
            </div>
          )}
        </div>

        {/* SA DR comparison */}
        <CompareBar
          title="Avg SA Damage Reduction"
          subtitle="Higher = better protected while in Super Armor"
          valueA={avgSaDrA}
          valueB={avgSaDrB}
          max={saDrMax}
          format={(v) => `${v.toFixed(1)}%`}
        />

        {/* Grab count */}
        <CompareBar
          title="Total Grab Skills"
          subtitle="More grabs = more catch potential"
          valueA={totalGrabA}
          valueB={totalGrabB}
          max={Math.max(totalGrabA, totalGrabB, 1)}
          format={(v) => v.toFixed(0)}
        />

        {/* CC coverage */}
        <CompareBar
          title="Total PvP CC Skills"
          subtitle="More CC = more lockdown potential"
          valueA={totalCcA}
          valueB={totalCcB}
          max={Math.max(totalCcA, totalCcB, 1)}
          format={(v) => v.toFixed(0)}
        />

        {/* Super Armor count */}
        <CompareBar
          title="Total Super Armor Skills"
          subtitle="More SA = more trade potential"
          valueA={totalSaA}
          valueB={totalSaB}
          max={Math.max(totalSaA, totalSaB, 1)}
          format={(v) => v.toFixed(0)}
        />
      </div>
    </div>
  )
}

// ─── CompareBar ────────────────────────────────────────────────────
// Helper: side-by-side A vs B comparison bar.

interface CompareBarProps {
  title: string
  subtitle: string
  valueA: number
  valueB: number
  max: number
  format: (v: number) => string
}

function CompareBar({ title, subtitle, valueA, valueB, max, format }: CompareBarProps) {
  const winner: 'A' | 'B' | 'tie' = valueA === valueB ? 'tie' : valueA > valueB ? 'A' : 'B'
  const aWidth = max > 0 ? (valueA / max) * 100 : 0
  const bWidth = max > 0 ? (valueB / max) * 100 : 0

  return (
    <div className="rounded-sm border border-amber-900/30 bg-bdo-leather-dark/40 p-2">
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300/60">{title}</div>
          <div className="text-[9px] text-amber-300/40">{subtitle}</div>
        </div>
        {winner !== 'tie' && (
          <span
            className="shrink-0 rounded-sm border px-1.5 py-0.5 text-[9px] font-bold uppercase"
            style={{
              borderColor: winner === 'A' ? '#10b98166' : '#ef444466',
              backgroundColor: winner === 'A' ? '#10b98115' : '#ef444415',
              color: winner === 'A' ? '#34d399' : '#f87171',
            }}
          >
            {winner} leads
          </span>
        )}
      </div>

      {/* Team A bar */}
      <div className="mb-1 flex items-center gap-1.5">
        <span className="w-3 text-right font-mono text-[9px] font-bold text-emerald-300">A</span>
        <div className="relative h-3 flex-1 overflow-hidden rounded-sm bg-amber-900/20">
          <div
            className="absolute inset-y-0 left-0 rounded-sm transition-all"
            style={{
              width: `${aWidth}%`,
              backgroundColor: winner === 'A' ? '#10b981' : '#10b98199',
            }}
          />
        </div>
        <span className="w-14 text-right font-mono text-[10px] font-bold text-emerald-300">{format(valueA)}</span>
      </div>

      {/* Team B bar */}
      <div className="flex items-center gap-1.5">
        <span className="w-3 text-right font-mono text-[9px] font-bold text-red-300">B</span>
        <div className="relative h-3 flex-1 overflow-hidden rounded-sm bg-amber-900/20">
          <div
            className="absolute inset-y-0 left-0 rounded-sm transition-all"
            style={{
              width: `${bWidth}%`,
              backgroundColor: winner === 'B' ? '#ef4444' : '#ef444499',
            }}
          />
        </div>
        <span className="w-14 text-right font-mono text-[10px] font-bold text-red-300">{format(valueB)}</span>
      </div>
    </div>
  )
}
