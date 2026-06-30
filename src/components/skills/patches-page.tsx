'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Newspaper, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react'
import { classColor, classIconUrl } from '@/lib/skills'
import { cn } from '@/lib/utils'

interface ClassChange {
  className: string
  changes: string
}

interface PatchNote {
  date: string
  url: string
  classChanges: ClassChange[]
}

export function PatchesPage() {
  const [patches, setPatches] = React.useState<PatchNote[]>([])
  const [loading, setLoading] = React.useState(true)
  const [expandedPatch, setExpandedPatch] = React.useState<number | null>(0)
  const [expandedClass, setExpandedClass] = React.useState<string | null>(null)

  React.useEffect(() => {
    fetch('/api/patches')
      .then(res => res.json())
      .then(data => {
        setPatches(data.patches || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-bdo-ink text-zinc-100">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-amber-900/50 bg-bdo-ink/95 px-4 py-3 backdrop-blur lg:px-6">
        <div className="flex items-center gap-3">
          <Newspaper className="size-6 text-amber-400" />
          <div>
            <h1 className="bdo-title text-2xl font-bold text-amber-400">Patch Notes</h1>
            <p className="text-xs text-amber-200/50">Class & skill changes from recent BDO updates</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6 lg:px-6">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-sm border-2 border-amber-900/30 bg-bdo-leather-dark" />
            ))}
          </div>
        ) : patches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-amber-300/40">
            <Newspaper className="mb-4 size-12 opacity-30" />
            <p>No patch notes loaded yet.</p>
            <p className="text-xs">Run the patch scraper to fetch latest notes.</p>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-4">
            {patches.map((patch, patchIdx) => (
              <motion.div
                key={patchIdx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: patchIdx * 0.1 }}
                className="overflow-hidden rounded-sm border-2 border-amber-800/40"
              >
                {/* Patch header */}
                <button
                  onClick={() => setExpandedPatch(expandedPatch === patchIdx ? null : patchIdx)}
                  className="flex w-full items-center justify-between gap-3 border-b border-amber-900/30 bg-bdo-leather-dark/50 px-4 py-3 transition-colors hover:bg-bdo-leather-dark"
                >
                  <div className="flex items-center gap-3">
                    {expandedPatch === patchIdx ? (
                      <ChevronDown className="size-4 text-amber-400" />
                    ) : (
                      <ChevronRight className="size-4 text-amber-400" />
                    )}
                    <div>
                      <span className="bdo-title text-lg font-bold text-amber-200">{patch.date}</span>
                      <span className="ml-3 text-xs text-amber-300/40">
                        {patch.classChanges.length} class changes
                      </span>
                    </div>
                  </div>
                  <a
                    href={patch.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 rounded-sm border border-amber-800/40 px-2 py-1 text-[10px] text-amber-300/50 transition-all hover:border-amber-500/50 hover:text-amber-200"
                  >
                    <ExternalLink className="size-3" />
                    Source
                  </a>
                </button>

                {/* Class changes */}
                {expandedPatch === patchIdx && (
                  <div className="divide-y divide-amber-900/20">
                    {patch.classChanges.map((cc, ccIdx) => {
                      const color = classColor(cc.className)
                      const iconUrl = classIconUrl(cc.className.toLowerCase().replace(/[^a-z]/g, ''))
                      const key = `${patchIdx}-${ccIdx}`
                      const isExpanded = expandedClass === key

                      return (
                        <div key={ccIdx} className="bg-bdo-ink/30">
                          {/* Class header */}
                          <button
                            onClick={() => setExpandedClass(isExpanded ? null : key)}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-amber-500/5"
                          >
                            {iconUrl && (
                              <div
                                className="size-8 shrink-0 overflow-hidden rounded-sm border"
                                style={{ borderColor: `${color}55` }}
                              >
                                <img src={iconUrl} alt={cc.className} className="h-full w-full object-cover" loading="lazy" />
                              </div>
                            )}
                            <span className="text-sm font-bold" style={{ color }}>
                              {cc.className}
                            </span>
                            <span className="ml-auto truncate text-[10px] text-amber-300/30">
                              {cc.changes.slice(0, 80).replace(/\n/g, ' ')}...
                            </span>
                            {isExpanded ? (
                              <ChevronDown className="size-3 shrink-0 text-amber-400/60" />
                            ) : (
                              <ChevronRight className="size-3 shrink-0 text-amber-400/60" />
                            )}
                          </button>

                          {/* Changes text */}
                          {isExpanded && (
                            <div className="px-4 pb-4">
                              <div
                                className="whitespace-pre-wrap rounded-sm border border-amber-900/20 bg-bdo-leather-dark/30 p-4 text-sm leading-relaxed text-amber-100/70"
                                style={{ borderLeft: `3px solid ${color}55` }}
                              >
                                {cc.changes.split('\n').map((line, i) => {
                                  // Highlight skill names (lines with specific patterns)
                                  const isSkillName = /^[A-Z]/.test(line) && line.length < 100 && !line.endsWith('.')
                                  const isHeading = /^(Main Weapon|Awakening|Succession|Ascension|Absolute|Prime|Flow|Core)/.test(line)
                                  const isTableHeader = /Before.*After/.test(line)

                                  if (isTableHeader) {
                                    return (
                                      <div key={i} className="my-1 flex gap-4 border-b border-amber-800/30 pb-1 text-[10px] uppercase tracking-wider text-amber-300/40">
                                        <span className="flex-1">{line}</span>
                                      </div>
                                    )
                                  }
                                  if (isHeading) {
                                    return (
                                      <div key={i} className="mt-2 text-xs font-bold uppercase tracking-wider" style={{ color }}>
                                        {line}
                                      </div>
                                    )
                                  }
                                  if (isSkillName) {
                                    return (
                                      <div key={i} className="mt-2 font-semibold text-amber-200">
                                        {line}
                                      </div>
                                    )
                                  }
                                  return (
                                    <div key={i} className="text-amber-100/60">
                                      {line || '\u00A0'}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
