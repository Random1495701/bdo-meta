'use client'

import * as React from 'react'
import { SlidersHorizontal } from 'lucide-react'

import { Header } from '@/components/skills/header'
import { ClassBar } from '@/components/skills/class-bar'
import { FilterSidebar } from '@/components/skills/filter-sidebar'
import { SkillGrid } from '@/components/skills/skill-grid'
import { Pagination } from '@/components/skills/pagination'
import { SkillDetailDrawer } from '@/components/skills/skill-detail-drawer'
import { SkillCompareDrawer } from '@/components/skills/skill-compare-drawer'
import { SyncFooter } from '@/components/skills/sync-footer'
import { MetaPage } from '@/components/skills/meta-page'
import { DocsPage } from '@/components/skills/docs-page'
import { TierListPage } from '@/components/skills/tier-list-page'
import { PatchesPage } from '@/components/skills/patches-page'
import { MatchupsPage } from '@/components/skills/matchups-page'
import { DamageCalculatorPage } from '@/components/skills/damage-calculator-page'
import { TabSwitcher, type ViewMode } from '@/components/skills/tab-switcher'

import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useSkillStore } from '@/lib/skill-store'

function MobileFiltersSheet() {
  const open = useSkillStore((s) => s.filtersOpen)
  const setOpen = useSkillStore((s) => s.setFiltersOpen)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="left"
        className="w-[88%] gap-0 border-r-2 border-amber-800/60 bg-bdo-ink p-0 sm:max-w-[360px]"
        aria-describedby={undefined}
        style={{ boxShadow: 'inset 0 0 0 1px rgba(240,208,96,0.15)' }}
      >
        <SheetTitle className="sr-only">Filters</SheetTitle>
        <FilterSidebar />
      </SheetContent>
    </Sheet>
  )
}

function MobileFilterTrigger() {
  const setFiltersOpen = useSkillStore((s) => s.setFiltersOpen)
  return (
    <Button
      className="bdo-btn lg:hidden"
      onClick={() => setFiltersOpen(true)}
    >
      <SlidersHorizontal className="size-4" />
      Filters
    </Button>
  )
}

export default function Home() {
  const [view, setView] = React.useState<ViewMode>('data')

  // Handle Meta card click → switch to Data tab with class+spec pre-filtered
  const handleMetaCardClick = React.useCallback((classId: number, spec: 'awakening' | 'succession' | 'ascension') => {
    const store = useSkillStore.getState()
    store.clearClasses()
    store.toggleClass(classId)
    // Clear existing specs and set the clicked spec
    store.filters.specs?.forEach((s) => store.toggleSpec(s))
    store.toggleSpec(spec)
    setView('data')
  }, [])

  // Keyboard navigation: / = focus search, Esc = close drawer, 1/2/3 = switch tabs
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input/textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        if (e.key === 'Escape' && target.tagName === 'INPUT') {
          (target as HTMLInputElement).blur()
        }
        return
      }

      if (e.key === '/' && view === 'data') {
        e.preventDefault()
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
        searchInput?.focus()
      } else if (view === 'data' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter')) {
        // Arrow key navigation in skill grid
        e.preventDefault()
        const cards = Array.from(document.querySelectorAll('[data-skill-card]')) as HTMLElement[]
        if (cards.length === 0) return

        let currentIdx = cards.findIndex(c => c === document.activeElement || c.contains(document.activeElement))
        if (currentIdx === -1) currentIdx = -1

        let nextIdx = currentIdx
        if (e.key === 'ArrowRight') nextIdx = Math.min(currentIdx + 1, cards.length - 1)
        else if (e.key === 'ArrowLeft') nextIdx = Math.max(currentIdx - 1, 0)
        else if (e.key === 'ArrowDown') nextIdx = Math.min(currentIdx + 4, cards.length - 1)
        else if (e.key === 'ArrowUp') nextIdx = Math.max(currentIdx - 4, 0)
        else if (e.key === 'Enter') {
          if (currentIdx >= 0 && currentIdx < cards.length) cards[currentIdx].click()
          return
        }

        if (nextIdx >= 0 && nextIdx < cards.length) {
          cards[nextIdx].focus()
          cards[nextIdx].scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        }
      } else if (e.key === 'Escape') {
        const store = useSkillStore.getState()
        if (store.detailOpen) {
          store.setDetailOpen(false)
        } else if (store.filtersOpen) {
          store.setFiltersOpen(false)
        }
      } else if (e.key === '1') {
        setView('data')
      } else if (e.key === '2') {
        setView('meta')
      } else if (e.key === '3') {
        setView('matchups')
      } else if (e.key === '4') {
        setView('tierlist')
      } else if (e.key === '5') {
        setView('patches')
      } else if (e.key === '6') {
        setView('dmgcalc')
      } else if (e.key === '7') {
        setView('docs')
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [view])

  if (view === 'meta') {
    return (
      <div className="relative flex min-h-screen flex-col bg-bdo-ink text-amber-50">
        <TabSwitcher view={view} onChange={setView} />
        <MetaPage onCardClick={handleMetaCardClick} />
        <SyncFooter />
      </div>
    )
  }

  if (view === 'matchups') {
    return (
      <div className="relative flex min-h-screen flex-col bg-bdo-ink text-amber-50">
        <TabSwitcher view={view} onChange={setView} />
        <MatchupsPage />
        <SyncFooter />
      </div>
    )
  }

  if (view === 'docs') {
    return (
      <div className="relative flex min-h-screen flex-col bg-bdo-ink text-amber-50">
        <TabSwitcher view={view} onChange={setView} />
        <DocsPage />
        <SyncFooter />
      </div>
    )
  }

  if (view === 'tierlist') {
    return (
      <div className="relative flex min-h-screen flex-col bg-bdo-ink text-amber-50">
        <TabSwitcher view={view} onChange={setView} />
        <TierListPage />
        <SyncFooter />
      </div>
    )
  }

  if (view === 'patches') {
    return (
      <div className="relative flex min-h-screen flex-col bg-bdo-ink text-amber-50">
        <TabSwitcher view={view} onChange={setView} />
        <PatchesPage />
        <SyncFooter />
      </div>
    )
  }

  if (view === 'dmgcalc') {
    return (
      <div className="relative flex min-h-screen flex-col bg-bdo-ink text-amber-50">
        <TabSwitcher view={view} onChange={setView} />
        <DamageCalculatorPage />
        <SyncFooter />
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-bdo-ink text-amber-50">
      <TabSwitcher view={view} onChange={setView} />

      <Header />
      <ClassBar />

      <div className="relative flex flex-1">
        {/* Desktop sidebar */}
        <aside className="sticky top-[152px] hidden h-[calc(100vh-152px)] w-[280px] shrink-0 border-r border-amber-900/40 bg-bdo-ink lg:block">
          <FilterSidebar />
        </aside>

        {/* Main content */}
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-2 px-4 py-2 lg:px-6">
            <div className="bdo-heading text-xs uppercase tracking-widest text-amber-200/50">
              Skills
            </div>
            <MobileFilterTrigger />
          </div>
          <div className="flex-1 px-4 pb-4 lg:px-6">
            <SkillGrid />
          </div>
          <div className="px-4 lg:px-6">
            <Pagination />
          </div>
        </main>
      </div>

      <SyncFooter />

      {/* Overlays */}
      <MobileFiltersSheet />
      <SkillDetailDrawer />
      <SkillCompareDrawer />
    </div>
  )
}
