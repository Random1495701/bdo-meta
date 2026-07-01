'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Swords, Pin, X, ArrowUp, ArrowDown, Minus, ChevronUp, ChevronDown } from 'lucide-react'
import { classColor, classIconUrl, SPEC_COLORS } from '@/lib/skills'
import { cn } from '@/lib/utils'

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
  const [teamA, setTeamA] = React.useState<string[]>([])
  const [teamB, setTeamB] = React.useState<string[]>([])

  const classes = metaQuery.data?.classes ?? []

  // Build merged class entries (combine all specs into one row per class)
  const mergedClasses = React.useMemo(() => {
    return classes.map(cls => {
      // Use the primary group (awakening for normal classes, ascension for ascension-only)
      const group = cls.isAscension ? cls.ascensionGroup : cls.awakeningGroup
      const saDr = cls.isAscension ? cls.ascensionSaDr : cls.awakeningSaDr
      // Merge stats: take the best spec (most skills)
      const specs = [cls.awakening, cls.succession, cls.ascension].filter(s => s.skillCount > 0)
      const bestSpec = specs.sort((a, b) => b.skillCount - a.skillCount)[0] || cls.awakening
      return {
        ...cls,
        group,
        saDr,
        mergedStats: bestSpec,
      }
    }).sort((a, b) => {
      // Sort by group first, then alphabetically
      const groupCompare = (a.group || 'zzz').localeCompare(b.group || 'zzz')
      if (groupCompare !== 0) return groupCompare
      return a.className.localeCompare(b.className)
    })
  }, [classes])

  // Group counts
  const groupCounts = React.useMemo(() => {
    const counts: Record<string, number> = {}
    for (const c of mergedClasses) {
      if (c.group) counts[c.group] = (counts[c.group] || 0) + 1
    }
    return counts
  }, [mergedClasses])

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
    const pinned = mergedClasses.filter(c => selectedClasses.has(c.className))
    const unpinned = mergedClasses.filter(c => !selectedClasses.has(c.className))
    return [...pinned, ...unpinned]
  }, [mergedClasses, selectedClasses])

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
                  <p className="text-[10px] text-amber-300/40">
                    Click class chips to assign to Team A or Team B (max 3 each). Shows group counter advantages between teams.
                  </p>
                  {/* Team display */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Team A */}
                    <div className="rounded-sm border border-emerald-700/40 bg-emerald-900/10 p-2">
                      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300/60">Team A ({teamA.length}/3)</div>
                      <div className="flex flex-wrap gap-1">
                        {teamA.map(name => {
                          const cls = mergedClasses.find(c => c.className === name)
                          const color = classColor(name)
                          return (
                            <div key={name} className="flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px]" style={{ borderColor: `${color}44`, backgroundColor: `${color}11` }}>
                              <span style={{ color }}>{name}</span>
                              <button onClick={() => setTeamA(teamA.filter(n => n !== name))} className="text-amber-300/30 hover:text-red-400"><X className="size-2.5" /></button>
                            </div>
                          )
                        })}
                        {teamA.length === 0 && <span className="text-[9px] text-emerald-300/30">Click classes below</span>}
                      </div>
                    </div>
                    {/* Team B */}
                    <div className="rounded-sm border border-red-700/40 bg-red-900/10 p-2">
                      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-red-300/60">Team B ({teamB.length}/3)</div>
                      <div className="flex flex-wrap gap-1">
                        {teamB.map(name => {
                          const cls = mergedClasses.find(c => c.className === name)
                          const color = classColor(name)
                          return (
                            <div key={name} className="flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px]" style={{ borderColor: `${color}44`, backgroundColor: `${color}11` }}>
                              <span style={{ color }}>{name}</span>
                              <button onClick={() => setTeamB(teamB.filter(n => n !== name))} className="text-amber-300/30 hover:text-red-400"><X className="size-2.5" /></button>
                            </div>
                          )
                        })}
                        {teamB.length === 0 && <span className="text-[9px] text-red-300/30">Click classes below</span>}
                      </div>
                    </div>
                  </div>

                  {/* Team advantage analysis */}
                  {teamA.length > 0 && teamB.length > 0 && (
                    <div className="rounded-sm border border-amber-800/30 bg-bdo-ink/40 p-2 text-[10px]">
                      {teamA.map(a => teamB.map(b => {
                        const clsA = mergedClasses.find(c => c.className === a)!
                        const clsB = mergedClasses.find(c => c.className === b)!
                        const adv = getAdvantage(clsA.group || '', clsB.group || '')
                        return (
                          <div key={`${a}-${b}`} className="flex items-center gap-1.5 py-0.5">
                            <span className="text-emerald-300/60">{a}</span>
                            <span className="text-amber-400/30">vs</span>
                            <span className="text-red-300/60">{b}</span>
                            <span className="ml-auto">
                              {adv === 'up' && <span className="text-emerald-400">+5%</span>}
                              {adv === 'down' && <span className="text-red-400">-5%</span>}
                              {adv === 'neutral' && <span className="text-amber-300/30">=</span>}
                            </span>
                          </div>
                        )
                      }))}
                    </div>
                  )}

                  {/* Class chips for arena selection */}
                  <div className="flex flex-wrap gap-1">
                    {mergedClasses.map(cls => {
                      const color = classColor(cls.className)
                      const iconUrl = classIconUrl(cls.slug)
                      const inA = teamA.includes(cls.className)
                      const inB = teamB.includes(cls.className)
                      const isFull = (inA && teamA.length >= 3) || (inB && teamB.length >= 3)
                      return (
                        <button
                          key={cls.classId}
                          onClick={() => {
                            if (inA) { setTeamA(teamA.filter(n => n !== cls.className)); return }
                            if (inB) { setTeamB(teamB.filter(n => n !== cls.className)); return }
                            if (teamA.length < 3) setTeamA([...teamA, cls.className])
                            else if (teamB.length < 3) setTeamB([...teamB, cls.className])
                          }}
                          disabled={!inA && !inB && teamA.length >= 3 && teamB.length >= 3}
                          className={cn(
                            'flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[9px] font-semibold transition-all',
                            inA && 'border-emerald-500/60 bg-emerald-900/20',
                            inB && 'border-red-500/60 bg-red-900/20',
                            !inA && !inB && 'border-amber-800/30 hover:border-amber-500/40',
                          )}
                          style={{ color }}
                          title={cls.group || ''}
                        >
                          {iconUrl && <img src={iconUrl} alt="" className="size-3.5 rounded-sm object-cover" loading="lazy" />}
                          {cls.className}
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
                    const clsA = mergedClasses.find(c => c.className === a)!
                    const clsB = mergedClasses.find(c => c.className === b)!
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
                              <td className="px-2 py-1.5 text-[10px] text-amber-300/50">{cls.combatType || '—'}</td>
                              <td className="px-2 py-1.5 text-right font-mono text-xs tabular-nums text-amber-300">{cls.saDr}%</td>
                              <td className="px-2 py-1.5 text-right font-mono text-xs tabular-nums text-red-300">{cls.mergedStats.pvpCcSkillCount}</td>
                              <td className="px-2 py-1.5 text-right font-mono text-xs tabular-nums text-orange-300">{cls.mergedStats.grabCount}</td>
                              <td className="px-2 py-1.5 text-right font-mono text-xs tabular-nums text-cyan-300">{cls.mergedStats.avgDpc}</td>
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
