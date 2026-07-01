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
  Ghost,
  Play,
  Languages,
  RotateCw,
  Upload,
  FileJson,
  HardDriveDownload,
  Info,
  Square,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

import { fetchSyncStatus, triggerSync, triggerLurker } from '@/lib/skills'
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
  color?: 'amber' | 'cyan' | 'gold'
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  const barClass =
    color === 'amber'
      ? 'bg-amber-500'
      : color === 'cyan'
        ? 'bg-cyan-500'
        : 'bg-amber-400'
  return (
    <div className="flex min-w-[140px] flex-1 flex-col gap-1">
      <div className="flex items-center justify-between text-[10px] text-amber-200/50">
        <span className="uppercase tracking-wider">{label}</span>
        <span className="font-mono tabular-nums text-amber-100/80">
          {value.toLocaleString()} / {total.toLocaleString()} ({pct}%)
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-bdo-leather-dark"
        style={{ boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.6)' }}
      >
        <div
          className={cn('h-full rounded-full transition-all', barClass)}
          style={{
            width: `${pct}%`,
            boxShadow: '0 0 6px rgba(240,208,96,0.4)',
          }}
        />
      </div>
    </div>
  )
}

export function SyncFooter() {
  const queryClient = useQueryClient()
  const [syncing, setSyncing] = React.useState(false)
  const [lastTriggered, setLastTriggered] = React.useState<number | null>(null)
  const [uploadOpen, setUploadOpen] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const statusQuery = useQuery({
    queryKey: ['sync-status'],
    queryFn: fetchSyncStatus,
    refetchInterval: 5_000,
  })

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
      success: (res) => `${label} started. ${res.message ?? ''}`,
      error: (err) => (err instanceof Error ? err.message : 'Failed to trigger sync'),
    })
    try { await promise } catch { /* */ }
  }

  const handleLurker = async (
    phase: 'daemon' | 'batch' | 'videos' | 'kr-names' | 're-enrich',
    limit?: number,
    label: string,
  ) => {
    if (syncing) return
    setSyncing(true)
    setLastTriggered(Date.now())
    const promise = triggerLurker(phase, limit)
    toast.promise(promise, {
      loading: `Starting lurker (${label})…`,
      success: (res) => `${label} lurker started (PID ${res.pid}). ${res.message ?? ''}`,
      error: (err) => (err instanceof Error ? err.message : 'Failed to start lurker'),
    })
    try { await promise } catch { /* */ }
  }

  const handleUpload = async (file: File) => {
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/upload/skills-json', { method: 'POST', body: formData })
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
      const result = await res.json()
      toast.success(
        `Uploaded ${file.name}: ${result.upserted} skills imported, ${result.skipped} skipped`,
      )
      void queryClient.invalidateQueries({ queryKey: ['sync-status'] })
      void queryClient.invalidateQueries({ queryKey: ['stats'] })
      setUploadOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleExport = (enrichedOnly: boolean) => {
    const url = `/api/export?format=snapshot${enrichedOnly ? '&enriched=true' : ''}`
    window.open(url, '_blank')
    toast.info(`Exporting ${enrichedOnly ? 'enriched skills only' : 'all skills'} as JSON…`)
  }

  const s = statusQuery.data
  const total = s?.total ?? 0
  const withDesc = s?.withDescription ?? 0
  const withVideo = s?.withVideo ?? 0
  const withAnim = s?.withAnimation ?? 0
  const pendingTooltips = s?.pendingTooltips ?? 0
  const pendingAnimations = s?.pendingAnimations ?? 0
  const lurker = s?.lurker
  const lurkerRunning = lurker?.running ?? false
  const lurkerState = lurker?.state

  return (
    <footer className="mt-auto border-t-2 border-amber-900/50 bg-bdo-ink/95 backdrop-blur"
      style={{ boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.5)' }}
    >
      {/* Ornate top accent */}
      <div className="h-px bg-gradient-to-r from-transparent via-amber-600/40 to-transparent" />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 lg:px-6">
        {/* Left: stat totals */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-amber-200/60">
          <span className="flex items-center gap-1.5">
            <Database className="size-3.5 text-amber-400" />
            <span className="font-mono font-semibold tabular-nums text-amber-100">
              {total.toLocaleString()}
            </span>
            <span className="hidden sm:inline">total</span>
          </span>
          <span className="flex items-center gap-1.5">
            <FileText className="size-3.5 text-cyan-400" />
            <span className="font-mono font-semibold tabular-nums text-amber-100">
              {withDesc.toLocaleString()}
            </span>
            <span className="hidden sm:inline">enriched</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Video className="size-3.5 text-pink-400" />
            <span className="font-mono font-semibold tabular-nums text-amber-100">
              {withVideo.toLocaleString()}
            </span>
            <span className="hidden sm:inline">w/ video</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Film className="size-3.5 text-amber-400" />
            <span className="font-mono font-semibold tabular-nums text-amber-100">
              {withAnim.toLocaleString()}
            </span>
            <span className="hidden sm:inline">w/ anim</span>
          </span>
        </div>

        {/* Middle: progress bars */}
        <div className="flex min-w-[300px] flex-1 flex-wrap items-center gap-4">
          <MiniProgress label="Tooltips" value={withDesc} total={total} color="cyan" />
          <MiniProgress label="Animations" value={withAnim} total={withVideo || 1} color="amber" />
        </div>

        {/* Lurker status indicator — gold pulse instead of emerald */}
        {lurkerRunning && lurkerState && (
          <div
            className="bdo-pulse flex items-center gap-2 rounded-sm border border-amber-500/60 bg-amber-500/10 px-2.5 py-1 text-[11px]"
          >
            <Ghost className="size-3.5 animate-pulse text-amber-300" />
            <span className="font-semibold text-amber-200">Lurker active</span>
            <span className="text-amber-500/60">·</span>
            <span className="font-mono text-amber-200/80">
              {lurkerState.processed} processed
            </span>
            <span className="text-amber-500/60">·</span>
            <span className="font-mono text-amber-200/80">
              {lurkerState.enriched} enriched
            </span>
            {lurkerState.challengesSolved && lurkerState.challengesSolved > 0 ? (
              <>
                <span className="text-amber-500/60">·</span>
                <span className="font-mono text-amber-200/80">
                  {lurkerState.challengesSolved} challenges solved
                </span>
              </>
            ) : null}
            {lurkerState.currentSkillId && (
              <>
                <span className="text-amber-500/60">·</span>
                <span className="font-mono text-amber-300">
                  skill {lurkerState.currentSkillId}
                </span>
                <span className="text-amber-500/50">
                  via {lurkerState.currentEndpoint}
                </span>
              </>
            )}
          </div>
        )}

        {/* Stop lurker button */}
        {lurkerRunning && (
          <button
            onClick={async () => {
              try {
                const res = await fetch('/api/sync/trigger', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ script: 'lurker', phase: 'stop' }),
                })
                const data = await res.json()
                toast.success(data.message || 'Lurker stop signal sent')
              } catch (err) {
                toast.error('Failed to stop lurker')
              }
            }}
            className="flex items-center gap-1 rounded-sm border border-red-700/60 bg-red-900/20 px-2 py-1 text-[10px] font-semibold text-red-300 transition-all hover:bg-red-800/30"
            title="Stop the lurker process (kills PID)"
          >
            <Square className="size-3" />
            Stop Lurker
          </button>
        )}

        {/* Right: sync triggers */}
        <div className="ml-auto flex items-center gap-2">
          {statusQuery.isFetching && (
            <RefreshCw className="size-3.5 animate-spin text-amber-500/60" />
          )}

          {/* Upload/Export dialog */}
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button
                className="bdo-btn"
                size="sm"
              >
                <Upload className="size-3.5" />
                <span className="hidden sm:inline">Data</span>
              </Button>
            </DialogTrigger>
            <DialogContent
              className="max-w-lg border-amber-800/60 bg-bdo-ink text-amber-100"
              style={{ boxShadow: 'inset 0 0 0 1px rgba(240,208,96,0.15)' }}
            >
              <DialogHeader>
                <DialogTitle className="bdo-title flex items-center gap-2">
                  <FileJson className="size-5 text-amber-400" />
                  Import / Export Skill Data
                </DialogTitle>
                <DialogDescription className="text-amber-200/50">
                  Upload a JSON dump to instantly enrich the database, or export what we have.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Upload section */}
                <div className="space-y-2">
                  <h4 className="bdo-heading text-sm">Import JSON</h4>
                  <p className="text-xs text-amber-200/50">
                    Upload a JSON file with a <code className="text-amber-300">skills</code> array.
                    Each skill needs at minimum a <code className="text-amber-300">skillId</code> and
                    optionally: name, description, className, cooldown, ccTypes, protectionTypes,
                    damageRows, animationDurationMs, videoUrl.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void handleUpload(file)
                      e.target.value = ''
                    }}
                  />
                  <Button
                    className="bdo-btn w-full"
                    size="sm"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? (
                      <RefreshCw className="size-4 animate-spin" />
                    ) : (
                      <Upload className="size-4" />
                    )}
                    {uploading ? 'Uploading…' : 'Choose JSON file'}
                  </Button>
                </div>

                {/* Export section */}
                <div className="space-y-2 border-t border-amber-900/40 pt-4">
                  <h4 className="bdo-heading text-sm">Export JSON</h4>
                  <p className="text-xs text-amber-200/50">
                    Download the current database as a JSON snapshot for backup or transfer.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      className="bdo-btn flex-1"
                      size="sm"
                      onClick={() => handleExport(true)}
                    >
                      <HardDriveDownload className="size-4" />
                      Enriched only ({withDesc.toLocaleString()})
                    </Button>
                    <Button
                      className="bdo-btn flex-1"
                      size="sm"
                      onClick={() => handleExport(false)}
                    >
                      <HardDriveDownload className="size-4" />
                      All ({total.toLocaleString()})
                    </Button>
                  </div>
                </div>

                {/* BDO game files info */}
                <div className="space-y-2 border-t border-amber-900/40 pt-4">
                  <h4 className="bdo-heading flex items-center gap-2 text-sm">
                    <Info className="size-4 text-amber-400" />
                    BDO Game Files (Advanced)
                  </h4>
                  <div className="space-y-1.5 text-xs text-amber-200/50">
                    <p>
                      If you have BDO installed, you can extract skill data directly from the game
                      files — no scraping needed:
                    </p>
                    <ol className="ml-4 list-decimal space-y-1">
                      <li>
                        Download{' '}
                        <a
                          href="https://github.com/AngeloCairo/BDO-UnPAZ"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bdo-link"
                        >
                          UnPAZ
                        </a>{' '}
                        and extract your BDO PAZ archives
                      </li>
                      <li>
                        Look for files matching:{' '}
                        <code className="text-amber-300">ui_data/skill/skill*.xml</code>
                      </li>
                      <li>
                        Convert the XML to JSON (or upload the raw XML — we&apos;ll parse it)
                      </li>
                    </ol>
                    <p className="pt-1 text-amber-200/40">
                      Supported upload formats: JSON array, bdocodex query.php format, or raw XML.
                    </p>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Lurker dropdown — gold-themed */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className={cn(
                  'bdo-btn',
                  lurkerRunning && 'border-amber-400/70 text-amber-200',
                )}
                size="sm"
                disabled={syncing}
              >
                <Ghost className={cn('size-3.5', lurkerRunning && 'animate-pulse')} />
                <span className="hidden sm:inline">Lurker</span>
                {lurkerRunning && (
                  <Badge
                    variant="secondary"
                    className="h-4 px-1 text-[9px] font-bold text-bdo-ink bg-amber-400"
                  >
                    ON
                  </Badge>
                )}
                <ChevronDown className="size-3 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-64 border-amber-800/60 bg-bdo-leather text-amber-100"
              style={{ boxShadow: 'inset 0 0 0 1px rgba(240,208,96,0.15)' }}
            >
              <DropdownMenuLabel className="flex items-center gap-2 text-amber-200/60">
                <Ghost className="size-3.5 text-amber-400" />
                Lurker v2 — challenge-solving sync
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-amber-900/40" />
              <DropdownMenuItem
                onClick={() => handleLurker('daemon', undefined, 'Daemon')}
                className="focus:bg-amber-500/15 focus:text-amber-200"
              >
                <Play className="size-4 text-amber-400" />
                Start daemon (run until done)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleLurker('batch', 100, 'Batch (100)')}
                className="focus:bg-amber-500/15 focus:text-amber-200"
              >
                <Ghost className="size-4 text-amber-400" />
                Batch — next 100 skills
                <span className="ml-auto text-[10px] text-amber-200/40">
                  {pendingTooltips} pending
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleLurker('videos', undefined, 'Animations')}
                className="focus:bg-amber-500/15 focus:text-amber-200"
              >
                <Film className="size-4 text-amber-400" />
                Extract animation durations
                <span className="ml-auto text-[10px] text-amber-200/40">
                  {pendingAnimations} pending
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleLurker('kr-names', undefined, 'KR names')}
                className="focus:bg-amber-500/15 focus:text-amber-200"
              >
                <Languages className="size-4 text-cyan-400" />
                Enrich Korean names
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-amber-900/40" />
              <DropdownMenuItem
                onClick={() => handleLurker('re-enrich', undefined, 'Re-enrich all')}
                className="focus:bg-amber-500/15 focus:text-amber-200"
              >
                <RotateCw className="size-4 text-amber-400" />
                Re-enrich all (refresh after patch)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Fast sync dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="bdo-btn"
                size="sm"
                disabled={syncing}
              >
                <Download className="size-3.5" />
                <span className="hidden sm:inline">Fast Sync</span>
                <ChevronDown className="size-3 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-60 border-amber-800/60 bg-bdo-leather text-amber-100"
              style={{ boxShadow: 'inset 0 0 0 1px rgba(240,208,96,0.15)' }}
            >
              <DropdownMenuLabel className="text-amber-200/60">
                Fast sync (may trigger bot challenge)
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-amber-900/40" />
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
                onClick={() => handleTrigger('tooltips', 500, 'Tooltips sync (next 500)')}
                className="focus:bg-amber-500/15 focus:text-amber-200"
              >
                <FileText className="size-4 text-cyan-400" />
                Sync tooltips (next 500)
                <span className="ml-auto text-[10px] text-amber-200/40">
                  {pendingTooltips} pending
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleTrigger('videos', 500, 'Animation sync (next 500)')}
                className="focus:bg-amber-500/15 focus:text-amber-200"
              >
                <Film className="size-4 text-amber-400" />
                Sync animations (next 500)
                <span className="ml-auto text-[10px] text-amber-200/40">
                  {pendingAnimations} pending
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-amber-900/40" />
              <DropdownMenuItem
                onClick={() => handleTrigger('all', undefined, 'Full sync')}
                className="focus:bg-amber-500/15 focus:text-amber-200"
              >
                <Sparkles className="size-4 text-amber-400" />
                Full sync
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Attribution */}
      <div className="border-t border-amber-900/40 bg-bdo-ink px-4 py-1.5 text-[10px] text-amber-200/40 lg:px-6">
        Data source:{' '}
        <a
          href="https://bdocodex.com"
          target="_blank"
          rel="noopener noreferrer"
          className="bdo-link"
        >
          bdocodex.com
        </a>{' '}
        · Animation durations via{' '}
        <a
          href="https://ffmpeg.org/ffprobe.html"
          target="_blank"
          rel="noopener noreferrer"
          className="bdo-link"
        >
          ffprobe
        </a>
        {' '}· Lurker v2 solves JS challenge + endpoint rotation + PID lock
      </div>
    </footer>
  )
}
