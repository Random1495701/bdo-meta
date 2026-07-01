import { NextResponse } from 'next/server'
import { execSync } from 'node:child_process'

export const dynamic = 'force-dynamic'

// POST /api/version/switch
// Switches the app to a specific git version/tag.
// Body: { target: "v2.7.0" | "main" }
// Stashes current work, checks out the tag, dev server auto-restarts.

export async function POST(request: Request) {
  try {
    const { target } = await request.json()

    if (!target || typeof target !== 'string') {
      return NextResponse.json({ ok: false, error: 'Missing target version' }, { status: 400 })
    }

    // Validate target — must be a valid git ref
    const validTargets = ['main', 'master']
    try {
      const tags = execSync('git tag', { encoding: 'utf-8' }).trim().split('\n')
      validTargets.push(...tags)
    } catch {}

    if (!validTargets.includes(target)) {
      return NextResponse.json({ ok: false, error: `Invalid version: ${target}` }, { status: 400 })
    }

    // Stash current work
    try {
      execSync('git stash push -m "auto-stash before version switch"', { stdio: 'pipe' })
    } catch {}

    // Checkout target
    if (target === 'main' || target === 'master') {
      execSync(`git checkout ${target}`, { stdio: 'pipe' })
      // Try to restore stashed work
      try {
        execSync('git stash pop', { stdio: 'pipe' })
      } catch {}
    } else {
      execSync(`git checkout ${target}`, { stdio: 'pipe' })
    }

    const current = execSync('git describe --tags 2>/dev/null || git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim()

    return NextResponse.json({
      ok: true,
      message: `Switched to ${target}. The dev server will restart automatically.`,
      current,
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
