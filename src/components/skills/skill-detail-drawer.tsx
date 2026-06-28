'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ExternalLink,
  Gauge,
  Clock,
  Film,
  Star,
  Sparkles,
  Sword,
  Shield,
  Zap,
  Keyboard,
  ChevronRight,
  Skull,
  Activity,
  Lock,
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
  SKILL_TYPE_META,
  skillTypeLabel,
  type DamageRow,
  type Skill,
} from '@/lib/skills'
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
        className="flex items-center justify-center rounded-lg border border-zinc-700/60 font-bold"
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
      className="relative shrink-0 overflow-hidden rounded-lg border border-zinc-700/60 bg-zinc-900"
      style={{ width: size, height: size }}
    >
      {!loaded && <div className="absolute inset-0 animate-pulse bg-zinc-800" />}
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
  accent?: 'amber' | 'red' | 'cyan' | 'green'
  hint?: string
}) {
  const accentClass =
    accent === 'amber'
      ? 'text-amber-300 border-amber-500/30 bg-amber-500/5'
      : accent === 'red'
        ? 'text-red-300 border-red-500/30 bg-red-500/5'
        : accent === 'cyan'
          ? 'text-cyan-300 border-cyan-500/30 bg-cyan-500/5'
          : accent === 'green'
            ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/5'
            : 'text-zinc-200 border-zinc-800 bg-zinc-900/40'

  return (
    <TooltipProvider delayDuration={150}>
      <div
        className={cn(
          'flex flex-col gap-0.5 rounded-md border px-3 py-2',
          accentClass,
        )}
      >
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          {icon}
          <span>{label}</span>
          {hint && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="ml-auto cursor-help text-[10px] text-zinc-600">
                  ⓘ
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px]">
                {hint}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="font-mono text-lg font-semibold tabular-nums">
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
              : 'text-zinc-300'

  return (
    <div className="flex items-baseline gap-2 py-1 text-sm">
      <span className={cn('font-medium', kindColor)}>{row.label}</span>
      {row.value && (
        <span className={cn('font-mono text-xs', kindColor)}>{row.value}</span>
      )}
      <span className="ml-auto flex items-center gap-1">
        {row.pvpOnly && (
          <Badge className="border-pink-500/40 bg-pink-500/10 text-pink-300">
            PvP only
          </Badge>
        )}
        {row.pveOnly && (
          <Badge className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
            PvE only
          </Badge>
        )}
        {row.kind !== 'note' && row.kind !== 'damage' && (
          <span className="text-[10px] uppercase tracking-wider text-zinc-600">
            {row.kind}
          </span>
        )}
      </span>
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
      <h4 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
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

  const query = useQuery({
    queryKey: ['skill', skillId],
    queryFn: () => {
      if (skillId == null) throw new Error('no skill')
      return fetchSkill(skillId)
    },
    enabled: skillId != null && open,
  })

  const skill = query.data
  const type = skill ? skillTypeLabel(skill) : null
  const typeMeta = type ? SKILL_TYPE_META[type] : null
  const color = skill ? classColor(skill.className) : '#a1a1aa'

  // Reset internal error state when skill changes.
  React.useEffect(() => {
    // no-op; the query hook manages itself.
  }, [skillId])

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      // Keep selectedSkillId so we can re-open quickly, but visually clear.
      // Optional: clear on close for cleanliness.
      // selectSkill(null)
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 border-l border-zinc-800 bg-zinc-950 p-0 sm:max-w-[560px] lg:max-w-[640px]"
        aria-describedby={undefined}
      >
        <SheetTitle className="sr-only">
          {skill?.name ?? 'Skill detail'}
        </SheetTitle>

        {/* Body */}
        <div className="flex h-full flex-col">
          <div className="flex-1 overflow-y-auto">
            {query.isPending ? (
              <DrawerSkeleton />
            ) : query.isError || !skill ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                <Skull className="size-8 text-zinc-500" />
                <div>
                  <h3 className="text-base font-semibold text-zinc-200">
                    Could not load skill
                  </h3>
                  <p className="mt-1 text-sm text-zinc-500">
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
                      <h2 className="text-2xl font-bold leading-tight text-zinc-50">
                        {skill.name}
                      </h2>
                      {skill.krName && (
                        <p className="mt-0.5 text-sm text-zinc-500">
                          {skill.krName}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {skill.className && (
                          <span
                            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{
                              backgroundColor: `${color}1a`,
                              color: color,
                              boxShadow: `inset 0 0 0 1px ${color}33`,
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
                            className="rounded-full px-2 py-0.5 text-xs font-semibold"
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
                      </div>
                    </div>
                  </header>

                  {/* Flag badges */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {skill.isAwakening && (
                      <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-300">
                        <Sparkles className="size-3" /> Awakening
                      </Badge>
                    )}
                    {skill.isSuccession && (
                      <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                        <Sword className="size-3" /> Succession
                      </Badge>
                    )}
                    {skill.isAbsolute && (
                      <Badge className="border-red-500/30 bg-red-500/10 text-red-300">
                        Absolute
                      </Badge>
                    )}
                    {skill.isBlackSpirit && (
                      <Badge className="border-violet-500/30 bg-violet-500/10 text-violet-300">
                        Black Spirit
                      </Badge>
                    )}
                    {skill.isPassive && (
                      <Badge className="border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                        Passive
                      </Badge>
                    )}
                    {skill.isQuickSlot && (
                      <Badge className="border-zinc-700 bg-zinc-800/60 text-zinc-300">
                        <Keyboard className="size-3" /> Quick-slot
                      </Badge>
                    )}
                  </div>

                  {/* Stat cards */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <StatCard
                      icon={<Gauge className="size-3" />}
                      label="Required Lv"
                      value={skill.requiredLevel ? String(skill.requiredLevel) : '—'}
                    />
                    <StatCard
                      icon={<Star className="size-3" />}
                      label="SP Cost"
                      value={skill.skillPoints ? String(skill.skillPoints) : '—'}
                    />
                    <StatCard
                      icon={<Activity className="size-3" />}
                      label="Max Lv"
                      value={skill.maxLevel ? String(skill.maxLevel) : '—'}
                    />
                    <StatCard
                      icon={<Clock className="size-3" />}
                      label="Cooldown"
                      value={formatCooldown(skill.cooldownSec)}
                    />
                    <StatCard
                      icon={<Film className="size-3" />}
                      label="Animation"
                      value={formatAnimDuration(skill.animationDurationMs)}
                      accent="amber"
                      hint="Extracted via ffprobe from the bdocodex preview video"
                    />
                    {skill.pvpDamagePercent != null && (
                      <StatCard
                        icon={<Sword className="size-3" />}
                        label="PvP Dmg"
                        value={`${skill.pvpDamagePercent}%`}
                        accent="pink"
                      />
                    )}
                  </div>

                  {/* Description */}
                  {skill.description && (
                    <Section title="Description" icon={<Activity className="size-3" />}>
                      <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-300">
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
                            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-xs text-zinc-200 shadow-[0_2px_0_rgb(0_0_0_/_0.4)]"
                          >
                            {part}
                          </kbd>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Damage breakdown */}
                  {skill.damageRows && skill.damageRows.length > 0 && (
                    <Section title="Damage & Effects" icon={<Sparkles className="size-3" />}>
                      <div className="divide-y divide-zinc-800/60 rounded-md border border-zinc-800 bg-zinc-900/40 px-3">
                        {skill.damageRows.map((row, i) => (
                          <DamageRowItem key={i} row={row} />
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* CC + Protection */}
                  {(skill.ccTypes?.length || skill.protectionTypes?.length) && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {skill.ccTypes?.length ? (
                        <Section title="CC Types" icon={<Zap className="size-3" />}>
                          <div className="flex flex-wrap gap-1.5">
                            {skill.ccTypes.map((c) => (
                              <span
                                key={c}
                                className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs text-red-300"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        </Section>
                      ) : null}
                      {skill.protectionTypes?.length ? (
                        <Section
                          title="Protection"
                          icon={<Shield className="size-3" />}
                        >
                          <div className="flex flex-wrap gap-1.5">
                            {skill.protectionTypes.map((p) => (
                              <span
                                key={p}
                                className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-300"
                              >
                                {p}
                              </span>
                            ))}
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
                            className="group flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/40 px-2.5 py-1.5 text-left transition-colors hover:border-amber-500/40 hover:bg-amber-500/5"
                          >
                            {p.iconUrl ? (
                              <img
                                src={p.iconUrl}
                                alt={p.name}
                                loading="lazy"
                                className="size-7 rounded border border-zinc-700/60 bg-zinc-900 object-cover"
                              />
                            ) : (
                              <div className="flex size-7 items-center justify-center rounded border border-zinc-700/60 bg-zinc-900 text-xs font-bold text-zinc-500">
                                {p.name[0]}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm text-zinc-200 group-hover:text-amber-200">
                                {p.name}
                              </div>
                              {p.className && (
                                <div className="text-[10px] text-zinc-500">
                                  {p.className} · Lv {p.requiredLevel}
                                </div>
                              )}
                            </div>
                            <ChevronRight className="size-4 text-zinc-600 group-hover:text-amber-400" />
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
                            className="group flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/40 px-2.5 py-1 text-xs text-zinc-300 transition-colors hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-200"
                            title={`Lv ${r.requiredLevel}`}
                          >
                            <span className="truncate max-w-[180px]">{r.name}</span>
                            <span className="rounded-full bg-zinc-800 px-1.5 py-px text-[10px] text-zinc-500 group-hover:bg-amber-500/20 group-hover:text-amber-300">
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
                      <div className="overflow-hidden rounded-md border border-zinc-800 bg-black">
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
                          <span className="text-zinc-500">
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
            <footer className="border-t border-zinc-800/80 bg-zinc-950/80 px-5 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-zinc-400">
                    Skill ID: {skill.skillId}
                  </span>
                  <span className="text-zinc-700">·</span>
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
                  className="flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-1 text-zinc-300 transition-colors hover:border-amber-500/40 hover:text-amber-300"
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
        <Skeleton className="size-24 rounded-lg bg-zinc-800" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-3/4 bg-zinc-800" />
          <Skeleton className="h-4 w-1/2 bg-zinc-800" />
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-20 rounded-full bg-zinc-800" />
            <Skeleton className="h-5 w-16 rounded-full bg-zinc-800" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-md bg-zinc-800" />
        ))}
      </div>
      <Skeleton className="h-4 w-24 bg-zinc-800" />
      <Skeleton className="h-20 w-full bg-zinc-800" />
      <Skeleton className="h-4 w-24 bg-zinc-800" />
      <Skeleton className="h-32 w-full bg-zinc-800" />
    </div>
  )
}
