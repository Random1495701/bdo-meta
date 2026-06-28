'use client'

import * as React from 'react'
import { SlidersHorizontal } from 'lucide-react'

import { Header } from '@/components/skills/header'
import { ClassBar } from '@/components/skills/class-bar'
import { FilterSidebar } from '@/components/skills/filter-sidebar'
import { SkillGrid } from '@/components/skills/skill-grid'
import { Pagination } from '@/components/skills/pagination'
import { SkillDetailDrawer } from '@/components/skills/skill-detail-drawer'
import { SyncFooter } from '@/components/skills/sync-footer'

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
        className="w-[88%] gap-0 border-r border-zinc-800 bg-zinc-950 p-0 sm:max-w-[360px]"
        aria-describedby={undefined}
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
      variant="outline"
      onClick={() => setFiltersOpen(true)}
      className="border-zinc-800 bg-zinc-900/60 text-zinc-200 hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-300 lg:hidden"
    >
      <SlidersHorizontal className="size-4" />
      Filters
    </Button>
  )
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <Header />
      <ClassBar />

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="sticky top-[152px] hidden h-[calc(100vh-152px)] w-[280px] shrink-0 border-r border-zinc-800/80 bg-zinc-950 lg:block">
          <FilterSidebar />
        </aside>

        {/* Main content */}
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-2 px-4 py-2 lg:px-6">
            <div className="text-xs uppercase tracking-wider text-zinc-500">
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
