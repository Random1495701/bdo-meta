'use client'

import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  RefreshCw,
  Database,
  FileText,
  Video,
  Film,
  Download,
  ListTree,
  Sparkles,
  ChevronDown,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { fetchSyncStatus, triggerSync } from '@/lib/skills'
import { cn } from '@/lib/utils'

function MiniProgress({
  label,
  value,
  total,
  color = 'amber',
}: {
  label: string
  value: number
  total: number
  color?: 'amber' | 'cyan' | 'emerald'
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  const barClass =
    color === 'amber'
      ? 'bg-amber-500'
      : color === 'cyan'
        ? 'bg-cyan-500'
        : 'bg-emerald-500'

  return (
    <div className="flex min-w-[140px] flex-1 flex-col gap-1">
      <div className="flex items-center justify-between text-[10px] text-zinc-400">
        <span className="uppercase tracking-wider">{label}</span>
        <span className="font-mono tabular-nums text-zinc-300">
          {value.toLocaleString()} / {total.toLocaleString()} ({pct}%)
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className={cn('h-full rounded-full transition-all', barClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function SyncFooter() {
  const queryClient = useQueryClient()
  const [syncing, setSyncing] = React.useState(false)
  const [lastTriggered, setLastTriggered] = React.useState<number | null>(null)

  const statusQuery = useQuery({
    queryKey: ['sync-status'],
    queryFn: fetchSyncStatus,
    refetchInterval: 5_000,
  })

  // Re-enable the sync button after 10s.
  React.useEffect(() => {
    if (lastTriggered == null) return
    const t = setTimeout(() => {
      setSyncing(false)
      setLastTriggered(null)
      void queryClient.invalidateQueries({ queryKey: ['sync-status'] })
      void queryClient.invalidateQueries({ queryKey: ['stats'] })
    }, 10_000)
    return () => clearTimeout(t)
  }, [lastTriggered, queryClient])

  const handleTrigger = async (
    phase: 'list' | 'trees' | 'tooltips' | 'videos' | 'all',
    limit?: number,
    label: string,
  ) => {
    if (syncing) return
    setSyncing(true)
    setLastTriggered(Date.now())
    const promise = triggerSync(phase, limit)
    toast.promise(promise, {
      loading: `Triggering ${label}…`,
      success: (res) =>
        `${label} started. ${res.message ?? ''} Phase: ${res.phase}`,
      error: (err) =>
        err instanceof Error ? err.message : 'Failed to trigger sync',
    })
    try {
      await promise
    } catch {
      // toast already shown
    }
  }

  const s = statusQuery.data
  const total = s?.total ?? 0
  const withDesc = s?.withDescription ?? 0
  const withVideo = s?.withVideo ?? 0
  const withAnim = s?.withAnimation ?? 0
  const pendingTooltips = s?.pendingTooltips ?? 0
  const pendingAnimations = s?.pendingAnimations ?? 0

  return (
    <footer className="mt-auto border-t border-zinc-800/80 bg-zinc-950/95 backdrop-blur">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 lg:px-6">
        {/* Left: stat totals */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-400">
          <span className="flex items-center gap-1.5">
            <Database className="size-3.5 text-amber-400" />
            <span className="font-mono font-semibold tabular-nums text-zinc-200">
              {total.toLocaleString()}
            </span>
            <span className="hidden sm:inline">total skills</span>
          </span>
          <span className="flex items-center gap-1.5">
            <FileText className="size-3.5 text-cyan-400" />
            <span className="font-mono font-semibold tabular-nums text-zinc-200">
              {withDesc.toLocaleString()}
            </span>
            <span className="hidden sm:inline">enriched</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Video className="size-3.5 text-pink-400" />
            <span className="font-mono font-semibold tabular-nums text-zinc-200">
              {withVideo.toLocaleString()}
            </span>
            <span className="hidden sm:inline">w/ video</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Film className="size-3.5 text-amber-400" />
            <span className="font-mono font-semibold tabular-nums text-zinc-200">
              {withAnim.toLocaleString()}
            </span>
            <span className="hidden sm:inline">w/ animation</span>
          </span>
        </div>

        {/* Middle: progress bars */}
        <div className="flex min-w-[300px] flex-1 flex-wrap items-center gap-4">
          <MiniProgress
            label="Tooltips"
            value={withDesc}
            total={total}
            color="cyan"
          />
          <MiniProgress
            label="Animations"
            value={withAnim}
            total={withVideo || 1}
            color="amber"
          />
        </div>

        {/* Right: sync trigger */}
        <div className="ml-auto flex items-center gap-2">
          {statusQuery.isFetching && (
            <RefreshCw className="size-3.5 animate-spin text-zinc-500" />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={syncing}
                className="border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200 disabled:opacity-50"
              >
                <Download className="size-3.5" />
                Sync
                <ChevronDown className="size-3 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-60 border-zinc-800 bg-zinc-900 text-zinc-100"
            >
              <DropdownMenuLabel className="text-zinc-400">
                Trigger sync phase
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem
                onClick={() => handleTrigger('list', undefined, 'Skill list sync')}
                className="focus:bg-amber-500/15 focus:text-amber-200"
              >
                <ListTree className="size-4 text-amber-400" />
                Sync skill list
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleTrigger('trees', undefined, 'Class tree sync')}
                className="focus:bg-amber-500/15 focus:text-amber-200"
              >
                <ListTree className="size-4 text-emerald-400" />
                Sync class trees
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  handleTrigger('tooltips', 500, 'Tooltips sync (next 500)')
                }
                className="focus:bg-amber-500/15 focus:text-amber-200"
              >
                <FileText className="size-4 text-cyan-400" />
                Sync tooltips (next 500)
                <span className="ml-auto text-[10px] text-zinc-500">
                  {pendingTooltips} pending
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  handleTrigger('videos', 500, 'Animation sync (next 500)')
                }
                className="focus:bg-amber-500/15 focus:text-amber-200"
              >
                <Film className="size-4 text-amber-400" />
                Sync animations (next 500)
                <span className="ml-auto text-[10px] text-zinc-500">
                  {pendingAnimations} pending
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem
                onClick={() => handleTrigger('all', undefined, 'Full sync')}
                className="focus:bg-amber-500/15 focus:text-amber-200"
              >
                <Sparkles className="size-4 text-violet-400" />
                Full sync
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Attribution */}
      <div className="border-t border-zinc-900 bg-zinc-950 px-4 py-1.5 text-[10px] text-zinc-600 lg:px-6">
        Data source:{' '}
        <a
          href="https://bdocodex.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-400 hover:text-amber-300"
        >
          bdocodex.com
        </a>{' '}
        · Animation durations extracted via{' '}
        <a
          href="https://ffmpeg.org/ffprobe.html"
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-400 hover:text-amber-300"
        >
          ffprobe
        </a>
      </div>
    </footer>
  )
}
