'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  Newspaper, ExternalLink, ArrowUp, ArrowDown, Plus, Minus,
  Zap, Clock, Swords, Link2, ScrollText, Sparkles, Info, Archive,
} from 'lucide-react'
import { classColor, classIconUrl, SPEC_COLORS } from '@/lib/skills'
import { cn } from '@/lib/utils'

// ─── Types (mirror the API response) ────────────────────────────────

type ChangeType =
  | 'damage_up' | 'damage_down'
  | 'cooldown_up' | 'cooldown_down'
  | 'added_effect' | 'removed_effect'
  | 'cc_change' | 'combo_change' | 'animation_change'
  | 'note' | 'other'

interface SkillChange {
  skillName: string
  matchedSkillId: number | null
  matchedSkillClassName: string | null
  changeType: ChangeType
  before?: string
  after?: string
  description: string
}

interface ClassChangeBlock {
  className: string
  spec: string | null
  intro: string
  changes: SkillChange[]
}

interface PatchNote {
  date: string
  url: string
  classChanges: ClassChangeBlock[]
}

// ─── Change type metadata ───────────────────────────────────────────

const CHANGE_META: Record<ChangeType, { label: string; icon: React.ReactNode; color: string; direction?: 'up' | 'down' | 'neutral' }> = {
  damage_up:      { label: 'Damage ↑',   icon: <Swords className="size-3.5" />,  color: '#22c55e', direction: 'up' },
  damage_down:    { label: 'Damage ↓',   icon: <Swords className="size-3.5" />,  color: '#ef4444', direction: 'down' },
  cooldown_up:    { label: 'Cooldown ↑', icon: <Clock className="size-3.5" />,   color: '#ef4444', direction: 'up' },
  cooldown_down:  { label: 'Cooldown ↓', icon: <Clock className="size-3.5" />,   color: '#22c55e', direction: 'down' },
  added_effect:   { label: 'Added',      icon: <Plus className="size-3.5" />,    color: '#22c55e', direction: 'neutral' },
  removed_effect: { label: 'Removed',    icon: <Minus className="size-3.5" />,   color: '#ef4444', direction: 'neutral' },
  cc_change:      { label: 'CC Change',  icon: <Zap className="size-3.5" />,     color: '#eab308', direction: 'neutral' },
  combo_change:   { label: 'Combo',      icon: <Sparkles className="size-3.5" />, color: '#3b82f6', direction: 'neutral' },
  animation_change: { label: 'Animation', icon: <ScrollText className="size-3.5" />, color: '#a78bfa', direction: 'neutral' },
  note:           { label: 'Changed',    icon: <Info className="size-3.5" />,    color: '#a1a1aa', direction: 'neutral' },
  other:          { label: 'Other',      icon: <Info className="size-3.5" />,    color: '#a1a1aa', direction: 'neutral' },
}

// ─── Component ───────────────────────────────────────────────────────

export function PatchesPage() {
  const [patch, setPatch] = React.useState<PatchNote | null>(null)
  const [archiveInfo, setArchiveInfo] = React.useState<{ totalPatches: number; dates: string[] } | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [hasData, setHasData] = React.useState(false)
  const [filterClass, setFilterClass] = React.useState<string | null>(null)

  React.useEffect(() => {
    fetch('/api/patches')
      .then(res => res.json())
      .then(data => {
        setHasData(data.hasData)
        if (data.patches && data.patches.length > 0) {
          setPatch(data.patches[0])
        }
        if (data.archiveInfo) setArchiveInfo(data.archiveInfo)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Collect all class names that have changes
  const changedClasses = React.useMemo(() => {
    if (!patch) return []
    return patch.classChanges.map(cc => cc.className).filter(Boolean)
  }, [patch])

  const filteredClassChanges = React.useMemo(() => {
    if (!patch) return []
    if (!filterClass) return patch.classChanges
    return patch.classChanges.filter(cc => cc.className === filterClass)
  }, [patch, filterClass])

  // Count changes by type for summary
  const changeSummary = React.useMemo(() => {
    if (!patch) return { total: 0, buffs: 0, nerfs: 0, linked: 0 }
    let total = 0, buffs = 0, nerfs = 0, linked = 0
    for (const cc of patch.classChanges) {
      for (const ch of cc.changes) {
        total++
        const meta = CHANGE_META[ch.changeType]
        if (meta.direction === 'up' && (ch.changeType === 'damage_up' || ch.changeType === 'cooldown_down')) buffs++
        if (meta.direction === 'down' && (ch.changeType === 'damage_down' || ch.changeType === 'cooldown_up')) nerfs++
        if (ch.changeType === 'added_effect') buffs++
        if (ch.changeType === 'removed_effect') nerfs++
        if (ch.matchedSkillId) linked++
      }
    }
    return { total, buffs, nerfs, linked }
  }, [patch])

  return (
    <div className="flex min-h-screen flex-col bg-bdo-ink text-zinc-100">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-amber-900/50 bg-bdo-ink/95 px-4 py-3 backdrop-blur lg:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <Newspaper className="size-5 text-amber-400" />
          <div>
            <h1 className="bdo-title text-xl font-bold text-amber-400 sm:text-2xl">Patch Notes</h1>
            <p className="text-xs text-amber-200/50">
              Latest patch only · Skill changes linked to database
            </p>
          </div>
          {patch && (
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden text-sm font-semibold text-amber-200 sm:inline">{patch.date}</span>
              <a
                href={patch.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-sm border border-amber-800/40 px-2 py-1 text-[10px] text-amber-300/50 transition-all hover:border-amber-500/50 hover:text-amber-200"
              >
                <ExternalLink className="size-3" /> Source
              </a>
            </div>
          )}
        </div>

        {/* Summary stats */}
        {patch && (
          <div className="mt-3 flex flex-wrap gap-3">
            <SummaryChip label="Classes" value={changedClasses.length} color="#fbbf24" />
            <SummaryChip label="Changes" value={changeSummary.total} color="#a1a1aa" />
            <SummaryChip label="Buffs" value={changeSummary.buffs} color="#22c55e" icon={<ArrowUp className="size-3" />} />
            <SummaryChip label="Nerfs" value={changeSummary.nerfs} color="#ef4444" icon={<ArrowDown className="size-3" />} />
            <SummaryChip label="Linked" value={changeSummary.linked} color="#3b82f6" icon={<Link2 className="size-3" />} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6 lg:px-6">
        {loading ? (
          <div className="mx-auto max-w-4xl space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-sm border-2 border-amber-900/30 bg-bdo-leather-dark" />
            ))}
          </div>
        ) : !hasData || !patch ? (
          <div className="flex flex-col items-center justify-center py-20 text-amber-300/40">
            <Newspaper className="mb-4 size-12 opacity-30" />
            <p>No patch notes loaded yet.</p>
            <p className="text-xs">Run the patch scraper to fetch latest notes:</p>
            <code className="mt-2 rounded-sm border border-amber-800/40 bg-bdo-leather-dark/50 px-3 py-1 text-[10px] text-amber-300/60">
              bun run scripts/scrape-patch-notes.ts
            </code>
          </div>
        ) : (
          <div className="mx-auto max-w-5xl">
            {/* Class filter chips */}
            {changedClasses.length > 1 && (
              <div className="mb-4 flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setFilterClass(null)}
                  className={cn(
                    'rounded-sm border px-2.5 py-1 text-[10px] font-semibold transition-all',
                    !filterClass
                      ? 'border-amber-400/60 bg-amber-500/15 text-amber-200'
                      : 'border-amber-800/40 bg-bdo-leather-dark/50 text-amber-300/50 hover:text-amber-200',
                  )}
                >
                  All ({changedClasses.length})
                </button>
                {changedClasses.map(cls => {
                  const color = classColor(cls)
                  return (
                    <button
                      key={cls}
                      onClick={() => setFilterClass(cls)}
                      className={cn(
                        'rounded-sm border px-2.5 py-1 text-[10px] font-semibold transition-all',
                        filterClass === cls
                          ? 'bg-amber-500/15 text-amber-200'
                          : 'border-amber-800/40 bg-bdo-leather-dark/50 text-amber-300/50 hover:text-amber-200',
                      )}
                      style={filterClass === cls ? { borderColor: color, color } : undefined}
                    >
                      {cls}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Class change blocks */}
            <div className="space-y-4">
              {filteredClassChanges.map((cc, idx) => (
                <ClassChangeCard key={`${cc.className}-${idx}`} cc={cc} />
              ))}
            </div>

            {/* Archive note */}
            {archiveInfo && archiveInfo.totalPatches > 1 && (
              <div className="mt-8 flex items-start gap-2 rounded-sm border border-amber-800/30 bg-bdo-leather-dark/20 p-3">
                <Archive className="mt-0.5 size-4 shrink-0 text-amber-400/50" />
                <div className="text-[10px] leading-relaxed text-amber-300/40">
                  <span className="font-semibold text-amber-300/60">{archiveInfo.totalPatches} patches archived.</span>{' '}
                  Showing only the latest patch ({patch.date}) to keep skill-change tracking clean —
                  consecutive patches to the same class won't interfere with change detection.
                  All patches are stored in <code className="text-amber-400/50">data/patch-archive.json</code> for
                  future features (browsing by class, last-changed timestamps, change magnitude).
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Summary chip ───────────────────────────────────────────────────

function SummaryChip({ label, value, color, icon }: { label: string; value: number; color: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 rounded-sm border border-amber-800/30 bg-bdo-leather-dark/30 px-2.5 py-1">
      {icon && <span style={{ color }}>{icon}</span>}
      <span className="font-mono text-sm font-bold" style={{ color }}>{value}</span>
      <span className="text-[9px] uppercase tracking-wider text-amber-300/40">{label}</span>
    </div>
  )
}

// ─── Class change card ──────────────────────────────────────────────

function ClassChangeCard({ cc }: { cc: ClassChangeBlock }) {
  const [expanded, setExpanded] = React.useState(true)
  const color = classColor(cc.className)
  const iconUrl = classIconUrl(cc.className.toLowerCase().replace(/[^a-z]/g, ''))
  const specColor = cc.spec ? (SPEC_COLORS[cc.spec.toLowerCase() as keyof typeof SPEC_COLORS] || '#c9a25c') : '#c9a25c'

  const buffs = cc.changes.filter(c => CHANGE_META[c.changeType].direction === 'up' || c.changeType === 'added_effect' || c.changeType === 'cooldown_down' || c.changeType === 'damage_up').length
  const nerfs = cc.changes.filter(c => CHANGE_META[c.changeType].direction === 'down' || c.changeType === 'removed_effect' || c.changeType === 'cooldown_up' || c.changeType === 'damage_down').length

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-sm border-2 border-amber-800/40"
    >
      {/* Class header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 border-b border-amber-900/30 bg-bdo-leather-dark/50 px-4 py-3 transition-colors hover:bg-bdo-leather-dark"
      >
        {iconUrl && (
          <div className="size-9 shrink-0 overflow-hidden rounded-sm border" style={{ borderColor: `${color}55` }}>
            <img src={iconUrl} alt={cc.className} className="h-full w-full object-cover" loading="lazy" />
          </div>
        )}
        <div className="flex flex-col items-start">
          <span className="text-sm font-bold" style={{ color }}>{cc.className}</span>
          <div className="flex items-center gap-2">
            {cc.spec && (
              <span
                className="rounded-sm px-1.5 py-0.5 text-[8px] font-bold uppercase"
                style={{ color: specColor, backgroundColor: `${specColor}15`, border: `1px solid ${specColor}44` }}
              >
                {cc.spec}
              </span>
            )}
            <span className="text-[9px] text-amber-300/40">
              {cc.changes.length} changes
              {buffs > 0 && <span className="ml-1 text-emerald-400/60">↑{buffs}</span>}
              {nerfs > 0 && <span className="ml-1 text-red-400/60">↓{nerfs}</span>}
            </span>
          </div>
        </div>
      </button>

      {/* Changes */}
      {expanded && (
        <div className="bg-bdo-ink/30">
          {/* Intro */}
          {cc.intro && (
            <div className="border-b border-amber-900/20 px-4 py-3">
              <p className="text-xs leading-relaxed text-amber-100/60">{cc.intro}</p>
            </div>
          )}

          {/* Skill changes */}
          <div className="divide-y divide-amber-900/15">
            {cc.changes.map((change, i) => (
              <SkillChangeRow key={i} change={change} />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ─── Skill change row ───────────────────────────────────────────────

function SkillChangeRow({ change }: { change: SkillChange }) {
  const meta = CHANGE_META[change.changeType] || CHANGE_META.other
  const isLinked = change.matchedSkillId != null

  return (
    <div className="flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-amber-500/5">
      {/* Direction arrow */}
      <div
        className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-sm border"
        style={{ borderColor: `${meta.color}44`, backgroundColor: `${meta.color}11`, color: meta.color }}
      >
        {meta.direction === 'up' && <ArrowUp className="size-3.5" />}
        {meta.direction === 'down' && <ArrowDown className="size-3.5" />}
        {meta.direction === 'neutral' && meta.icon}
      </div>

      <div className="min-w-0 flex-1">
        {/* Skill name + type badge */}
        <div className="flex items-center gap-2">
          {isLinked ? (
            <a
              href={`#skill-${change.matchedSkillId}`}
              onClick={(e) => {
                // Navigate to Data tab with this skill — dispatch a custom event
                e.preventDefault()
                window.dispatchEvent(new CustomEvent('bdo-open-skill', { detail: change.matchedSkillId }))
              }}
              className="flex items-center gap-1 text-sm font-semibold text-amber-200 underline-offset-2 hover:underline"
            >
              {change.skillName}
              <Link2 className="size-3 text-amber-400/50" />
            </a>
          ) : (
            <span className="text-sm font-semibold text-amber-200/70">{change.skillName}</span>
          )}
          <span
            className="rounded-sm px-1.5 py-0.5 text-[8px] font-bold uppercase"
            style={{ color: meta.color, backgroundColor: `${meta.color}15` }}
          >
            {meta.label}
          </span>
          {change.matchedSkillClassName && change.matchedSkillClassName !== change.skillName && (
            <span className="text-[8px] text-amber-300/30">→ {change.matchedSkillClassName}</span>
          )}
        </div>

        {/* Before → After */}
        {(change.before || change.after) && (
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
            {change.before && (
              <span className="rounded-sm border border-red-800/30 bg-red-900/10 px-2 py-0.5 font-mono text-red-300/70">
                {change.before}
              </span>
            )}
            {change.before && change.after && <ArrowRight />}
            {change.after && (
              <span className="rounded-sm border border-emerald-800/30 bg-emerald-900/10 px-2 py-0.5 font-mono text-emerald-300/70">
                {change.after}
              </span>
            )}
          </div>
        )}

        {/* Description */}
        {!change.before && !change.after && change.description && (
          <p className="mt-0.5 text-[11px] leading-relaxed text-amber-100/50">{change.description}</p>
        )}
      </div>
    </div>
  )
}

function ArrowRight() {
  return <span className="text-amber-400/40">→</span>
}
