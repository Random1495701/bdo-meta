'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ExternalLink,
  Gauge,
  Clock,
  Film,
  Sparkles,
  Sword,
  Shield,
  Zap,
  Keyboard,
  ChevronRight,
  Skull,
  Activity,
  Lock,
  Swords,
  AlertTriangle,
} from 'lucide-react'

import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import {
  classColor,
  fetchSkill,
  formatAnimDuration,
  formatCooldown,
  PROTECTION_META,
  CC_TYPES,
  NON_CC_EFFECTS,
  SKILL_TYPE_META,
  skillTypeLabel,
  type DamageRow,
  type PhaseDamage,
  type Skill,
} from '@/lib/skills'
import { formatDamage } from '@/lib/damage'
import { useSkillStore } from '@/lib/skill-store'
import { cn } from '@/lib/utils'

// ---------- helpers ----------

function SkillIconLarge({ skill, size }: { skill: Skill; size: number }) {
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
            'inset 0 0 0 1px rgba(240,208,96,0.3), inset 0 0 14px rgba(0,0,0,0.7)',
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
      {!loaded && <div className="absolute inset-0 animate-pulse bg-bdo-leather" />}
      <img
        src={skill.iconUrl}
        alt={skill.name}
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

function StatCard({
  icon,
  label,
  value,
  accent,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent?: 'amber' | 'red' | 'cyan' | 'green' | 'pink'
  hint?: string
}) {
  const accentBorder =
    accent === 'amber'
      ? 'border-amber-500/50'
      : accent === 'red'
        ? 'border-red-700/50'
        : accent === 'cyan'
          ? 'border-cyan-700/50'
          : accent === 'green'
            ? 'border-emerald-700/50'
            : accent === 'pink'
              ? 'border-pink-700/50'
              : 'border-amber-900/50'

  const accentText =
    accent === 'amber'
      ? 'text-amber-300'
      : accent === 'red'
        ? 'text-red-300'
        : accent === 'cyan'
          ? 'text-cyan-300'
          : accent === 'green'
            ? 'text-emerald-300'
            : accent === 'pink'
              ? 'text-pink-300'
              : 'text-amber-100'

  return (
    <TooltipProvider delayDuration={150}>
      <div
        className={cn(
          'bdo-stat-box flex flex-col gap-0.5',
          accentBorder,
        )}
      >
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200/50">
          {icon}
          <span>{label}</span>
          {hint && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="ml-auto cursor-help text-[10px] text-amber-700/70">
                  ⓘ
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px]">
                {hint}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className={cn('font-mono text-base font-semibold tabular-nums', accentText)}>
          {value}
        </div>
      </div>
    </TooltipProvider>
  )
}

function DamageRowItem({ row }: { row: DamageRow }) {
  const kindColor =
    row.kind === 'damage'
      ? 'text-amber-300'
      : row.kind === 'cc'
        ? 'text-red-300'
        : row.kind === 'protection'
          ? 'text-cyan-300'
          : row.kind === 'pvp'
            ? 'text-pink-300'
            : row.kind === 'buff'
              ? 'text-emerald-300'
              : 'text-amber-100/80'

  return (
    <div className="flex items-baseline gap-2 py-1 text-sm">
      <span className={cn('font-medium', kindColor)}>{row.label}</span>
      {row.value && (
        <span className={cn('font-mono text-xs', kindColor)}>{row.value}</span>
      )}
      <span className="ml-auto flex items-center gap-1">
        {row.pvpOnly && (
          <Badge className="border-pink-700/50 bg-pink-900/20 text-pink-300">
            PvP only
          </Badge>
        )}
        {row.pveOnly && (
          <Badge className="border-emerald-700/50 bg-emerald-900/20 text-emerald-300">
            PvE only
          </Badge>
        )}
        {row.kind !== 'note' && row.kind !== 'damage' && (
          <span className="text-[10px] uppercase tracking-wider text-amber-200/40">
            {row.kind}
          </span>
        )}
      </span>
    </div>
  )
}

// Per-phase damage breakdown row. Format: "Attack 1: 8,246% × 1 = 8,246%"
// or with maxHits: "Attack 3: 4,082% × 8 max 8 = 32,656%"
function PhaseDamageRow({ phase }: { phase: PhaseDamage }) {
  const percent = phase.percent.toLocaleString()
  const total = phase.totalMax.toLocaleString()
  const pvpOnly = phase.pvpOnly
  const pveOnly = phase.pveOnly
  const color = pvpOnly
    ? 'text-pink-300'
    : pveOnly
      ? 'text-emerald-300'
      : 'text-amber-300'
  const borderColor = pvpOnly
    ? 'border-pink-900/40'
    : pveOnly
      ? 'border-emerald-900/40'
      : 'border-amber-900/40'

  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-2 rounded-sm border bg-bdo-leather-dark px-2.5 py-1.5 text-sm',
        borderColor,
      )}
      style={{ boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.6)' }}
    >
      <div className="flex min-w-0 flex-1 items-baseline gap-1.5">
        <span className="truncate font-medium text-amber-100/90">
          {phase.phase}
        </span>
        {pvpOnly && (
          <Badge className="border-pink-700/50 bg-pink-900/20 text-pink-300 text-[9px]">
            PvP
          </Badge>
        )}
        {pveOnly && (
          <Badge className="border-emerald-700/50 bg-emerald-900/20 text-emerald-300 text-[9px]">
            PvE
          </Badge>
        )}
      </div>
      <div className="flex items-baseline gap-1 font-mono text-xs tabular-nums">
        <span className={cn('font-semibold', color)}>{percent}%</span>
        <span className="text-amber-700/70">×</span>
        <span className="text-amber-200/80">{phase.hits}</span>
        {phase.maxHits != null && (
          <>
            <span className="text-amber-700/70">max</span>
            <span className="text-amber-200/80">{phase.maxHits}</span>
          </>
        )}
        <span className="text-amber-700/70">=</span>
        <span className={cn('font-bold', color)}>{total}%</span>
      </div>
    </div>
  )
}

// Large stat card for the damage summary section.
function DamageStatCard({
  label,
  value,
  accent,
  hint,
}: {
  label: string
  value: string
  accent: 'amber' | 'pink'
  hint?: string
}) {
  const isAmber = accent === 'amber'
  return (
    <div
      className={cn(
        'bdo-stat-box flex flex-col gap-1 rounded-sm border-2 px-3 py-2.5',
        isAmber ? 'border-amber-500/60' : 'border-pink-700/60',
      )}
      style={
        isAmber
          ? { boxShadow: 'inset 0 0 0 1px rgba(240,208,96,0.25), 0 0 14px rgba(200,170,68,0.18)' }
          : { boxShadow: 'inset 0 0 0 1px rgba(244,114,182,0.25), 0 0 14px rgba(244,114,182,0.15)' }
      }
    >
      <div
        className={cn(
          'text-[10px] font-semibold uppercase tracking-widest',
          isAmber ? 'text-amber-200/70' : 'text-pink-200/70',
        )}
      >
        {label}
        {hint && (
          <span className="ml-1 text-[9px] font-normal normal-case text-amber-200/40">
            {hint}
          </span>
        )}
      </div>
      <div
        className={cn(
          'font-mono text-2xl font-bold tabular-nums',
          isAmber ? 'text-amber-300' : 'text-pink-400',
        )}
      >
        {value}
      </div>
    </div>
  )
}

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      <h4 className="bdo-heading flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-amber-200/70">
        {icon}
        {title}
      </h4>
      {children}
    </section>
  )
}

// ---------- main drawer ----------

export function SkillDetailDrawer() {
  const open = useSkillStore((s) => s.detailOpen)
  const setOpen = useSkillStore((s) => s.setDetailOpen)
  const selectSkill = useSkillStore((s) => s.selectSkill)
  const skillId = useSkillStore((s) => s.selectedSkillId)

  // Refetch the open skill every 15s so the lurker's enrichment shows up
  // live without needing to close/reopen the drawer.
  const query = useQuery({
    queryKey: ['skill', skillId],
    queryFn: () => {
      if (skillId == null) throw new Error('no skill')
      return fetchSkill(skillId)
    },
    enabled: skillId != null && open,
    refetchInterval: skillId != null && open ? 15_000 : false,
    refetchIntervalInBackground: true,
  })

  const skill = query.data
  const type = skill ? skillTypeLabel(skill) : null
  const typeMeta = type ? SKILL_TYPE_META[type] : null
  const color = skill ? classColor(skill.className) : '#a1a1aa'

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 border-l-2 border-amber-800/60 bg-bdo-ink p-0 sm:max-w-[560px] lg:max-w-[640px]"
        aria-describedby={undefined}
        style={{
          backgroundImage:
            'linear-gradient(to bottom, #0a0908 0%, #0d0a08 100%)',
          boxShadow: 'inset 0 0 0 1px rgba(240,208,96,0.15)',
        }}
      >
        <SheetTitle className="sr-only">
          {skill?.name ?? 'Skill detail'}
        </SheetTitle>

        {/* Top loading bar — visible while a background refetch is in-flight */}
        {query.isFetching && !query.isPending && (
          <div
            className="relative h-0.5 w-full overflow-hidden bg-amber-950/30"
            aria-hidden
          >
            <div className="bdo-loadbar absolute inset-0" />
          </div>
        )}

        {/* Ornate top border accent */}
        <div className="h-px bg-gradient-to-r from-transparent via-amber-600/60 to-transparent" />

        {/* Body */}
        <div className="flex h-full flex-col">
          <div className="flex-1 overflow-y-auto">
            {query.isPending ? (
              <DrawerSkeleton />
            ) : query.isError || !skill ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                <Skull className="size-8 text-amber-500/60" />
                <div>
                  <h3 className="bdo-heading text-base text-amber-100">
                    Could not load skill
                  </h3>
                  <p className="mt-1 text-sm text-amber-200/50">
                    Skill ID {skillId} may not exist in the database.
                  </p>
                </div>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={skill.skillId}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5 p-5"
                >
                  {/* Header */}
                  <header className="flex items-start gap-4">
                    <SkillIconLarge skill={skill} size={96} />
                    <div className="min-w-0 flex-1">
                      <h2 className="bdo-title text-2xl leading-tight">
                        {skill.name}
                      </h2>
                      {skill.krName && (
                        <p className="mt-0.5 text-sm text-amber-200/50">
                          {skill.krName}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {skill.className && (
                          <span
                            className="flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium"
                            style={{
                              backgroundColor: `${color}1a`,
                              color: color,
                              boxShadow: `inset 0 0 0 1px ${color}55`,
                            }}
                          >
                            <span
                              className="size-2 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            {skill.className}
                          </span>
                        )}
                        {typeMeta && (
                          <span
                            className="rounded-sm px-2 py-0.5 text-xs font-semibold"
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
                      </div>
                    </div>
                  </header>

                  {/* Flag badges */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {skill.isAwakening && (
                      <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-300">
                        <Sparkles className="size-3" /> Awakening
                      </Badge>
                    )}
                    {skill.isSuccession && (
                      <Badge className="border-emerald-700/50 bg-emerald-900/20 text-emerald-300">
                        <Sword className="size-3" /> Succession
                      </Badge>
                    )}
                    {skill.isAbsolute && (
                      <Badge className="border-red-700/50 bg-red-900/20 text-red-300">
                        Absolute
                      </Badge>
                    )}
                    {skill.isBlackSpirit && (
                      <Badge className="border-amber-700/50 bg-amber-900/20 text-amber-200">
                        Black Spirit
                      </Badge>
                    )}
                    {skill.isPassive && (
                      <Badge className="border-cyan-700/50 bg-cyan-900/20 text-cyan-300">
                        Passive
                      </Badge>
                    )}
                    {skill.isQuickSlot && (
                      <Badge className="border-amber-900/50 bg-bdo-leather-dark text-amber-200/70">
                        <Keyboard className="size-3" /> Quick-slot
                      </Badge>
                    )}
                  </div>

                  {/* Primary stat cards — ordered by relevance:
                      Damage → Cooldown → Protection → CC Count → Animation */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {/* 1. Damage (most important) */}
                    {skill.damage && skill.damage.hasDamage ? (
                      <StatCard
                        icon={<Swords className="size-3" />}
                        label="PvE Damage"
                        value={formatDamage(skill.damage.totalPvE)}
                        accent="amber"
                      />
                    ) : (
                      <StatCard
                        icon={<Swords className="size-3" />}
                        label="PvE Damage"
                        value="—"
                      />
                    )}
                    {skill.damage && skill.damage.totalPvP != null ? (
                      <StatCard
                        icon={<Skull className="size-3" />}
                        label="PvP Damage"
                        value={formatDamage(skill.damage.totalPvP)}
                        accent="pink"
                      />
                    ) : (
                      <StatCard
                        icon={<Clock className="size-3" />}
                        label="Cooldown"
                        value={formatCooldown(skill.cooldownSec)}
                      />
                    )}
                    {/* 2. Cooldown */}
                    {skill.damage && skill.damage.totalPvP != null && (
                      <StatCard
                        icon={<Clock className="size-3" />}
                        label="Cooldown"
                        value={formatCooldown(skill.cooldownSec)}
                      />
                    )}
                    {/* 3. Protection */}
                    {skill.protectionTypes && skill.protectionTypes.length > 0 ? (
                      <StatCard
                        icon={<Shield className="size-3" />}
                        label="Protection"
                        value={skill.protectionTypes.map((p) => {
                          const m = PROTECTION_META[p]
                          return m ? m.symbol : p[0]
                        }).join(' ')}
                        accent="amber"
                        hint={skill.protectionTypes.join(', ')}
                      />
                    ) : (
                      <StatCard
                        icon={<Shield className="size-3" />}
                        label="Protection"
                        value="—"
                      />
                    )}
                    {/* 4. CC Count (PvP only) */}
                    <StatCard
                      icon={<Zap className="size-3" />}
                      label="CC Count (PvP)"
                      value={skill.ccCounterDisplay || '—'}
                      accent="red"
                      hint="PvP CC counters (target is CC-immune at 2). PvE-only CCs are excluded."
                    />
                    {/* 5. Animation Duration */}
                    <StatCard
                      icon={<Film className="size-3" />}
                      label="Animation"
                      value={formatAnimDuration(skill.animationDurationMs)}
                      accent="amber"
                      hint="Extracted via ffprobe from the bdocodex preview video"
                    />
                    {/* Secondary stats */}
                    <StatCard
                      icon={<Gauge className="size-3" />}
                      label="Required Lv"
                      value={skill.requiredLevel ? String(skill.requiredLevel) : '—'}
                    />
                  </div>

                  {/* PvE-only CC warning */}
                  {skill.pveOnlyCCs && skill.pveOnlyCCs.length > 0 && (
                    <div
                      className="flex items-center gap-2 rounded-sm border border-orange-700/50 bg-orange-900/20 px-3 py-2 text-xs text-orange-300"
                      title="These CCs only work in PvE and do not count toward the PvP CC counter"
                    >
                      <AlertTriangle className="size-3.5 shrink-0" />
                      <span>
                        <strong className="font-semibold">PvE only:</strong>{' '}
                        {skill.pveOnlyCCs.join(', ')} — does not count toward PvP CC counter
                      </span>
                    </div>
                  )}

                  {/* Damage Summary — large stat cards for PvE + PvP totals */}
                  {skill.damage && skill.damage.hasDamage && (
                    <Section
                      title="Damage Summary"
                      icon={<Sparkles className="size-3" />}
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <DamageStatCard
                          label="Total PvE Damage"
                          value={formatDamage(skill.damage.totalPvE)}
                          accent="amber"
                          hint="∑ phases × hits"
                        />
                        {skill.damage.totalPvP != null ? (
                          <DamageStatCard
                            label="Total PvP Damage"
                            value={formatDamage(skill.damage.totalPvP)}
                            accent="pink"
                            hint={`${skill.damage.pvpDamagePercent}% of PvE`}
                          />
                        ) : (
                          <div
                            className="flex flex-col items-center justify-center gap-1 rounded-sm border-2 border-amber-900/40 bg-bdo-leather-dark px-3 py-2.5 text-center"
                            style={{ boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.6)' }}
                          >
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-200/40">
                              PvP Damage
                            </span>
                            <span className="font-mono text-lg text-amber-200/40">
                              Not available
                            </span>
                          </div>
                        )}
                      </div>
                    </Section>
                  )}

                  {/* Description */}
                  {skill.description && (
                    <Section title="Description" icon={<Activity className="size-3" />}>
                      <p className="whitespace-pre-line text-sm leading-relaxed text-amber-100/80">
                        {skill.description}
                      </p>
                    </Section>
                  )}

                  {/* Command */}
                  {skill.command && (
                    <Section title="Command" icon={<Keyboard className="size-3" />}>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {skill.command.split(/\s*\+\s*|\s+/).map((part, i) => (
                          <kbd
                            key={i}
                            className="rounded-sm border border-amber-800/60 bg-bdo-leather-dark px-2 py-1 font-mono text-xs text-amber-200/80"
                            style={{ boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.6)' }}
                          >
                            {part}
                          </kbd>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Damage breakdown — per-phase + raw rows */}
                  {skill.damageRows && skill.damageRows.length > 0 && (
                    <Section title="Damage & Effects" icon={<Sparkles className="size-3" />}>
                      {/* Per-phase breakdown (computed by /src/lib/damage.ts) */}
                      {skill.damage && skill.damage.phases.length > 0 && (
                        <div className="mb-3 space-y-1.5">
                          <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-amber-200/50">
                            <span>Per-phase Breakdown</span>
                            <span>percent × hits = total</span>
                          </div>
                          {skill.damage.phases.map((p, i) => (
                            <PhaseDamageRow key={`${p.phase}-${i}`} phase={p} />
                          ))}
                          <div
                            className="mt-2 flex items-baseline justify-between gap-2 rounded-sm border-2 border-amber-700/60 bg-gradient-to-r from-amber-950/50 to-bdo-leather-dark px-3 py-2"
                            style={{ boxShadow: 'inset 0 0 0 1px rgba(240,208,96,0.2)' }}
                          >
                            <span className="text-xs font-semibold uppercase tracking-widest text-amber-200/70">
                              Total PvE
                            </span>
                            <span className="font-mono text-lg font-bold tabular-nums text-amber-300">
                              {formatDamage(skill.damage.totalPvE)}
                            </span>
                          </div>
                          {skill.damage.totalPvP != null && (
                            <div
                              className="flex items-baseline justify-between gap-2 rounded-sm border-2 border-pink-800/60 bg-gradient-to-r from-pink-950/30 to-bdo-leather-dark px-3 py-2"
                              style={{ boxShadow: 'inset 0 0 0 1px rgba(244,114,182,0.2)' }}
                            >
                              <span className="text-xs font-semibold uppercase tracking-widest text-pink-200/70">
                                Total PvP ({skill.damage.pvpDamagePercent}%)
                              </span>
                              <span className="font-mono text-lg font-bold tabular-nums text-pink-400">
                                {formatDamage(skill.damage.totalPvP)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Raw damage rows from bdocodex tooltip */}
                      <div
                        className="divide-y divide-amber-900/40 rounded-sm border border-amber-900/40 bg-bdo-leather-dark px-3"
                        style={{ boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.6)' }}
                      >
                        {skill.damageRows.map((row, i) => (
                          <DamageRowItem key={i} row={row} />
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* CC + Protection */}
                  {(skill.ccTypes?.length || skill.protectionTypes?.length) && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {/* CC Types (real CCs only) + counter badge */}
                      {(() => {
                        const realCCs = skill.realCCs ?? []
                        const nonCCEffects = skill.nonCCEffects ?? []
                        const counters = skill.ccCounters ?? 0
                        if (!realCCs.length && !nonCCEffects.length) return null
                        return (
                          <Section
                            title={`CC Types`}
                            icon={<Zap className="size-3" />}
                          >
                            <div className="space-y-2">
                              {counters > 0 && (
                                <div
                                  className="inline-flex items-center gap-1 rounded-sm border border-red-700/60 bg-red-900/30 px-2 py-0.5 text-xs font-bold text-red-300"
                                  title="CC counters filled (target becomes CC-immune at 2). Format: X+Y = each CC's individual counter value."
                                >
                                  <Zap className="size-3" />
                                  CC Counters: {skill.ccCounterDisplay || counters}
                                </div>
                              )}
                              {realCCs.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {realCCs.map((c) => {
                                    const meta = CC_TYPES[c]
                                    if (!meta) {
                                      return (
                                        <span
                                          key={c}
                                          className="rounded-sm border border-red-700/50 bg-red-900/20 px-2 py-0.5 text-xs text-red-300"
                                        >
                                          {c}
                                        </span>
                                      )
                                    }
                                    return (
                                      <Tooltip key={c}>
                                        <TooltipTrigger asChild>
                                          <span
                                            className="flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-medium"
                                            style={{
                                              borderColor: `${meta.color}66`,
                                              backgroundColor: `${meta.color}1a`,
                                              color: meta.color,
                                            }}
                                          >
                                            <span>{meta.symbol}</span>
                                            <span>{c}</span>
                                            <span className="ml-0.5 text-[10px] opacity-70">
                                              ({meta.counterValue})
                                            </span>
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-[220px]">
                                          <div className="space-y-1">
                                            <div className="font-semibold">{meta.name}</div>
                                            <div className="text-[10px] opacity-80">
                                              {meta.description}
                                            </div>
                                            <div className="text-[10px] opacity-70">
                                              Resistance: {meta.resistanceCategory} · Counter: {meta.counterValue}
                                            </div>
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    )
                                  })}
                                </div>
                              )}
                              {nonCCEffects.length > 0 && (
                                <div>
                                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-amber-200/50">
                                    Other Effects
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {nonCCEffects.map((e) => {
                                      const meta = NON_CC_EFFECTS[e]
                                      if (!meta) {
                                        return (
                                          <span
                                            key={e}
                                            className="rounded-sm border border-amber-900/50 bg-bdo-leather-dark px-2 py-0.5 text-xs text-amber-200/70"
                                          >
                                            {e}
                                          </span>
                                        )
                                      }
                                      return (
                                        <Tooltip key={e}>
                                          <TooltipTrigger asChild>
                                            <span
                                              className="flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-medium"
                                              style={{
                                                borderColor: `${meta.color}66`,
                                                backgroundColor: `${meta.color}1a`,
                                                color: meta.color,
                                              }}
                                            >
                                              <span>{meta.symbol}</span>
                                              <span>{e}</span>
                                            </span>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="max-w-[220px]">
                                            <div className="space-y-1">
                                              <div className="font-semibold">{e}</div>
                                              <div className="text-[10px] opacity-80">
                                                {meta.category} — does not count toward the CC counter
                                              </div>
                                            </div>
                                          </TooltipContent>
                                        </Tooltip>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </Section>
                        )
                      })()}

                      {/* Protection — uses PROTECTION_META symbols (🛡 SA, ⬛ FG, ✦ IF) */}
                      {skill.protectionTypes?.length ? (
                        <Section
                          title="Protection"
                          icon={<Shield className="size-3" />}
                        >
                          <div className="flex flex-wrap gap-1.5">
                            {skill.protectionTypes.map((p) => {
                              const meta = PROTECTION_META[p]
                              if (!meta) {
                                return (
                                  <span
                                    key={p}
                                    className="rounded-sm border border-cyan-700/50 bg-cyan-900/20 px-2 py-0.5 text-xs text-cyan-300"
                                  >
                                    {p}
                                  </span>
                                )
                              }
                              return (
                                <Tooltip key={p}>
                                  <TooltipTrigger asChild>
                                    <span
                                      className="flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-medium"
                                      style={{
                                        borderColor: `${meta.color}66`,
                                        backgroundColor: `${meta.color}1a`,
                                        color: meta.color,
                                      }}
                                    >
                                      <span className="text-sm leading-none">{meta.symbol}</span>
                                      <span>{meta.shortName}</span>
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-[220px]">
                                    <div className="space-y-1">
                                      <div className="font-semibold">{p}</div>
                                      <div className="text-[10px] opacity-80">{meta.description}</div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              )
                            })}
                          </div>
                        </Section>
                      ) : null}
                    </div>
                  )}

                  {/* Prerequisites */}
                  {skill.prerequisites && skill.prerequisites.length > 0 && (
                    <Section title="Prerequisites" icon={<Lock className="size-3" />}>
                      <div className="flex flex-col gap-1.5">
                        {skill.prerequisites.map((p) => (
                          <button
                            key={p.skillId}
                            type="button"
                            onClick={() => selectSkill(p.skillId)}
                            className="group flex items-center gap-2 rounded-sm border border-amber-900/40 bg-bdo-leather-dark px-2.5 py-1.5 text-left transition-colors hover:border-amber-500/60 hover:bg-amber-900/10"
                            style={{ boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.6)' }}
                          >
                            {p.iconUrl ? (
                              <img
                                src={p.iconUrl}
                                alt={p.name}
                                loading="lazy"
                                className="size-7 rounded-sm border border-amber-800/60 bg-bdo-leather object-cover"
                              />
                            ) : (
                              <div className="flex size-7 items-center justify-center rounded-sm border border-amber-800/60 bg-bdo-leather text-xs font-bold text-amber-200/60">
                                {p.name[0]}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm text-amber-100/80 group-hover:text-amber-200">
                                {p.name}
                              </div>
                              {p.className && (
                                <div className="text-[10px] text-amber-200/40">
                                  {p.className} · Lv {p.requiredLevel}
                                </div>
                              )}
                            </div>
                            <ChevronRight className="size-4 text-amber-700/60 group-hover:text-amber-400" />
                          </button>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Related ranks */}
                  {skill.relatedRanks && skill.relatedRanks.length > 0 && (
                    <Section title="Related Ranks" icon={<Sparkles className="size-3" />}>
                      <div className="flex flex-wrap gap-1.5">
                        {skill.relatedRanks.map((r) => (
                          <button
                            key={r.skillId}
                            type="button"
                            onClick={() => selectSkill(r.skillId)}
                            className="group flex items-center gap-1.5 rounded-sm border border-amber-900/40 bg-bdo-leather-dark px-2.5 py-1 text-xs text-amber-100/70 transition-colors hover:border-amber-500/60 hover:bg-amber-900/10 hover:text-amber-200"
                            style={{ boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.6)' }}
                            title={`Lv ${r.requiredLevel}`}
                          >
                            <span className="truncate max-w-[180px]">{r.name}</span>
                            <span className="rounded-sm bg-bdo-leather px-1.5 py-px text-[10px] text-amber-200/50 group-hover:bg-amber-500/20 group-hover:text-amber-200">
                              Lv {r.requiredLevel}
                            </span>
                          </button>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Video preview */}
                  {skill.videoUrl && (
                    <Section title="Video Preview" icon={<Film className="size-3" />}>
                      <div className="overflow-hidden rounded-sm border-2 border-amber-800/60 bg-black"
                        style={{ boxShadow: 'inset 0 0 0 1px rgba(240,208,96,0.2)' }}
                      >
                        <video
                          src={skill.videoUrl}
                          autoPlay
                          loop
                          muted
                          playsInline
                          controls
                          className="h-auto max-h-[360px] w-full bg-black object-contain"
                        />
                      </div>
                      {skill.animationDurationMs != null && (
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-300">
                          <Film className="size-3.5" />
                          Animation duration:{' '}
                          <span className="font-mono font-semibold">
                            {formatAnimDuration(skill.animationDurationMs)}
                          </span>
                          <span className="text-amber-200/40">
                            (measured from preview video via ffprobe)
                          </span>
                        </p>
                      )}
                    </Section>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* Footer */}
          {skill && (
            <footer
              className="border-t border-amber-900/40 bg-bdo-ink/80 px-5 py-3"
              style={{ boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.6)' }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-amber-200/50">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-amber-200/70">
                    Skill ID: {skill.skillId}
                  </span>
                  <span className="text-amber-700/50">·</span>
                  <span>
                    Synced{' '}
                    {new Date(skill.syncedAt).toLocaleString(undefined, {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
                <a
                  href={skill.bdocodexUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bdo-btn flex items-center gap-1 !py-1 !text-[11px]"
                >
                  <ExternalLink className="size-3" />
                  View on bdocodex.com
                </a>
              </div>
            </footer>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function DrawerSkeleton() {
  return (
    <div className="space-y-5 p-5">
      <div className="flex items-start gap-4">
        <Skeleton className="size-24 rounded-sm bg-amber-950/40" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-3/4 bg-amber-950/40" />
          <Skeleton className="h-4 w-1/2 bg-amber-950/40" />
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-20 rounded-sm bg-amber-950/40" />
            <Skeleton className="h-5 w-16 rounded-sm bg-amber-950/40" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-sm bg-amber-950/40" />
        ))}
      </div>
      <Skeleton className="h-4 w-24 bg-amber-950/40" />
      <Skeleton className="h-20 w-full bg-amber-950/40" />
      <Skeleton className="h-4 w-24 bg-amber-950/40" />
      <Skeleton className="h-32 w-full bg-amber-950/40" />
    </div>
  )
}
