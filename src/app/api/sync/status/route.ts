import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { readFileSync, existsSync } from 'node:fs'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  const [total, withDescription, withVideo, withAnimation, withKrName, recentLogs] = await Promise.all([
    db.skill.count(),
    db.skill.count({ where: { description: { not: null } } }),
    db.skill.count({ where: { videoUrl: { not: null } } }),
    db.skill.count({ where: { animationDurationMs: { not: null } } }),
    db.skill.count({ where: { krName: { not: null } } }),
    db.syncLog.findMany({ take: 10, orderBy: { createdAt: 'desc' } }),
  ])

  // Read lurker state from heartbeat file
  let lurker: { running: boolean; state: any } = { running: false, state: null }
  const stateFile = `${process.cwd()}/scripts/lurker.state.json`
  if (existsSync(stateFile)) {
    try {
      const state = JSON.parse(readFileSync(stateFile, 'utf-8'))
      const lastHeartbeat = new Date(state.lastHeartbeatAt).getTime()
      lurker = {
        running: Date.now() - lastHeartbeat < 120000,
        state: {
          pid: state.pid,
          mode: state.mode,
          startedAt: state.startedAt,
          lastHeartbeatAt: state.lastHeartbeatAt,
          processed: state.processed,
          enriched: state.enriched,
          failed: state.failed,
          skipped: state.skipped,
          challengesSolved: state.challengesSolved || 0,
          currentSkillId: state.currentSkillId,
          currentEndpoint: state.currentEndpoint,
          cooldowns: state.cooldowns,
        },
      }
    } catch {
      // ignore
    }
  }

  return NextResponse.json({
    total,
    withDescription,
    withVideo,
    withAnimation,
    withKrName,
    pendingTooltips: Math.max(0, total - withDescription),
    pendingAnimations: Math.max(0, withVideo - withAnimation),
    pendingKrNames: Math.max(0, total - withKrName),
    lurker,
    recentLogs: recentLogs.map((l) => ({
      id: l.id,
      type: l.type,
      status: l.status,
      count: l.count,
      total: l.total,
      message: l.message,
      createdAt: l.createdAt,
    })),
  })
}
