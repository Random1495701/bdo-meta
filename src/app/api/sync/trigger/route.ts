import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'node:child_process'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Trigger a sync phase by spawning the ingestion script in the background.
// Body: { phase?: "list" | "trees" | "tooltips" | "videos" | "all", limit?: number }
export async function POST(req: NextRequest) {
  let body: { phase?: string; limit?: number } = {}
  try {
    body = await req.json()
  } catch {
    // empty body is fine
  }
  const phase = body.phase && ['list', 'trees', 'tooltips', 'videos', 'all'].includes(body.phase)
    ? body.phase
    : 'all'
  const args = ['run', 'scripts/sync-skills.ts', '--phase', phase]
  if (body.limit && Number.isFinite(body.limit)) {
    args.push('--limit', String(body.limit))
  }

  await db.syncLog.create({
    data: {
      type: phase,
      status: 'started',
      message: `Manually triggered sync phase: ${phase}`,
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
    phase,
    pid: child.pid ?? null,
    message: `Sync phase "${phase}" started in background`,
  })
}
