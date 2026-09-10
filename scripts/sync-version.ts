// Sync version.ts with current git state.
// Run this after tagging a new version: bun run scripts/sync-version.ts
//
// This script:
// 1. Gets the latest git tag (APP_VERSION)
// 2. Gets the tag's commit date (APP_VERSION_DATE)
// 3. Gets all git tags (GIT_TAGS array)
// 4. Updates .env.local with NEXT_PUBLIC_APP_VERSION etc.
// 5. Updates the hardcoded fallback in src/lib/version.ts

import { execSync } from 'node:child_process'
import { writeFileSync, readFileSync, existsSync } from 'node:fs'

function run(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf-8' }).trim()
  } catch {
    return ''
  }
}

const version = run('git describe --tags --abbrev=0') || 'v0.0.0'
const date = run(`git log -1 --format=%cs ${version}`) || new Date().toISOString().slice(0, 10)
const tags = run('git tag | sort -V')
  .split('\n')
  .filter(Boolean)

console.log('=== Sync Version ===')
console.log('  Version:', version)
console.log('  Date:', date)
console.log('  Tags:', tags.length)

// Update .env.local
const envPath = '.env.local'
let envContent = ''
if (existsSync(envPath)) {
  envContent = readFileSync(envPath, 'utf-8')
}

// Remove old version lines
envContent = envContent
  .split('\n')
  .filter((line) => !line.startsWith('NEXT_PUBLIC_APP_VERSION'))
  .join('\n')

// Add new version lines
envContent += `\nNEXT_PUBLIC_APP_VERSION=${version}\n`
envContent += `NEXT_PUBLIC_APP_VERSION_DATE=${date}\n`

writeFileSync(envPath, envContent.trim() + '\n')
console.log('  Updated .env.local')

// Update version.ts fallback
const versionTsPath = 'src/lib/version.ts'
let versionTs = readFileSync(versionTsPath, 'utf-8')

versionTs = versionTs.replace(
  /export const APP_VERSION = process\.env\.NEXT_PUBLIC_APP_VERSION \|\| '[^']*'/,
  `export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '${version}'`
)
versionTs = versionTs.replace(
  /export const APP_VERSION_DATE = process\.env\.NEXT_PUBLIC_APP_VERSION_DATE \|\| '[^']*'/,
  `export const APP_VERSION_DATE = process.env.NEXT_PUBLIC_APP_VERSION_DATE || '${date}'`
)

// Update GIT_TAGS array
const tagsFormatted = tags.map((t) => `'${t}'`).join(', ')
const tagsLines: string[] = []
for (let i = 0; i < tags.length; i += 6) {
  const chunk = tags.slice(i, i + 6)
  tagsLines.push('  ' + chunk.map((t) => `'${t}'`).join(', ') + (i + 6 < tags.length ? ',' : ''))
}
versionTs = versionTs.replace(
  /export const GIT_TAGS = \[[\s\S]*?\]/,
  `export const GIT_TAGS = [\n${tagsLines.join('\n')}\n]`
)

writeFileSync(versionTsPath, versionTs)
console.log('  Updated src/lib/version.ts')
console.log('\n=== Done ===')
