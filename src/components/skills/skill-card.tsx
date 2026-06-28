'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Clock, Film, Gauge, Keyboard, Star } from 'lucide-react'

import {
  classColor,
  formatAnimDuration,
  formatCooldown,
  SKILL_TYPE_META,
  skillTypeLabel,
  type Skill,
} from '@/lib/skills'
import { useSkillStore } from '@/lib/skill-store'
import { cn } from '@/lib/utils'

function SkillIcon({ skill, size }: { skill: Skill; size: number }) {
  const [errored, setErrored] = React.useState(false)
  const [loaded, setLoaded] = React.useState(false)
  const firstLetter = skill.name?.[0] ?? '?'
  const fallbackColor = classColor(skill.className)

  if (!skill.iconUrl || errored) {
    return (
      <div
        className="flex items-center justify-center rounded-md border border-zinc-700/60 font-bold"
        style={{
          width: size,
          height: size,
          backgroundColor: `${fallbackColor}1a`,
          color: fallbackColor,
          fontSize: size * 0.4,
        }}
      >
        {firstLetter}
      </div>
    )
  }

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-md border border-zinc-700/60 bg-zinc-900"
      style={{ width: size, height: size }}
    >
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-zinc-800" />
      )}
      <img
        src={skill.iconUrl}
        alt={skill.name}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        className={cn(
          'h-full w-full object-cover transition-opacity',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
      />
    </div>
  )
}

function MiniStat({
  icon,
  value,
  label,
  accent,
}: {
  icon: React.ReactNode
  value: string
  label: string
  accent?: boolean
}) {
  const empty = value === '—'
  return (
    <div
      className={cn(
        'flex items-center gap-1 text-[11px] tabular-nums',
        empty ? 'text-zinc-600' : accent ? 'text-amber-300' : 'text-zinc-300',
      )}
      title={`${label}: ${value}`}
    >
      <span className="shrink-0 opacity-80">{icon}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  )
}

export const SkillCard = React.memo(function SkillCard({
  skill,
}: {
  skill: Skill
}) {
  const selectSkill = useSkillStore((s) => s.selectSkill)
  const type = skillTypeLabel(skill)
  const typeMeta = type ? SKILL_TYPE_META[type] : null
  const color = classColor(skill.className)
  const cd = formatCooldown(skill.cooldownSec)
  const anim = formatAnimDuration(skill.animationDurationMs)

  return (
    <motion.button
      type="button"
      onClick={() => selectSkill(skill.skillId)}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className="group relative flex h-full w-full flex-col gap-2 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-left transition-colors hover:border-amber-500/40 hover:bg-zinc-900/70 hover:shadow-[0_0_0_1px_rgba(245,158,11,0.15),0_8px_24px_-8px_rgba(245,158,11,0.25)]"
    >
      {/* Top: icon + title */}
      <div className="flex items-start gap-2.5">
        <SkillIcon skill={skill} size={48} />

        <div className="min-w-0 flex-1">
          <div
            className="line-clamp-2 text-sm font-semibold leading-tight text-zinc-100 group-hover:text-amber-100"
            title={skill.name}
          >
            {skill.name}
          </div>
          {skill.krName && (
            <div
              className="mt-0.5 truncate text-[11px] text-zinc-500"
              title={skill.krName}
            >
              {skill.krName}
            </div>
          )}
        </div>

        {skill.animationDurationMs != null && (
          <div
            className="flex items-center gap-0.5 rounded-full border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300"
            title={`Animation: ${anim}`}
          >
            <Film className="size-2.5" />
            {anim}
          </div>
        )}
      </div>

      {/* Class + type badge */}
      <div className="flex flex-wrap items-center gap-1.5">
        {skill.className && (
          <div
            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{
              backgroundColor: `${color}1a`,
              color: color,
              boxShadow: `inset 0 0 0 1px ${color}33`,
            }}
          >
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="truncate max-w-[110px]">{skill.className}</span>
          </div>
        )}
        {typeMeta && (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{
              backgroundColor: `${typeMeta.color}1a`,
              color: typeMeta.color,
              boxShadow: `inset 0 0 0 1px ${typeMeta.color}33`,
            }}
            title={typeMeta.description}
          >
            {typeMeta.label}
          </span>
        )}
        {skill.isQuickSlot && (
          <span className="flex items-center gap-0.5 rounded-full bg-zinc-800/80 px-1.5 py-0.5 text-[10px] text-zinc-400">
            <Keyboard className="size-2.5" /> Q-Slot
          </span>
        )}
      </div>

      {/* Command (if present) */}
      {skill.command && (
        <div className="flex items-center gap-1">
          <kbd className="rounded border border-zinc-700 bg-zinc-800/70 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
            {skill.command}
          </kbd>
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-zinc-800/60 pt-2">
        <MiniStat
          icon={<Gauge className="size-3" />}
          value={skill.requiredLevel ? `Lv ${skill.requiredLevel}` : '—'}
          label="Required level"
        />
        <MiniStat
          icon={<Clock className="size-3" />}
          value={cd}
          label="Cooldown"
        />
        <MiniStat
          icon={<Film className="size-3" />}
          value={anim}
          label="Animation"
          accent={skill.animationDurationMs != null}
        />
        {skill.skillPoints > 0 && (
          <MiniStat
            icon={<Star className="size-3" />}
            value={`${skill.skillPoints} SP`}
            label="Skill points"
          />
        )}
      </div>
    </motion.button>
  )
})
