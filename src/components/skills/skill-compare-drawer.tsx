'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { X, GitCompare, Swords, Skull, Clock, Film, Zap, Shield } from 'lucide-react'

import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'

import {
  classColor,
  fetchSkill,
  formatAnimDuration,
  formatCooldown,
  type Skill,
} from '@/lib/skills'
import { formatDamage } from '@/lib/damage'
import { useSkillStore } from '@/lib/skill-store'
import { cn } from '@/lib/utils'

function CompareStat({ label, valueA, valueB, icon, higherIsBetter = true }: {
  label: string
  valueA: string | number
  valueB: string | number
  icon?: React.ReactNode
  higherIsBetter?: boolean
}) {
  const numA = typeof valueA === 'number' ? valueA : parseFloat(String(valueA).replace(/[^0-9.-]/g, '')) || 0
  const numB = typeof valueB === 'number' ? valueB : parseFloat(String(valueB).replace(/[^0-9.-]/g, '')) || 0
  const aBetter = higherIsBetter ? numA > numB : numA < numB
  const bBetter = higherIsBetter ? numB > numA : numB < numA

  return (
    <div className="grid grid-cols-3 items-center gap-2 border-b border-amber-900/20 py-2">
      <div className={cn('text-right font-mono text-sm tabular-nums', aBetter ? 'font-bold text-emerald-400' : 'text-amber-200/70')}>
        {valueA}
      </div>
      <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-amber-300/40">
        {icon}
        {label}
      </div>
      <div className={cn('text-left font-mono text-sm tabular-nums', bBetter ? 'font-bold text-emerald-400' : 'text-amber-200/70')}>
        {valueB}
      </div>
    </div>
  )
}

function SkillColumn({ skill, side }: { skill: Skill | undefined; side: 'left' | 'right' }) {
  if (!skill) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-amber-300/30">
        <Skeleton className="h-12 w-12 rounded-sm" />
        <Skeleton className="h-4 w-24" />
        <span className="text-xs">Click a skill to compare</span>
      </div>
    )
  }

  const color = classColor(skill.className)
  const align = side === 'left' ? 'text-right' : 'text-left'

  return (
    <div className="flex flex-col items-center gap-2">
      {skill.iconUrl && (
        <div
          className="overflow-hidden rounded-sm border-2"
          style={{ width: 56, height: 56, borderColor: `${color}88`, boxShadow: `0 0 8px ${color}33` }}
        >
          <img src={skill.iconUrl} alt={skill.name} className="h-full w-full object-cover" />
        </div>
      )}
      <div className={cn('w-full', align)}>
        <div className="text-sm font-bold" style={{ color }}>{skill.name}</div>
        <div className="text-[10px] text-amber-200/40">{skill.className}</div>
      </div>
    </div>
  )
}

export function SkillCompareDrawer() {
  const compareOpen = useSkillStore((s) => s.compareOpen)
  const setCompareOpen = useSkillStore((s) => s.setCompareOpen)
  const selectedSkillId = useSkillStore((s) => s.selectedSkillId)
  const compareSkillId = useSkillStore((s) => s.compareSkillId)
  const selectSkill = useSkillStore((s) => s.selectSkill)
  const setCompareSkill = useSkillStore((s) => s.setCompareSkill)

  // Fetch both skills
  const queryA = useQuery({
    queryKey: ['skill', selectedSkillId],
    queryFn: () => fetchSkill(selectedSkillId!),
    enabled: !!selectedSkillId,
    refetchInterval: 15_000,
  })
  const queryB = useQuery({
    queryKey: ['skill', compareSkillId],
    queryFn: () => fetchSkill(compareSkillId!),
    enabled: !!compareSkillId,
    refetchInterval: 15_000,
  })

  const skillA = queryA.data
  const skillB = queryB.data

  return (
    <Sheet open={compareOpen} onOpenChange={setCompareOpen}>
      <SheetContent
        side="bottom"
        className="h-[80vh] gap-0 border-t-2 border-amber-800/60 bg-bdo-ink p-0"
        aria-describedby={undefined}
      >
        <SheetTitle className="sr-only">Compare Skills</SheetTitle>

        <div className="flex items-center justify-between border-b border-amber-900/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <GitCompare className="size-5 text-amber-400" />
            <span className="bdo-title text-lg font-bold text-amber-300">Skill Comparison</span>
          </div>
          <button onClick={() => setCompareOpen(false)} className="text-amber-300/50 hover:text-amber-200">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Two skill headers */}
          <div className="grid grid-cols-2 gap-4">
            <SkillColumn skill={skillA} side="left" />
            <SkillColumn skill={skillB} side="right" />
          </div>

          {/* Comparison stats */}
          {skillA && skillB && (
            <div className="mt-6 space-y-0">
              <div className="mb-2 text-center text-[10px] uppercase tracking-widest text-amber-300/30">
                Green = better value
              </div>

              <CompareStat
                label="PvE Damage"
                icon={<Swords className="size-3" />}
                valueA={skillA.damage?.totalPvE ? formatDamage(skillA.damage.totalPvE) : '—'}
                valueB={skillB.damage?.totalPvE ? formatDamage(skillB.damage.totalPvE) : '—'}
              />
              <CompareStat
                label="PvP Damage"
                icon={<Skull className="size-3" />}
                valueA={skillA.damage?.totalPvP ? formatDamage(skillA.damage.totalPvP) : '—'}
                valueB={skillB.damage?.totalPvP ? formatDamage(skillB.damage.totalPvP) : '—'}
              />
              <CompareStat
                label="Cooldown"
                icon={<Clock className="size-3" />}
                valueA={formatCooldown(skillA.cooldownSec)}
                valueB={formatCooldown(skillB.cooldownSec)}
                higherIsBetter={false}
              />
              <CompareStat
                label="Animation"
                icon={<Film className="size-3" />}
                valueA={formatAnimDuration(skillA.animationDurationMs)}
                valueB={formatAnimDuration(skillB.animationDurationMs)}
                higherIsBetter={false}
              />
              <CompareStat
                label="Dmg / Cooldown"
                icon={<Swords className="size-3" />}
                valueA={skillA.damagePerCooldown ? formatDamage(skillA.damagePerCooldown) : '—'}
                valueB={skillB.damagePerCooldown ? formatDamage(skillB.damagePerCooldown) : '—'}
              />
              <CompareStat
                label="CC Counters"
                icon={<Zap className="size-3" />}
                valueA={skillA.ccCounterDisplay || '—'}
                valueB={skillB.ccCounterDisplay || '—'}
              />
              <CompareStat
                label="SA Skills"
                icon={<span>💪</span>}
                valueA={skillA.protectionTypes?.includes('Super Armor') ? 'Yes' : 'No'}
                valueB={skillB.protectionTypes?.includes('Super Armor') ? 'Yes' : 'No'}
              />
              <CompareStat
                label="FG Skills"
                icon={<span>🛡</span>}
                valueA={skillA.protectionTypes?.includes('Forward Guard') ? 'Yes' : 'No'}
                valueB={skillB.protectionTypes?.includes('Forward Guard') ? 'Yes' : 'No'}
              />
              <CompareStat
                label="I-Frame"
                icon={<span>✦</span>}
                valueA={skillA.protectionTypes?.includes('I-Frame') ? 'Yes' : 'No'}
                valueB={skillB.protectionTypes?.includes('I-Frame') ? 'Yes' : 'No'}
              />
              <CompareStat
                label="Level"
                valueA={skillA.requiredLevel || '—'}
                valueB={skillB.requiredLevel || '—'}
                higherIsBetter={false}
              />
            </div>
          )}

          {/* Instructions when no second skill selected */}
          {skillA && !skillB && (
            <div className="mt-8 rounded-sm border border-amber-800/30 bg-bdo-leather-dark/30 px-4 py-3 text-center text-sm text-amber-200/50">
              Click any skill card to add it to the comparison
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
