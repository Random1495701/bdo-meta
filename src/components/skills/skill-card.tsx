'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Clock, Film, Gauge, GitCompare, Keyboard, Skull, Swords, Zap } from 'lucide-react'

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

// Skill icon rendered inside an ornate gold frame (BDO skill-bar style).
function SkillIcon({ skill, size }: { skill: Skill; size: number }) {
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
        empty
          ? 'text-amber-100/30'
          : accent
            ? 'text-amber-300'
            : 'text-amber-100/80',
      )}
      title={`${label}: ${value}`}
    >
      <span className="shrink-0 opacity-80">{icon}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  )
}

// Compact damage row — shows total PvE (amber, ⚔) and PvP (pink, ☠) inline.
// Both values fit on a single line; the icons replace the legacy "DAMAGE"
// label which used to clip on narrow cards.
function DamageRow({ skill }: { skill: Skill }) {
  const dmg = skill.damage
  if (!dmg || !dmg.hasDamage) {
    return (
      <div className="flex items-center gap-1.5 rounded-sm border border-amber-900/40 bg-bdo-leather-dark px-2.5 py-1.5 text-xs text-amber-200/30">
        <Swords className="size-3" />
        <span>—</span>
      </div>
    )
  }
  const pve = formatDamage(dmg.totalPvE)
  const pvp = dmg.totalPvP != null ? formatDamage(dmg.totalPvP) : null
  return (
    <div
      className="flex items-center gap-2.5 rounded-sm border border-amber-700/40 bg-gradient-to-r from-amber-950/40 to-bdo-leather-dark px-2.5 py-1.5"
      style={{ boxShadow: 'inset 0 0 0 1px rgba(240,208,96,0.1)' }}
    >
      <div
        className="flex items-center gap-1 text-sm font-bold tabular-nums text-amber-300"
        title={`Total PvE damage: ${dmg.totalPvE.toLocaleString()}%`}
      >
        <Swords className="size-3.5 text-amber-400" />
        {pve}
      </div>
      {pvp && (
        <div
          className="flex items-center gap-1 text-sm font-bold tabular-nums text-pink-400"
          title={`Total PvP damage: ${dmg.totalPvP?.toLocaleString()}% (${dmg.pvpDamagePercent}% of PvE)`}
        >
          <Skull className="size-3.5 text-pink-400/80" />
          {pvp}
        </div>
      )}
    </div>
  )
}

export const SkillCard = React.memo(function SkillCard({
  skill,
}: {
  skill: Skill
}) {
  const selectSkill = useSkillStore((s) => s.selectSkill)
  const setCompareSkill = useSkillStore((s) => s.setCompareSkill)
  const type = skillTypeLabel(skill)
  const typeMeta = type ? SKILL_TYPE_META[type] : null
  const color = classColor(skill.className)
  const cd = formatCooldown(skill.cooldownSec)
  const anim = formatAnimDuration(skill.animationDurationMs)

  return (
    <motion.button
      type="button"
      data-skill-card
      tabIndex={0}
      onClick={() => selectSkill(skill.skillId)}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className={cn(
        'group relative flex h-full w-full flex-col gap-2 overflow-hidden rounded-sm border p-3 text-left transition-colors',
        'border-amber-800/50 bg-bdo-leather hover:border-amber-500/70',
      )}
      style={{
        boxShadow:
          'inset 0 0 0 1px rgba(240,208,96,0.1), inset 0 0 14px rgba(0,0,0,0.6)',
      }}
    >
      {/* Hover gold glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(circle at center, rgba(200,170,68,0.08) 0%, transparent 70%)',
        }}
      />
      {/* Top: icon + title */}
      <div className="flex items-start gap-2.5">
        <SkillIcon skill={skill} size={48} />

        <div className="min-w-0 flex-1">
          <div
            className="bdo-heading line-clamp-2 text-sm leading-tight text-amber-100 group-hover:text-amber-200"
            title={skill.name}
          >
            {skill.name}
          </div>
          {skill.krName && (
            <div
              className="mt-0.5 truncate text-[11px] text-amber-200/40"
              title={skill.krName}
            >
              {skill.krName}
            </div>
          )}
        </div>

        {skill.animationDurationMs != null && (
          <div
            className="flex items-center gap-0.5 rounded-sm border border-amber-500/50 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300"
            style={{ boxShadow: 'inset 0 0 0 1px rgba(240,208,96,0.2)' }}
            title={`Animation: ${anim}`}
          >
            <Film className="size-2.5" />
            {anim}
          </div>
        )}
        {/* Compare button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setCompareSkill(skill.skillId)
          }}
          className="flex size-6 shrink-0 items-center justify-center rounded-sm border border-amber-800/40 bg-bdo-leather-dark/50 text-amber-300/40 opacity-0 transition-all hover:border-amber-500/50 hover:text-amber-200 group-hover:opacity-100"
          title="Compare with current skill"
        >
          <GitCompare className="size-3" />
        </button>
      </div>

      {/* Class + type badge */}
      <div className="flex flex-wrap items-center gap-1.5">
        {skill.className && (
          <div
            className="flex items-center gap-1 rounded-sm px-2 py-0.5 text-[10px] font-medium"
            style={{
              backgroundColor: `${color}1a`,
              color: color,
              boxShadow: `inset 0 0 0 1px ${color}55`,
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
            className="rounded-sm px-2 py-0.5 text-[10px] font-semibold"
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
          <span className="flex items-center gap-0.5 rounded-sm bg-bdo-leather-dark px-1.5 py-0.5 text-[10px] text-amber-200/60">
            <Keyboard className="size-2.5" /> Q-Slot
          </span>
        )}
      </div>

      {/* Command (if present) */}
      {skill.command && (
        <div className="flex items-center gap-1">
          <kbd
            className="rounded-sm border border-amber-800/60 bg-bdo-leather-dark px-1.5 py-0.5 font-mono text-[10px] text-amber-200/80"
            style={{ boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.6)' }}
          >
            {skill.command}
          </kbd>
        </div>
      )}

      {/* Damage row — prominent amber/pink display */}
      <DamageRow skill={skill} />

      <div
        className="mt-auto flex items-center justify-between gap-2 border-t border-amber-900/40 pt-2"
      >
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
        {skill.ccCounters != null && skill.ccCounters > 0 && (
          <div
            className="flex items-center gap-1 rounded-sm border border-red-700/60 bg-red-900/30 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-red-300"
            title={`CC Counters: ${skill.ccCounterDisplay} (PvP only, target is CC-immune at 2)`}
          >
            <Zap className="size-2.5" />
            {skill.ccCounterDisplay}
          </div>
        )}
      </div>
    </motion.button>
  )
})
