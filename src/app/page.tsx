'use client'

import * as React from 'react'
import { SlidersHorizontal, Database, BarChart3 } from 'lucide-react'

import { Header } from '@/components/skills/header'
import { ClassBar } from '@/components/skills/class-bar'
import { FilterSidebar } from '@/components/skills/filter-sidebar'
import { SkillGrid } from '@/components/skills/skill-grid'
import { Pagination } from '@/components/skills/pagination'
import { SkillDetailDrawer } from '@/components/skills/skill-detail-drawer'
import { SyncFooter } from '@/components/skills/sync-footer'
import { MetaPage } from '@/components/skills/meta-page'

import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useSkillStore } from '@/lib/skill-store'
import { cn } from '@/lib/utils'

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
  const [view, setView] = React.useState<'data' | 'meta'>('data')

  if (view === 'meta') {
    return (
      <div className="relative flex min-h-screen flex-col bg-bdo-ink text-amber-50">
        {/* Tab switcher */}
        <div className="sticky top-0 z-40 flex items-center gap-2 border-b border-amber-900/50 bg-bdo-ink/95 px-4 py-2 backdrop-blur lg:px-6">
          <button
            onClick={() => setView('data')}
            className={cn(
              'flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-xs font-semibold transition-all',
              'border-amber-900/40 bg-bdo-leather-dark text-amber-300/50 hover:text-amber-200',
            )}
          >
            <Database className="size-3.5" />
            Data
          </button>
          <button
            onClick={() => setView('meta')}
            className={cn(
              'flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-xs font-semibold transition-all',
              'border-amber-400/60 bg-amber-500/15 text-amber-200',
            )}
          >
            <BarChart3 className="size-3.5" />
            Meta
          </button>
        </div>

        <MetaPage />
        <SyncFooter />
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-bdo-ink text-amber-50">
      {/* Tab switcher */}
      <div className="sticky top-0 z-40 flex items-center gap-2 border-b border-amber-900/50 bg-bdo-ink/95 px-4 py-2 backdrop-blur lg:px-6">
        <button
          onClick={() => setView('data')}
          className={cn(
            'flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-xs font-semibold transition-all',
            'border-amber-400/60 bg-amber-500/15 text-amber-200',
          )}
        >
          <Database className="size-3.5" />
          Data
        </button>
        <button
          onClick={() => setView('meta')}
          className={cn(
            'flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-xs font-semibold transition-all',
            'border-amber-900/40 bg-bdo-leather-dark text-amber-300/50 hover:text-amber-200',
          )}
        >
          <BarChart3 className="size-3.5" />
          Meta
        </button>
      </div>

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
    </div>
  )
}
