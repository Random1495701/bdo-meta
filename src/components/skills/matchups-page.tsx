'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Swords, Pin, X, ArrowUp, ArrowDown, Minus, ChevronUp, ChevronDown, ShieldHalf } from 'lucide-react'
import { classColor, classIconUrl, SPEC_COLORS } from '@/lib/skills'
import { cn } from '@/lib/utils'

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
// green (25% — best). Returns inline rgba() string for backgroundColor.
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

// ─── Spec-specific portrait URLs ────────────────────────────────────
// Awakening/Succession use spec-specific portraits under /specs/.
// Ascension (and as fallback) uses the main portrait — try .jpg then .png.
function getPortraitUrls(slug: string, spec: SpecName): string[] {
  const urls: string[] = []
  if (spec === 'awakening' || spec === 'succession') {
    urls.push(`/icons/portraits/specs/${slug}-${spec}.jpg`)
  }
  urls.push(`/icons/portraits/${slug}.jpg`)
  urls.push(`/icons/portraits/${slug}.png`)
  return urls
}

// Small component that picks the first portrait URL that loads,
// falling back through the chain (spec-specific → main .jpg → main .png).
function SpecPortrait({
  slug, spec, alt, className,
}: {
  slug: string
  spec: SpecName
  alt: string
  className?: string
}) {
  const urls = React.useMemo(() => getPortraitUrls(slug, spec), [slug, spec])
  const [idx, setIdx] = React.useState(0)
  return (
    <img
      src={urls[idx]}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setIdx(i => Math.min(i + 1, urls.length - 1))}
    />
  )
}

// ─── Team entry helpers ─────────────────────────────────────────────

const entryKey = (e: SpecEntry) => `${e.classId}:${e.spec}`
const sameEntry = (a: SpecEntry, b: SpecEntry) => a.classId === b.classId && a.spec === b.spec

interface SpecStats {
  skillCount: number
  avgPvpDamage: number
  medianPvpDamage: number
  pvpCcSkillCount: number
  grabCount: number
  superArmorCount: number
  forwardGuardCount: number
  iFrameCount: number
  coreSaCount: number
  coreFgCount: number
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
  Pulverizer: '⚔',
  Skirmisher: '🏹',
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

export function MatchupsPage() {
  const metaQuery = useQuery({ queryKey: ['meta'], queryFn: fetchMeta, staleTime: 60_000 })
  const [selectedClasses, setSelectedClasses] = React.useState<Set<string>>(new Set())
  const [arenaMode, setArenaMode] = React.useState(false)
  const [teamA, setTeamA] = React.useState<SpecEntry[]>([])
  const [teamB, setTeamB] = React.useState<SpecEntry[]>([])

  const classes = metaQuery.data?.classes ?? []

  // Build spec-separated entries — each class×spec is a separate entry
  // because groups and SA DR differ per spec (per PA Wiki wikiNo=225)
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

  // Group counts
  const groupCounts = React.useMemo(() => {
    const counts: Record<string, number> = {}
    for (const c of specEntries) {
      if (c.group) counts[c.group] = (counts[c.group] || 0) + 1
    }
    return counts
  }, [specEntries])

  const toggleClass = (className: string) => {
    setSelectedClasses(prev => {
      const next = new Set(prev)
      if (next.has(className)) next.delete(className)
      else next.add(className)
      return next
    })
  }

  // Pinned (selected) classes appear at top
  const sortedClasses = React.useMemo(() => {
    const pinned = specEntries.filter(c => selectedClasses.has(c.className))
    const unpinned = specEntries.filter(c => !selectedClasses.has(c.className))
    return [...pinned, ...unpinned]
  }, [specEntries, selectedClasses])

  // Get counter relationship
  const getCounter = (group: string): string => COUNTER_CYCLE[group] || ''
  const getAdvantage = (attackerGroup: string, defenderGroup: string): 'up' | 'down' | 'neutral' => {
    if (!attackerGroup || !defenderGroup) return 'neutral'
    if (getCounter(attackerGroup) === defenderGroup) return 'up'
    if (getCounter(defenderGroup) === attackerGroup) return 'down'
    return 'neutral'
  }

  // Ratio comparison: show pairwise for selected classes
  const selectedList = Array.from(selectedClasses)

  return (
    <div className="flex min-h-screen flex-col bg-bdo-ink text-zinc-100">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-amber-900/50 bg-bdo-ink/95 px-4 py-3 backdrop-blur lg:px-6">
        <div className="flex items-center gap-3">
          <Swords className="size-5 text-amber-400" />
          <div>
            <h1 className="bdo-title text-xl font-bold text-amber-400 sm:text-2xl">Class Matchups</h1>
            <p className="text-xs text-amber-200/50">
              Merged specs · Group brackets · Click classes to compare ratios
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
                    <span className="text-[9px] text-amber-300/40">{groupCounts[group] || 0} classes</span>
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
            {/* Arena of Solare 3v3 Selector */}
            <div className="rounded-sm border-2 border-amber-800/40 bg-bdo-leather-dark/30 p-4">
              <div
                className="flex cursor-pointer items-center gap-2"
                onClick={() => { setArenaMode(!arenaMode); if (arenaMode) { setTeamA([]); setTeamB([]) } }}
              >
                <Swords className="size-4 text-amber-400" />
                <h2 className="bdo-title text-sm font-bold text-amber-300">Arena of Solare (3v3)</h2>
                <button
                  onClick={(e) => { e.stopPropagation(); setArenaMode(!arenaMode); if (arenaMode) { setTeamA([]); setTeamB([]) } }}
                  className="ml-auto flex items-center gap-1 text-[10px] text-amber-300/50 hover:text-amber-200"
                >
                  {arenaMode ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </button>
              </div>
              {arenaMode && (
                <div className="space-y-3">
                  <p className="text-[10px] leading-relaxed text-amber-300/50">
                    Click a chip to assign to Team A (1st click) or Team B (when A is full or already has it). Max 3 per team.
                    Chip background = <span className="text-emerald-300">SA DR heatmap</span> (amber &rarr; green);
                    <ArrowUp className="ml-1 inline size-2.5 text-emerald-400" /> marks above-average SA DR (>10%).
                  </p>

                  {/* Team display — portraits + class info */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Team A */}
                    <div className="rounded-sm border-2 border-emerald-700/50 bg-emerald-950/30 p-2">
                      <div className="mb-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-emerald-400" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/80">Team A</span>
                        </div>
                        <span className="font-mono text-[10px] text-emerald-300/60">{teamA.length}/3</span>
                      </div>
                      <div className="space-y-1">
                        {teamA.map(entry => (
                          <TeamMemberRow
                            key={`a-${entryKey(entry)}`}
                            entry={entry}
                            teamColor="emerald"
                            onRemove={() => setTeamA(prev => prev.filter(t => !sameEntry(t, entry)))}
                          />
                        ))}
                        {teamA.length === 0 && (
                          <div className="rounded-sm border border-dashed border-emerald-800/30 px-2 py-2 text-center text-[9px] text-emerald-300/30">
                            Click a class chip below
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Team B */}
                    <div className="rounded-sm border-2 border-red-700/50 bg-red-950/30 p-2">
                      <div className="mb-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-red-400" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-red-300/80">Team B</span>
                        </div>
                        <span className="font-mono text-[10px] text-red-300/60">{teamB.length}/3</span>
                      </div>
                      <div className="space-y-1">
                        {teamB.map(entry => (
                          <TeamMemberRow
                            key={`b-${entryKey(entry)}`}
                            entry={entry}
                            teamColor="red"
                            onRemove={() => setTeamB(prev => prev.filter(t => !sameEntry(t, entry)))}
                          />
                        ))}
                        {teamB.length === 0 && (
                          <div className="rounded-sm border border-dashed border-red-800/30 px-2 py-2 text-center text-[9px] text-red-300/30">
                            Click a class chip below
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Team advantage analysis */}
                  {teamA.length > 0 && teamB.length > 0 && (() => {
                    const avgA = teamA.reduce((s, e) => s + e.saDr, 0) / teamA.length
                    const avgB = teamB.reduce((s, e) => s + e.saDr, 0) / teamB.length
                    const diff = avgA - avgB
                    // Aggregate group counter advantage: count pairwise matchups
                    let aUpCount = 0, bUpCount = 0, neutralCount = 0
                    for (const a of teamA) for (const b of teamB) {
                      const adv = getAdvantage(a.group || '', b.group || '')
                      if (adv === 'up') aUpCount++
                      else if (adv === 'down') bUpCount++
                      else neutralCount++
                    }
                    return (
                      <div className="rounded-sm border border-amber-800/40 bg-bdo-ink/50 p-2.5 text-[10px]">
                        <div className="mb-1.5 flex items-center gap-1.5">
                          <Swords className="size-3 text-amber-400" />
                          <span className="font-bold uppercase tracking-wider text-amber-300/70">Team Advantage Analysis</span>
                        </div>

                        {/* Aggregate counter advantage summary */}
                        <div className="mb-2 grid grid-cols-3 gap-1.5">
                          <div className="rounded-sm border border-emerald-800/40 bg-emerald-900/15 px-2 py-1 text-center">
                            <div className="font-mono text-sm font-bold text-emerald-300">{aUpCount}</div>
                            <div className="text-[8px] uppercase tracking-wider text-emerald-300/50">A counters</div>
                          </div>
                          <div className="rounded-sm border border-amber-800/30 bg-amber-900/10 px-2 py-1 text-center">
                            <div className="font-mono text-sm font-bold text-amber-300/60">{neutralCount}</div>
                            <div className="text-[8px] uppercase tracking-wider text-amber-300/40">Neutral</div>
                          </div>
                          <div className="rounded-sm border border-red-800/40 bg-red-900/15 px-2 py-1 text-center">
                            <div className="font-mono text-sm font-bold text-red-300">{bUpCount}</div>
                            <div className="text-[8px] uppercase tracking-wider text-red-300/50">B counters</div>
                          </div>
                        </div>

                        {/* SA DR advantage note — only when meaningful difference */}
                        {Math.abs(diff) >= 0.5 && (
                          <div
                            className="mb-2 flex items-center gap-1.5 rounded-sm border px-2 py-1"
                            style={{
                              borderColor: diff > 0 ? 'rgba(52, 211, 153, 0.4)' : 'rgba(248, 113, 113, 0.4)',
                              backgroundColor: diff > 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                            }}
                          >
                            <ShieldHalf
                              className="size-3 shrink-0"
                              style={{ color: diff > 0 ? '#34d399' : '#f87171' }}
                            />
                            <span className="text-amber-100/80">
                              <span className="font-bold" style={{ color: diff > 0 ? '#34d399' : '#f87171' }}>
                                Team {diff > 0 ? 'A' : 'B'}
                              </span>{' '}
                              has{' '}
                              <span className="font-mono font-bold text-amber-200">
                                {Math.abs(diff).toFixed(1)}%
                              </span>{' '}
                              more SA DR on average
                              <span className="text-amber-300/40">
                                {' '}({Math.max(avgA, avgB).toFixed(1)}% vs {Math.min(avgA, avgB).toFixed(1)}%)
                              </span>
                            </span>
                          </div>
                        )}

                        {/* Pairwise matchup grid */}
                        <div className="space-y-0.5">
                          {teamA.map(a => teamB.map(b => {
                            const adv = getAdvantage(a.group || '', b.group || '')
                            const saDrColor = getSaDrColor(a.saDr)
                            const saDrColorB = getSaDrColor(b.saDr)
                            return (
                              <div
                                key={`${entryKey(a)}-${entryKey(b)}`}
                                className="flex items-center gap-1.5 rounded-sm bg-bdo-leather-dark/20 px-1.5 py-0.5"
                              >
                                <span className="truncate" style={{ color: saDrColor.text }}>{a.className}</span>
                                <span className="text-[8px]" style={{ color: SPEC_COLORS[a.spec] }}>
                                  {a.spec === 'awakening' ? 'A' : a.spec === 'succession' ? 'S' : 'X'}
                                </span>
                                <span className="text-amber-400/30">vs</span>
                                <span className="truncate" style={{ color: saDrColorB.text }}>{b.className}</span>
                                <span className="text-[8px]" style={{ color: SPEC_COLORS[b.spec] }}>
                                  {b.spec === 'awakening' ? 'A' : b.spec === 'succession' ? 'S' : 'X'}
                                </span>
                                <span className="ml-auto flex items-center gap-1">
                                  {adv === 'up' && <span className="text-emerald-400">+5%</span>}
                                  {adv === 'down' && <span className="text-red-400">−5%</span>}
                                  {adv === 'neutral' && <span className="text-amber-300/30">=</span>}
                                </span>
                              </div>
                            )
                          }))}
                        </div>
                      </div>
                    )
                  })()}

                  {/* SA DR legend */}
                  <div className="flex items-center gap-2 rounded-sm border border-amber-900/30 bg-bdo-ink/30 px-2 py-1 text-[9px] text-amber-300/50">
                    <span className="uppercase tracking-wider text-amber-300/40">SA DR</span>
                    {[10, 15, 20, 25].map(v => (
                      <div key={v} className="flex items-center gap-1">
                        <span
                          className="size-3 rounded-sm border"
                          style={{
                            backgroundColor: getSaDrColor(v).bg,
                            borderColor: getSaDrColor(v).border,
                          }}
                        />
                        <span className="font-mono">{v}%</span>
                      </div>
                    ))}
                    <span className="ml-auto flex items-center gap-1">
                      <ArrowUp className="size-3 text-emerald-400" />
                      <span>= above average (&gt;10%)</span>
                    </span>
                  </div>

                  {/* Class chips for arena selection — SA DR heatmap + spec borders */}
                  <div className="flex flex-wrap gap-1">
                    {specEntries.map(cls => {
                      const iconUrl = classIconUrl(cls.slug)
                      const specColor = SPEC_COLORS[cls.spec]
                      const saDrColor = getSaDrColor(cls.saDr)
                      const inA = teamA.some(t => sameEntry(t, cls))
                      const inB = teamB.some(t => sameEntry(t, cls))
                      const aboveAverage = cls.saDr > 10
                      return (
                        <button
                          key={entryKey(cls)}
                          onClick={() => {
                            if (inA) { setTeamA(prev => prev.filter(t => !sameEntry(t, cls))); return }
                            if (inB) { setTeamB(prev => prev.filter(t => !sameEntry(t, cls))); return }
                            if (teamA.length < 3) setTeamA(prev => [...prev, cls])
                            else if (teamB.length < 3) setTeamB(prev => [...prev, cls])
                          }}
                          disabled={!inA && !inB && teamA.length >= 3 && teamB.length >= 3}
                          className={cn(
                            'group relative flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[9px] font-semibold transition-all',
                            !inA && !inB && 'hover:scale-105 hover:brightness-125',
                            (inA || inB) && 'ring-1 ring-offset-1 ring-offset-bdo-ink',
                            inA && 'ring-emerald-400',
                            inB && 'ring-red-400',
                          )}
                          style={{
                            // SA DR heatmap background; spec color border (or team color when selected)
                            backgroundColor: inA
                              ? 'rgba(6, 78, 59, 0.55)'
                              : inB
                                ? 'rgba(127, 29, 29, 0.55)'
                                : saDrColor.bg,
                            borderColor: inA
                              ? '#10b981'
                              : inB
                                ? '#ef4444'
                                : specColor,
                            color: '#fafafa',
                          }}
                          title={`${cls.className} (${cls.spec}) — ${cls.group || 'no group'} · SA DR ${cls.saDr}%`}
                        >
                          {iconUrl && (
                            <img
                              src={iconUrl}
                              alt=""
                              className="size-3.5 rounded-sm object-cover"
                              loading="lazy"
                            />
                          )}
                          <span className="leading-none">{cls.className}</span>
                          {/* Spec badge (AWK/SUCC/ASC) */}
                          <span
                            className="rounded-sm px-0.5 text-[7px] font-bold uppercase leading-none"
                            style={{
                              color: specColor,
                              backgroundColor: `${specColor}22`,
                              border: `1px solid ${specColor}55`,
                            }}
                          >
                            {cls.spec === 'awakening' ? 'AWK' : cls.spec === 'succession' ? 'SUCC' : 'ASC'}
                          </span>
                          {/* SA DR up arrow for above-average classes */}
                          {aboveAverage && (
                            <ArrowUp className="size-2.5 text-emerald-400" strokeWidth={3} />
                          )}
                          {/* SA DR % — show on hover via group-hover */}
                          <span className="font-mono text-[7px] text-amber-100/60 group-hover:inline">
                            {cls.saDr}%
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Ratio comparison panel (shows when classes are selected) */}
            {selectedList.length >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-sm border-2 border-amber-700/40 bg-bdo-leather-dark/30 p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300/60">
                    Ratio Comparison ({selectedList.length} selected)
                  </span>
                  <button
                    onClick={() => setSelectedClasses(new Set())}
                    className="ml-auto flex items-center gap-1 rounded-sm border border-amber-800/40 px-2 py-0.5 text-[10px] text-amber-300/50 hover:text-amber-200"
                  >
                    <X className="size-3" /> Clear
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {selectedList.map((a, i) => selectedList.slice(i + 1).map((b) => {
                    const clsA = specEntries.find(c => c.className === a)!
                    const clsB = specEntries.find(c => c.className === b)!
                    const adv = getAdvantage(clsA.group || '', clsB.group || '')
                    const color = GROUP_COLORS[clsA.group || ''] || '#a1a1aa'
                    const colorB = GROUP_COLORS[clsB.group || ''] || '#a1a1aa'
                    return (
                      <div key={`${a}-${b}`} className="flex items-center gap-2 rounded-sm border border-amber-900/30 bg-bdo-ink/40 px-2 py-1.5 text-xs">
                        <span className="font-bold" style={{ color }}>{clsA.className}</span>
                        <span className="text-[9px] text-amber-300/40">({clsA.group?.slice(0, 3)})</span>
                        <span className="text-amber-400/40">vs</span>
                        <span className="font-bold" style={{ color: colorB }}>{clsB.className}</span>
                        <span className="text-[9px] text-amber-300/40">({clsB.group?.slice(0, 3)})</span>
                        <span className="ml-auto flex items-center gap-1">
                          {adv === 'up' && <><ArrowUp className="size-3 text-emerald-400" /><span className="text-emerald-400">+5%</span></>}
                          {adv === 'down' && <><ArrowDown className="size-3 text-red-400" /><span className="text-red-400">-5%</span></>}
                          {adv === 'neutral' && <><Minus className="size-3 text-amber-300/30" /><span className="text-amber-300/30">=</span></>}
                        </span>
                      </div>
                    )
                  }))}
                </div>
              </motion.div>
            )}

            {/* Matchup table — merged specs, grouped by bracket */}
            {['Vanguard', 'Pulverizer', 'Skirmisher'].map(group => {
              const groupClasses = sortedClasses.filter(c => c.group === group)
              if (groupClasses.length === 0) return null
              const color = GROUP_COLORS[group]
              return (
                <div key={group} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full" style={{ backgroundColor: color }} />
                    <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color }}>
                      {group} ({groupClasses.length})
                    </h2>
                    <span className="text-[10px] text-amber-300/40">
                      Counters: {getCounter(group)} · Countered by: {Object.entries(COUNTER_CYCLE).find(([_, v]) => v === group)?.[0]}
                    </span>
                  </div>

                  {/* Matchup matrix for this bracket */}
                  <div className="overflow-x-auto rounded-sm border border-amber-800/30">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-amber-800/40 bg-bdo-leather-dark/50">
                          <th className="sticky left-0 z-10 bg-bdo-leather-dark/50 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-amber-300/50">
                            Class
                          </th>
                          <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-amber-300/50">Spec</th>
                          <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-amber-300/50">Combat Type</th>
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
                        {groupClasses.map(cls => {
                          const clsColor = classColor(cls.className)
                          const iconUrl = classIconUrl(cls.slug)
                          const isPinned = selectedClasses.has(cls.className)
                          return (
                            <tr
                              key={cls.classId}
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
                              <td className="px-2 py-1.5 text-[10px] text-amber-300/50">{cls.combatType || '—'}</td>
                              <td className="px-2 py-1.5 text-right font-mono text-xs tabular-nums text-amber-300">{cls.saDr}%</td>
                              <td className="px-2 py-1.5 text-right font-mono text-xs tabular-nums text-red-300">{cls.stats.pvpCcSkillCount}</td>
                              <td className="px-2 py-1.5 text-right font-mono text-xs tabular-nums text-orange-300">{cls.stats.grabCount}</td>
                              <td className="px-2 py-1.5 text-right font-mono text-xs tabular-nums text-cyan-300">{cls.stats.avgDpc}</td>
                              {/* vs each group */}
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
                                  onClick={() => toggleClass(cls.className)}
                                  className={cn(
                                    'flex size-6 items-center justify-center rounded-sm border transition-all',
                                    isPinned
                                      ? 'border-amber-400/60 bg-amber-500/20 text-amber-200'
                                      : 'border-amber-800/40 text-amber-300/30 hover:border-amber-500/40 hover:text-amber-200',
                                  )}
                                  title={isPinned ? 'Unpin' : 'Pin for ratio comparison'}
                                >
                                  <Pin className="size-3" />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Team member row (used in the Arena team display panels) ────────
// Renders a class portrait thumbnail + name + spec badge + SA DR chip,
// with a remove button on hover.

function TeamMemberRow({
  entry, teamColor, onRemove,
}: {
  entry: SpecEntry
  teamColor: 'emerald' | 'red'
  onRemove: () => void
}) {
  const specColor = SPEC_COLORS[entry.spec]
  const saDrColor = getSaDrColor(entry.saDr)
  const iconUrl = classIconUrl(entry.slug)
  const teamRing = teamColor === 'emerald' ? 'ring-emerald-500/40' : 'ring-red-500/40'
  const teamText = teamColor === 'emerald' ? 'text-emerald-300' : 'text-red-300'

  return (
    <div
      className={cn(
        'group relative flex items-center gap-1.5 overflow-hidden rounded-sm border bg-bdo-ink/60 p-1 pr-5 ring-1',
        teamRing,
      )}
      style={{ borderColor: `${specColor}66` }}
    >
      {/* Class portrait (spec-specific) */}
      <div
        className="size-8 shrink-0 overflow-hidden rounded-sm border"
        style={{ borderColor: `${specColor}88` }}
      >
        <SpecPortrait
          slug={entry.slug}
          spec={entry.spec}
          alt={`${entry.className} ${entry.spec}`}
          className="h-full w-full object-cover"
        />
      </div>

      {/* Class info */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-1">
          {iconUrl && (
            <img
              src={iconUrl}
              alt=""
              className="size-3 rounded-sm object-cover"
              loading="lazy"
            />
          )}
          <span className="truncate text-[11px] font-bold text-amber-100">
            {entry.className}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Spec badge */}
          <span
            className="rounded-sm px-0.5 text-[7px] font-bold uppercase leading-none"
            style={{
              color: specColor,
              backgroundColor: `${specColor}22`,
              border: `1px solid ${specColor}55`,
            }}
          >
            {entry.spec === 'awakening' ? 'AWK' : entry.spec === 'succession' ? 'SUCC' : 'ASC'}
          </span>
          {/* Group badge (if any) */}
          {entry.group && (
            <span
              className="rounded-sm px-0.5 text-[7px] font-semibold uppercase leading-none"
              style={{
                color: GROUP_COLORS[entry.group] || '#a1a1aa',
                backgroundColor: `${GROUP_COLORS[entry.group] || '#a1a1aa'}15`,
              }}
            >
              {entry.group.slice(0, 3)}
            </span>
          )}
          {/* SA DR chip with heatmap color */}
          <span
            className="ml-auto flex items-center gap-0.5 rounded-sm border px-1 font-mono text-[8px] font-bold leading-tight"
            style={{
              color: saDrColor.text,
              backgroundColor: saDrColor.bg,
              borderColor: saDrColor.border,
            }}
            title="Super Armor Damage Reduction"
          >
            {entry.saDr > 10 && <ArrowUp className="size-2" strokeWidth={3} />}
            {entry.saDr}% SA
          </span>
        </div>
      </div>

      {/* Remove button */}
      <button
        onClick={onRemove}
        className={cn(
          'absolute right-1 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-amber-300/30 opacity-0 transition-opacity hover:bg-red-900/40 hover:text-red-300 group-hover:opacity-100',
        )}
        aria-label={`Remove ${entry.className} from team`}
      >
        <X className="size-3" />
      </button>
      {/* team-colored accent strip on the left edge */}
      <span
        className={cn('absolute left-0 top-0 h-full w-0.5', teamText)}
        style={{ backgroundColor: 'currentColor' }}
        aria-hidden
      />
    </div>
  )
}
