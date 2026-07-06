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
  Keyboard,
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
  isFocused = false,
  registerRef,
}: {
  skill: Skill
  onClick: () => void
  depth?: number
  showConnector?: boolean
  baseLabel?: string
  /**
   * Whether this node currently has keyboard focus (set via arrow keys).
   * Distinct from `isSelected` — selection opens the detail drawer; focus is
   * the keyboard-cursor position. They can coincide.
   */
  isFocused?: boolean
  /** Ref callback so the parent can keep a Map of skillId → button DOM el. */
  registerRef?: (el: HTMLButtonElement | null) => void
}) {
  const selectedSkillId = useSkillStore((s) => s.selectedSkillId)
  const isSelected = selectedSkillId === skill.skillId

  const dmgPvE = skill.damage?.totalPvE
  const dmgPvP = skill.damage?.totalPvP
  const cooldown = formatCooldown(skill.cooldownSec, skill.cooldown)

  // Determine the spec accent for the left border.
  // Uses DB flags with name-prefix fallbacks (flags aren't populated for all
  // skills in the DB yet).
  const isBs = skill.isBlackSpirit || /^Black Spirit:\s/i.test(skill.name)
  const isFlow = !isBs && (skill.isFlow || /^Flow:\s/i.test(skill.name))
  const isCore = !isBs && !isFlow && (skill.isCore || /^Core:\s/i.test(skill.name))
  const accent = skill.isSuccession
    ? 'border-l-blue-500'
    : skill.isAwakening
    ? 'border-l-red-500'
    : isBs
    ? 'border-l-purple-500'
    : isCore
    ? 'border-l-emerald-500'
    : isFlow
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
        ref={registerRef as React.Ref<HTMLButtonElement>}
        data-skill-tree-node
        data-skill-id={String(skill.skillId)}
        // Programmatically focusable (we call .focus() on arrow nav). Excluded
        // from the Tab ring so the browser's tab order stays predictable; AT
        // users still hear the focused button because we move real DOM focus
        // to it on every arrow press.
        tabIndex={-1}
        whileHover={{ x: 2 }}
        transition={{ duration: 0.12 }}
        className={cn(
          'flex flex-1 items-center gap-2.5 rounded-sm border border-l-2 bg-bdo-leather-dark/60 px-2.5 py-1.5 text-left outline-none transition-all',
          accent,
          'border-amber-900/40 hover:border-amber-600/60 hover:bg-amber-900/10',
          isSelected && 'ring-1 ring-amber-400/60 bg-amber-500/10',
          // Keyboard-focus ring — gold (BDO amber). Overrides the lighter
          // selected ring when both apply (twMerge resolves the conflict).
          isFocused &&
            'ring-2 ring-amber-400 bg-amber-500/15 shadow-[0_0_0_1px_rgba(245,158,11,0.55),0_0_10px_rgba(245,158,11,0.25)]',
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
        data-tree-section-id={id}
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

// --- Empty prompt when no class/spec is selected ---------------------------
function NoSpecPrompt() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-sm border border-dashed border-amber-800/40 bg-bdo-leather-dark/40 px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full border border-amber-700/50 bg-amber-950/40">
        <Sword className="size-6 text-amber-500/80" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-amber-200">
          Select a class &amp; spec to view the skill tree
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

  // Group skills into categories.
  // Uses DB flags (isFlow/isCore/isBlackSpirit) when available, with name-prefix
  // fallbacks ("Flow: "/"Core: "/"Black Spirit: ") because the flags aren't
  // populated for all skills in the DB yet.
  const groups = React.useMemo(() => {
    const main: Skill[] = []
    const specWeapon: Skill[] = []
    const core: Skill[] = []
    const flow: Skill[] = []
    const bs: Skill[] = []

    for (const s of skills) {
      const isBs = s.isBlackSpirit || /^Black Spirit:\s/i.test(s.name)
      const isFlow = !isBs && (s.isFlow || /^Flow:\s/i.test(s.name))
      const isCore = !isBs && !isFlow && (s.isCore || /^Core:\s/i.test(s.name))
      if (isBs) {
        bs.push(s)
      } else if (isFlow) {
        flow.push(s)
      } else if (isCore) {
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
  // Excludes Flow/BS/Core/Passive skills from being parents — Flow chains FROM
  // a Main/Spec-weapon skill, never from another Flow or a Core skill.
  const parentByBaseName = React.useMemo(() => {
    const m = new Map<string, Skill>()
    for (const s of skills) {
      const isBs = s.isBlackSpirit || /^Black Spirit:\s/i.test(s.name)
      const isFlow = !isBs && (s.isFlow || /^Flow:\s/i.test(s.name))
      const isCore = !isBs && !isFlow && (s.isCore || /^Core:\s/i.test(s.name))
      if (isFlow || isBs || isCore || s.isPassive) continue
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

  // --- Prompt states ---
  // Tree view is only meaningful when BOTH a class AND a spec are selected
  // (per P2.4 rules — the tree mirrors the in-game per-class layout).
  if (!hasSpec || !activeSpec || classIds.length === 0) {
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
    <SkillTreeBody
      groups={groups}
      findFlowParent={findFlowParent}
      findBsBase={findBsBase}
      specLabel={specLabel}
      specColor={specColor}
      selectSkill={selectSkill}
      totalVisible={totalVisible}
    />
  )
}

// ---------------------------------------------------------------------------
// Q3.3 — Keyboard navigation
//
// The body is split into its own component so all the keyboard-nav hooks
// (focusedSkillId state, keydown listener, ref map) only mount when a tree
// is actually being rendered. The parent `SkillTree` short-circuits earlier
// for the no-spec / no-class / empty-filters cases, so this component is
// guaranteed to have a non-empty `flatNodes` list.
// ---------------------------------------------------------------------------

// One entry per visible SkillNode, in DOM render order. Mirrors the section
// rendering below so that ArrowUp/ArrowDown traversal matches what the user
// sees on screen (including Flow: children nested under their parent).
type FlatNode = {
  skillId: number
  skill: Skill
  depth: number
  showConnector: boolean
  baseLabel?: string
  sectionId: TreeSectionId
}

type TreeSectionId =
  | 'main-weapon'
  | 'spec-weapon'
  | 'core-rabam'
  | 'flow-orphan'
  | 'black-spirit'

interface SkillTreeBodyProps {
  groups: {
    main: Skill[]
    specWeapon: Skill[]
    core: Skill[]
    flow: Skill[]
    bs: Skill[]
  }
  findFlowParent: (s: Skill) => Skill | null
  findBsBase: (s: Skill) => Skill | null
  specLabel: string
  specColor: string
  selectSkill: (id: number | null) => void
  totalVisible: number
}

function SkillTreeBody({
  groups,
  findFlowParent,
  findBsBase,
  specLabel,
  specColor,
  selectSkill,
  totalVisible,
}: SkillTreeBodyProps) {
  // --- Build the flat node list (source of truth for both rendering + nav) --
  const flatNodes = React.useMemo<FlatNode[]>(() => {
    const nodes: FlatNode[] = []

    // Section 1: Main Weapon — each main skill followed by its Flow: children
    for (const s of groups.main) {
      nodes.push({
        skillId: s.skillId,
        skill: s,
        depth: 0,
        showConnector: false,
        sectionId: 'main-weapon',
      })
      const flowChildren = groups.flow.filter(
        (f) => findFlowParent(f)?.skillId === s.skillId,
      )
      for (const f of flowChildren) {
        nodes.push({
          skillId: f.skillId,
          skill: f,
          depth: 1,
          showConnector: true,
          sectionId: 'main-weapon',
        })
      }
    }

    // Section 2: Spec Weapon — same parent/Flow structure
    for (const s of groups.specWeapon) {
      nodes.push({
        skillId: s.skillId,
        skill: s,
        depth: 0,
        showConnector: false,
        sectionId: 'spec-weapon',
      })
      const flowChildren = groups.flow.filter(
        (f) => findFlowParent(f)?.skillId === s.skillId,
      )
      for (const f of flowChildren) {
        nodes.push({
          skillId: f.skillId,
          skill: f,
          depth: 1,
          showConnector: true,
          sectionId: 'spec-weapon',
        })
      }
    }

    // Section 3: Core (Rabam)
    for (const s of groups.core) {
      nodes.push({
        skillId: s.skillId,
        skill: s,
        depth: 0,
        showConnector: false,
        sectionId: 'core-rabam',
      })
    }

    // Section 4: Flow orphans — Flow skills whose parent isn't visible
    const parentIds = new Set<number>()
    for (const s of [
      ...groups.main,
      ...groups.specWeapon,
      ...groups.core,
    ]) {
      parentIds.add(s.skillId)
    }
    const orphanFlows = groups.flow.filter((f) => {
      const parent = findFlowParent(f)
      return !parent || !parentIds.has(parent.skillId)
    })
    for (const f of orphanFlows) {
      const parent = findFlowParent(f)
      nodes.push({
        skillId: f.skillId,
        skill: f,
        depth: 0,
        showConnector: false,
        baseLabel: parent ? `from ${parent.name}` : undefined,
        sectionId: 'flow-orphan',
      })
    }

    // Section 5: Black Spirit
    for (const s of groups.bs) {
      const base = findBsBase(s)
      nodes.push({
        skillId: s.skillId,
        skill: s,
        depth: 0,
        showConnector: false,
        baseLabel: base ? `rage of ${base.name}` : undefined,
        sectionId: 'black-spirit',
      })
    }

    return nodes
  }, [groups, findFlowParent, findBsBase])

  // --- Keyboard focus state -------------------------------------------------
  // focusedSkillId is the keyboard-cursor position. Independent of the detail-
  // drawer's selectedSkillId (click vs. keyboard can target different nodes).
  const [focusedSkillId, setFocusedSkillId] = React.useState<number | null>(
    null,
  )

  // Drop focus if the node disappears from the list (filters changed, section
  // collapsed, etc.) — keeping a stale id would leave a phantom gold ring.
  React.useEffect(() => {
    if (focusedSkillId == null) return
    if (!flatNodes.some((n) => n.skillId === focusedSkillId)) {
      setFocusedSkillId(null)
    }
  }, [flatNodes, focusedSkillId])

  // Direct DOM handle per node, keyed by skillId. We use this for .focus()
  // and .scrollIntoView() instead of querySelector for speed and to avoid
  // surprises if the DOM structure ever changes.
  const nodeRefs = React.useRef<Map<number, HTMLButtonElement>>(new Map())
  const registerRef = React.useCallback(
    (skillId: number) => (el: HTMLButtonElement | null) => {
      const map = nodeRefs.current
      if (el) map.set(skillId, el)
      else map.delete(skillId)
    },
    [],
  )

  // Stable click handler — keeps SkillNode onClick closures cheap.
  const handleNodeClick = React.useCallback(
    (skillId: number) => {
      setFocusedSkillId(skillId)
      selectSkill(skillId)
    },
    [selectSkill],
  )

  // --- Section toggle (for Arrow Left/Right) -------------------------------
  // TreeSection manages its own isOpen state (persisted to localStorage), so
  // we collapse/expand by simulating a click on its header button. We look up
  // the button via [data-tree-section-id] and read aria-expanded to decide
  // whether to act.
  const toggleSection = React.useCallback((sectionId: TreeSectionId) => {
    if (typeof document === 'undefined') return
    const btn = document.querySelector<HTMLElement>(
      `[data-tree-section-id="${sectionId}"]`,
    )
    btn?.click()
  }, [])

  const isSectionExpanded = React.useCallback((sectionId: TreeSectionId) => {
    if (typeof document === 'undefined') return true
    const btn = document.querySelector<HTMLElement>(
      `[data-tree-section-id="${sectionId}"]`,
    )
    return btn?.getAttribute('aria-expanded') === 'true'
  }, [])

  // --- Window-level keydown handler ----------------------------------------
  // Mounted only when there are nodes to navigate. We mirror the page.tsx
  // pattern (window-level listener, skip when typing in an input).
  React.useEffect(() => {
    if (flatNodes.length === 0) return

    const focusNode = (skillId: number) => {
      const el = nodeRefs.current.get(skillId)
      if (el) {
        el.focus({ preventScroll: true })
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }

    const handleKey = (e: KeyboardEvent) => {
      // Skip if user is typing in an input/textarea/contenteditable — those
      // keys belong to the field, not the tree.
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }

      const key = e.key
      if (
        key !== 'ArrowDown' &&
        key !== 'ArrowUp' &&
        key !== 'ArrowLeft' &&
        key !== 'ArrowRight' &&
        key !== 'Enter'
      ) {
        return
      }

      e.preventDefault()

      // Enter → open detail drawer for the focused skill (no-op if nothing
      // is focused yet — matches the grid view's behaviour).
      if (key === 'Enter') {
        if (focusedSkillId != null) selectSkill(focusedSkillId)
        return
      }

      // Arrow Up/Down → traverse the flat node list across section boundaries.
      if (key === 'ArrowDown' || key === 'ArrowUp') {
        const curIdx = focusedSkillId == null
          ? -1
          : flatNodes.findIndex((n) => n.skillId === focusedSkillId)
        const base = curIdx === -1 ? -1 : curIdx
        const nextIdx =
          key === 'ArrowDown'
            ? Math.min(base + 1, flatNodes.length - 1)
            : Math.max(base - 1, 0)
        const nextNode = flatNodes[nextIdx]
        if (!nextNode) return
        setFocusedSkillId(nextNode.skillId)
        focusNode(nextNode.skillId)
        return
      }

      // Arrow Left/Right → collapse/expand the section the focused node lives
      // in. We act as a no-op when the section is already in the desired state
      // (so a user mashing Arrow Right on an open section doesn't accidentally
      // collapse it on the next press).
      if (focusedSkillId == null) return
      const current = flatNodes.find((n) => n.skillId === focusedSkillId)
      if (!current) return
      const expanded = isSectionExpanded(current.sectionId)
      if (key === 'ArrowRight' && !expanded) {
        toggleSection(current.sectionId)
      } else if (key === 'ArrowLeft' && expanded) {
        toggleSection(current.sectionId)
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [
    flatNodes,
    focusedSkillId,
    selectSkill,
    isSectionExpanded,
    toggleSection,
  ])

  // --- Section render metadata ---------------------------------------------
  const sectionsToRender: Array<{
    id: TreeSectionId
    title: string
    icon: React.ReactNode
    accentColor: string
    defaultOpen: boolean
  }> = [
    {
      id: 'main-weapon',
      title: 'Main Weapon',
      icon: <Sword className="size-3" />,
      accentColor: '#c9a25c',
      defaultOpen: true,
    },
    {
      id: 'spec-weapon',
      title: specLabel,
      icon: <Crown className="size-3" />,
      accentColor: specColor,
      defaultOpen: true,
    },
    {
      id: 'core-rabam',
      title: 'Core (Rabam)',
      icon: <Gem className="size-3" />,
      accentColor: '#10b981',
      defaultOpen: true,
    },
    {
      id: 'flow-orphan',
      title: 'Flow',
      icon: <GitBranch className="size-3" />,
      accentColor: '#f59e0b',
      defaultOpen: false,
    },
    {
      id: 'black-spirit',
      title: 'Black Spirit',
      icon: <Sparkles className="size-3" />,
      accentColor: '#a855f7',
      defaultOpen: false,
    },
  ]

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

      {/* Sections — rendered from the flatNodes list so DOM order is
          guaranteed to match the keyboard-nav order. */}
      {sectionsToRender.map((sec) => {
        const sectionNodes = flatNodes.filter((n) => n.sectionId === sec.id)
        if (sectionNodes.length === 0) return null
        return (
          <TreeSection
            key={sec.id}
            id={sec.id}
            title={sec.title}
            icon={sec.icon}
            count={sectionNodes.length}
            accentColor={sec.accentColor}
            defaultOpen={sec.defaultOpen}
          >
            {sectionNodes.map((n) => (
              <SkillNode
                key={`${sec.id}-${n.skillId}`}
                skill={n.skill}
                onClick={() => handleNodeClick(n.skillId)}
                depth={n.depth}
                showConnector={n.showConnector}
                baseLabel={n.baseLabel}
                isFocused={focusedSkillId === n.skillId}
                registerRef={registerRef(n.skillId)}
              />
            ))}
          </TreeSection>
        )
      })}

      {/* Keyboard-nav hint */}
      <div className="mt-2 flex items-center justify-center gap-1.5 rounded-sm border border-amber-900/30 bg-bdo-leather-dark/40 px-3 py-1.5 text-[10px] text-amber-200/50">
        <Keyboard className="size-3 text-amber-500/60" />
        <span className="font-mono tabular-nums">
          <span className="text-amber-300/80">↑↓</span> Navigate
          <span className="mx-1.5 text-amber-700/60">·</span>
          <span className="text-amber-300/80">Enter</span> Open
          <span className="mx-1.5 text-amber-700/60">·</span>
          <span className="text-amber-300/80">← →</span> Collapse/Expand
        </span>
      </div>
    </div>
  )
}
