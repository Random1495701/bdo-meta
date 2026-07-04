'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { X, Swords, ExternalLink, ShieldHalf, Trophy, ArrowRight } from 'lucide-react'
import { classColor, classIconUrl, SPEC_COLORS } from '@/lib/skills'
import { formatDamage as fmtDmg } from '@/lib/damage'
import { cn } from '@/lib/utils'

interface SpecStats {
  skillCount: number
  avgPvpDamage: number
  medianPvpDamage: number
  pvpCcSkillCount: number
  grabCount: number
  superArmorCount: number
  forwardGuardCount: number
  iFrameCount: number
  coreSaCount: number
  coreFgCount: number
  topPvpDamageSkill: { skillId: number; name: string; damage: number } | null
  dpsEstimate: number
  avgDpcPvP: number
  protectedCoverage: number
}

interface ClassStats {
  classId: number
  className: string
  slug: string
  combatType: string | null
  successionGroup: string | null
  awakeningGroup: string | null
  ascensionGroup: string | null
  successionSaDr: number
  awakeningSaDr: number
  ascensionSaDr: number
  awakening: SpecStats
  succession: SpecStats
  ascension: SpecStats
}

const AWK_COLOR = '#ef4444'
const SUCC_COLOR = '#3b82f6'

const GROUP_COLORS: Record<string, string> = {
  Vanguard: '#ef4444',
  Pulverizer: '#f97316',
  Skirmisher: '#3b82f6',
}

const GROUP_ICONS: Record<string, string> = {
  Vanguard: '🛡',
  Pulverizer: '💥',
  Skirmisher: '⚔',
}

const COUNTER_CYCLE: Record<string, string> = {
  Vanguard: 'Pulverizer',
  Pulverizer: 'Skirmisher',
  Skirmisher: 'Vanguard',
}

// 12 comparison rows. Each row knows how to extract a numeric/string value
// from a SpecStats and which side wins (higher = better, unless `lowerBetter`).
type Comparator = (s: SpecStats) => number

interface ComparisonRow {
  label: string
  get: Comparator
  format: (v: number) => string
  lowerBetter?: boolean
  // For non-numeric (Top PvP Skill) rows — overrides get/format
  custom?: (s: SpecStats) => string
}

const COMPARISON_ROWS: ComparisonRow[] = [
  { label: 'Skill Count', get: (s) => s.skillCount, format: (v) => String(v) },
  { label: 'Avg PvP', get: (s) => s.avgPvpDamage, format: (v) => (v > 0 ? fmtDmg(v) : '—') },
  { label: 'Med PvP', get: (s) => s.medianPvpDamage, format: (v) => (v > 0 ? fmtDmg(v) : '—') },
  { label: 'PvP DPC', get: (s) => s.avgDpcPvP, format: (v) => String(v) },
  { label: 'DPS Est', get: (s) => s.dpsEstimate, format: (v) => (v > 0 ? fmtDmg(v) : '—') },
  { label: 'CC Skills', get: (s) => s.pvpCcSkillCount, format: (v) => String(v) },
  { label: 'Grabs', get: (s) => s.grabCount, format: (v) => String(v) },
  { label: 'SA', get: (s) => s.superArmorCount, format: (v) => String(v) },
  { label: 'FG', get: (s) => s.forwardGuardCount, format: (v) => String(v) },
  { label: 'IF', get: (s) => s.iFrameCount, format: (v) => String(v) },
  { label: 'Protected %', get: (s) => s.protectedCoverage, format: (v) => `${v}%` },
  // Top PvP Skill — shown as text; "win" goes to the higher damage
  {
    label: 'Top PvP Skill',
    get: (s) => s.topPvpDamageSkill?.damage ?? 0,
    format: (v) => (v > 0 ? fmtDmg(v) : '—'),
    custom: (s) => s.topPvpDamageSkill?.name ?? '—',
  },
]

function pickWinner(
  row: ComparisonRow,
  awk: SpecStats,
  succ: SpecStats,
): 'awk' | 'succ' | 'tie' {
  const a = row.get(awk)
  const b = row.get(succ)
  if (a === b) return 'tie'
  const awkBetter = row.lowerBetter ? a < b : a > b
  return awkBetter ? 'awk' : 'succ'
}

/**
 * SpecComparisonModal — side-by-side Awakening vs Succession comparison for
 * a class. Shows 12 stat rows, a verdict box, SA DR comparison, group
 * counter advantage, and "View Skills" buttons that navigate to the Data
 * tab via onCardClick(classId, spec).
 *
 * Uses framer-motion AnimatePresence for the open/close animation. BDO
 * theme classes throughout.
 */
export function SpecComparisonModal({
  cls,
  onClose,
  onCardClick,
}: {
  cls: ClassStats
  onClose: () => void
  onCardClick?: (classId: number, spec: 'awakening' | 'succession' | 'ascension') => void
}) {
  const awk = cls.awakening
  const succ = cls.succession
  const clsColor = classColor(cls.className)
  const iconUrl = classIconUrl(cls.slug)

  // Close on Escape
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Tally wins across the 12 rows
  const verdict = React.useMemo(() => {
    let awkWins = 0
    let succWins = 0
    for (const row of COMPARISON_ROWS) {
      const w = pickWinner(row, awk, succ)
      if (w === 'awk') awkWins++
      else if (w === 'succ') succWins++
    }
    return { awkWins, succWins }
  }, [awk, succ])

  const overallWinner: 'awk' | 'succ' | 'tie' =
    verdict.awkWins === verdict.succWins
      ? 'tie'
      : verdict.awkWins > verdict.succWins
        ? 'awk'
        : 'succ'

  // Group counter advantage — Awakening vs Succession group (one counters the other)
  const awkGroup = cls.awakeningGroup
  const succGroup = cls.successionGroup
  let groupAdvantage: 'awk' | 'succ' | 'neutral' = 'neutral'
  if (awkGroup && succGroup) {
    if (COUNTER_CYCLE[awkGroup] === succGroup) groupAdvantage = 'awk'
    else if (COUNTER_CYCLE[succGroup] === awkGroup) groupAdvantage = 'succ'
  }

  return (
    <motion.div
      key="scm-root"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        key="scm-panel"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-sm border-2 border-amber-700/60 bg-bdo-ink shadow-[0_0_30px_rgba(0,0,0,0.8)]"
        style={{ boxShadow: '0 0 0 1px rgba(240,208,96,0.25), 0 12px 40px rgba(0,0,0,0.8)' }}
      >
          {/* Header — class icon + name + close button */}
          <div className="flex items-center gap-3 border-b border-amber-900/40 bg-gradient-to-r from-bdo-leather-dark to-bdo-ink px-4 py-3">
            {iconUrl && (
              <div
                className="size-10 shrink-0 overflow-hidden rounded-sm border-2"
                style={{ borderColor: clsColor, boxShadow: `0 0 8px ${clsColor}44` }}
              >
                <img src={iconUrl} alt={cls.className} className="h-full w-full object-cover" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="bdo-title truncate text-lg font-bold text-amber-300">
                {cls.className}
              </h2>
              <p className="text-[10px] uppercase tracking-wider text-amber-200/40">
                Awakening vs Succession · {cls.combatType || 'Unknown combat type'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-sm border border-amber-800/50 bg-bdo-leather-dark text-amber-300/60 transition-all hover:border-amber-500/60 hover:text-amber-200"
              aria-label="Close comparison"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Body — scrollable */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {/* Column headers — Awakening (red) vs Succession (blue) */}
            <div className="mb-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div
                className="flex items-center justify-center gap-2 rounded-sm border-2 px-3 py-2"
                style={{ borderColor: `${AWK_COLOR}66`, backgroundColor: `${AWK_COLOR}11` }}
              >
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: AWK_COLOR }}>
                  Awakening
                </span>
                <span className="text-[9px] text-amber-200/40">{awk.skillCount} skills</span>
              </div>
              <Swords className="size-5 text-amber-400" />
              <div
                className="flex items-center justify-center gap-2 rounded-sm border-2 px-3 py-2"
                style={{ borderColor: `${SUCC_COLOR}66`, backgroundColor: `${SUCC_COLOR}11` }}
              >
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: SUCC_COLOR }}>
                  Succession
                </span>
                <span className="text-[9px] text-amber-200/40">{succ.skillCount} skills</span>
              </div>
            </div>

            {/* 12 stat comparison rows */}
            <div className="space-y-0.5">
              {COMPARISON_ROWS.map((row, idx) => {
                const winner = pickWinner(row, awk, succ)
                const awkVal = row.get(awk)
                const succVal = row.get(succ)
                const awkDisplay = row.custom ? row.custom(awk) : row.format(awkVal)
                const succDisplay = row.custom ? row.custom(succ) : row.format(succVal)
                return (
                  <div
                    key={row.label}
                    className={cn(
                      'grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-sm px-2 py-1.5 text-xs transition-colors',
                      idx % 2 === 0 ? 'bg-bdo-leather-dark/30' : 'bg-bdo-ink/30',
                    )}
                  >
                    {/* Awakening value (left) */}
                    <div
                      className={cn(
                        'flex items-center justify-end gap-1.5 text-right font-mono tabular-nums',
                        winner === 'awk' && 'font-bold',
                      )}
                      style={{ color: winner === 'awk' ? AWK_COLOR : '#e8d9b0' }}
                    >
                      <span className={cn('truncate', row.custom && 'font-sans')}>
                        {awkDisplay}
                      </span>
                      {winner === 'awk' && <Trophy className="size-3 shrink-0" style={{ color: AWK_COLOR }} />}
                    </div>
                    {/* Label (center) */}
                    <div className="px-2 text-center text-[10px] uppercase tracking-wider text-amber-300/50">
                      {row.label}
                    </div>
                    {/* Succession value (right) */}
                    <div
                      className={cn(
                        'flex items-center gap-1.5 font-mono tabular-nums',
                        winner === 'succ' && 'font-bold',
                      )}
                      style={{ color: winner === 'succ' ? SUCC_COLOR : '#e8d9b0' }}
                    >
                      {winner === 'succ' && <Trophy className="size-3 shrink-0" style={{ color: SUCC_COLOR }} />}
                      <span className={cn('truncate', row.custom && 'font-sans')}>
                        {succDisplay}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Verdict box */}
            <div
              className="mt-3 rounded-sm border-2 px-3 py-2.5"
              style={{
                borderColor:
                  overallWinner === 'awk'
                    ? `${AWK_COLOR}88`
                    : overallWinner === 'succ'
                      ? `${SUCC_COLOR}88`
                      : 'rgba(156,126,46,0.5)',
                backgroundColor:
                  overallWinner === 'awk'
                    ? `${AWK_COLOR}11`
                    : overallWinner === 'succ'
                      ? `${SUCC_COLOR}11`
                      : 'rgba(156,126,46,0.08)',
              }}
            >
              <div className="flex items-center gap-2">
                <Trophy
                  className="size-4"
                  style={{
                    color:
                      overallWinner === 'awk'
                        ? AWK_COLOR
                        : overallWinner === 'succ'
                          ? SUCC_COLOR
                          : '#c8aa44',
                  }}
                />
                <span className="text-xs font-bold uppercase tracking-wider text-amber-200/70">
                  Verdict
                </span>
                <span
                  className="ml-auto font-mono text-sm font-bold"
                  style={{
                    color:
                      overallWinner === 'awk'
                        ? AWK_COLOR
                        : overallWinner === 'succ'
                          ? SUCC_COLOR
                          : '#c8aa44',
                  }}
                >
                  {verdict.awkWins} – {verdict.succWins}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-amber-100/70">
                {overallWinner === 'tie'
                  ? `Tied at ${verdict.awkWins} categor${verdict.awkWins === 1 ? 'y' : 'ies'} each — choose based on playstyle.`
                  : `${overallWinner === 'awk' ? 'Awakening' : 'Succession'} wins ${overallWinner === 'awk' ? verdict.awkWins : verdict.succWins} of 12 categories (${overallWinner === 'awk' ? 'red' : 'blue'} column).`}
              </p>
            </div>

            {/* SA DR comparison */}
            <div className="mt-3 rounded-sm border border-amber-800/40 bg-bdo-leather-dark/40 p-3">
              <div className="mb-2 flex items-center gap-1.5">
                <ShieldHalf className="size-3.5 text-amber-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300/70">
                  Super Armor Damage Reduction
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div
                  className="rounded-sm border px-2 py-1.5 text-center"
                  style={{ borderColor: `${AWK_COLOR}55`, backgroundColor: `${AWK_COLOR}0d` }}
                >
                  <div className="text-[9px] uppercase tracking-wider" style={{ color: AWK_COLOR }}>
                    Awakening
                  </div>
                  <div className="font-mono text-lg font-bold" style={{ color: AWK_COLOR }}>
                    {cls.awakeningSaDr}%
                  </div>
                  <div className="text-[8px] text-amber-200/40">
                    {cls.awakeningSaDr > 10 ? 'Special (above 10% default)' : 'Default (10%)'}
                  </div>
                </div>
                <div
                  className="rounded-sm border px-2 py-1.5 text-center"
                  style={{ borderColor: `${SUCC_COLOR}55`, backgroundColor: `${SUCC_COLOR}0d` }}
                >
                  <div className="text-[9px] uppercase tracking-wider" style={{ color: SUCC_COLOR }}>
                    Succession
                  </div>
                  <div className="font-mono text-lg font-bold" style={{ color: SUCC_COLOR }}>
                    {cls.successionSaDr}%
                  </div>
                  <div className="text-[8px] text-amber-200/40">
                    {cls.successionSaDr > 10 ? 'Special (above 10% default)' : 'Default (10%)'}
                  </div>
                </div>
              </div>
              {cls.awakeningSaDr !== cls.successionSaDr && (
                <div className="mt-2 text-center text-[10px] text-amber-300/60">
                  <span
                    className="font-mono font-bold"
                    style={{ color: cls.awakeningSaDr > cls.successionSaDr ? AWK_COLOR : SUCC_COLOR }}
                  >
                    {cls.awakeningSaDr > cls.successionSaDr ? 'Awakening' : 'Succession'}
                  </span>{' '}
                  has{' '}
                  <span className="font-mono font-bold text-amber-200">
                    {Math.abs(cls.awakeningSaDr - cls.successionSaDr).toFixed(1)}%
                  </span>{' '}
                  more SA DR
                </div>
              )}
            </div>

            {/* Group counter advantage */}
            <div className="mt-3 rounded-sm border border-amber-800/40 bg-bdo-leather-dark/40 p-3">
              <div className="mb-2 flex items-center gap-1.5">
                <Swords className="size-3.5 text-amber-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300/70">
                  Group Counter Advantage
                </span>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div
                  className="flex items-center justify-center gap-1.5 rounded-sm border px-2 py-1.5"
                  style={{
                    borderColor: awkGroup ? `${GROUP_COLORS[awkGroup]}66` : 'rgba(156,126,46,0.4)',
                    backgroundColor: awkGroup ? `${GROUP_COLORS[awkGroup]}11` : 'transparent',
                  }}
                >
                  <span>{awkGroup ? GROUP_ICONS[awkGroup] : '—'}</span>
                  <span
                    className="text-[10px] font-bold"
                    style={{ color: awkGroup ? GROUP_COLORS[awkGroup] : '#9c8a5e' }}
                  >
                    {awkGroup || 'No group'}
                  </span>
                </div>
                <div className="text-center text-[9px] uppercase tracking-wider text-amber-300/40">
                  {groupAdvantage === 'neutral' ? (
                    <span>no counter</span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <ArrowRight
                        className="size-3"
                        style={{ color: groupAdvantage === 'awk' ? AWK_COLOR : SUCC_COLOR }}
                      />
                      +5%
                    </span>
                  )}
                </div>
                <div
                  className="flex items-center justify-center gap-1.5 rounded-sm border px-2 py-1.5"
                  style={{
                    borderColor: succGroup ? `${GROUP_COLORS[succGroup]}66` : 'rgba(156,126,46,0.4)',
                    backgroundColor: succGroup ? `${GROUP_COLORS[succGroup]}11` : 'transparent',
                  }}
                >
                  <span>{succGroup ? GROUP_ICONS[succGroup] : '—'}</span>
                  <span
                    className="text-[10px] font-bold"
                    style={{ color: succGroup ? GROUP_COLORS[succGroup] : '#9c8a5e' }}
                  >
                    {succGroup || 'No group'}
                  </span>
                </div>
              </div>
              {groupAdvantage !== 'neutral' && (
                <div className="mt-2 text-center text-[10px] text-amber-300/60">
                  <span
                    className="font-bold"
                    style={{ color: groupAdvantage === 'awk' ? AWK_COLOR : SUCC_COLOR }}
                  >
                    {groupAdvantage === 'awk' ? 'Awakening' : 'Succession'}
                  </span>{' '}
                  counters the other spec&apos;s group (+5% damage in PvP)
                </div>
              )}
            </div>

            {/* View Skills buttons */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => onCardClick?.(cls.classId, 'awakening')}
                className="flex items-center justify-center gap-1.5 rounded-sm border-2 px-3 py-2 text-xs font-bold transition-all hover:scale-[1.02]"
                style={{
                  borderColor: `${AWK_COLOR}88`,
                  backgroundColor: `${AWK_COLOR}1a`,
                  color: AWK_COLOR,
                }}
                title={`Open ${cls.className} Awakening in the Data tab`}
              >
                <ExternalLink className="size-3.5" />
                View Awakening Skills
              </button>
              <button
                onClick={() => onCardClick?.(cls.classId, 'succession')}
                className="flex items-center justify-center gap-1.5 rounded-sm border-2 px-3 py-2 text-xs font-bold transition-all hover:scale-[1.02]"
                style={{
                  borderColor: `${SUCC_COLOR}88`,
                  backgroundColor: `${SUCC_COLOR}1a`,
                  color: SUCC_COLOR,
                }}
                title={`Open ${cls.className} Succession in the Data tab`}
              >
                <ExternalLink className="size-3.5" />
                View Succession Skills
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
  )
}
