'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  ChevronRight,
  Swords,
  Gem,
  Clock,
  Zap,
  Crosshair,
  GitBranch,
  Crown,
  Sword,
  Sparkles,
  Info,
} from 'lucide-react'

import {
  classColor,
  formatCooldown,
  SKILL_TYPE_META,
  type Skill,
} from '@/lib/skills'
import { formatDamage } from '@/lib/damage'
import { useSkillStore } from '@/lib/skill-store'
import { getBaseName } from '@/lib/spec-dedup'
import { cn } from '@/lib/utils'
import { PatchChangeIndicator } from '@/components/skills/patch-change-indicator'

// ============================================================================
// P2.4 — Skill Tree View
//
// Mirrors the bdocodex/in-game skill tree layout. Only meaningful when a spec
// (Awakening/Succession/Ascension) is selected — otherwise a friendly prompt
// is shown.
//
// Sections (collapsible, in this order):
//   1. Main Weapon        — main-weapon active skills (no Flow/Core/BS/Passive)
//   2. {Spec} Weapon      — Awakening-weapon skills (AWK) OR Prime:/Absolute: (SUCC)
//   3. Core (Rabam)       — Core: skills
//   4. Flow               — Flow: skills (shown inline as children of their parent
//                           wherever the parent lives, with a connector line)
//   5. Black Spirit       — BS skills, each linked to its base skill via a badge
//
// Rules (per roadmap P2.4):
//   - Only max-rank skills shown (default API behavior)
//   - NO prerequisite lines (would be chaos)
//   - ONLY Flow: connection lines (drawn as inline tree indentation)
//   - Core: (Rabam) skills are part of Awakening strictly (Awakening-flagged
//     Core excluded from Succession spec — handled by dedup upstream)
//   - BS skills are rage versions of regular skills — show linked to base
//   - Within each section, sort by requiredLevel ascending
//   - Each node: icon, name, level, SP cost, damage
//   - Clicking a node opens the skill detail drawer
// ============================================================================

// --- Skill icon (reused pattern, slightly smaller for tree density) ---------
function TreeSkillIcon({ skill, size }: { skill: Skill; size: number }) {
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

// --- Tiny stat badge --------------------------------------------------------
function NodeStat({
  icon,
  value,
  title,
  accent,
}: {
  icon: React.ReactNode
  value: string
  title: string
  accent?: 'gold' | 'red' | 'blue' | 'green' | 'muted'
}) {
  const colorMap: Record<string, string> = {
    gold: 'border-amber-600/40 bg-amber-950/30 text-amber-300',
    red: 'border-red-700/40 bg-red-950/30 text-red-300',
    blue: 'border-blue-700/40 bg-blue-950/30 text-blue-300',
    green: 'border-emerald-700/40 bg-emerald-950/30 text-emerald-300',
    muted: 'border-zinc-700/40 bg-zinc-900/40 text-zinc-400',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-sm border px-1 py-0.5 text-[10px] font-mono tabular-nums leading-none',
        colorMap[accent || 'muted'],
      )}
      title={title}
    >
      <span className="size-2.5 opacity-80">{icon}</span>
      {value}
    </span>
  )
}

// --- Skill node (row in the tree) ------------------------------------------
function SkillNode({
  skill,
  onClick,
  depth = 0,
  showConnector = false,
  baseLabel,
}: {
  skill: Skill
  onClick: () => void
  depth?: number
  showConnector?: boolean
  baseLabel?: string
}) {
  const selectedSkillId = useSkillStore((s) => s.selectedSkillId)
  const isSelected = selectedSkillId === skill.skillId

  const dmgPvE = skill.damage?.totalPvE
  const dmgPvP = skill.damage?.totalPvP
  const cooldown = formatCooldown(skill.cooldownSec, skill.cooldown)

  // Determine the spec accent for the left border
  const accent = skill.isSuccession
    ? 'border-l-blue-500'
    : skill.isAwakening
    ? 'border-l-red-500'
    : skill.isBlackSpirit
    ? 'border-l-purple-500'
    : skill.isCore
    ? 'border-l-emerald-500'
    : skill.isFlow
    ? 'border-l-amber-500/60'
    : 'border-l-amber-700/30'

  return (
    <div
      className="relative flex items-stretch"
      style={{ paddingLeft: depth * 24 }}
    >
      {/* Connector line for Flow: children */}
      {showConnector && (
        <div
          aria-hidden
          className="absolute top-0 bottom-0 pointer-events-none"
          style={{
            left: (depth - 1) * 24 + 16,
            width: 14,
          }}
        >
          {/* vertical line */}
          <div className="absolute top-3 bottom-0 w-px bg-amber-700/40" />
          {/* horizontal line into the node */}
          <div className="absolute top-3 left-0 h-px w-full bg-amber-700/40" />
        </div>
      )}
      <motion.button
        type="button"
        onClick={onClick}
        whileHover={{ x: 2 }}
        transition={{ duration: 0.12 }}
        className={cn(
          'flex flex-1 items-center gap-2.5 rounded-sm border border-l-2 bg-bdo-leather-dark/60 px-2.5 py-1.5 text-left transition-all',
          accent,
          'border-amber-900/40 hover:border-amber-600/60 hover:bg-amber-900/10',
          isSelected && 'ring-1 ring-amber-400/60 bg-amber-500/10',
        )}
        style={{ boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.6)' }}
        title={skill.name}
      >
        <TreeSkillIcon skill={skill} size={32} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-xs font-semibold text-amber-100">
              {skill.name}
            </span>
            <PatchChangeIndicator skill={skill} />
            {baseLabel && (
              <span className="ml-auto inline-flex shrink-0 items-center gap-0.5 rounded-sm border border-purple-700/40 bg-purple-950/40 px-1 py-0.5 text-[9px] font-medium text-purple-300">
                <GitBranch className="size-2.5" />
                <span className="truncate max-w-[100px]">{baseLabel}</span>
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <NodeStat
              icon={<Crown className="size-2.5" />}
              value={`Lv ${skill.requiredLevel}`}
              title="Required level"
              accent="gold"
            />
            <NodeStat
              icon={<Gem className="size-2.5" />}
              value={String(skill.skillPoints)}
              title="Skill points"
              accent="blue"
            />
            {dmgPvE != null && dmgPvE > 0 && (
              <NodeStat
                icon={<Swords className="size-2.5" />}
                value={formatDamage(dmgPvE)}
                title="PvE damage"
                accent="red"
              />
            )}
            {dmgPvP != null && dmgPvP > 0 && (
              <NodeStat
                icon={<Crosshair className="size-2.5" />}
                value={formatDamage(dmgPvP)}
                title="PvP damage"
                accent="green"
              />
            )}
            {cooldown && (
              <NodeStat
                icon={<Clock className="size-2.5" />}
                value={cooldown}
                title="Cooldown"
              />
            )}
            {skill.command && (
              <NodeStat
                icon={<Zap className="size-2.5" />}
                value={skill.command}
                title="Input command"
              />
            )}
          </div>
        </div>
      </motion.button>
    </div>
  )
}

// --- Collapsible section ----------------------------------------------------
function TreeSection({
  id,
  title,
  icon,
  count,
  accentColor,
  defaultOpen = true,
  children,
}: {
  id: string
  title: string
  icon: React.ReactNode
  count: number
  accentColor: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = React.useState(() => {
    if (typeof window === 'undefined') return defaultOpen
    try {
      const stored = localStorage.getItem(`bdo-meta-tree-section-${id}`)
      return stored === null ? defaultOpen : stored === 'true'
    } catch {
      return defaultOpen
    }
  })

  const toggle = () => {
    const next = !isOpen
    setIsOpen(next)
    try {
      localStorage.setItem(`bdo-meta-tree-section-${id}`, String(next))
    } catch {}
  }

  if (count === 0) return null

  return (
    <section className="mb-3">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-2 rounded-sm border border-amber-900/50 bg-bdo-leather-dark px-3 py-2 text-left transition-colors hover:bg-amber-900/15"
        style={{ boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.6)' }}
        aria-expanded={isOpen}
      >
        <ChevronRight
          className={cn(
            'size-3.5 shrink-0 text-amber-500/80 transition-transform',
            isOpen && 'rotate-90',
          )}
        />
        <span
          className="flex size-5 items-center justify-center rounded-sm"
          style={{
            backgroundColor: `${accentColor}1f`,
            border: `1px solid ${accentColor}66`,
            color: accentColor,
          }}
        >
          {icon}
        </span>
        <span className="text-sm font-semibold text-amber-200">{title}</span>
        <span
          className="ml-auto rounded-sm border border-amber-800/50 bg-amber-950/40 px-1.5 py-0.5 text-[10px] font-mono font-semibold tabular-nums text-amber-300/80"
          title={`${count} skill${count === 1 ? '' : 's'}`}
        >
          {count}
        </span>
      </button>
      {isOpen && (
        <div className="mt-1.5 space-y-1 pl-1">{children}</div>
      )}
    </section>
  )
}

// --- Empty prompt when no spec is selected ---------------------------------
function NoSpecPrompt() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-sm border border-dashed border-amber-800/40 bg-bdo-leather-dark/40 px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full border border-amber-700/50 bg-amber-950/40">
        <Sword className="size-6 text-amber-500/80" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-amber-200">
          Select a spec to view the skill tree
        </h3>
        <p className="mt-1 max-w-md text-xs text-amber-200/60">
          The skill tree mirrors the in-game layout per weapon/spec. Click a
          class chip above, then toggle <span className="font-semibold text-blue-300">S</span> (Succession) or{' '}
          <span className="font-semibold text-red-300">A</span> (Awakening) to
          see the tree.
        </p>
      </div>
      <div className="mt-2 flex items-center gap-1.5 rounded-sm border border-amber-800/30 bg-amber-950/20 px-2.5 py-1.5 text-[11px] text-amber-200/70">
        <Info className="size-3.5 text-amber-500/80" />
        <span>
          Ascension-only classes use <span className="font-semibold text-yellow-300">Asc</span> instead.
        </span>
      </div>
    </div>
  )
}

// --- Main SkillTree component ----------------------------------------------
export function SkillTree({ skills }: { skills: Skill[] }) {
  const selectSkill = useSkillStore((s) => s.selectSkill)
  const specs = useSkillStore((s) => s.filters.specs) ?? []
  const classIds = useSkillStore((s) => s.filters.classIds) ?? []

  const hasSpec = specs.length > 0
  const activeSpec: 'awakening' | 'succession' | 'ascension' | null =
    specs.includes('awakening')
      ? 'awakening'
      : specs.includes('succession')
      ? 'succession'
      : specs.includes('ascension')
      ? 'ascension'
      : null

  // Group skills into categories
  const groups = React.useMemo(() => {
    const main: Skill[] = []
    const specWeapon: Skill[] = []
    const core: Skill[] = []
    const flow: Skill[] = []
    const bs: Skill[] = []

    for (const s of skills) {
      if (s.isBlackSpirit) {
        bs.push(s)
      } else if (s.isFlow) {
        flow.push(s)
      } else if (s.isCore) {
        core.push(s)
      } else if (s.isPassive) {
        // Passives are not shown in the tree (kept in other views)
        continue
      } else if (
        s.isAwakening ||
        s.isAbsolute ||
        s.isSuccession
      ) {
        specWeapon.push(s)
      } else {
        main.push(s)
      }
    }

    // Sort each group by requiredLevel ascending
    const byLevel = (a: Skill, b: Skill) => a.requiredLevel - b.requiredLevel
    main.sort(byLevel)
    specWeapon.sort(byLevel)
    core.sort(byLevel)
    flow.sort(byLevel)
    bs.sort(byLevel)

    return { main, specWeapon, core, flow, bs }
  }, [skills])

  // Build a map of baseName → skillId for connecting Flow: and BS: skills to
  // their parent. We key on the stripped baseName (no Flow:/BS: prefix, no rank).
  const parentByBaseName = React.useMemo(() => {
    const m = new Map<string, Skill>()
    for (const s of skills) {
      if (s.isFlow || s.isBlackSpirit || s.isPassive) continue
      const bn = s.baseName || getBaseName(s.name)
      if (bn && !m.has(bn)) m.set(bn, s)
    }
    return m
  }, [skills])

  // Find a Flow: skill's parent — strip "Flow: " and look up by name.
  const findFlowParent = React.useCallback(
    (flowSkill: Skill): Skill | null => {
      // "Flow: Prime: Slash" → "Prime: Slash" → getBaseName → "Slash"
      // The parent baseName should also be "Slash".
      const bn = flowSkill.baseName || getBaseName(flowSkill.name)
      if (!bn) return null
      return parentByBaseName.get(bn) ?? null
    },
    [parentByBaseName],
  )

  // Find a BS skill's base — strip "Black Spirit: " prefix and look up.
  const findBsBase = React.useCallback(
    (bsSkill: Skill): Skill | null => {
      // getBaseName strips "Black Spirit: " prefix too if it's the outermost,
      // so we need a custom strip that keeps the inner prefix.
      // e.g. "Black Spirit: Prime: Slash" → "Prime: Slash" → baseName "Slash"
      // e.g. "Black Spirit: Slash" → "Slash" → baseName "Slash"
      const stripped = bsSkill.name.replace(/^Black Spirit:\s*/i, '')
      const bn = getBaseName(stripped)
      if (!bn) return null
      return parentByBaseName.get(bn) ?? null
    },
    [parentByBaseName],
  )

  // --- No spec selected: show prompt ---
  if (!hasSpec || !activeSpec) {
    // Edge case: class selected but no spec — still show prompt.
    // (Tree view is only meaningful with a spec, per P2.4 rules.)
    if (classIds.length === 0) {
      return <NoSpecPrompt />
    }
    return <NoSpecPrompt />
  }

  const specLabel =
    activeSpec === 'awakening'
      ? 'Awakening Weapon'
      : activeSpec === 'succession'
      ? 'Succession Weapon'
      : 'Ascension Weapon'

  const specColor =
    activeSpec === 'awakening'
      ? '#ef4444'
      : activeSpec === 'succession'
      ? '#3b82f6'
      : '#eab308'

  const totalVisible =
    groups.main.length +
    groups.specWeapon.length +
    groups.core.length +
    groups.flow.length +
    groups.bs.length

  if (totalVisible === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-amber-800/40 bg-bdo-leather-dark/40 px-6 py-10 text-center">
        <Sparkles className="size-5 text-amber-500/60" />
        <p className="text-xs text-amber-200/60">
          No skills match the current filters in tree view.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {/* Header summary */}
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-sm border border-amber-900/40 bg-bdo-leather-dark/60 px-3 py-2">
        <span
          className="rounded-sm border px-2 py-0.5 text-xs font-semibold"
          style={{
            color: specColor,
            borderColor: `${specColor}66`,
            backgroundColor: `${specColor}1a`,
          }}
        >
          {specLabel}
        </span>
        <span className="text-xs text-amber-200/60">
          {totalVisible} skill{totalVisible === 1 ? '' : 's'} · max-rank only
        </span>
        <span className="ml-auto flex items-center gap-1 text-[10px] text-amber-200/40">
          <GitBranch className="size-3" />
          Flow lines shown
        </span>
      </div>

      {/* Section 1: Main Weapon */}
      <TreeSection
        id="main-weapon"
        title="Main Weapon"
        icon={<Sword className="size-3" />}
        count={groups.main.length}
        accentColor="#c9a25c"
        defaultOpen
      >
        {groups.main.map((s) => {
          // Find Flow: children of this skill
          const flowChildren = groups.flow.filter((f) => {
            const parent = findFlowParent(f)
            return parent?.skillId === s.skillId
          })
          return (
            <div key={s.id} className="space-y-1">
              <SkillNode skill={s} onClick={() => selectSkill(s.skillId)} />
              {flowChildren.map((f) => (
                <SkillNode
                  key={f.id}
                  skill={f}
                  onClick={() => selectSkill(f.skillId)}
                  depth={1}
                  showConnector
                />
              ))}
            </div>
          )
        })}
      </TreeSection>

      {/* Section 2: Spec Weapon (Awakening/Succession/Ascension) */}
      <TreeSection
        id="spec-weapon"
        title={specLabel}
        icon={<Crown className="size-3" />}
        count={groups.specWeapon.length}
        accentColor={specColor}
        defaultOpen
      >
        {groups.specWeapon.map((s) => {
          const flowChildren = groups.flow.filter((f) => {
            const parent = findFlowParent(f)
            return parent?.skillId === s.skillId
          })
          return (
            <div key={s.id} className="space-y-1">
              <SkillNode skill={s} onClick={() => selectSkill(s.skillId)} />
              {flowChildren.map((f) => (
                <SkillNode
                  key={f.id}
                  skill={f}
                  onClick={() => selectSkill(f.skillId)}
                  depth={1}
                  showConnector
                />
              ))}
            </div>
          )
        })}
      </TreeSection>

      {/* Section 3: Core (Rabam) */}
      <TreeSection
        id="core-rabam"
        title="Core (Rabam)"
        icon={<Gem className="size-3" />}
        count={groups.core.length}
        accentColor="#10b981"
        defaultOpen
      >
        {groups.core.map((s) => (
          <SkillNode key={s.id} skill={s} onClick={() => selectSkill(s.skillId)} />
        ))}
      </TreeSection>

      {/* Section 4: Flow (orphans — Flow skills whose parent isn't in this view) */}
      {(() => {
        // Find Flow skills whose parent isn't in any visible section
        const parentIds = new Set<number>()
        for (const s of [...groups.main, ...groups.specWeapon, ...groups.core]) {
          parentIds.add(s.skillId)
        }
        const orphanFlows = groups.flow.filter((f) => {
          const parent = findFlowParent(f)
          return !parent || !parentIds.has(parent.skillId)
        })
        if (orphanFlows.length === 0) return null
        return (
          <TreeSection
            id="flow-orphan"
            title="Flow"
            icon={<GitBranch className="size-3" />}
            count={orphanFlows.length}
            accentColor="#f59e0b"
            defaultOpen={false}
          >
            {orphanFlows.map((f) => {
              const parent = findFlowParent(f)
              return (
                <SkillNode
                  key={f.id}
                  skill={f}
                  onClick={() => selectSkill(f.skillId)}
                  baseLabel={parent ? `from ${parent.name}` : undefined}
                />
              )
            })}
          </TreeSection>
        )
      })()}

      {/* Section 5: Black Spirit */}
      <TreeSection
        id="black-spirit"
        title="Black Spirit"
        icon={<Sparkles className="size-3" />}
        count={groups.bs.length}
        accentColor="#a855f7"
        defaultOpen={false}
      >
        {groups.bs.map((s) => {
          const base = findBsBase(s)
          return (
            <SkillNode
              key={s.id}
              skill={s}
              onClick={() => selectSkill(s.skillId)}
              baseLabel={base ? `rage of ${base.name}` : undefined}
            />
          )
        })}
      </TreeSection>
    </div>
  )
}
