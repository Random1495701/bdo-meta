#!/usr/bin/env bun
// Switch to a specific git version/tag.
// Stashes current work, checks out the tag, and the dev server auto-restarts.
//
// Usage: bun run scripts/switch-version.ts <tag>
// Example: bun run scripts/switch-version.ts v2.7.0
//
// To return to the latest: bun run scripts/switch-version.ts main

import { execSync } from 'node:child_process'

const target = process.argv[2]

if (!target) {
  console.error('Usage: bun run scripts/switch-version.ts <tag|main>')
  console.error('Available tags:')
  try {
    const tags = execSync('git tag', { encoding: 'utf-8' }).trim().split('\n')
    tags.forEach(t => console.error(`  ${t}`))
  } catch {}
  process.exit(1)
}

console.log(`=== Switching to ${target} ===`)

// 1. Stash current work (in case there are uncommitted changes)
try {
  execSync('git stash push -m "auto-stash before version switch"', { stdio: 'pipe' })
  console.log('✓ Current work stashed')
} catch {
  console.log('- Nothing to stash')
}

// 2. Checkout the target
try {
  if (target === 'main') {
    execSync('git checkout main', { stdio: 'pipe' })
    // Pop stash if exists
    try {
      execSync('git stash pop', { stdio: 'pipe' })
      console.log('✓ Stashed work restored')
    } catch {}
  } else {
    execSync(`git checkout ${target}`, { stdio: 'pipe' })
  }
  console.log(`✓ Checked out ${target}`)
} catch (err) {
  console.error(`✗ Failed to checkout ${target}:`, (err as Error).message)
  process.exit(1)
}

// 3. Show current state
const current = execSync('git describe --tags 2>/dev/null || git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim()
console.log(`\nCurrent version: ${current}`)
console.log('\nThe dev server should auto-restart. If not, run: node scripts/start-dev.mjs')
