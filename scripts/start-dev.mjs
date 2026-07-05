import { spawn, execSync } from 'node:child_process'
import { writeFileSync, existsSync } from 'node:fs'

// Ensure .env exists (it's gitignored so it gets lost on git reset)
if (!existsSync('.env')) {
  writeFileSync('.env', 'DATABASE_URL=file:/home/z/my-project/db/custom.db\n')
  console.log('Created .env with DATABASE_URL')
}

// P4.1: Session reset auto-recovery.
// On boot, if the DB has fewer than 5000 skills, it's likely corrupted or
// lost due to a session reset. Restore from the git-tracked DB backup.
try {
  const countOutput = execSync(
    'bun -e "import {db} from \'./src/lib/db\'; db.skill.count().then(c => { console.log(c); process.exit(0) }).catch(() => process.exit(1))"',
    { encoding: 'utf-8', timeout: 15000, stdio: 'pipe' }
  ).trim()
  const count = parseInt(countOutput, 10)
  if (!isNaN(count) && count < 5000) {
    console.log(`⚠️  DB has only ${count} skills (< 5000) — restoring from git...`)
    execSync('git checkout db/custom.db', { stdio: 'pipe' })
    console.log('✅ DB restored from git. Run `bun run db:push` to apply schema.')
    execSync('bun run db:push', { stdio: 'pipe', timeout: 30000 })
    console.log('✅ Schema pushed.')
  } else if (!isNaN(count)) {
    console.log(`✅ DB healthy: ${count} skills`)
  }
} catch (e) {
  console.log('⚠️  Could not check DB health (may need db:push):', e.message?.substring(0, 100))
}

const child = spawn('npx', ['next', 'dev', '-p', '3000'], {
  cwd: process.cwd(),
  detached: true,
  stdio: ['ignore', 'ignore', 'ignore'],
  env: { ...process.env, FORCE_COLOR: '0' }
})
child.unref()
writeFileSync('scripts/dev.pid', String(child.pid))
console.log(`Dev server started with PID ${child.pid} (detached, unref'd)`)
