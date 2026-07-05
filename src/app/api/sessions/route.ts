import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/sessions — list all PvP sessions
// POST /api/sessions — create a new session
// DELETE /api/sessions?id=xxx — delete a session

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const playerTag = searchParams.get('playerTag')
  const sessionType = searchParams.get('type')

  const where: any = {}
  if (playerTag) where.playerTag = playerTag
  if (sessionType) where.sessionType = sessionType

  const sessions = await db.pvpSession.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json({ sessions })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const session = await db.pvpSession.create({
      data: {
        playerTag: body.playerTag,
        sessionType: body.sessionType, // "aos" | "nodewar" | "wotr"
        result: body.result || 'unknown',
        isPractice: body.isPractice || false,
        duration: body.duration || null,
        sessionDate: body.sessionDate || null,
        kills: body.kills || 0,
        deaths: body.deaths || 0,
        assists: body.assists || 0,
        ccCount: body.ccCount || 0,
        damageDealt: body.damageDealt || 0,
        damageTaken: body.damageTaken || 0,
        healing: body.healing || 0,
        teamData: body.teamData ? JSON.stringify(body.teamData) : null,
        enemyData: body.enemyData ? JSON.stringify(body.enemyData) : null,
        screenshotUrl: body.screenshotUrl || null,
        notes: body.notes || null,
      },
    })
    return NextResponse.json({ ok: true, session })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 })

  await db.pvpSession.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
