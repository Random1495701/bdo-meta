'use client'

import * as React from 'react'
import { Database, BarChart3, BookOpen, Crown, Newspaper } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ViewMode = 'data' | 'meta' | 'tierlist' | 'patches' | 'docs'

export function TabSwitcher({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  const tabs: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
    { id: 'data', label: 'Data', icon: <Database className="size-3.5" /> },
    { id: 'meta', label: 'Meta', icon: <BarChart3 className="size-3.5" /> },
    { id: 'tierlist', label: 'Tiers', icon: <Crown className="size-3.5" /> },
    { id: 'patches', label: 'Patches', icon: <Newspaper className="size-3.5" /> },
    { id: 'docs', label: 'Docs', icon: <BookOpen className="size-3.5" /> },
  ]

  return (
    <div
      role="tablist"
      aria-label="Main navigation"
      className="sticky top-0 z-40 flex items-center gap-2 border-b border-amber-900/50 bg-bdo-ink/95 px-4 py-2 backdrop-blur lg:px-6"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={view === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-xs font-semibold transition-all',
            view === tab.id
              ? 'border-amber-400/60 bg-amber-500/15 text-amber-200'
              : 'border-amber-900/40 bg-bdo-leather-dark text-amber-300/50 hover:text-amber-200',
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  )
}
