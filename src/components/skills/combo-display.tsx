'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { ChevronRight, Zap, Swords, Target } from 'lucide-react'

import type { Combo, ComboSpec, ComboType } from '@/lib/combo-data'
import { SPEC_COLORS } from '@/lib/skills'
import { cn } from '@/lib/utils'

interface ComboDisplayProps {
  className: string
  spec: 'awakening' | 'succession' | 'ascension'
  /** When false, render a compact "combos pending" placeholder card. */
  combos: Combo[]
  /** Optional global search query — matching combos are highlighted, non-matches dimmed. */
  searchQuery?: string
  /** Optional hard filter on combo type. Defaults to 'all' (no filter). */
  typeFilter?: ComboTypeFilter
}

/** Filter values for the combo type chips. 'all' = no filter. */
export type ComboTypeFilter = 'all' | 'pvp' | 'pve' | 'both'

const TYPE_META: Record<ComboType, { label: string; icon: typeof Zap; color: string }> = {
  pvp: { label: 'PvP', icon: Swords, color: '#f472b6' },
  pve: { label: 'PvE', icon: Target, color: '#34d399' },
  both: { label: 'PvP / PvE', icon: Zap, color: '#fbbf24' },
}

const SPEC_LABEL: Record<ComboSpec, string> = {
  awakening: 'Awakening',
  succession: 'Succession',
  both: 'Both',
}

/**
 * Render a single skill step as a chip with a spec-colored monogram (using
 * the first letter of the skill name) + the skill name + optional note.
 *
 * We don't have skill IDs in the curated combo data (only names), so we use
 * a styled monogram instead of trying to look up an icon path — this keeps
 * the component self-contained and avoids an extra API call per render.
 */
function SkillStep({ step, specColor }: {
  step: { skillName: string; note?: string }
  specColor: string
}) {
  const monogram = step.skillName.replace(/^(Prime|Absolute|Flow|Core|Succession|Awakening)\s*:\s*/i, '').charAt(0).toUpperCase() || '?'
  return (
    <div
      className="flex items-center gap-1.5 rounded-sm border bg-bdo-ink/80 px-1.5 py-1"
      style={{ borderColor: `${specColor}55` }}
      title={step.note ? `${step.skillName} — ${step.note}` : step.skillName}
    >
      <span
        className="flex size-5 shrink-0 items-center justify-center rounded-sm text-[10px] font-bold"
        style={{
          backgroundColor: `${specColor}22`,
          color: specColor,
          border: `1px solid ${specColor}55`,
        }}
      >
        {monogram}
      </span>
      <span className="flex flex-col">
        <span className="text-[10px] font-semibold leading-tight text-amber-100">
          {step.skillName}
        </span>
        {step.note && (
          <span className="text-[8px] leading-tight text-amber-200/40">
            {step.note}
          </span>
        )}
      </span>
    </div>
  )
}

/**
 * Renders a horizontal flow: step1 → step2 → step3 (wraps on small screens).
 */
function ComboFlow({ combo, specColor }: { combo: Combo; specColor: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {combo.steps.map((step, i) => (
        <React.Fragment key={`${combo.name}-${i}`}>
          <SkillStep step={step} specColor={specColor} />
          {i < combo.steps.length - 1 && (
            <ChevronRight
              className="size-3 shrink-0 text-amber-300/50"
              aria-hidden
            />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

/**
 * Case-insensitive search match against a combo.
 * Matches on combo name, type label (pvp/pve/both), or any step's skill name.
 * Returns false when the query is empty (no search active).
 */
function comboMatchesSearch(combo: Combo, query: string): boolean {
  if (!query) return false
  if (combo.name.toLowerCase().includes(query)) return true
  if (combo.type.toLowerCase().includes(query)) return true
  return combo.steps.some(s => s.skillName.toLowerCase().includes(query))
}

/** Shared "no matches" notice shown when filtering yields zero visible combos. */
function NoMatchNotice() {
  return (
    <div className="rounded-sm border border-amber-900/30 bg-bdo-ink/50 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-200/40">
        Combos
      </div>
      <p className="mt-1 text-[10px] italic text-amber-200/50">
        No combos match your search
      </p>
    </div>
  )
}

export function ComboDisplay({
  className,
  spec,
  combos,
  searchQuery,
  typeFilter = 'all',
}: ComboDisplayProps) {
  const specColor = SPEC_COLORS[spec] ?? '#c9a25c'

  // Normalize search query
  const query = (searchQuery ?? '').trim().toLowerCase()
  const searchActive = query.length > 0
  const typeFilterActive = typeFilter !== 'all'
  const filteringActive = searchActive || typeFilterActive

  // Hard filter by type (PvP/PvE/Both chip) — non-matching combos are removed entirely.
  const visibleCombos = typeFilterActive
    ? combos.filter(c => c.type === typeFilter)
    : combos

  // No curated combos for this class+spec — show a graceful placeholder
  // that doesn't pretend to have data it doesn't have. This is independent
  // of the search/filter state (you can't filter what doesn't exist).
  if (combos.length === 0) {
    return (
      <div className="rounded-sm border border-amber-900/30 bg-bdo-ink/50 px-3 py-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-200/40">
          Combos
        </div>
        <p className="mt-1 text-[10px] text-amber-200/50">
          Community-sourced combos for {className} {SPEC_LABEL[spec]} are
          pending — see the class Discord for current sequences.
        </p>
      </div>
    )
  }

  // When filtering is active and nothing remains (either the type chip
  // removed everything, or the search query matched none of the survivors),
  // show the no-match notice instead of an empty list.
  if (filteringActive) {
    const hasSearchMatches = searchActive
      ? visibleCombos.some(c => comboMatchesSearch(c, query))
      : false
    if (visibleCombos.length === 0 || (searchActive && !hasSearchMatches)) {
      return <NoMatchNotice />
    }
  }

  // Pre-compute match count for the header (only when search is active).
  const matchCount = searchActive
    ? visibleCombos.filter(c => comboMatchesSearch(c, query)).length
    : 0

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-200/40">
          Combos
        </div>
        <div className="text-[9px] text-amber-200/30">
          {searchActive ? (
            <span>
              <span className="font-semibold text-amber-300/70">{matchCount}</span>
              {' of '}
              {visibleCombos.length} match{matchCount === 1 ? '' : 'es'}
            </span>
          ) : (
            <span>
              {visibleCombos.length} sequence{visibleCombos.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        {visibleCombos.map((combo, i) => {
          const TypeIcon = TYPE_META[combo.type].icon
          const isMatch = searchActive && comboMatchesSearch(combo, query)
          const isDimmed = searchActive && !isMatch
          return (
            <motion.div
              key={`${combo.name}-${i}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: isDimmed ? 0.4 : 1, y: 0 }}
              transition={{ duration: 0.18, delay: i * 0.04 }}
              className={cn(
                'rounded-sm border bg-bdo-ink/60 p-1.5 transition-all',
                isMatch
                  ? 'border-amber-400/70 ring-1 ring-amber-400/40'
                  : 'border-amber-900/30',
              )}
            >
              <div className="mb-1 flex items-center gap-1.5">
                <span
                  className="flex items-center gap-0.5 rounded-sm px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider"
                  style={{
                    color: TYPE_META[combo.type].color,
                    backgroundColor: `${TYPE_META[combo.type].color}1a`,
                    border: `1px solid ${TYPE_META[combo.type].color}33`,
                  }}
                >
                  <TypeIcon className="size-2.5" />
                  {TYPE_META[combo.type].label}
                </span>
                <span className="text-[10px] font-semibold text-amber-100">
                  {combo.name}
                </span>
                {combo.spec !== 'both' && (
                  <span
                    className="ml-auto text-[8px] font-bold uppercase tracking-wider"
                    style={{ color: SPEC_COLORS[combo.spec] }}
                  >
                    {SPEC_LABEL[combo.spec]}
                  </span>
                )}
              </div>
              <ComboFlow combo={combo} specColor={specColor} />
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Variant for use OUTSIDE the SpecCard — a self-contained section that loads
 * its own combos. Not currently used (the Meta page wires combos through the
 * SpecCard directly), but kept here for future use (e.g. a dedicated Combos tab).
 */
export function ComboSection({
  className,
  spec,
  combos,
}: ComboDisplayProps) {
  return (
    <section
      className={cn(
        'rounded-sm border-2 bg-bdo-ink/80 p-3',
      )}
      style={{ borderColor: `${SPEC_COLORS[spec]}44` }}
    >
      <ComboDisplay className={className} spec={spec} combos={combos} />
    </section>
  )
}
