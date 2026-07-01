#!/usr/bin/env bun
// Patch lurker — checks for new BDO patch notes weekly after patch day (Thursday).
// Runs the scraper only if:
//   1. Today is Thursday (patch day) or later in the week, AND
//   2. We haven't already scraped a patch from this week.
//
// This avoids hammering PA's servers every day and risking an IP block.
//
// Usage:
//   bun run scripts/patch-lurker.ts          # check + scrape if needed
//   bun run scripts/patch-lurker.ts --force  # force scrape regardless of day
//
// Recommended cron: run daily at 10:00 (the lurker itself decides whether to actually scrape)
//   0 10 * * * cd /home/z/my-project && bun run scripts/patch-lurker.ts >> logs/patch-lurker.log 2>&1

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const ARCHIVE_PATH = 'data/patch-archive.json'
const STATE_PATH = 'data/patch-lurker-state.json'

interface LurkerState {
  lastCheckAt: string | null
  lastScrapeAt: string | null
  lastPatchDate: string | null
  lastPatchUrl: string | null
  consecutiveNoChangeWeeks: number
}

function loadState(): LurkerState {
  if (!existsSync(STATE_PATH)) {
    return {
      lastCheckAt: null,
      lastScrapeAt: null,
      lastPatchDate: null,
      lastPatchUrl: null,
      consecutiveNoChangeWeeks: 0,
    }
  }
  try {
    return JSON.parse(readFileSync(STATE_PATH, 'utf-8'))
  } catch {
    return { lastCheckAt: null, lastScrapeAt: null, lastPatchDate: null, lastPatchUrl: null, consecutiveNoChangeWeeks: 0 }
  }
}

function saveState(state: LurkerState) {
  mkdirSync('data', { recursive: true })
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2))
}

function loadArchive(): { url: string; date: string }[] {
  if (!existsSync(ARCHIVE_PATH)) return []
  try {
    return JSON.parse(readFileSync(ARCHIVE_PATH, 'utf-8'))
  } catch {
    return []
  }
}

// Get the most recent Thursday at 00:00 in the user's timezone
// BDO patches typically drop on Thursday maintenance
function getLastThursday(now: Date): Date {
  const d = new Date(now)
  const dayOfWeek = d.getDay() // 0=Sun, 4=Thu
  let daysSinceThursday = (dayOfWeek - 4 + 7) % 7
  // If today is Thursday, daysSinceThursday = 0 (today is patch day)
  // If today is Friday, daysSinceThursday = 1
  // etc.
  d.setDate(d.getDate() - daysSinceThursday)
  d.setHours(0, 0, 0, 0)
  return d
}

// Check if we should scrape today:
// - Only scrape on Thursday or later in the week (not Mon-Wed)
// - Only scrape once per week (if we already have this week's patch)
function shouldScrape(state: LurkerState, force: boolean): { should: boolean; reason: string } {
  if (force) return { should: true, reason: 'forced' }

  const now = new Date()
  const dayOfWeek = now.getDay() // 0=Sun, 4=Thu

  // Only check Thursday through Sunday (after patch day)
  // Mon-Wed: too early, patch hasn't dropped yet
  if (dayOfWeek < 4) {
    return { should: false, reason: `today is ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dayOfWeek]}, waiting for Thursday (patch day)` }
  }

  // Check if we already scraped this week's patch
  const lastThursday = getLastThursday(now)
  const lastScrape = state.lastScrapeAt ? new Date(state.lastScrapeAt) : null

  if (lastScrape && lastScrape >= lastThursday) {
    return { should: false, reason: `already scraped this week (last scrape: ${state.lastScrapeAt})` }
  }

  // Also check if the archive already has a patch from this week
  const archive = loadArchive()
  if (archive.length > 0) {
    const latest = archive[0]
    if (latest.date) {
      const patchDate = new Date(latest.date)
      if (!isNaN(patchDate.getTime()) && patchDate >= lastThursday) {
        return { should: false, reason: `archive already has this week's patch (${latest.date})` }
      }
    }
  }

  return { should: true, reason: `Thursday+ and no scrape this week yet` }
}

async function main() {
  const force = process.argv.includes('--force')

  console.log('=== Patch Lurker ===')
  console.log(`Time: ${new Date().toISOString()}`)

  const state = loadState()
  const decision = shouldScrape(state, force)

  console.log(`Decision: ${decision.should ? 'SCRAPE' : 'SKIP'} — ${decision.reason}`)

  // Always update lastCheckAt
  state.lastCheckAt = new Date().toISOString()

  if (!decision.should) {
    saveState(state)
    console.log('Exiting without scraping.')
    return
  }

  // Run the scraper
  console.log('\nRunning patch scraper...')
  try {
    const output = execFileSync('bun', ['run', 'scripts/scrape-patch-notes.ts'], {
      stdio: 'pipe',
      timeout: 300000, // 5 min timeout
      cwd: process.cwd(),
    }).toString()

    console.log(output)

    // Check if a new patch was added
    const archive = loadArchive()
    if (archive.length > 0) {
      const latest = archive[0]
      if (latest.url !== state.lastPatchUrl) {
        console.log(`\n✓ New patch detected: ${latest.date} (${latest.url})`)
        state.lastPatchDate = latest.date
        state.lastPatchUrl = latest.url
        state.consecutiveNoChangeWeeks = 0
      } else {
        console.log('\nNo new patch found (same as last time).')
        state.consecutiveNoChangeWeeks++
      }
    }

    state.lastScrapeAt = new Date().toISOString()
    saveState(state)
    console.log(`\nState saved. Consecutive no-change weeks: ${state.consecutiveNoChangeWeeks}`)
  } catch (err) {
    console.error('Scraper failed:', (err as Error).message)
    state.lastScrapeAt = new Date().toISOString()
    saveState(state)
    process.exit(1)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
