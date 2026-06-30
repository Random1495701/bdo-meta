'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Crown, Medal, Award, Shield, Skull } from 'lucide-react'
import { classColor, classIconUrl, SPEC_COLORS } from '@/lib/skills'
import { formatDamage as fmtDmg } from '@/lib/damage'
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
  awakening: SpecStats
  succession: SpecStats
  ascension: SpecStats
}

type SpecView = 'awakening' | 'succession' | 'ascension'

// Tier thresholds based on composite score percentile
function computeCompositeScore(stats: SpecStats, saDr: number): number {
  // Weighted composite: damage 40%, CC 20%, protection 20%, SA DR 10%, grabs 10%
  const damageScore = stats.avgPvpDamage / 100
  const ccScore = stats.pvpCcSkillCount * 10
  const protScore = (stats.superArmorCount + stats.forwardGuardCount + stats.iFrameCount) * 8
  const saDrScore = saDr * 5
  const grabScore = stats.grabCount * 15
  return Math.round(damageScore * 0.4 + ccScore * 0.2 + protScore * 0.2 + saDrScore * 0.1 + grabScore * 0.1)
}

function getTier(score: number, allScores: number[]): 'S' | 'A' | 'B' | 'C' | 'D' {
  const sorted = [...allScores].sort((a, b) => b - a)
  const rank = sorted.indexOf(score)
  const pct = rank / sorted.length
  if (pct < 0.1) return 'S'
  if (pct < 0.3) return 'A'
  if (pct < 0.6) return 'B'
  if (pct < 0.85) return 'C'
  return 'D'
}

const TIER_META: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  S: { color: '#fbbf24', icon: <Crown className="size-4" />, label: 'S Tier — Top' },
  A: { color: '#34d399', icon: <Medal className="size-4" />, label: 'A Tier — Strong' },
  B: { color: '#60a5fa', icon: <Award className="size-4" />, label: 'B Tier — Viable' },
  C: { color: '#a78bfa', icon: <Shield className="size-4" />, label: 'C Tier — Niche' },
  D: { color: '#f87171', icon: <Skull className="size-4" />, label: 'D Tier — Weak' },
}

async function fetchMeta(): Promise<{ classes: ClassStats[] }> {
  const res = await fetch('/api/meta', { cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed: ${res.status}`)
  return res.json()
}

export function TierListPage() {
  const [spec, setSpec] = React.useState<SpecView>('awakening')
  const metaQuery = useQuery({ queryKey: ['meta'], queryFn: fetchMeta, staleTime: 60_000 })

  const classes = metaQuery.data?.classes ?? []

  const tierData = React.useMemo(() => {
    const validClasses = classes.filter(c => c[spec].skillCount > 0)
    const scores = validClasses.map(c => {
      const saDr = spec === 'awakening' ? c.awakeningSaDr : spec === 'succession' ? c.successionSaDr : c.ascensionSaDr
      return computeCompositeScore(c[spec], saDr)
    })

    const tierMap = new Map<string, { cls: ClassStats; score: number }[]>()
    for (let i = 0; i < validClasses.length; i++) {
      const tier = getTier(scores[i], scores)
      if (!tierMap.has(tier)) tierMap.set(tier, [])
      tierMap.get(tier)!.push({ cls: validClasses[i], score: scores[i] })
    }

    // Sort each tier by score descending
    for (const [, list] of tierMap) {
      list.sort((a, b) => b.score - a.score)
    }

    return ['S', 'A', 'B', 'C', 'D'].map(tier => ({
      tier,
      items: tierMap.get(tier) || [],
    })).filter(t => t.items.length > 0)
  }, [classes, spec])

  return (
    <div className="flex min-h-screen flex-col bg-bdo-ink text-zinc-100">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-amber-900/50 bg-bdo-ink/95 px-4 py-3 backdrop-blur lg:px-6">
        <div className="flex items-center gap-4">
          <h1 className="bdo-title text-2xl font-bold text-amber-400">Tier List</h1>
          <span className="hidden text-xs text-amber-200/50 sm:inline">
            Auto-generated from Meta stats · Composite score: Damage 40% + CC 20% + Protection 20% + SA DR 10% + Grabs 10%
          </span>

          {/* Spec toggle */}
          <div className="ml-auto flex rounded-sm border border-amber-800/50 overflow-hidden">
            {(['awakening', 'succession', 'ascension'] as SpecView[]).map(s => (
              <button
                key={s}
                onClick={() => setSpec(s)}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold capitalize transition-all',
                  spec === s ? 'bg-amber-500/20 text-amber-200' : 'bg-bdo-leather-dark text-amber-300/50 hover:text-amber-200',
                )}
                style={spec === s ? { color: SPEC_COLORS[s] } : undefined}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tier list */}
      <div className="flex-1 px-4 py-6 lg:px-6">
        {metaQuery.isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-sm border-2 border-amber-900/30 bg-bdo-leather-dark" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {tierData.map(({ tier, items }) => {
              const meta = TIER_META[tier]
              return (
                <div key={tier} className="flex gap-3">
                  {/* Tier label */}
                  <div
                    className="flex w-16 shrink-0 items-center justify-center rounded-sm border-2 text-2xl font-black"
                    style={{ borderColor: meta.color, color: meta.color, backgroundColor: `${meta.color}11` }}
                  >
                    {tier}
                  </div>

                  {/* Class chips */}
                  <div className="flex flex-wrap items-center gap-2">
                    {items.map(({ cls, score }) => {
                      const color = classColor(cls.className)
                      const iconUrl = classIconUrl(cls.slug)
                      return (
                        <motion.div
                          key={cls.classId}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center gap-2 rounded-sm border px-3 py-2"
                          style={{ borderColor: `${meta.color}44`, backgroundColor: `${meta.color}08` }}
                          title={`${cls.className} ${spec} — Score: ${score}`}
                        >
                          {iconUrl && (
                            <div className="size-7 shrink-0 overflow-hidden rounded-sm border" style={{ borderColor: `${color}55` }}>
                              <img src={iconUrl} alt={cls.className} className="h-full w-full object-cover" loading="lazy" />
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="text-sm font-bold" style={{ color }}>{cls.className}</span>
                            <span className="text-[9px] font-mono tabular-nums text-amber-300/40">Score: {score}</span>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Legend */}
        <div className="mt-8 flex flex-wrap gap-4 border-t border-amber-900/30 pt-4">
          {Object.entries(TIER_META).map(([tier, meta]) => (
            <div key={tier} className="flex items-center gap-2 text-xs">
              <span className="flex size-6 items-center justify-center rounded-sm border font-black" style={{ borderColor: meta.color, color: meta.color }}>
                {tier}
              </span>
              <span className="text-amber-200/50">{meta.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
