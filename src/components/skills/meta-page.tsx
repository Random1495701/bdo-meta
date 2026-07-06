'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, ArrowUpDown, Table2, LayoutGrid, Database, X, ChevronDown, ExternalLink, Swords, Search } from 'lucide-react'

import { classColor, classIconUrl, SPEC_COLORS } from '@/lib/skills'
import { formatDamage as fmtDmg } from '@/lib/damage'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { SpecComparisonModal } from '@/components/skills/spec-comparison-modal'
import { ComboDisplay, type ComboTypeFilter } from '@/components/skills/combo-display'
import { getCombosForClass } from '@/lib/combo-data'

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
  protectedSkillCount: number
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

type SortKey = 'className' | 'avgPvpDamage' | 'medianPvpDamage' | 'pvpCcSkillCount' | 'superArmorCount' | 'forwardGuardCount' | 'iFrameCount' | 'dpsEstimate' | 'avgDpcPvP' | 'protectedCoverage' | 'grabCount'

// Spec display metadata — Red=Awakening, Blue=Succession, Yellow=Ascension
const SPEC_META: Record<string, { label: string; color: string; shortLabel: string }> = {
  awakening: { label: 'Awakening', color: SPEC_COLORS.awakening, shortLabel: 'AWK' },
  succession: { label: 'Succession', color: SPEC_COLORS.succession, shortLabel: 'SUCC' },
  ascension: { label: 'Ascension', color: SPEC_COLORS.ascension, shortLabel: 'ASC' },
}

async function fetchMeta(): Promise<{ classes: ClassStats[] }> {
  const res = await fetch('/api/meta', { cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed to fetch meta: ${res.status}`)
  return res.json()
}

// A single spec card — one per class×spec combination
// Portrait is the card background, with a dark gradient overlay for readability.
// Framed class icon in top-right corner with spec-colored border.
// Card is clickable → navigates to Data tab with class+spec pre-filtered.
function SpecCard({ cls, specName, stats, sortKey, onClick, onDataClick, isExpanded, onExpand, onCompare, comboSearch, comboFilter }: {
  cls: ClassStats
  specName: 'awakening' | 'succession' | 'ascension'
  stats: SpecStats
  sortKey: SortKey
  onClick: () => void
  onDataClick: () => void
  isExpanded: boolean
  onExpand: () => void
  onCompare?: () => void
  /** Global combo search query (forwarded to ComboDisplay). */
  comboSearch?: string
  /** Global combo type filter (forwarded to ComboDisplay). */
  comboFilter?: ComboTypeFilter
}) {
  const iconUrl = classIconUrl(cls.slug)
  const specPortraitUrl = `/icons/portraits/specs/${cls.slug}-${specName}.jpg`
  const mainPortraitUrl = `/icons/portraits/${cls.slug}.jpg`
  const bgPortraitUrl = specName === 'awakening' || specName === 'succession'
    ? specPortraitUrl
    : mainPortraitUrl
  const specMeta = SPEC_META[specName]
  const specColor = specMeta.color

  if (stats.skillCount === 0) return null

  // Class-average comparison data for the mini bar chart
  const allSpecs = [cls.awakening, cls.succession, cls.ascension].filter(s => s.skillCount > 0)
  const avgOf = (key: keyof SpecStats) => allSpecs.length > 0
    ? allSpecs.reduce((sum, s) => sum + (s[key] as number), 0) / allSpecs.length
    : 0
  const group = specName === 'awakening' ? cls.awakeningGroup
    : specName === 'succession' ? cls.successionGroup
    : cls.ascensionGroup
  const saDr = specName === 'awakening' ? cls.awakeningSaDr
    : specName === 'succession' ? cls.successionSaDr
    : cls.ascensionSaDr

  const barStats: { label: string; value: number; avg: number; color: string }[] = [
    { label: 'Avg PvP', value: stats.avgPvpDamage, avg: avgOf('avgPvpDamage'), color: '#f472b6' },
    { label: 'Med PvP', value: stats.medianPvpDamage, avg: avgOf('medianPvpDamage'), color: '#f9a8d4' },
    { label: 'DPS', value: stats.dpsEstimate, avg: avgOf('dpsEstimate'), color: '#34d399' },
    { label: 'CC', value: stats.pvpCcSkillCount, avg: avgOf('pvpCcSkillCount'), color: '#f87171' },
    { label: 'SA', value: stats.superArmorCount, avg: avgOf('superArmorCount'), color: '#fbbf24' },
    { label: 'FG', value: stats.forwardGuardCount, avg: avgOf('forwardGuardCount'), color: '#60a5fa' },
    { label: 'IF', value: stats.iFrameCount, avg: avgOf('iFrameCount'), color: '#a78bfa' },
    { label: 'PvP DPC', value: stats.avgDpcPvP, avg: avgOf('avgDpcPvP'), color: '#22d3ee' },
    { label: 'Grab', value: stats.grabCount, avg: avgOf('grabCount'), color: '#f97316' },
    { label: 'Prot %', value: stats.protectedCoverage, avg: avgOf('protectedCoverage'), color: '#22d3ee' },
  ]
  const maxValue = Math.max(...barStats.map(s => Math.max(s.value, s.avg)), 1)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onExpand}
      className={cn(
        'group relative flex cursor-pointer flex-col gap-2 overflow-hidden border-2 transition-all',
        isExpanded ? 'col-span-full lg:col-span-2 xl:col-span-3' : '',
      )}
      style={{
        borderColor: specColor,
        boxShadow: `0 0 0 1px ${specColor}33, 0 4px 12px rgba(0,0,0,0.6)`,
        minHeight: isExpanded ? 400 : 200,
        borderRadius: '4px',
      }}
    >
      {/* Background portrait */}
      <div className="absolute inset-0 z-0">
        <img
          src={bgPortraitUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          onError={(e) => {
            const img = e.target as HTMLImageElement
            if (img.src !== mainPortraitUrl) img.src = mainPortraitUrl
            else img.style.display = 'none'
          }}
        />
        {/* Dark gradient overlay for readability — stronger at bottom */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom,
              rgba(10,9,8,0.85) 0%,
              rgba(10,9,8,0.6) 30%,
              rgba(10,9,8,0.85) 70%,
              rgba(10,9,8,0.95) 100%)`,
          }}
        />
        {/* Spec color tint at top */}
        <div
          className="absolute inset-x-0 top-0 h-1"
          style={{ background: `linear-gradient(to bottom, ${specColor}66, transparent)` }}
        />
      </div>

      {/* Content layer */}
      <div className="relative z-10 flex flex-col gap-2 p-3">
        {/* Header: clickable button — toggles inline expand */}
        <button
          type="button"
          onClick={onExpand}
          aria-expanded={isExpanded}
          className="flex items-start justify-between gap-2 text-left"
          title={`${cls.className} ${specMeta.label} — click to ${isExpanded ? 'collapse' : 'expand'} details`}
        >
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1">
              <h3 className="bdo-title text-base font-bold leading-tight text-amber-50 drop-shadow-lg">
                {cls.className}
              </h3>
              <ChevronDown
                className={cn('size-3.5 text-amber-300/60 transition-transform', isExpanded && 'rotate-180')}
              />
            </div>
            <span
              className="w-fit rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider backdrop-blur-sm"
              style={{
                color: specColor,
                backgroundColor: `${specColor}22`,
                border: `1px solid ${specColor}66`,
              }}
            >
              {specMeta.label}
            </span>
          </div>

          {/* Framed class icon — spec-colored border */}
          {iconUrl && (
            <div className="flex items-center gap-1.5">
              {stats.grabCount > 0 && (
                <div
                  className="flex h-7 items-center gap-0.5 rounded-sm border px-1.5 text-[9px] font-bold"
                  style={{ borderColor: '#fb923c66', backgroundColor: '#fb923c11', color: '#fb923c' }}
                  title={`${stats.grabCount} grab skill${stats.grabCount > 1 ? 's' : ''}`}
                >
                  ✊ {stats.grabCount}
                </div>
              )}
              <div
                className="shrink-0 overflow-hidden rounded-sm border-2"
                style={{
                  width: 36,
                  height: 36,
                  borderColor: specColor,
                  boxShadow: `0 0 8px ${specColor}44, inset 0 0 0 1px ${specColor}33`,
                  background: 'rgba(10,9,8,0.8)',
                }}
              >
                <img src={iconUrl} alt={cls.className} className="h-full w-full object-cover" loading="lazy" />
              </div>
            </div>
          )}
        </button>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-1">
          <StatBox label="Avg PvP" value={stats.avgPvpDamage > 0 ? fmtDmg(stats.avgPvpDamage) : '—'} color="#f472b6" highlighted={sortKey === 'avgPvpDamage'} />
          <StatBox label="Med PvP" value={stats.medianPvpDamage > 0 ? fmtDmg(stats.medianPvpDamage) : '—'} color="#f472b6" highlighted={sortKey === 'medianPvpDamage'} />
          <StatBox label="CC*" value={String(stats.pvpCcSkillCount)} color="#f87171" highlighted={sortKey === 'pvpCcSkillCount'} />
          <StatBox label="💪 SA" value={`${stats.superArmorCount}${stats.coreSaCount > 0 ? ` (+${stats.coreSaCount}c)` : ''}`} color="#fbbf24" highlighted={sortKey === 'superArmorCount'} />
          <StatBox label="🛡 FG" value={`${stats.forwardGuardCount}${stats.coreFgCount > 0 ? ` (+${stats.coreFgCount}c)` : ''}`} color="#60a5fa" highlighted={sortKey === 'forwardGuardCount'} />
          <StatBox label="✦ IF" value={String(stats.iFrameCount)} color="#a78bfa" highlighted={sortKey === 'iFrameCount'} />
        </div>

        {/* Total protected skills + SA DR */}
        <div className="grid grid-cols-2 gap-1">
          <StatBox label="Protected" value={String(stats.protectedSkillCount + (stats.coreSaCount > 0 || stats.coreFgCount > 0 ? 1 : 0))} color="#60a5fa" />
          <StatBox label="SA DR" value={`${cls[specName === 'awakening' ? 'awakeningSaDr' : specName === 'succession' ? 'successionSaDr' : 'ascensionSaDr']}%`} color="#fbbf24" />
        </div>

        {/* Top PvP damage skill */}
        {stats.topPvpDamageSkill && (
          <div
            className="flex items-center gap-1.5 rounded-sm border px-2 py-1"
            style={{ borderColor: '#f472b644', backgroundColor: '#f472b60a' }}
            title={`Top PvP damage skill: ${stats.topPvpDamageSkill.name} (${fmtDmg(stats.topPvpDamageSkill.damage)} PvP damage)`}
          >
            <span className="text-[8px] font-semibold uppercase tracking-wider text-pink-300/60">Top Skill</span>
            <span className="truncate text-[10px] font-medium text-pink-200">
              {stats.topPvpDamageSkill.name}
            </span>
            <span className="ml-auto shrink-0 font-mono text-[10px] font-bold tabular-nums text-pink-300">
              {fmtDmg(stats.topPvpDamageSkill.damage)}
            </span>
          </div>
        )}

        {/* Skill count + Data button */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-amber-200/40">{stats.skillCount} skills</span>
          <div className="flex items-center gap-1">
            {onCompare && cls.awakening.skillCount > 0 && cls.succession.skillCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onCompare()
                }}
                className="flex items-center gap-1 rounded-sm border border-purple-700/50 bg-purple-900/15 px-2 py-0.5 text-[9px] font-semibold text-purple-300/80 transition-all hover:border-purple-500/60 hover:bg-purple-500/15 hover:text-purple-200"
                title={`Compare Awakening vs Succession for ${cls.className}`}
              >
                <Swords className="size-2.5" />
                AWK vs SUCC
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDataClick()
              }}
              className="flex items-center gap-1 rounded-sm border border-amber-700/40 bg-amber-900/10 px-2 py-0.5 text-[9px] font-semibold text-amber-300/70 transition-all hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-200"
            >
              <Database className="size-2.5" />
              Data
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onExpand()
              }}
              className="flex items-center gap-1 rounded-sm border border-amber-700/40 bg-amber-900/10 px-2 py-0.5 text-[9px] font-semibold text-amber-300/70 transition-all hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-200"
            >
              {isExpanded ? <X className="size-2.5" /> : <ChevronDown className="size-2.5" />}
              {isExpanded ? 'Close' : 'Expand'}
            </button>
          </div>
        </div>

        {/* Expanded view — detailed stats using full card space */}
        {isExpanded && (
          <div className="mt-2 grid grid-cols-1 gap-3 border-t border-amber-900/30 pt-3 sm:grid-cols-2">
            {/* Detailed stats */}
            <div className="grid grid-cols-2 gap-2">
              <DetailedStat label="Total Skills" value={String(stats.skillCount)} />
              <DetailedStat label="Protected Skills %" value={`${stats.protectedCoverage}%`} />
              <DetailedStat label="Avg PvP Damage" value={stats.avgPvpDamage > 0 ? fmtDmg(stats.avgPvpDamage) : '—'} />
              <DetailedStat label="Median PvP Damage" value={stats.medianPvpDamage > 0 ? fmtDmg(stats.medianPvpDamage) : '—'} />
              <DetailedStat label="PvP CC Skills" value={String(stats.pvpCcSkillCount)} />
              <DetailedStat label="Top PvP Skill" value={stats.topPvpDamageSkill?.name || '—'} />
              <DetailedStat label="Combat Type" value={cls.combatType || '—'} />
              <DetailedStat label="Class Group" value={
                specName === 'awakening' ? (cls.awakeningGroup || '—') :
                specName === 'succession' ? (cls.successionGroup || '—') :
                (cls.ascensionGroup || '—')
              } />
            </div>

            {/* Protection breakdown + SA DR */}
            <div className="flex flex-col gap-2">
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-amber-200/40">Protection Breakdown</div>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1 rounded-sm border border-amber-700/30 px-2 py-1">
                    <span className="text-amber-400">💪</span>
                    <span className="text-xs font-bold text-amber-300">{stats.superArmorCount}</span>
                    <span className="text-[9px] text-amber-200/40">Super Armor</span>
                  </div>
                  <div className="flex items-center gap-1 rounded-sm border border-blue-700/30 px-2 py-1">
                    <span className="text-blue-400">🛡</span>
                    <span className="text-xs font-bold text-blue-300">{stats.forwardGuardCount}</span>
                    <span className="text-[9px] text-amber-200/40">Forward Guard</span>
                  </div>
                  <div className="flex items-center gap-1 rounded-sm border border-purple-700/30 px-2 py-1">
                    <span className="text-purple-400">✦</span>
                    <span className="text-xs font-bold text-purple-300">{stats.iFrameCount}</span>
                    <span className="text-[9px] text-amber-200/40">I-Frame</span>
                  </div>
                </div>
              </div>

              {/* SA Damage Reduction */}
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-amber-200/40">Super Armor Damage Reduction</div>
                <div className="rounded-sm border border-amber-700/30 bg-amber-900/10 px-2 py-1.5">
                  <span className="font-mono text-lg font-bold text-amber-300">
                    {specName === 'awakening' ? cls.awakeningSaDr : specName === 'succession' ? cls.successionSaDr : cls.ascensionSaDr}%
                  </span>
                  <span className="ml-2 text-[10px] text-amber-200/40">
                    {(() => {
                      const dr = specName === 'awakening' ? cls.awakeningSaDr : specName === 'succession' ? cls.successionSaDr : cls.ascensionSaDr
                      return dr > 10 ? 'Special (above 10% default)' : 'Default (10%)'
                    })()}
                  </span>
                </div>
              </div>

              {/* Combos — curated community-known sequences from src/lib/combo-data.ts */}
              <ComboDisplay
                className={cls.className}
                spec={specName}
                combos={getCombosForClass(cls.className, specName)}
                searchQuery={comboSearch}
                typeFilter={comboFilter}
              />
            </div>
          </div>
        )}
      </div>

      {/* Expanded panel — extra details + comparison bar chart + View Skills button */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative z-10 overflow-hidden border-t-2"
            style={{ borderColor: `${specColor}55` }}
          >
            <div
              className="flex flex-col gap-3 p-4"
              style={{ backgroundColor: 'rgba(10,9,8,0.96)' }}
            >
              {/* Combat breakdown — CC chain, Grab, Core SA/FG */}
              <div>
                <div className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-amber-400/70">
                  Combat Breakdown
                </div>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  <ExpandedStatBox label="PvP DPC" value={String(stats.avgDpcPvP)} color="#22d3ee" />
                  <ExpandedStatBox label="Grab Count" value={String(stats.grabCount)} color="#f97316" />
                  <ExpandedStatBox label="Core SA" value={String(stats.coreSaCount)} color="#fbbf24" />
                  <ExpandedStatBox label="Core FG" value={String(stats.coreFgCount)} color="#60a5fa" />
                </div>
              </div>

              {/* Top PvP damage skill */}
              {stats.topPvpDamageSkill && (
                <div>
                  <div className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-amber-400/70">
                    Top PvP Damage Skill
                  </div>
                  <div
                    className="flex items-center gap-2 rounded-sm border px-3 py-2"
                    style={{ borderColor: '#f472b655', backgroundColor: '#f472b60f' }}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-pink-300/70">Skill</span>
                    <span className="flex-1 truncate text-sm font-medium text-pink-100">
                      {stats.topPvpDamageSkill.name}
                    </span>
                    <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-pink-300">
                      {fmtDmg(stats.topPvpDamageSkill.damage)}
                    </span>
                  </div>
                </div>
              )}

              {/* PA Wiki: combat type, group, SA DR */}
              <div>
                <div className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-amber-400/70">
                  PA Wiki Data
                </div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className="rounded-sm border border-amber-700/50 bg-amber-900/25 px-2 py-1 text-[10px] font-semibold text-amber-200"
                    title="Combat type"
                  >
                    Combat: <span className="font-bold text-amber-100">{cls.combatType || '—'}</span>
                  </span>
                  <span
                    className="rounded-sm border border-cyan-700/50 bg-cyan-900/25 px-2 py-1 text-[10px] font-semibold text-cyan-200"
                    title="Class group (rock-paper-scissors: Vanguard > Pulverizer > Skirmisher > Vanguard)"
                  >
                    Group: <span className="font-bold text-cyan-100">{group || '—'}</span>
                  </span>
                  <span
                    className="rounded-sm border border-emerald-700/50 bg-emerald-900/25 px-2 py-1 text-[10px] font-semibold text-emerald-200"
                    title="Super Armor damage reduction"
                  >
                    SA DR: <span className="font-bold text-emerald-100">{saDr > 0 ? `${saDr}%` : '—'}</span>
                  </span>
                </div>
              </div>

              {/* Mini bar chart — this spec vs class average */}
              <div>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-amber-400/70">
                    vs Class Average
                  </div>
                  <div className="flex items-center gap-3 text-[8px] text-amber-300/50">
                    <span className="flex items-center gap-1">
                      <span className="inline-block size-2 rounded-sm" style={{ backgroundColor: specColor }} />
                      This spec
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block size-2 rounded-sm bg-amber-300/30" />
                      Class avg
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3 lg:grid-cols-5">
                  {barStats.map(s => {
                    const valuePct = (s.value / maxValue) * 100
                    const avgPct = (s.avg / maxValue) * 100
                    const diff = s.avg > 0 ? ((s.value - s.avg) / s.avg) * 100 : (s.value > 0 ? 100 : 0)
                    const diffColor = diff > 5 ? '#34d399' : diff < -5 ? '#f87171' : '#a8a29e'
                    return (
                      <div key={s.label} className="flex flex-col gap-0.5">
                        <div className="flex items-baseline justify-between gap-1 text-[9px]">
                          <span className="truncate text-amber-200/70">{s.label}</span>
                          <span className="font-mono font-bold tabular-nums" style={{ color: s.color }}>
                            {fmtDmg(s.value)}
                          </span>
                        </div>
                        <div className="relative h-2 overflow-hidden rounded-sm bg-amber-900/20">
                          <div
                            className="absolute left-0 top-0 h-full rounded-sm transition-all"
                            style={{ width: `${Math.max(valuePct, 2)}%`, backgroundColor: s.color }}
                          />
                        </div>
                        <div className="relative h-1.5 overflow-hidden rounded-sm bg-amber-900/10">
                          <div
                            className="absolute left-0 top-0 h-full rounded-sm bg-amber-300/30"
                            style={{ width: `${Math.max(avgPct, 2)}%` }}
                          />
                        </div>
                        <div className="text-[8px] font-mono tabular-nums" style={{ color: diffColor }}>
                          {s.avg > 0 ? `${diff >= 0 ? '+' : ''}${diff.toFixed(0)}%` : 'no avg'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* View Skills button — calls onClick (navigate to Data tab) */}
              <button
                type="button"
                onClick={onClick}
                className="flex w-full items-center justify-center gap-1.5 rounded-sm border px-4 py-2 text-sm font-bold transition-all hover:scale-[1.01]"
                style={{
                  borderColor: `${specColor}88`,
                  backgroundColor: `${specColor}1a`,
                  color: specColor,
                }}
                title={`Open ${cls.className} ${specMeta.label} in the Data tab`}
              >
                <ExternalLink className="size-3.5" />
                View Skills in Data Tab
                <span aria-hidden>→</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function DetailedStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-amber-900/30 bg-bdo-ink/50 px-2 py-1.5">
      <div className="text-[8px] font-semibold uppercase tracking-wider text-amber-200/40">{label}</div>
      <div className="truncate font-mono text-sm font-bold text-amber-100">{value}</div>
    </div>
  )
}

function StatBox({ label, value, color, highlighted }: { label: string; value: string; color: string; highlighted?: boolean }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-0.5 rounded-sm border px-2 py-1',
        highlighted && 'ring-1 ring-amber-400/60',
      )}
      style={{ borderColor: `${color}44`, backgroundColor: `${color}0a` }}
      title={label}
    >
      <span className="text-[8px] font-semibold uppercase tracking-wider" style={{ color: `${color}99` }}>{label}</span>
      <span className="font-mono text-xs font-bold tabular-nums" style={{ color }}>{value}</span>
    </div>
  )
}

function MetaTable({ classes, sortKey, sortDir, onSort }: {
  classes: ClassStats[]
  sortKey: SortKey
  sortDir: 'asc' | 'desc'
  onSort: (key: SortKey) => void
}) {
  // Flatten into spec rows
  const rows: { cls: ClassStats; spec: 'awakening' | 'succession' | 'ascension'; stats: SpecStats }[] = []
  for (const cls of classes) {
    if (cls.awakening.skillCount > 0) rows.push({ cls, spec: 'awakening', stats: cls.awakening })
    if (cls.succession.skillCount > 0) rows.push({ cls, spec: 'succession', stats: cls.succession })
    if (cls.ascension.skillCount > 0) rows.push({ cls, spec: 'ascension', stats: cls.ascension })
  }

  // Sort rows
  rows.sort((a, b) => {
    if (sortKey === 'className') {
      const dir = sortDir === 'asc' ? 1 : -1
      const cmp = a.cls.className.localeCompare(b.cls.className)
      if (cmp !== 0) return cmp * dir
      return a.spec.localeCompare(b.spec) * dir
    }
    const dir = sortDir === 'asc' ? 1 : -1
    return ((a.stats[sortKey] as number) - (b.stats[sortKey] as number)) * dir
  })

  const sortOptions: { key: SortKey; label: string; hint?: string }[] = [
    { key: 'className', label: 'Class' },
    { key: 'avgPvpDamage', label: 'Avg PvP' },
    { key: 'medianPvpDamage', label: 'Med PvP' },
    { key: 'pvpCcSkillCount', label: 'CC*', hint: 'Black Spirit rage skills are not counted in CC stats' },
    { key: 'avgDpcPvP', label: 'PvP DPC' },
    { key: 'grabCount', label: 'Grab' },
    { key: 'superArmorCount', label: '💪 SA' },
    { key: 'forwardGuardCount', label: '🛡 FG' },
    { key: 'iFrameCount', label: '✦ IF' },
    { key: 'protectedCoverage', label: 'Prot %' },
  ]

  const renderSortHeader = (key: SortKey, label: string) => (
    <th
      key={key}
      onClick={() => onSort(key)}
      className={cn(
        'cursor-pointer px-2 py-1.5 text-right font-semibold transition-colors hover:bg-amber-500/10',
        sortKey === key && 'bg-amber-500/15 text-amber-200',
      )}
    >
      <span className="flex items-center justify-end gap-1">
        {label}
        {sortKey === key && <ArrowUpDown className="size-2.5" style={{ transform: sortDir === 'asc' ? 'rotate(180deg)' : 'none' }} />}
      </span>
    </th>
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b-2 border-amber-800/50 bg-bdo-leather-dark">
            <th onClick={() => onSort('className')} className={cn('cursor-pointer px-2 py-1.5 text-left font-semibold hover:bg-amber-500/10', sortKey === 'className' && 'bg-amber-500/15 text-amber-200')}>
              <span className="flex items-center gap-1">Class / Spec{sortKey === 'className' && <ArrowUpDown className="size-2.5" />}</span>
            </th>
            {sortOptions.slice(1).map((o) => renderSortHeader(o.key, o.label))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const color = classColor(row.cls.className)
            const specPortraitUrl = `/icons/portraits/specs/${row.cls.slug}-${row.spec}.jpg`
            const mainPortraitUrl = `/icons/portraits/${row.cls.slug}.jpg`
            const specMeta = SPEC_META[row.spec]
            const rowKey = `${row.cls.classId}-${row.spec}`
            return (
              <tr
                key={rowKey}
                className={cn(
                  'border-b border-amber-900/20 hover:bg-amber-500/5',
                )}
              >
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <div className="size-8 shrink-0 overflow-hidden rounded-sm border" style={{ borderColor: `${color}55` }}>
                      <img src={specPortraitUrl} alt="" className="h-full w-full object-cover" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).src = mainPortraitUrl }} />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold" style={{ color }}>{row.cls.className}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: specMeta.color }}>{specMeta.label}</span>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-1 text-right font-mono text-xs tabular-nums text-pink-300">{row.stats.avgPvpDamage > 0 ? fmtDmg(row.stats.avgPvpDamage) : '—'}</td>
                <td className="px-2 py-1 text-right font-mono text-xs tabular-nums text-pink-300">{row.stats.medianPvpDamage > 0 ? fmtDmg(row.stats.medianPvpDamage) : '—'}</td>
                <td className="px-2 py-1 text-right font-mono text-xs tabular-nums text-red-300">{row.stats.pvpCcSkillCount}</td>
                <td className="px-2 py-1 text-right font-mono text-xs tabular-nums text-cyan-300">{row.stats.avgDpcPvP}</td>
                <td className="px-2 py-1 text-right font-mono text-xs tabular-nums text-orange-300">{row.stats.grabCount}</td>
                <td className="px-2 py-1 text-right font-mono text-xs tabular-nums text-amber-300">{row.stats.superArmorCount}</td>
                <td className="px-2 py-1 text-right font-mono text-xs tabular-nums text-blue-300">{row.stats.forwardGuardCount}</td>
                <td className="px-2 py-1 text-right font-mono text-xs tabular-nums text-purple-300">{row.stats.iFrameCount}</td>
                <td className="px-2 py-1 text-right font-mono text-xs tabular-nums text-blue-300">{row.stats.protectedCoverage}%</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function MetaPage({ onCardClick }: { onCardClick?: (classId: number, spec: 'awakening' | 'succession' | 'ascension') => void }) {
  const [viewMode, setViewMode] = React.useState<'cards' | 'table'>('cards')
  const [sortKey, setSortKey] = React.useState<SortKey>('avgDpcPvP')
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc')
  const [expandedCard, setExpandedCard] = React.useState<string | null>(null)
  const [comparingClass, setComparingClass] = React.useState<ClassStats | null>(null)
  // Global combo search/filter — applies to every SpecCard's ComboDisplay.
  const [comboSearch, setComboSearch] = React.useState('')
  const [comboFilter, setComboFilter] = React.useState<ComboTypeFilter>('all')

  const metaQuery = useQuery({
    queryKey: ['meta'],
    queryFn: fetchMeta,
    staleTime: 60_000,
  })

  const classes = metaQuery.data?.classes ?? []

  // Flatten into spec cards for sorting
  const specCards = React.useMemo(() => {
    const cards: { cls: ClassStats; spec: 'awakening' | 'succession' | 'ascension'; stats: SpecStats }[] = []
    for (const cls of classes) {
      if (cls.awakening.skillCount > 0) cards.push({ cls, spec: 'awakening', stats: cls.awakening })
      if (cls.succession.skillCount > 0) cards.push({ cls, spec: 'succession', stats: cls.succession })
      if (cls.ascension.skillCount > 0) cards.push({ cls, spec: 'ascension', stats: cls.ascension })
    }
    cards.sort((a, b) => {
      if (sortKey === 'className') {
        const dir = sortDir === 'asc' ? 1 : -1
        const cmp = a.cls.className.localeCompare(b.cls.className)
        if (cmp !== 0) return cmp * dir
        return a.spec.localeCompare(b.spec) * dir
      }
      const dir = sortDir === 'asc' ? 1 : -1
      return ((b.stats[sortKey] as number) - (a.stats[sortKey] as number)) * dir
    })
    return cards
  }, [classes, sortKey, sortDir])

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      // className sorts ascending by default, all other stats descending
      setSortDir(key === 'className' ? 'asc' : 'desc')
    }
  }

  const sortOptions: { key: SortKey; label: string; icon: React.ReactNode; hint?: string }[] = [
    { key: 'className', label: 'Class', icon: null },
    { key: 'avgPvpDamage', label: 'Avg PvP', icon: null },
    { key: 'medianPvpDamage', label: 'Med PvP', icon: null },
    { key: 'pvpCcSkillCount', label: 'CC Skills', icon: <Zap className="size-3" /> },
    { key: 'avgDpcPvP', label: 'PvP DPC', icon: null },
    { key: 'grabCount', label: 'Grab', icon: null },
    { key: 'superArmorCount', label: 'SA', icon: <span>💪</span> },
    { key: 'forwardGuardCount', label: 'FG', icon: <span>🛡</span> },
    { key: 'iFrameCount', label: 'IF', icon: <span>✦</span> },
    { key: 'protectedCoverage', label: 'Prot %', icon: null },
  ]

  // Filter chips for the combo search bar. Colors mirror ComboDisplay's TYPE_META
  // so the active chip visually matches the combo type badge.
  const comboFilterOptions: { key: ComboTypeFilter; label: string; color: string | null }[] = [
    { key: 'all', label: 'All', color: null },
    { key: 'pvp', label: 'PvP', color: '#f472b6' },
    { key: 'pve', label: 'PvE', color: '#34d399' },
    { key: 'both', label: 'Both', color: '#fbbf24' },
  ]
  const comboFilterActive = comboSearch.trim().length > 0 || comboFilter !== 'all'

  return (
    <div className="flex min-h-screen flex-col bg-bdo-ink text-zinc-100">
      {/* Meta header */}
      <div className="sticky top-0 z-30 border-b border-amber-900/50 bg-bdo-ink/95 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 lg:px-6">
          <h1 className="bdo-title text-2xl font-bold text-amber-400">BDO Meta</h1>
          <span className="hidden text-xs text-amber-200/50 sm:inline">
            {specCards.length} spec cards · {classes.length} classes
          </span>

          {/* View toggle */}
          <div className="ml-auto flex items-center gap-2">
            <div className="flex rounded-sm border border-amber-800/50 overflow-hidden">
              <button
                onClick={() => setViewMode('cards')}
                className={cn('flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold transition-all', viewMode === 'cards' ? 'bg-amber-500/20 text-amber-200' : 'bg-bdo-leather-dark text-amber-300/50 hover:text-amber-200')}
              >
                <LayoutGrid className="size-3.5" /> Cards
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={cn('flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold transition-all', viewMode === 'table' ? 'bg-amber-500/20 text-amber-200' : 'bg-bdo-leather-dark text-amber-300/50 hover:text-amber-200')}
              >
                <Table2 className="size-3.5" /> Table
              </button>
            </div>
          </div>

          {/* Sort buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-amber-300/40">Sort:</span>
            {sortOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => handleSort(opt.key)}
                title={opt.hint || undefined}
                className={cn(
                  'flex items-center gap-1 rounded-sm border px-2 py-1 text-[11px] font-semibold transition-all',
                  sortKey === opt.key
                    ? 'border-amber-400/60 bg-amber-500/15 text-amber-200'
                    : 'border-amber-900/40 bg-bdo-leather-dark text-amber-300/50 hover:border-amber-600/40 hover:text-amber-200',
                )}
              >
                {opt.icon}
                {opt.label}
                {sortKey === opt.key && <ArrowUpDown className="size-2.5 opacity-60" style={{ transform: sortDir === 'asc' ? 'rotate(180deg)' : 'none' }} />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6 lg:px-6">
        {metaQuery.isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-sm border-2 border-amber-900/30 bg-bdo-leather-dark" />
            ))}
          </div>
        ) : metaQuery.isError ? (
          <div className="flex items-center justify-center py-20 text-amber-300/60">
            Failed to load meta data. Make sure the database is restored.
          </div>
        ) : viewMode === 'cards' ? (
          <>
            {/* Combo search + type filter — global; affects ComboDisplay inside each expanded SpecCard. */}
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-sm border border-amber-900/40 bg-bdo-leather-dark/40 p-2.5">
              <div className="flex items-center gap-2">
                <Search className="size-4 shrink-0 text-amber-300/60" aria-hidden />
                <Input
                  type="text"
                  value={comboSearch}
                  onChange={(e) => setComboSearch(e.target.value)}
                  placeholder="Search combos by name, skill, or type (pvp / pve / both)…"
                  aria-label="Search combos"
                  className="h-8 w-72 max-w-full border-amber-900/50 bg-bdo-ink/70 text-xs text-amber-100 placeholder:text-amber-200/30 focus-visible:border-amber-500/60 focus-visible:ring-amber-500/20"
                />
                {comboSearch && (
                  <button
                    type="button"
                    onClick={() => setComboSearch('')}
                    title="Clear search"
                    aria-label="Clear search"
                    className="flex size-6 shrink-0 items-center justify-center rounded-sm border border-amber-900/40 bg-bdo-ink/60 text-amber-300/60 transition-colors hover:text-amber-200"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-amber-300/40">Type:</span>
                {comboFilterOptions.map((opt) => {
                  const isActive = comboFilter === opt.key
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setComboFilter(opt.key)}
                      className={cn(
                        'rounded-sm border px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-all',
                        isActive
                          ? 'border-amber-400/60 bg-amber-500/15 text-amber-200'
                          : 'border-amber-900/40 bg-bdo-leather-dark text-amber-300/50 hover:border-amber-600/40 hover:text-amber-200',
                      )}
                      style={isActive && opt.color
                        ? { color: opt.color, borderColor: `${opt.color}66`, backgroundColor: `${opt.color}1a` }
                        : undefined}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>

              {comboFilterActive && (
                <button
                  type="button"
                  onClick={() => { setComboSearch(''); setComboFilter('all') }}
                  className="ml-auto text-[10px] uppercase tracking-wider text-amber-300/50 transition-colors hover:text-amber-200"
                  title="Reset combo search and filter"
                >
                  Reset
                </button>
              )}
              <span className="hidden text-[10px] text-amber-200/30 sm:inline">
                Applies to combos inside expanded class cards
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {specCards.map(({ cls, spec, stats }) => {
                const cardKey = `${cls.classId}-${spec}`
                return (
                  <SpecCard
                    key={cardKey}
                    cls={cls}
                    specName={spec}
                    stats={stats}
                    sortKey={sortKey}
                    onClick={() => onCardClick?.(cls.classId, spec)}
                    onDataClick={() => onCardClick?.(cls.classId, spec)}
                    isExpanded={expandedCard === cardKey}
                    onExpand={() => {
                      setExpandedCard(expandedCard === cardKey ? null : cardKey)
                    }}
                    onCompare={() => setComparingClass(cls)}
                    comboSearch={comboSearch}
                    comboFilter={comboFilter}
                  />
                )
              })}
            </div>
          </>
        ) : (
          <MetaTable
            classes={classes}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
          />
        )}
      </div>

      {/* Disclaimer */}
      <div className="border-t border-amber-900/30 bg-bdo-ink px-4 py-2 text-center text-[10px] text-amber-300/30">
        {specCards.length} spec cards · Each class×spec = separate card · Black Spirit rage skills excluded · PvE-only CC/protection excluded · Max-rank skills only
      </div>

      {/* Spec Comparison Modal — opens when comparingClass is set */}
      <AnimatePresence>
        {comparingClass && (
          <SpecComparisonModal
            cls={comparingClass}
            onClose={() => setComparingClass(null)}
            onCardClick={onCardClick}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function ExpandedStatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="flex flex-col gap-0.5 rounded-sm border px-2 py-1.5"
      style={{ borderColor: `${color}55`, backgroundColor: `${color}12` }}
      title={label}
    >
      <span className="text-[8px] font-semibold uppercase tracking-wider" style={{ color: `${color}cc` }}>{label}</span>
      <span className="font-mono text-base font-bold tabular-nums" style={{ color }}>{value}</span>
    </div>
  )
}

