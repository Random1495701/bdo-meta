'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Clock, Film, Gauge, Skull, Swords, Zap } from 'lucide-react'

import {
  classColor,
  formatAnimDuration,
  formatCooldown,
  SKILL_TYPE_META,
  skillTypeLabel,
  type Skill,
} from '@/lib/skills'
import { formatDamage } from '@/lib/damage'
import { useSkillStore } from '@/lib/skill-store'
import { cn } from '@/lib/utils'

// Compact list-row skill icon. Same gold-bevel frame as the grid card but at 40px.
function ListSkillIcon({ skill, size }: { skill: Skill; size: number }) {
  const [errored, setErrored] = React.useState(false)
  const [loaded, setLoaded] = React.useState(false)
  const firstLetter = skill.name?.[0] ?? '?'
  const fallbackColor = classColor(skill.className)

  if (!skill.iconUrl || errored) {
    return (
      <div
        className="flex items-center justify-center rounded-sm border-2 font-bold"
        style={{
          width: size,
          height: size,
          borderColor: `${fallbackColor}aa`,
          backgroundColor: `${fallbackColor}1a`,
          color: fallbackColor,
          fontSize: size * 0.4,
          boxShadow:
            'inset 0 0 0 1px rgba(240,208,96,0.2), inset 0 0 8px rgba(0,0,0,0.6)',
        }}
      >
        {firstLetter}
      </div>
    )
  }

  return (
    <div
      className="bdo-icon-frame relative shrink-0 overflow-hidden"
      style={{ width: size, height: size }}
    >
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-bdo-leather" />
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

// Compact single-row skill entry. Used in the "list" view mode.
// Layout: [40px icon] [name + class dot + type badge] [key stats: Lv / SP / CD / Damage / Anim]
export const SkillListRow = React.memo(function SkillListRow({
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
  const dmg = skill.damage
  const hasDmg = !!dmg && dmg.hasDamage

  return (
    <motion.button
      type="button"
      onClick={() => selectSkill(skill.skillId)}
      whileHover={{ x: 2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'group relative flex w-full items-center gap-3 rounded-sm border p-2.5 text-left transition-colors',
        'border-amber-800/40 bg-bdo-leather hover:border-amber-500/70',
      )}
      style={{
        boxShadow:
          'inset 0 0 0 1px rgba(240,208,96,0.08), inset 0 0 10px rgba(0,0,0,0.5)',
      }}
    >
      {/* Hover gold glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          background:
            'linear-gradient(90deg, rgba(200,170,68,0.06) 0%, transparent 60%)',
        }}
      />

      <ListSkillIcon skill={skill} size={40} />

      {/* Name + class/type badges */}
      <div className="min-w-0 flex-1">
        <div
          className="bdo-heading truncate text-sm leading-tight text-amber-100 group-hover:text-amber-200"
          title={skill.name}
        >
          {skill.name}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          {skill.className && (
            <span
              className="flex items-center gap-1 text-[10px] font-medium"
              style={{ color }}
              title={skill.className}
            >
              <span
                className="size-1.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="max-w-[110px] truncate">{skill.className}</span>
            </span>
          )}
          {typeMeta && (
            <span
              className="rounded-sm px-1.5 py-px text-[9px] font-semibold"
              style={{
                backgroundColor: `${typeMeta.color}1a`,
                color: typeMeta.color,
                boxShadow: `inset 0 0 0 1px ${typeMeta.color}55`,
              }}
              title={typeMeta.description}
            >
              {typeMeta.label}
            </span>
          )}
          {skill.isQuickSlot && (
            <span className="rounded-sm bg-bdo-leather-dark px-1 py-px text-[9px] text-amber-200/50">
              Q-Slot
            </span>
          )}
        </div>
      </div>

      {/* Compact key stats row */}
      <div className="flex shrink-0 items-center gap-3 text-[11px] tabular-nums">
        <div
          className="hidden items-center gap-1 text-amber-100/70 sm:flex"
          title="Required level"
        >
          <Gauge className="size-3 text-amber-500/70" />
          <span className="font-mono">{skill.requiredLevel || '—'}</span>
        </div>
        <div
          className="hidden items-center gap-1 text-amber-100/70 md:flex"
          title="Cooldown"
        >
          <Clock className="size-3 text-amber-500/70" />
          <span className="font-mono">{cd}</span>
        </div>
        {hasDmg ? (
          <div
            className="flex items-center gap-2"
            title={`PvE: ${dmg!.totalPvE.toLocaleString()}%${
              dmg!.totalPvP != null ? ` · PvP: ${dmg!.totalPvP.toLocaleString()}%` : ''
            }`}
          >
            <span className="flex items-center gap-1 font-mono font-bold text-amber-300">
              <Swords className="size-3 text-amber-400" />
              {formatDamage(dmg!.totalPvE)}
            </span>
            {dmg!.totalPvP != null && (
              <span className="flex items-center gap-1 font-mono font-bold text-pink-400">
                <Skull className="size-3 text-pink-400/80" />
                {formatDamage(dmg!.totalPvP)}
              </span>
            )}
          </div>
        ) : (
          <span className="flex items-center gap-1 text-amber-200/30">
            <Swords className="size-3" />
            <span>—</span>
          </span>
        )}
        {skill.ccCounters != null && skill.ccCounters > 0 && (
          <div
            className="flex items-center gap-1 rounded-sm border border-red-700/60 bg-red-900/30 px-1.5 py-0.5 font-mono font-bold text-red-300"
            title={`CC Counters: ${skill.ccCounterDisplay || skill.ccCounters} (PvP only)`}
          >
            <Zap className="size-2.5" />
            {skill.ccCounterDisplay || skill.ccCounters}
          </div>
        )}
        {skill.animationDurationMs != null && (
          <div
            className="hidden items-center gap-1 text-amber-300 lg:flex"
            title="Animation"
          >
            <Film className="size-3" />
            <span className="font-mono">{anim}</span>
          </div>
        )}
      </div>
    </motion.button>
  )
})
