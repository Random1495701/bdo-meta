'use client'

import * as React from 'react'
import { Database, BarChart3, BookOpen, Crown, Newspaper, ChevronDown, GitBranch } from 'lucide-react'
import { cn } from '@/lib/utils'
import { APP_VERSION, GIT_TAGS } from '@/lib/version'

export type ViewMode = 'data' | 'meta' | 'tierlist' | 'patches' | 'docs'

export function TabSwitcher({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  const [switching, setSwitching] = React.useState(false)
  const [dropdownOpen, setDropdownOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  const tabs: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
    { id: 'data', label: 'Data', icon: <Database className="size-3.5" /> },
    { id: 'meta', label: 'Meta', icon: <BarChart3 className="size-3.5" /> },
    { id: 'tierlist', label: 'Tiers', icon: <Crown className="size-3.5" /> },
    { id: 'patches', label: 'Patches', icon: <Newspaper className="size-3.5" /> },
    { id: 'docs', label: 'Docs', icon: <BookOpen className="size-3.5" /> },
  ]

  // Close dropdown on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleVersionSwitch = async (target: string) => {
    setDropdownOpen(false)
    if (target === 'main') {
      if (!confirm('Switch to latest (main)? This will stash any uncommitted work and the dev server will restart.')) return
    } else {
      if (!confirm(`Switch to ${target}? The dev server will restart. Any uncommitted work will be stashed.`)) return
    }
    setSwitching(true)
    try {
      const res = await fetch('/api/version/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      })
      const data = await res.json()
      if (data.ok) {
        setTimeout(() => window.location.reload(), 3000)
      } else {
        alert(`Failed: ${data.error}`)
        setSwitching(false)
      }
    } catch (e) {
      alert(`Failed: ${e}`)
      setSwitching(false)
    }
  }

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

      {/* Version badge + custom dropdown */}
      <div ref={dropdownRef} className="relative ml-auto">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          disabled={switching}
          className="flex items-center gap-1.5 rounded-sm border border-amber-800/40 bg-bdo-leather-dark px-2.5 py-1.5 text-xs font-mono font-semibold text-amber-400/70 transition-all hover:border-amber-500/50 hover:text-amber-300"
        >
          <GitBranch className="size-3" />
          {switching ? 'Switching...' : APP_VERSION}
          <ChevronDown className={cn('size-3 transition-transform', dropdownOpen && 'rotate-180')} />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-1 z-50 max-h-96 min-w-[180px] overflow-y-auto rounded-sm border border-amber-800/60 bg-bdo-ink shadow-xl">
            <div className="border-b border-amber-900/30 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-300/50">
              Switch Version (Git Vault)
            </div>
            <button
              onClick={() => handleVersionSwitch('main')}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-amber-200 transition-colors hover:bg-amber-500/10 hover:text-amber-100"
            >
              <GitBranch className="size-3" /> main (latest)
            </button>
            <div className="border-t border-amber-900/30" />
            {GIT_TAGS.slice().reverse().map(tag => (
              <button
                key={tag}
                onClick={() => handleVersionSwitch(tag)}
                className={cn(
                  'flex w-full items-center px-3 py-1.5 text-left font-mono text-xs transition-colors hover:bg-amber-500/10',
                  tag === APP_VERSION
                    ? 'text-amber-300 bg-amber-500/10'
                    : 'text-amber-200/60 hover:text-amber-100',
                )}
              >
                {tag === APP_VERSION && '→ '}
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
