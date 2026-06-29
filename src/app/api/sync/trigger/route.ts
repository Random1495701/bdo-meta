import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'node:child_process'
import { db } from '@/lib/db'
import { readFileSync, existsSync } from 'node:fs'

export const dynamic = 'force-dynamic'

// Trigger a sync phase by spawning the ingestion script in the background.
// Body: { phase?: string, limit?: number, script?: 'sync' | 'lurker' }
//
// script: 'sync' (default) uses scripts/sync-skills.ts (fast, aggressive — may
//         trigger bdocodex bot detection after ~150 requests).
//         'lurker' uses scripts/sync-lurker.ts (polite, endpoint-rotating,
//         jittered delays — designed to run for hours without bot detection).
//
// phase values:
//   For 'sync':  'list' | 'trees' | 'tooltips' | 'videos' | 'all'
//   For 'lurker': 'daemon' | 'batch' | 'videos' | 'kr-names' | 're-enrich' | 'once'
//     (batch and once require a limit/skillId)
export async function POST(req: NextRequest) {
  let body: {
    phase?: string
    limit?: number
    script?: 'sync' | 'lurker'
  } = {}
  try {
    body = await req.json()
  } catch {
    // empty body is fine
  }

  const script = body.script === 'lurker' ? 'lurker' : 'sync'
  const scriptPath = script === 'lurker' ? 'scripts/sync-lurker.ts' : 'scripts/sync-skills.ts'

  let args: string[] = ['run', scriptPath]

  if (script === 'lurker') {
    const phase = body.phase || 'daemon'
    if (phase === 'daemon') {
      // Run until all skills enriched (no batch limit)
    } else if (phase === 'batch') {
      args.push('--batch', String(body.limit || 100))
    } else if (phase === 'videos') {
      args.push('--videos')
    } else if (phase === 'kr-names') {
      args.push('--kr-names')
    } else if (phase === 're-enrich') {
      args.push('--re-enrich')
    } else if (phase === 'once' && body.limit) {
      args.push('--once', String(body.limit))
    }
  } else {
    const phase = body.phase && ['list', 'trees', 'tooltips', 'videos', 'all'].includes(body.phase)
      ? body.phase
      : 'all'
    args.push('--phase', phase)
    if (body.limit && Number.isFinite(body.limit)) {
      args.push('--limit', String(body.limit))
    }
  }

  await db.syncLog.create({
    data: {
      type: `${script}_${body.phase || 'daemon'}`,
      status: 'started',
      message: `Manually triggered ${script} sync: ${body.phase || 'default'}`,
    },
  })

  // Spawn detached so it survives the request lifecycle.
  const child = spawn('bun', args, {
    cwd: process.cwd(),
    detached: true,
    stdio: 'ignore',
  })
  child.unref()

  return NextResponse.json({
    ok: true,
    script,
    phase: body.phase || (script === 'lurker' ? 'daemon' : 'all'),
    pid: child.pid ?? null,
    message: `${script} sync started in background (${body.phase || 'default'} mode)`,
  })
}

// GET: return current lurker state from the heartbeat file
export async function GET() {
  const stateFile = `${process.cwd()}/scripts/lurker.state.json`
  if (!existsSync(stateFile)) {
    return NextResponse.json({ running: false, state: null })
  }
  try {
    const state = JSON.parse(readFileSync(stateFile, 'utf-8'))
    // Consider the lurker "running" if the last heartbeat was < 2 minutes ago
    const lastHeartbeat = new Date(state.lastHeartbeatAt).getTime()
    const running = Date.now() - lastHeartbeat < 120000
    return NextResponse.json({ running, state })
  } catch {
    return NextResponse.json({ running: false, state: null })
  }
}
