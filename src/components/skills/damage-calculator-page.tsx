'use client'

// BDO PvP Damage Calculator — v2 (validated formula)
// Formula source: bdo-tools.net/@gpw, confirmed by garmoth.com
//
//   1. Base Damage    = AP + Species AP - Enemy DR
//   2. After DR Rate  = Base × (1 - DR_Rate%)
//   3. After Crit     = × Crit Multiplier   (×2.25 at 100% crit rate)
//   4. After Skill    = × (PvP_Damage_% / 100) × (Skill_Damage_% / 100) × Hit_Count
//   5. After Class Group = × 1.05 if attacker has counter advantage
//                          (Vanguard > Pulverizer > Skirmisher > Vanguard)
//   6. After SA DR    = × (1 - SA_DR%)   [if target is in Super Armor]
//   + Back/Down/Air Attack scalars are applied multiplicatively at the end.
//
// Assumptions: 100% accuracy, 100% crit rate when crit toggle is on.
// "Total AP" already includes Species AP — input panel asks for the merged value.

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calculator,
  Search,
  Plus,
  X,
  Info,
  Swords,
  ChevronDown,
  ChevronUp,
  Settings,
  ArrowUpDown,
  Shield,
  Zap,
} from 'lucide-react'

import { classColor, classIconUrl } from '@/lib/skills'
import { formatDamage } from '@/lib/damage'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────

type ClassGroup = 'Vanguard' | 'Pulverizer' | 'Skirmisher'
type Spec = 'awakening' | 'succession' | 'ascension'

interface PhaseDamage {
  phase: string
  percent: number
  multiplier: number
  maxHits: number
  totalPerHit: number
  totalMax: number
  pvpOnly: boolean
  pveOnly: boolean
}

interface SkillDamage {
  phases: PhaseDamage[]
  totalPvE: number
  totalPvP: number | null
  pvpDamagePercent: number | null
  hasDamage: boolean
  hasSpecialMode: boolean
}

interface Skill {
  skillId: number
  name: string
  className: string | null
  classId: number | null
  iconUrl: string | null
  damage: SkillDamage
  pvpDamagePercent: number | null
  isAwakening: boolean
  isSuccession: boolean
  isAbsolute: boolean
  isBlackSpirit: boolean
  isPassive: boolean
}

interface SkillListResponse {
  items: Skill[]
  total: number
}

interface MetaSpecStats {
  skillCount: number
  avgPvpDamage: number
}

interface MetaClass {
  classId: number
  className: string
  slug: string
  awakeningGroup: string | null
  successionGroup: string | null
  ascensionGroup: string | null
  awakeningSaDr: number
  successionSaDr: number
  ascensionSaDr: number
  awakening: MetaSpecStats
  succession: MetaSpecStats
  ascension: MetaSpecStats
}

interface MetaResponse {
  classes: MetaClass[]
}

// ─── Constants ───────────────────────────────────────────────────────

const CLASS_GROUPS: ClassGroup[] = ['Vanguard', 'Pulverizer', 'Skirmisher']

// Vanguard > Pulverizer > Skirmisher > Vanguard
const GROUP_COUNTERS: Record<ClassGroup, ClassGroup> = {
  Vanguard: 'Pulverizer',
  Pulverizer: 'Skirmisher',
  Skirmisher: 'Vanguard',
}

const GROUP_THEME: Record<ClassGroup, { color: string; glyph: string; tagline: string }> = {
  Vanguard:    { color: '#ef4444', glyph: '🛡', tagline: 'Tanks / Bruisers' },
  Pulverizer:  { color: '#f59e0b', glyph: '💥', tagline: 'Burst / Strikers' },
  Skirmisher:  { color: '#10b981', glyph: '⚔', tagline: 'Skirmishers / Mages' },
}

function hasCounterAdvantage(attacker: ClassGroup, defender: ClassGroup): boolean {
  return GROUP_COUNTERS[attacker] === defender
}

interface ScalarConfig {
  key: 'crit' | 'back' | 'down' | 'air'
  label: string
  short: string
  multiplier: number
  color: string
  description: string
}

const SCALAR_CONFIGS: ScalarConfig[] = [
  { key: 'crit', label: 'Critical',   short: 'CRIT', multiplier: 2.25, color: '#fbbf24', description: 'Critical Hit: ×2.25 damage (assumes 100% crit rate).' },
  { key: 'back', label: 'Back Atk',   short: 'BACK', multiplier: 1.5,  color: '#a78bfa', description: 'Back Attack: ×1.5 damage (hitting target from behind).' },
  { key: 'down', label: 'Down Atk',   short: 'DOWN', multiplier: 1.5,  color: '#ef4444', description: 'Down Attack: ×1.5 damage (target is knocked down).' },
  { key: 'air',  label: 'Air Atk',    short: 'AIR',  multiplier: 1.3,  color: '#38bdf8', description: 'Air Attack: ×1.3 damage (target is airborne).' },
]

// ─── Calculation ─────────────────────────────────────────────────────

interface CalcResult {
  totalAp: number
  enemyDr: number
  baseDamage: number        // step 1 (clamped to ≥ 1)
  baseRaw: number           // step 1 (raw, before clamp)
  drRate: number
  afterDrRate: number       // step 2
  critMult: number
  afterCrit: number         // step 3
  pvpPercent: number
  skillDamagePercent: number
  hitCount: number
  afterSkill: number        // step 4
  groupModifier: number
  counterAdvantage: boolean
  afterGroup: number        // step 5
  saDrApplied: number
  afterSaDr: number         // step 6
  backMult: number
  downMult: number
  airMult: number
  extraScalarMult: number   // back × down × air
  finalDamage: number       // step 7
  perScalar: Record<ScalarConfig['key'], number>
}

function calculatePvpDamage(opts: {
  totalAp: number
  enemyDr: number
  drRate: number
  scalars: Record<ScalarConfig['key'], boolean>
  attackerGroup: ClassGroup
  targetGroup: ClassGroup
  saDrEnabled: boolean
  saDr: number
  skill: Skill
}): CalcResult | null {
  const { totalAp, enemyDr, drRate, scalars, attackerGroup, targetGroup, saDrEnabled, saDr, skill } = opts

  if (!skill.pvpDamagePercent || skill.pvpDamagePercent <= 0) return null
  if (!skill.damage || !skill.damage.totalPvE || skill.damage.totalPvE <= 0) return null

  const pvpPercent = skill.pvpDamagePercent
  const skillDamagePercent = skill.damage.totalPvE
  const phases = skill.damage.phases || []
  const hitCount = phases.reduce((sum, p) => sum + p.multiplier * p.maxHits, 0)
  if (hitCount <= 0) return null

  // Step 1: Base = (Total AP, which already includes Species AP) - DR
  const baseRaw = totalAp - enemyDr
  const baseDamage = Math.max(1, baseRaw)
  // Step 2: After DR Rate
  const afterDrRate = baseDamage * (1 - drRate / 100)
  // Step 3: After Crit
  const critMult = scalars.crit ? 2.25 : 1
  const afterCrit = afterDrRate * critMult
  // Step 4: After Skill = × (PvP%/100) × (Skill%/100) × Hit_Count
  const afterSkill = afterCrit * (pvpPercent / 100) * (skillDamagePercent / 100) * hitCount
  // Step 5: After Class Group (×1.05 if attacker has counter advantage)
  const counterAdvantage = hasCounterAdvantage(attackerGroup, targetGroup)
  const groupModifier = counterAdvantage ? 1.05 : 1
  const afterGroup = afterSkill * groupModifier
  // Step 6: After SA DR
  const saDrApplied = saDrEnabled ? saDr : 0
  const afterSaDr = afterGroup * (1 - saDrApplied / 100)
  // Step 7: Other positional scalars (Back / Down / Air)
  const backMult = scalars.back ? 1.5 : 1
  const downMult = scalars.down ? 1.5 : 1
  const airMult = scalars.air ? 1.3 : 1
  const extraScalarMult = backMult * downMult * airMult
  const finalDamage = afterSaDr * extraScalarMult

  // Per-scalar damage: what each scalar alone would yield on top of base formula
  // (multiplication is commutative, so order doesn't matter for these isolated views)
  const perScalar = {} as Record<ScalarConfig['key'], number>
  for (const cfg of SCALAR_CONFIGS) {
    perScalar[cfg.key] = afterSaDr * cfg.multiplier
  }

  return {
    totalAp, enemyDr, baseDamage, baseRaw, drRate, afterDrRate,
    critMult, afterCrit,
    pvpPercent, skillDamagePercent, hitCount, afterSkill,
    groupModifier, counterAdvantage, afterGroup,
    saDrApplied, afterSaDr,
    backMult, downMult, airMult, extraScalarMult,
    finalDamage, perScalar,
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────

function fmt(n: number, digits = 0): string {
  if (!isFinite(n)) return '—'
  if (digits === 0) return Math.round(n).toLocaleString()
  return n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

function fmtPct(n: number, digits = 1): string {
  return `${fmt(n, digits)}%`
}

// Skill icon with gold-bevel BDO frame and first-letter fallback.
function SkillIcon({ skill, size = 36 }: {
  skill: { iconUrl: string | null; name: string; className: string | null }
  size?: number
}) {
  const [errored, setErrored] = React.useState(false)
  const [loaded, setLoaded] = React.useState(false)
  const firstLetter = skill.name?.[0] ?? '?'
  const fallbackColor = classColor(skill.className)

  if (!skill.iconUrl || errored) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-sm border-2 font-bold"
        style={{
          width: size, height: size,
          borderColor: `${fallbackColor}aa`,
          backgroundColor: `${fallbackColor}1a`,
          color: fallbackColor,
          fontSize: size * 0.42,
        }}
      >
        {firstLetter}
      </div>
    )
  }

  return (
    <div className="bdo-icon-frame relative shrink-0 overflow-hidden" style={{ width: size, height: size }}>
      {!loaded && <div className="absolute inset-0 animate-pulse bg-bdo-leather" />}
      <img
        src={skill.iconUrl}
        alt={skill.name}
        width={size}
        height={size}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        className={cn('h-full w-full object-cover transition-opacity', loaded ? 'opacity-100' : 'opacity-0')}
      />
    </div>
  )
}

// Number input with label, hint slot, and BDO styling.
function NumberField({ label, value, onChange, min = 0, step = 1, hint, suffix }: {
  label: string
  value: number
  onChange: (n: number) => void
  min?: number
  step?: number
  hint?: React.ReactNode
  suffix?: string
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-amber-300/70">
        {label}
        {hint}
      </span>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => {
            const n = parseFloat(e.target.value)
            onChange(Number.isFinite(n) ? n : 0)
          }}
          className={cn(
            'bdo-input w-full px-3 py-2 text-sm font-semibold tabular-nums',
            suffix && 'pr-9',
          )}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-amber-400/60">
            {suffix}
          </span>
        )}
      </div>
    </label>
  )
}

// Sort header button for the results table.
function SortButton({ label, active, dir, onClick, align = 'left' }: {
  label: string
  active: boolean
  dir: 'asc' | 'desc'
  onClick: () => void
  align?: 'left' | 'right' | 'center'
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-bold uppercase tracking-wider transition-colors hover:text-amber-200',
        active ? 'text-amber-300' : 'text-amber-300/50',
        align === 'right' && 'flex-row-reverse',
        align === 'center' && 'justify-center',
      )}
    >
      {label}
      {active ? (
        dir === 'asc' ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />
      ) : (
        <ArrowUpDown className="size-3 opacity-50" />
      )}
    </button>
  )
}

// Three-button group selector for Vanguard/Pulverizer/Skirmisher.
function GroupSelector({ label, value, onChange, tooltip }: {
  label: string
  value: ClassGroup
  onChange: (g: ClassGroup) => void
  tooltip?: React.ReactNode
}) {
  return (
    <div>
      <span className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-amber-300/70">
        {label}
        {tooltip}
      </span>
      <div className="grid grid-cols-3 gap-1.5">
        {CLASS_GROUPS.map((g) => {
          const theme = GROUP_THEME[g]
          const active = value === g
          return (
            <button
              key={g}
              type="button"
              onClick={() => onChange(g)}
              title={`${g} — ${theme.tagline}`}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-sm border px-2 py-1.5 text-[10px] font-bold transition-all',
                active
                  ? 'bdo-chip-on'
                  : 'bdo-chip',
              )}
              style={active ? { borderColor: `${theme.color}aa`, color: theme.color } : undefined}
            >
              <span className="text-sm leading-none">{theme.glyph}</span>
              <span className="leading-tight">{g}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Skill search response shape (subset) ────────────────────────────

async function searchSkills(q: string): Promise<SkillListResponse> {
  const sp = new URLSearchParams({
    q,
    maxRank: 'true',
    filterEvasion: 'true',
    pageSize: '10',
  })
  const res = await fetch(`/api/skills?${sp.toString()}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Search failed: ${res.status}`)
  return res.json()
}

async function fetchMeta(): Promise<MetaResponse> {
  const res = await fetch('/api/meta', { cache: 'no-store' })
  if (!res.ok) throw new Error(`Meta fetch failed: ${res.status}`)
  return res.json()
}

// ─── Main component ──────────────────────────────────────────────────

type SortKey = 'name' | 'finalDamage' | 'skillDamage' | 'pvpPercent' | 'hits'
type SortDir = 'asc' | 'desc'

interface SelectedSkill {
  skill: Skill
  result: CalcResult | null
}

export function DamageCalculatorPage() {
  // Inputs
  const [totalAp, setTotalAp] = React.useState(300)
  const [enemyDr, setEnemyDr] = React.useState(350)
  const [drRate, setDrRate] = React.useState(30)
  const [scalars, setScalars] = React.useState<Record<ScalarConfig['key'], boolean>>({
    crit: true,
    back: false,
    down: false,
    air: false,
  })
  const [attackerGroup, setAttackerGroup] = React.useState<ClassGroup>('Vanguard')
  const [targetGroup, setTargetGroup] = React.useState<ClassGroup>('Pulverizer')
  const [saDrEnabled, setSaDrEnabled] = React.useState(true)
  const [saDr, setSaDr] = React.useState(10)

  // Advanced mode (auto-fill SA DR from /api/meta)
  const [advanced, setAdvanced] = React.useState(false)
  const [metaClassId, setMetaClassId] = React.useState<number | null>(null)
  const [metaSpec, setMetaSpec] = React.useState<Spec>('awakening')

  // Search
  const [searchInput, setSearchInput] = React.useState('')
  const [debouncedQuery, setDebouncedQuery] = React.useState('')
  const [selectedSkills, setSelectedSkills] = React.useState<Skill[]>([])

  // UI
  const [sortKey, setSortKey] = React.useState<SortKey>('finalDamage')
  const [sortDir, setSortDir] = React.useState<SortDir>('desc')
  const [expandedId, setExpandedId] = React.useState<number | null>(null)

  // Debounce search input
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  // Search query
  const { data: searchData, isLoading: searchLoading } = useQuery<SkillListResponse>({
    queryKey: ['dmgcalc-v2-skill-search', debouncedQuery],
    queryFn: () => searchSkills(debouncedQuery),
    enabled: debouncedQuery.length > 0,
    staleTime: 60_000,
  })

  // Meta fetch (advanced mode)
  const { data: metaData } = useQuery<MetaResponse>({
    queryKey: ['dmgcalc-v2-meta'],
    queryFn: fetchMeta,
    enabled: advanced,
    staleTime: 5 * 60_000,
  })

  // When advanced mode is on and a class+spec is chosen, auto-fill SA DR
  React.useEffect(() => {
    if (!advanced || !metaData || metaClassId == null) return
    const cls = metaData.classes.find((c) => c.classId === metaClassId)
    if (!cls) return
    const v =
      metaSpec === 'awakening' ? cls.awakeningSaDr :
      metaSpec === 'succession' ? cls.successionSaDr :
      cls.ascensionSaDr
    if (typeof v === 'number') setSaDr(v)
  }, [advanced, metaData, metaClassId, metaSpec])

  const counterAdvantage = hasCounterAdvantage(attackerGroup, targetGroup)

  // Add/remove skills
  const addSkill = React.useCallback((s: Skill) => {
    setSelectedSkills((prev) => {
      if (prev.some((p) => p.skillId === s.skillId)) return prev
      return [...prev, s]
    })
  }, [])
  const removeSkill = React.useCallback((id: number) => {
    setSelectedSkills((prev) => prev.filter((p) => p.skillId !== id))
  }, [])
  const isAdded = (id: number) => selectedSkills.some((p) => p.skillId === id)

  // Compute results for all selected skills
  const computed: SelectedSkill[] = React.useMemo(() => {
    return selectedSkills.map((skill) => {
      const result = calculatePvpDamage({
        totalAp, enemyDr, drRate, scalars,
        attackerGroup, targetGroup,
        saDrEnabled, saDr,
        skill,
      })
      return { skill, result }
    })
  }, [selectedSkills, totalAp, enemyDr, drRate, scalars, attackerGroup, targetGroup, saDrEnabled, saDr])

  // Sort
  const sorted = React.useMemo(() => {
    const arr = [...computed]
    arr.sort((a, b) => {
      let av: number | string = 0
      let bv: number | string = 0
      switch (sortKey) {
        case 'name':
          av = a.skill.name.toLowerCase(); bv = b.skill.name.toLowerCase(); break
        case 'finalDamage':
          av = a.result?.finalDamage ?? -1; bv = b.result?.finalDamage ?? -1; break
        case 'skillDamage':
          av = a.skill.damage?.totalPvE ?? 0; bv = b.skill.damage?.totalPvE ?? 0; break
        case 'pvpPercent':
          av = a.skill.pvpDamagePercent ?? 0; bv = b.skill.pvpDamagePercent ?? 0; break
        case 'hits':
          av = a.result?.hitCount ?? 0; bv = b.result?.hitCount ?? 0; break
      }
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
    return arr
  }, [computed, sortKey, sortDir])

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(k); setSortDir(k === 'name' ? 'asc' : 'desc') }
  }

  const activeScalarCount = SCALAR_CONFIGS.filter((c) => scalars[c.key]).length

  return (
    <div className="min-h-screen bg-bdo-ink text-amber-100">
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
        {/* Header */}
        <header className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="bdo-title text-2xl sm:text-3xl">PvP Damage Calculator</h1>
            <p className="mt-1 text-xs text-amber-300/60 sm:text-sm">
              Validated formula from <span className="text-amber-300">bdo-tools.net/@gpw</span>, confirmed by{' '}
              <span className="text-amber-300">garmoth.com</span>. Assumes 100% accuracy &amp; 100% crit rate.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-amber-300/50">
            <Swords className="size-3.5" />
            <span>Counter advantage active: <span className={cn('font-bold', counterAdvantage ? 'text-emerald-400' : 'text-amber-300/40')}>{counterAdvantage ? 'YES (+5%)' : 'NO'}</span></span>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr] xl:grid-cols-[380px_1fr]">
          {/* ─── Input Panel (sticky on desktop) ─── */}
          <aside className="lg:sticky lg:top-16 lg:self-start">
            <div className="space-y-4 rounded-sm border border-amber-900/50 bg-bdo-leather-dark p-4">
              {/* Section: Combat Stats */}
              <section>
                <h2 className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-300/80">
                  <Calculator className="size-3.5" />
                  Combat Stats
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    label="Total AP"
                    value={totalAp}
                    onChange={setTotalAp}
                    suffix="AP"
                    hint={
                      <span title="Includes Species AP" className="inline-flex cursor-help items-center">
                        <Info className="size-3 text-amber-400/70" />
                      </span>
                    }
                  />
                  <NumberField
                    label="Enemy DR"
                    value={enemyDr}
                    onChange={setEnemyDr}
                    suffix="DR"
                  />
                  <NumberField
                    label="DR Rate"
                    value={drRate}
                    onChange={setDrRate}
                    suffix="%"
                    hint={
                      <span title="Damage Reduction Rate from gear" className="inline-flex cursor-help items-center">
                        <Info className="size-3 text-amber-400/70" />
                      </span>
                    }
                  />
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-amber-300/40">
                  Total AP already includes Species AP. Hit Count is computed per-skill from damage phases.
                </p>
              </section>

              <div className="bdo-divider" />

              {/* Section: Damage Scalars */}
              <section>
                <h2 className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-300/80">
                  <Zap className="size-3.5" />
                  Damage Scalars
                  <span className="ml-auto rounded-sm bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                    {activeScalarCount}/4
                  </span>
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {SCALAR_CONFIGS.map((cfg) => {
                    const active = scalars[cfg.key]
                    return (
                      <button
                        key={cfg.key}
                        type="button"
                        onClick={() => setScalars((p) => ({ ...p, [cfg.key]: !p[cfg.key] }))}
                        title={cfg.description}
                        className={cn(
                          'flex items-center justify-between gap-1.5 rounded-sm border px-2.5 py-2 text-left text-xs font-semibold transition-all',
                          active ? 'bdo-chip-on' : 'bdo-chip',
                        )}
                        style={active ? { borderColor: `${cfg.color}aa`, color: cfg.color } : undefined}
                      >
                        <span className="flex flex-col leading-tight">
                          <span>{cfg.label}</span>
                          <span className="text-[10px] font-mono opacity-70">×{cfg.multiplier}</span>
                        </span>
                        <span
                          className="size-2.5 rounded-full border"
                          style={{
                            backgroundColor: active ? cfg.color : 'transparent',
                            borderColor: active ? cfg.color : 'rgba(156,126,46,0.4)',
                          }}
                        />
                      </button>
                    )
                  })}
                </div>
              </section>

              <div className="bdo-divider" />

              {/* Section: Class Groups */}
              <section className="space-y-3">
                <h2 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-300/80">
                  <Swords className="size-3.5" />
                  Class Groups
                </h2>
                <GroupSelector
                  label="Attacker"
                  value={attackerGroup}
                  onChange={setAttackerGroup}
                />
                <GroupSelector
                  label="Target"
                  value={targetGroup}
                  onChange={setTargetGroup}
                />
                <div
                  className={cn(
                    'rounded-sm border px-2.5 py-1.5 text-[11px] leading-relaxed transition-colors',
                    counterAdvantage
                      ? 'border-emerald-700/50 bg-emerald-900/15 text-emerald-300'
                      : 'border-amber-900/40 bg-bdo-ink/40 text-amber-300/50',
                  )}
                >
                  {counterAdvantage ? (
                    <>
                      <span className="font-bold">{attackerGroup}</span> counters{' '}
                      <span className="font-bold">{targetGroup}</span> → <span className="font-bold">×1.05</span>
                    </>
                  ) : (
                    <>
                      <span className="font-bold text-amber-300/70">{attackerGroup}</span> does not counter{' '}
                      <span className="font-bold text-amber-300/70">{targetGroup}</span> → <span className="font-bold">×1.00</span>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-amber-300/40">
                  Vanguard › Pulverizer › Skirmisher › Vanguard
                </p>
              </section>

              <div className="bdo-divider" />

              {/* Section: Super Armor DR */}
              <section>
                <h2 className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-300/80">
                  <Shield className="size-3.5" />
                  Super Armor DR
                </h2>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={saDrEnabled}
                    onChange={(e) => setSaDrEnabled(e.target.checked)}
                    className="size-3.5 accent-amber-500"
                  />
                  <span className="text-amber-200/80">Target is in Super Armor</span>
                </label>
                <div className={cn('mt-2 transition-opacity', saDrEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none')}>
                  <NumberField
                    label="SA Damage Reduction"
                    value={saDr}
                    onChange={setSaDr}
                    suffix="%"
                  />
                </div>

                {/* Advanced mode toggle */}
                <button
                  type="button"
                  onClick={() => setAdvanced((a) => !a)}
                  className={cn(
                    'mt-3 flex w-full items-center justify-between rounded-sm border px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors',
                    advanced
                      ? 'border-amber-500/60 bg-amber-500/10 text-amber-300'
                      : 'border-amber-900/40 bg-bdo-ink/40 text-amber-300/60 hover:text-amber-300',
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <Settings className="size-3" />
                    Advanced Mode
                  </span>
                  <span className="text-[10px] opacity-70">{advanced ? 'ON' : 'OFF'}</span>
                </button>

                <AnimatePresence>
                  {advanced && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 space-y-2 rounded-sm border border-amber-900/40 bg-bdo-ink/60 p-2.5">
                        <p className="text-[10px] leading-relaxed text-amber-300/50">
                          Auto-fill SA DR% from our DB data for the selected class &amp; spec.
                        </p>
                        <label className="block">
                          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-amber-300/60">
                            Target Class
                          </span>
                          <select
                            value={metaClassId ?? ''}
                            onChange={(e) => setMetaClassId(e.target.value ? Number(e.target.value) : null)}
                            className="bdo-input w-full px-2 py-1.5 text-xs"
                          >
                            <option value="">— select class —</option>
                            {(metaData?.classes ?? []).map((c) => (
                              <option key={c.classId} value={c.classId}>
                                {c.className}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div>
                          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-amber-300/60">
                            Spec
                          </span>
                          <div className="grid grid-cols-3 gap-1">
                            {(['awakening', 'succession', 'ascension'] as Spec[]).map((s) => {
                              const disabled = s === 'ascension' && !metaData?.classes.find((c) => c.classId === metaClassId)?.ascensionGroup
                              return (
                                <button
                                  key={s}
                                  type="button"
                                  disabled={disabled}
                                  onClick={() => setMetaSpec(s)}
                                  className={cn(
                                    'rounded-sm border px-1.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all',
                                    metaSpec === s ? 'bdo-chip-on' : 'bdo-chip',
                                    disabled && 'opacity-30',
                                  )}
                                >
                                  {s.slice(0, 4)}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                        {metaClassId != null && metaData && (() => {
                          const cls = metaData.classes.find((c) => c.classId === metaClassId)
                          if (!cls) return null
                          const v = metaSpec === 'awakening' ? cls.awakeningSaDr : metaSpec === 'succession' ? cls.successionSaDr : cls.ascensionSaDr
                          const grp = metaSpec === 'awakening' ? cls.awakeningGroup : metaSpec === 'succession' ? cls.successionGroup : cls.ascensionGroup
                          return (
                            <div className="rounded-sm bg-bdo-ink/60 px-2 py-1.5 text-[10px] text-amber-200/70">
                              <span className="font-bold text-amber-300">{cls.className}</span> · {metaSpec} · group{' '}
                              <span className="font-bold text-amber-300">{grp ?? '—'}</span> → SA DR{' '}
                              <span className="font-bold text-amber-300">{v}%</span>
                            </div>
                          )
                        })()}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            </div>
          </aside>

          {/* ─── Main column: Search + Results ─── */}
          <main className="space-y-4 min-w-0">
            {/* Search panel */}
            <section className="rounded-sm border border-amber-900/50 bg-bdo-leather-dark p-4">
              <h2 className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-300/80">
                <Search className="size-3.5" />
                Find Skills
              </h2>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-amber-400/50" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search skills by name (e.g. Flow, Pole, Pulse)..."
                  className="bdo-input w-full pl-9 pr-9 py-2 text-sm"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => setSearchInput('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-amber-400/60 hover:bg-amber-500/10 hover:text-amber-300"
                    aria-label="Clear search"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              <div className="mt-3 max-h-80 overflow-y-auto">
                {searchLoading && (
                  <div className="flex items-center justify-center gap-2 py-6 text-xs text-amber-300/60">
                    <div className="size-3 animate-spin rounded-full border-2 border-amber-500/30 border-t-amber-400" />
                    Searching...
                  </div>
                )}
                {!searchLoading && debouncedQuery && searchData && searchData.items.length === 0 && (
                  <div className="py-6 text-center text-xs text-amber-300/50">
                    No skills found for &quot;<span className="text-amber-300">{debouncedQuery}</span>&quot;
                  </div>
                )}
                {!debouncedQuery && (
                  <div className="py-6 text-center text-xs text-amber-300/40">
                    Start typing to search skills. Only max-rank, non-evasion skills are returned.
                  </div>
                )}
                {searchData?.items.map((s) => {
                  const already = isAdded(s.skillId)
                  const cColor = classColor(s.className)
                  return (
                    <button
                      key={s.skillId}
                      type="button"
                      onClick={() => addSkill(s)}
                      disabled={already}
                      className={cn(
                        'group flex w-full items-center gap-3 rounded-sm border border-transparent px-2 py-2 text-left transition-colors',
                        already
                          ? 'cursor-default opacity-50'
                          : 'hover:border-amber-700/40 hover:bg-amber-500/5',
                      )}
                    >
                      <SkillIcon skill={s} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-amber-100">{s.name}</span>
                          {s.className && (
                            <span
                              className="shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-bold"
                              style={{ backgroundColor: `${cColor}22`, color: cColor }}
                            >
                              {s.className}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-3 text-[10px] text-amber-300/60">
                          <span>
                            Skill: <span className="font-bold text-amber-200/80">{formatDamage(s.damage?.totalPvE ?? 0)}</span>
                          </span>
                          <span>
                            PvP: <span className="font-bold text-amber-200/80">{s.pvpDamagePercent != null ? `${s.pvpDamagePercent.toFixed(1)}%` : '—'}</span>
                          </span>
                        </div>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 rounded-sm border px-2 py-1 text-[10px] font-bold uppercase tracking-wider',
                          already ? 'border-amber-900/40 text-amber-300/40' : 'border-amber-500/40 bg-amber-500/10 text-amber-300 group-hover:bg-amber-500/20',
                        )}
                      >
                        {already ? 'Added' : <span className="flex items-center gap-1"><Plus className="size-3" />Add</span>}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>

            {/* Results table */}
            <section className="rounded-sm border border-amber-900/50 bg-bdo-leather-dark p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-300/80">
                  <Calculator className="size-3.5" />
                  Results
                  <span className="rounded-sm bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                    {selectedSkills.length}
                  </span>
                </h2>
                {selectedSkills.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedSkills([])}
                    className="text-[10px] font-bold uppercase tracking-wider text-amber-300/50 hover:text-rose-400"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {selectedSkills.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <Calculator className="size-8 text-amber-500/30" />
                  <p className="text-xs text-amber-300/50">No skills added yet. Search above and click a skill to add it.</p>
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden overflow-x-auto lg:block">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-amber-900/50">
                          <th className="px-2 py-2 text-left">
                            <SortButton label="Skill" active={sortKey === 'name'} dir={sortDir} onClick={() => toggleSort('name')} />
                          </th>
                          <th className="px-2 py-2 text-right">
                            <SortButton label="Skill Dmg" active={sortKey === 'skillDamage'} dir={sortDir} onClick={() => toggleSort('skillDamage')} align="right" />
                          </th>
                          <th className="px-2 py-2 text-right">
                            <SortButton label="PvP %" active={sortKey === 'pvpPercent'} dir={sortDir} onClick={() => toggleSort('pvpPercent')} align="right" />
                          </th>
                          <th className="px-2 py-2 text-right">
                            <SortButton label="Hits" active={sortKey === 'hits'} dir={sortDir} onClick={() => toggleSort('hits')} align="right" />
                          </th>
                          <th className="px-2 py-2 text-right">
                            <SortButton label="PvP Dmg" active={sortKey === 'finalDamage'} dir={sortDir} onClick={() => toggleSort('finalDamage')} align="right" />
                          </th>
                          {SCALAR_CONFIGS.map((cfg) => (
                            <th key={cfg.key} className="px-2 py-2 text-right text-[11px] font-bold uppercase tracking-wider" style={{ color: cfg.color }}>
                              {cfg.short}
                            </th>
                          ))}
                          <th className="px-2 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-amber-300/50">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map(({ skill, result }) => {
                          const isExpanded = expandedId === skill.skillId
                          const cColor = classColor(skill.className)
                          return (
                            <React.Fragment key={skill.skillId}>
                              <tr
                                className={cn(
                                  'border-b border-amber-900/30 transition-colors hover:bg-amber-500/5',
                                  isExpanded && 'bg-amber-500/5',
                                )}
                              >
                                <td className="px-2 py-2">
                                  <div className="flex items-center gap-2">
                                    <SkillIcon skill={skill} size={36} />
                                    <div className="min-w-0">
                                      <div className="truncate text-xs font-semibold text-amber-100">{skill.name}</div>
                                      {skill.className && (
                                        <div className="text-[10px] font-bold" style={{ color: cColor }}>
                                          {skill.className}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-2 py-2 text-right text-xs tabular-nums text-amber-200/80">
                                  {result ? formatDamage(result.skillDamagePercent) : '—'}
                                </td>
                                <td className="px-2 py-2 text-right text-xs tabular-nums text-amber-200/80">
                                  {result ? fmtPct(result.pvpPercent, 1) : '—'}
                                </td>
                                <td className="px-2 py-2 text-right text-xs tabular-nums text-amber-200/80">
                                  {result ? fmt(result.hitCount) : '—'}
                                </td>
                                <td className="px-2 py-2 text-right text-xs font-bold tabular-nums text-amber-300">
                                  {result ? fmt(result.finalDamage) : <span className="text-rose-400/70">N/A</span>}
                                </td>
                                {SCALAR_CONFIGS.map((cfg) => (
                                  <td
                                    key={cfg.key}
                                    className="px-2 py-2 text-right text-xs tabular-nums"
                                    style={{ color: scalars[cfg.key] ? cfg.color : 'rgba(217,199,154,0.4)' }}
                                  >
                                    {result ? fmt(result.perScalar[cfg.key]) : '—'}
                                  </td>
                                ))}
                                <td className="px-2 py-2">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => setExpandedId(isExpanded ? null : skill.skillId)}
                                      disabled={!result}
                                      className="rounded-sm border border-amber-900/40 p-1 text-amber-300/70 hover:border-amber-500/50 hover:text-amber-300 disabled:opacity-30"
                                      aria-label="Expand formula breakdown"
                                    >
                                      {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeSkill(skill.skillId)}
                                      className="rounded-sm border border-rose-900/40 p-1 text-rose-400/70 hover:border-rose-500/50 hover:text-rose-400"
                                      aria-label="Remove skill"
                                    >
                                      <X className="size-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              {isExpanded && result && (
                                <tr>
                                  <td colSpan={9} className="px-2 pb-3">
                                    <FormulaBreakdown result={result} scalars={scalars} attackerGroup={attackerGroup} targetGroup={targetGroup} />
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile card list */}
                  <div className="space-y-2 lg:hidden">
                    {sorted.map(({ skill, result }) => {
                      const cColor = classColor(skill.className)
                      const isExpanded = expandedId === skill.skillId
                      return (
                        <div key={skill.skillId} className="rounded-sm border border-amber-900/40 bg-bdo-ink/40 p-3">
                          <div className="flex items-start gap-3">
                            <SkillIcon skill={skill} size={40} />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold text-amber-100">{skill.name}</div>
                              {skill.className && (
                                <div className="text-[11px] font-bold" style={{ color: cColor }}>{skill.className}</div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeSkill(skill.skillId)}
                              className="rounded-sm border border-rose-900/40 p-1 text-rose-400/70 hover:border-rose-500/50 hover:text-rose-400"
                              aria-label="Remove skill"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>

                          {result ? (
                            <>
                              <div className="mt-2 grid grid-cols-4 gap-1.5 text-center">
                                <div className="bdo-stat-box">
                                  <div className="text-[9px] uppercase text-amber-300/50">Skill Dmg</div>
                                  <div className="text-xs font-bold text-amber-200">{formatDamage(result.skillDamagePercent)}</div>
                                </div>
                                <div className="bdo-stat-box">
                                  <div className="text-[9px] uppercase text-amber-300/50">PvP %</div>
                                  <div className="text-xs font-bold text-amber-200">{fmtPct(result.pvpPercent, 1)}</div>
                                </div>
                                <div className="bdo-stat-box">
                                  <div className="text-[9px] uppercase text-amber-300/50">Hits</div>
                                  <div className="text-xs font-bold text-amber-200">{fmt(result.hitCount)}</div>
                                </div>
                                <div className="bdo-stat-box" style={{ borderColor: 'rgba(240,208,96,0.5)' }}>
                                  <div className="text-[9px] uppercase text-amber-300/50">PvP Dmg</div>
                                  <div className="text-xs font-bold text-amber-300">{fmt(result.finalDamage)}</div>
                                </div>
                              </div>

                              <div className="mt-1.5 grid grid-cols-4 gap-1.5 text-center">
                                {SCALAR_CONFIGS.map((cfg) => (
                                  <div key={cfg.key} className="bdo-stat-box" style={{ borderColor: scalars[cfg.key] ? `${cfg.color}66` : undefined }}>
                                    <div className="text-[9px] uppercase" style={{ color: cfg.color }}>{cfg.short}</div>
                                    <div className="text-[10px] font-bold" style={{ color: cfg.color }}>{fmt(result.perScalar[cfg.key])}</div>
                                  </div>
                                ))}
                              </div>

                              <button
                                type="button"
                                onClick={() => setExpandedId(isExpanded ? null : skill.skillId)}
                                className="mt-2 flex w-full items-center justify-center gap-1 rounded-sm border border-amber-900/40 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300/70 hover:border-amber-500/50 hover:text-amber-300"
                              >
                                {isExpanded ? 'Hide' : 'Show'} Formula
                                {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                              </button>
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <FormulaBreakdown result={result} scalars={scalars} attackerGroup={attackerGroup} targetGroup={targetGroup} />
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </>
                          ) : (
                            <div className="mt-2 rounded-sm border border-rose-900/40 bg-rose-900/10 px-2 py-1.5 text-[11px] text-rose-300/80">
                              Cannot calculate — skill has no PvP damage data.
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </section>

            {/* Formula display */}
            <section className="rounded-sm border border-amber-900/50 bg-bdo-leather-dark p-4">
              <h2 className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-300/80">
                <Info className="size-3.5" />
                Formula
              </h2>
              <div className="overflow-x-auto rounded-sm bg-bdo-ink/60 px-3 py-2.5">
                <code className="whitespace-nowrap font-mono text-[11px] leading-relaxed text-amber-200/90 sm:text-xs">
                  PvP Damage = [(AP + Species AP − DR) × (1 − DR_Rate%)] × Crit × (PvP% × Skill% × Hits) × Group_Modifier × (1 − SA_DR%)
                </code>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-2">
                <Legend term="AP + Species AP" desc="Total AP (input already includes Species AP)" />
                <Legend term="DR" desc="Enemy Damage Reduction stat" />
                <Legend term="DR_Rate%" desc="Damage Reduction Rate from gear (0–100)" />
                <Legend term="Crit" desc="×2.25 (assumes 100% crit rate)" />
                <Legend term="PvP%" desc="Skill's PvP damage percent (e.g. 32%)" />
                <Legend term="Skill%" desc="Skill's total PvE damage percent (e.g. 1207%)" />
                <Legend term="Hits" desc="Σ (multiplier × maxHits) across phases" />
                <Legend term="Group_Modifier" desc="×1.05 if attacker counters target group" />
                <Legend term="SA_DR%" desc="Target's Super Armor damage reduction" />
                <Legend term="Back/Down/Air" desc="Positional scalars (×1.5/1.5/1.3) applied at end" />
              </div>
              <div className="mt-3 flex items-start gap-2 rounded-sm border border-emerald-700/30 bg-emerald-900/10 px-3 py-2">
                <Info className="mt-0.5 size-3.5 shrink-0 text-emerald-400" />
                <p className="text-[11px] leading-relaxed text-emerald-200/80">
                  <span className="font-semibold text-emerald-300">Validated formula.</span> Matches bdo-tools.net/@gpw and garmoth.com. Assumes 100% accuracy and 100% crit rate. The breakdown panel for each skill shows every intermediate value so you can verify the math.
                </p>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}

// ─── Formula breakdown (expanded row) ────────────────────────────────

function FormulaBreakdown({ result, scalars, attackerGroup, targetGroup }: {
  result: CalcResult
  scalars: Record<ScalarConfig['key'], boolean>
  attackerGroup: ClassGroup
  targetGroup: ClassGroup
}) {
  const r = result
  const rows: { label: string; calc: string; value: string }[] = [
    {
      label: '1. Base Damage',
      calc: `${fmt(r.totalAp)} (AP+Species) − ${fmt(r.enemyDr)} (DR)`,
      value: `${fmt(r.baseRaw)} → max(1, …) = ${fmt(r.baseDamage)}`,
    },
    {
      label: '2. After DR Rate',
      calc: `${fmt(r.baseDamage)} × (1 − ${fmt(r.drRate, 1)}%)`,
      value: fmt(r.afterDrRate, 4),
    },
    {
      label: '3. After Crit',
      calc: `${fmt(r.afterDrRate, 4)} × ${fmt(r.critMult, 2)} (${r.critMult === 2.25 ? 'crit ON' : 'crit OFF'})`,
      value: fmt(r.afterCrit, 4),
    },
    {
      label: '4. After Skill',
      calc: `${fmt(r.afterCrit, 4)} × (${fmt(r.pvpPercent, 1)}/100) × (${fmt(r.skillDamagePercent)}/100) × ${fmt(r.hitCount)} (hits)`,
      value: fmt(r.afterSkill, 4),
    },
    {
      label: '5. After Class Group',
      calc: `${fmt(r.afterSkill, 4)} × ${fmt(r.groupModifier, 2)} (${r.counterAdvantage ? `${attackerGroup} › ${targetGroup}` : 'no advantage'})`,
      value: fmt(r.afterGroup, 4),
    },
    {
      label: '6. After SA DR',
      calc: `${fmt(r.afterGroup, 4)} × (1 − ${fmt(r.saDrApplied)}%)`,
      value: fmt(r.afterSaDr, 4),
    },
    {
      label: '7. After Positional Scalars',
      calc: `${fmt(r.afterSaDr, 4)} × ${fmt(r.backMult, 2)} (back) × ${fmt(r.downMult, 2)} (down) × ${fmt(r.airMult, 2)} (air)`,
      value: fmt(r.finalDamage),
    },
  ]

  return (
    <div className="rounded-sm border border-amber-900/40 bg-bdo-ink/70 p-3">
      <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-amber-300/60">
        Calculation Breakdown
      </div>
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-1 gap-0.5 sm:grid-cols-[140px_1fr_auto] sm:items-baseline sm:gap-3">
            <div className="text-[11px] font-bold text-amber-200/80">{row.label}</div>
            <div className="font-mono text-[10px] text-amber-300/60 sm:text-[11px]">{row.calc}</div>
            <div className="font-mono text-[11px] font-bold text-amber-300 sm:text-right">{row.value}</div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-amber-900/40 pt-2 text-[10px]">
        <span className="font-bold uppercase tracking-wider text-amber-300/60">Active Scalars:</span>
        {SCALAR_CONFIGS.filter((c) => scalars[c.key]).length === 0 ? (
          <span className="text-amber-300/40">none</span>
        ) : (
          SCALAR_CONFIGS.filter((c) => scalars[c.key]).map((c) => (
            <span
              key={c.key}
              className="rounded-sm border px-1.5 py-0.5 font-bold"
              style={{ borderColor: `${c.color}66`, color: c.color }}
            >
              {c.short} ×{c.multiplier}
            </span>
          ))
        )}
        <span className="ml-auto font-mono text-xs font-bold text-amber-300">
          Final: {fmt(r.finalDamage)}
        </span>
      </div>
    </div>
  )
}

// ─── Legend row ──────────────────────────────────────────────────────

function Legend({ term, desc }: { term: string; desc: string }) {
  return (
    <div className="rounded-sm bg-bdo-ink/60 px-2 py-1.5">
      <span className="font-semibold text-amber-200">{term}</span>{' '}
      <span className="text-amber-300/60">= {desc}</span>
    </div>
  )
}
