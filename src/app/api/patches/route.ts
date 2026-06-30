import { NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'node:fs'

export const dynamic = 'force-dynamic'

export async function GET() {
  const filePath = 'data/patch-notes.json'
  if (!existsSync(filePath)) {
    return NextResponse.json({ patches: [] })
  }
  try {
    const data = JSON.parse(readFileSync(filePath, 'utf-8'))
    return NextResponse.json({ patches: data })
  } catch {
    return NextResponse.json({ patches: [] })
  }
}
