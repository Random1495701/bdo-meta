'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, GitCompare, Swords, Clock, Zap, Shield } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import { fetchSkill, classColor, formatCooldown, formatAnimDuration, SPEC_COLORS } from '@/lib/skills'
import { formatDamage as fmtDmg } from '@/lib/damage'
import { useSkillStore } from '@/lib/skill-store'

export function SkillCompareDrawer() {
  const compareSkillId = useSkillStore((s) => s.compareSkillId)
  const compareOpen = useSkillStore((s) => s.compareOpen)
  const setCompareOpen = useSkillStore((s) => s.setCompareOpen)
  const selectedSkillId = useSkillStore((s) => s.selectedSkillId)

  const leftQuery = useQuery({
    queryKey: ['skill', selectedSkillId],
    queryFn: () => fetchSkill(selectedSkillId!),
    enabled: selectedSkillId != null,
  })

  const rightQuery = useQuery({
    queryKey: ['skill', compareSkillId],
    queryFn: () => fetchSkill(compareSkillId!),
    enabled: compareSkillId != null,
  })

  const left = leftQuery.data
  const right = rightQuery.data

  return (
    <Sheet open={compareOpen} onOpenChange={setCompareOpen}>
      <SheetContent
        side="right"
        className="w-full gap-0 border-l-2 border-amber-800/60 bg-bdo-ink p-0 sm:max-w-[700px]"
        aria-describedby={undefined}
      >
        <SheetTitle className="sr-only">Compare Skills</SheetTitle>

        {/* Header */}
        <div className="flex items-center gap-2 border-b border-amber-900/50 bg-bdo-leather-dark/50 px-4 py-3">
          <GitCompare className="size-5 text-amber-400" />
          <h2 className="bdo-title text-lg font-bold text-amber-300">Skill Comparison</h2>
          <button
            onClick={() => setCompareOpen(false)}
            className="ml-auto rounded-sm p-1 text-amber-300/50 hover:bg-amber-500/10 hover:text-amber-200"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex h-[calc(100vh-60px)] flex-col overflow-y-auto">
          {!left || !right ? (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-amber-300/40">
              <div>
                <GitCompare className="mx-auto mb-3 size-12 opacity-30" />
                <p className="text-sm">Select two skills to compare</p>
                <p className="mt-1 text-xs">
                  Open a skill, then click the compare button on another skill.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Two-column header */}
              <div className="grid grid-cols-2 gap-px bg-amber-900/30">
                <CompareHeader skill={left} />
                <CompareHeader skill={right} />
              </div>

              {/* Comparison rows */}
              <CompareRow label="Class" left={left.className || '—'} right={right.className || '—'} />
              <CompareRow label="Level" left={String(left.requiredLevel)} right={String(right.requiredLevel)} />
              <CompareRow label="SP" left={String(left.skillPoints)} right={String(right.skillPoints)} icon={<Zap className="size-3" />} />
              <CompareRow label="Cooldown" left={formatCooldown(left.cooldownSec)} right={formatCooldown(right.cooldownSec)} icon={<Clock className="size-3" />} compare lower />
              <CompareRow label="Animation" left={formatAnimDuration(left.animationDurationMs)} right={formatAnimDuration(right.animationDurationMs)} icon={<Clock className="size-3" />} compare lower />
              <CompareRow label="PvP Damage %" left={left.pvpDamagePercent != null ? `${left.pvpDamagePercent}%` : '—'} right={right.pvpDamagePercent != null ? `${right.pvpDamagePercent}%` : '—'} icon={<Swords className="size-3" />} />
              <CompareRow label="PvE Damage" left={left.damage?.totalPvE ? fmtDmg(left.damage.totalPvE) : '—'} right={right.damage?.totalPvE ? fmtDmg(right.damage.totalPvE) : '—'} icon={<Swords className="size-3" />} compare />
              <CompareRow label="PvP Damage" left={left.damage?.totalPvP ? fmtDmg(left.damage.totalPvP) : '—'} right={right.damage?.totalPvP ? fmtDmg(right.damage.totalPvP) : '—'} icon={<Swords className="size-3" />} compare />
              <CompareRow label="Dmg / Cooldown" left={left.damagePerCooldown ? fmtDmg(left.damagePerCooldown) : '—'} right={right.damagePerCooldown ? fmtDmg(right.damagePerCooldown) : '—'} compare />
              <CompareRow label="CC Counters" left={left.ccCounterDisplay || '—'} right={right.ccCounterDisplay || '—'} icon={<Zap className="size-3" />} />
              <CompareRow label="CC Types" left={left.ccTypes?.join(', ') || '—'} right={right.ccTypes?.join(', ') || '—'} />
              <CompareRow label="Protection" left={left.protectionTypes?.join(', ') || '—'} right={right.protectionTypes?.join(', ') || '—'} icon={<Shield className="size-3" />} />
              <CompareRow label="Command" left={left.command || '—'} right={right.command || '—'} />
              <CompareRow label="Quick Slot" left={left.isQuickSlot ? 'Yes' : 'No'} right={right.isQuickSlot ? 'Yes' : 'No'} />

              {/* Damage phases comparison */}
              {left.damage && right.damage && (left.damage.phases.length > 0 || right.damage.phases.length > 0) && (
                <div className="mt-2 border-t border-amber-900/30 p-3">
                  <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-amber-300/50">Damage Phases</h3>
                  <div className="space-y-1">
                    {Array.from(new Set([...left.damage.phases.map(p => p.phase), ...right.damage.phases.map(p => p.phase)])).map(phase => {
                      const lp = left.damage!.phases.find(p => p.phase === phase)
                      const rp = right.damage!.phases.find(p => p.phase === phase)
                      return (
                        <div key={phase} className="grid grid-cols-3 gap-2 rounded-sm border border-amber-900/20 bg-bdo-leather-dark/20 p-2 text-[10px]">
                          <span className="font-semibold text-amber-200/70">{phase}</span>
                          <span className="font-mono text-pink-300/70">{lp ? `${fmtDmg(lp.totalMax)}` : '—'}</span>
                          <span className="font-mono text-pink-300/70">{rp ? `${fmtDmg(rp.totalMax)}` : '—'}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function CompareHeader({ skill }: { skill: any }) {
  const color = classColor(skill.className)
  return (
    <div className="bg-bdo-leather-dark/50 p-3">
      <div className="flex items-center gap-2">
        {skill.iconUrl && (
          <div className="size-10 shrink-0 overflow-hidden rounded-sm border" style={{ borderColor: `${color}55` }}>
            <img src={skill.iconUrl} alt={skill.name} className="h-full w-full object-cover" />
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-amber-100">{skill.name}</div>
          <div className="text-[10px]" style={{ color }}>{skill.className}</div>
        </div>
      </div>
    </div>
  )
}

function CompareRow({ label, left, right, icon, compare, lower }: {
  label: string
  left: string
  right: string
  icon?: React.ReactNode
  compare?: boolean // highlight the better value
  lower?: boolean // if true, lower value is better (cooldown, animation)
}) {
  // Determine winner
  let leftWins = false, rightWins = false
  if (compare) {
    const ln = parseFloat(left.replace(/[^0-9.]/g, ''))
    const rn = parseFloat(right.replace(/[^0-9.]/g, ''))
    if (!isNaN(ln) && !isNaN(rn) && ln !== rn) {
      if (lower) {
        leftWins = ln < rn
        rightWins = rn < ln
      } else {
        leftWins = ln > rn
        rightWins = rn > ln
      }
    }
  }

  return (
    <div className="grid grid-cols-3 gap-px border-b border-amber-900/15 bg-amber-900/10">
      <div className="flex items-center gap-1.5 bg-bdo-ink/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-amber-300/40">
        {icon}
        {label}
      </div>
      <div className={`bg-bdo-ink/60 px-3 py-2 text-xs font-mono tabular-nums ${leftWins ? 'text-emerald-300 font-bold' : 'text-amber-100/70'}`}>
        {left}
      </div>
      <div className={`bg-bdo-ink/60 px-3 py-2 text-xs font-mono tabular-nums ${rightWins ? 'text-emerald-300 font-bold' : 'text-amber-100/70'}`}>
        {right}
      </div>
    </div>
  )
}
