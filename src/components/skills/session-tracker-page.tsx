'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Trophy, Upload, Swords, Shield, Heart, Zap, Clock, Calendar,
  X, Plus, Trash2, Loader2, CheckCircle2, AlertCircle, Image as ImageIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface PvpSession {
  id: string
  playerTag: string
  sessionType: string
  result: string
  isPractice: boolean
  duration: string | null
  sessionDate: string | null
  kills: number
  deaths: number
  assists: number
  ccCount: number
  damageDealt: number
  damageTaken: number
  healing: number
  teamData: string | null
  enemyData: string | null
  screenshotUrl: string | null
  notes: string | null
  createdAt: string
}

async function fetchSessions(): Promise<{ sessions: PvpSession[] }> {
  const res = await fetch('/api/sessions', { cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed: ${res.status}`)
  return res.json()
}

const SESSION_TYPE_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  aos: { label: 'Arena of Solare', color: '#3b82f6', icon: <Swords className="size-4" /> },
  nodewar: { label: 'Node War', color: '#ef4444', icon: <Shield className="size-4" /> },
  wotr: { label: 'War of the Roses', color: '#eab308', icon: <Trophy className="size-4" /> },
}

const RESULT_META: Record<string, { color: string; label: string }> = {
  victory: { color: '#22c55e', label: 'Victory' },
  defeat: { color: '#ef4444', label: 'Defeat' },
  draw: { color: '#a1a1aa', label: 'Draw' },
  unknown: { color: '#a1a1aa', label: 'Unknown' },
}

function formatNumber(n: number): string {
  return n.toLocaleString()
}

export function SessionTrackerPage() {
  const queryClient = useQueryClient()
  const [playerTag, setPlayerTag] = React.useState('')
  const [uploading, setUploading] = React.useState(false)
  const [parseResult, setParseResult] = React.useState<any>(null)
  const [parseError, setParseError] = React.useState<string | null>(null)
  const [showManualForm, setShowManualForm] = React.useState(false)
  const [manualType, setManualType] = React.useState<'aos' | 'nodewar' | 'wotr'>('nodewar')
  const [manualResult, setManualResult] = React.useState<'victory' | 'defeat' | 'draw'>('victory')
  const [manualDate, setManualDate] = React.useState(new Date().toISOString().slice(0, 10))
  const [manualKills, setManualKills] = React.useState(0)
  const [manualDeaths, setManualDeaths] = React.useState(0)
  const [manualNotes, setManualNotes] = React.useState('')
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const sessionsQuery = useQuery({ queryKey: ['sessions'], queryFn: fetchSessions, staleTime: 30_000 })
  const sessions = sessionsQuery.data?.sessions ?? []

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create session')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/sessions?id=${id}`, { method: 'DELETE' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
  })

  const handleScreenshotUpload = async (file: File) => {
    if (!playerTag.trim()) {
      setParseError('Enter your player name first')
      return
    }
    setUploading(true)
    setParseError(null)
    setParseResult(null)

    try {
      const formData = new FormData()
      formData.append('screenshot', file)

      const res = await fetch('/api/sessions/parse-screenshot', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (!data.ok) throw new Error(data.error || 'Parse failed')

      setParseResult(data.parsed)

      // Auto-create session if parse was successful
      if (data.parsed && !data.parsed.parseError && data.parsed.playerStats) {
        const p = data.parsed
        await createMutation.mutateAsync({
          playerTag,
          sessionType: p.sessionType || 'aos',
          result: p.result || 'unknown',
          isPractice: p.isPractice || false,
          duration: p.duration || null,
          sessionDate: p.sessionDate || null,
          kills: p.playerStats?.kills || 0,
          deaths: p.playerStats?.deaths || 0,
          assists: p.playerStats?.assists || 0,
          ccCount: p.playerStats?.ccCount || 0,
          damageDealt: p.playerStats?.damageDealt || 0,
          damageTaken: p.playerStats?.damageTaken || 0,
          healing: p.playerStats?.healing || 0,
          teamData: p.teamData || null,
          enemyData: p.enemyData || null,
          screenshotUrl: data.screenshotUrl || null,
        })
      }
    } catch (e) {
      setParseError((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const handleManualSubmit = async () => {
    if (!playerTag.trim()) return
    await createMutation.mutateAsync({
      playerTag,
      sessionType: manualType,
      result: manualResult,
      sessionDate: manualDate,
      kills: manualKills,
      deaths: manualDeaths,
      notes: manualNotes || null,
    })
    setShowManualForm(false)
    setManualKills(0)
    setManualDeaths(0)
    setManualNotes('')
  }

  // Filter sessions by player tag
  const filteredSessions = playerTag.trim()
    ? sessions.filter(s => s.playerTag.toLowerCase().includes(playerTag.toLowerCase()))
    : sessions

  // Aggregate stats
  const stats = React.useMemo(() => {
    if (filteredSessions.length === 0) return null
    const wins = filteredSessions.filter(s => s.result === 'victory').length
    const losses = filteredSessions.filter(s => s.result === 'defeat').length
    const totalKills = filteredSessions.reduce((sum, s) => sum + s.kills, 0)
    const totalDeaths = filteredSessions.reduce((sum, s) => sum + s.deaths, 0)
    const totalDamage = filteredSessions.reduce((sum, s) => sum + s.damageDealt, 0)
    const totalHealing = filteredSessions.reduce((sum, s) => sum + s.healing, 0)
    return { wins, losses, winrate: Math.round((wins / filteredSessions.length) * 100), totalKills, totalDeaths, totalDamage, totalHealing, total: filteredSessions.length }
  }, [filteredSessions])

  return (
    <div className="flex min-h-screen flex-col bg-bdo-ink text-zinc-100">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-amber-900/50 bg-bdo-ink/95 px-4 py-3 backdrop-blur lg:px-6">
        <div className="flex items-center gap-3">
          <Trophy className="size-5 text-amber-400" />
          <div>
            <h1 className="bdo-title text-xl font-bold text-amber-400 sm:text-2xl">Session Tracker</h1>
            <p className="text-xs text-amber-200/50">AoS · Node Wars · War of the Roses</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-6 lg:px-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Player input + Upload */}
          <div className="rounded-sm border-2 border-amber-800/40 bg-bdo-leather-dark/30 p-4">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <Input
                value={playerTag}
                onChange={(e) => setPlayerTag(e.target.value)}
                placeholder="Enter your player name (IGN)..."
                className="max-w-xs border-amber-800/40 bg-bdo-ink/60 text-amber-100 placeholder:text-amber-300/30"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || !playerTag.trim()}
                className="bdo-btn"
              >
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                {uploading ? 'Parsing...' : 'Upload Screenshot'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleScreenshotUpload(file)
                  e.target.value = ''
                }}
              />
              <Button
                onClick={() => setShowManualForm(!showManualForm)}
                variant="outline"
                className="border-amber-800/40 text-amber-300/50 hover:text-amber-200"
              >
                <Plus className="size-4" /> Manual Entry
              </Button>
            </div>

            {/* Parse error */}
            {parseError && (
              <div className="flex items-center gap-2 rounded-sm border border-red-700/40 bg-red-900/10 p-2 text-xs text-red-300">
                <AlertCircle className="size-3.5" />
                {parseError}
              </div>
            )}

            {/* Parse result preview */}
            {parseResult && !parseResult.parseError && (
              <div className="mt-2 flex items-center gap-2 rounded-sm border border-emerald-700/40 bg-emerald-900/10 p-2 text-xs text-emerald-300">
                <CheckCircle2 className="size-3.5" />
                Parsed: {parseResult.sessionType?.toUpperCase()} · {parseResult.result} · K/D: {parseResult.playerStats?.kills}/{parseResult.playerStats?.deaths}
              </div>
            )}

            {/* Manual entry form */}
            {showManualForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 space-y-2 rounded-sm border border-amber-800/30 bg-bdo-ink/40 p-3"
              >
                <div className="flex flex-wrap gap-2">
                  <select value={manualType} onChange={(e) => setManualType(e.target.value as any)} className="rounded-sm border border-amber-800/40 bg-bdo-ink/60 px-2 py-1 text-xs text-amber-100">
                    <option value="nodewar">Node War</option>
                    <option value="wotr">War of the Roses</option>
                    <option value="aos">Arena of Solare</option>
                  </select>
                  <select value={manualResult} onChange={(e) => setManualResult(e.target.value as any)} className="rounded-sm border border-amber-800/40 bg-bdo-ink/60 px-2 py-1 text-xs text-amber-100">
                    <option value="victory">Victory</option>
                    <option value="defeat">Defeat</option>
                    <option value="draw">Draw</option>
                  </select>
                  <Input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} className="w-auto border-amber-800/40 bg-bdo-ink/60 text-amber-100" />
                  <Input type="number" value={manualKills} onChange={(e) => setManualKills(Number(e.target.value))} placeholder="Kills" className="w-20 border-amber-800/40 bg-bdo-ink/60 text-amber-100" />
                  <Input type="number" value={manualDeaths} onChange={(e) => setManualDeaths(Number(e.target.value))} placeholder="Deaths" className="w-20 border-amber-800/40 bg-bdo-ink/60 text-amber-100" />
                </div>
                <Input value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} placeholder="Notes (optional)..." className="border-amber-800/40 bg-bdo-ink/60 text-amber-100" />
                <Button onClick={handleManualSubmit} className="bdo-btn" size="sm">
                  Save Session
                </Button>
              </motion.div>
            )}
          </div>

          {/* Aggregate stats */}
          {stats && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              <StatCard label="Sessions" value={String(stats.total)} color="#fbbf24" />
              <StatCard label="Win Rate" value={`${stats.winrate}%`} color={stats.winrate >= 50 ? '#22c55e' : '#ef4444'} />
              <StatCard label="W/L" value={`${stats.wins}/${stats.losses}`} color="#fbbf24" />
              <StatCard label="Total K/D" value={`${stats.totalKills}/${stats.totalDeaths}`} color="#f87171" />
              <StatCard label="Total Damage" value={formatNumber(stats.totalDamage)} color="#f472b6" />
              <StatCard label="Total Healing" value={formatNumber(stats.totalHealing)} color="#34d399" />
            </div>
          )}

          {/* Session list */}
          {sessionsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-sm border border-amber-900/30 bg-bdo-leather-dark" />
              ))}
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-amber-300/40">
              <Trophy className="mb-4 size-12 opacity-30" />
              <p>No sessions logged yet.</p>
              <p className="text-xs">Upload an AoS screenshot or add a manual entry to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSessions.map((session, idx) => {
                const typeMeta = SESSION_TYPE_META[session.sessionType] || SESSION_TYPE_META.aos
                const resultMeta = RESULT_META[session.result] || RESULT_META.unknown
                const teamData = session.teamData ? JSON.parse(session.teamData) : null
                const enemyData = session.enemyData ? JSON.parse(session.enemyData) : null

                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.02, 0.2) }}
                    className="overflow-hidden rounded-sm border-2"
                    style={{ borderColor: `${resultMeta.color}44` }}
                  >
                    {/* Session header */}
                    <div className="flex items-center gap-3 border-b border-amber-900/30 bg-bdo-leather-dark/30 px-4 py-2">
                      <span style={{ color: typeMeta.color }}>{typeMeta.icon}</span>
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: typeMeta.color }}>
                        {typeMeta.label}
                      </span>
                      {session.isPractice && (
                        <span className="rounded-sm border border-amber-700/40 bg-amber-900/20 px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-300/50">
                          Practice
                        </span>
                      )}
                      <span
                        className="rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase"
                        style={{ color: resultMeta.color, backgroundColor: `${resultMeta.color}15` }}
                      >
                        {resultMeta.label}
                      </span>
                      {session.duration && (
                        <span className="flex items-center gap-1 text-[10px] text-amber-300/40">
                          <Clock className="size-3" /> {session.duration}
                        </span>
                      )}
                      {session.sessionDate && (
                        <span className="flex items-center gap-1 text-[10px] text-amber-300/40">
                          <Calendar className="size-3" /> {session.sessionDate}
                        </span>
                      )}
                      <span className="ml-auto text-[10px] text-amber-300/30">{session.playerTag}</span>
                      <button
                        onClick={() => deleteMutation.mutate(session.id)}
                        className="text-amber-300/30 hover:text-red-400"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>

                    {/* Session stats */}
                    <div className="px-4 py-3">
                      {/* Screenshot */}
                      {session.screenshotUrl && (
                        <div className="mb-3 overflow-hidden rounded-sm border border-amber-800/30">
                          <img src={session.screenshotUrl} alt="Session screenshot" className="max-h-48 w-full object-contain" loading="lazy" />
                        </div>
                      )}

                      {/* Player stats */}
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-7">
                        <StatBox label="Kills" value={String(session.kills)} color="#22c55e" icon={<Swords className="size-3" />} />
                        <StatBox label="Deaths" value={String(session.deaths)} color="#ef4444" icon={<X className="size-3" />} />
                        <StatBox label="Assists" value={String(session.assists)} color="#3b82f6" />
                        <StatBox label="CC" value={String(session.ccCount)} color="#eab308" icon={<Zap className="size-3" />} />
                        <StatBox label="Dealt" value={formatNumber(session.damageDealt)} color="#f472b6" />
                        <StatBox label="Taken" value={formatNumber(session.damageTaken)} color="#f87171" />
                        <StatBox label="Healed" value={formatNumber(session.healing)} color="#34d399" icon={<Heart className="size-3" />} />
                      </div>

                      {/* Team data (AoS) */}
                      {teamData && Array.isArray(teamData) && teamData.length > 0 && (
                        <div className="mt-3">
                          <div className="mb-1 text-[9px] font-bold uppercase tracking-wider text-emerald-300/50">My Team</div>
                          <div className="space-y-1">
                            {teamData.map((p: any, i: number) => (
                              <PlayerRow key={i} player={p} color="#22c55e" />
                            ))}
                          </div>
                        </div>
                      )}
                      {enemyData && Array.isArray(enemyData) && enemyData.length > 0 && (
                        <div className="mt-2">
                          <div className="mb-1 text-[9px] font-bold uppercase tracking-wider text-red-300/50">Enemy Team</div>
                          <div className="space-y-1">
                            {enemyData.map((p: any, i: number) => (
                              <PlayerRow key={i} player={p} color="#ef4444" />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {session.notes && (
                        <p className="mt-2 text-[10px] text-amber-300/40">{session.notes}</p>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-sm border border-amber-800/30 bg-bdo-leather-dark/30 p-3 text-center">
      <div className="font-mono text-lg font-bold" style={{ color }}>{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-amber-300/40">{label}</div>
    </div>
  )
}

function StatBox({ label, value, color, icon }: { label: string; value: string; color: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-sm border px-2 py-1.5" style={{ borderColor: `${color}44`, backgroundColor: `${color}0a` }}>
      <div className="flex items-center gap-1 text-[8px] font-semibold uppercase tracking-wider" style={{ color: `${color}99` }}>
        {icon} {label}
      </div>
      <div className="font-mono text-sm font-bold" style={{ color }}>{value}</div>
    </div>
  )
}

function PlayerRow({ player, color }: { player: any; color: string }) {
  return (
    <div className="flex items-center gap-2 rounded-sm border border-amber-900/15 bg-bdo-ink/30 px-2 py-1 text-[10px]">
      <span className="font-semibold text-amber-200">{player.name || 'Unknown'}</span>
      {player.class && <span className="text-amber-300/30">{player.class}</span>}
      <span className="ml-auto flex items-center gap-2 font-mono">
        <span className="text-emerald-300/60">{player.kills || 0}/{player.deaths || 0}</span>
        <span className="text-amber-300/40">CC: {player.cc || 0}</span>
        <span className="text-pink-300/40">{formatNumber(player.dealt || 0)}</span>
        <span className="text-emerald-300/40">{formatNumber(player.healed || 0)}</span>
      </span>
    </div>
  )
}
