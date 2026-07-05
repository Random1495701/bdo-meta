import { spawn } from 'node:child_process'
import { writeFileSync, existsSync } from 'node:fs'

// Ensure .env exists (it's gitignored so it gets lost on git reset)
if (!existsSync('.env')) {
  writeFileSync('.env', 'DATABASE_URL=file:/home/z/my-project/db/custom.db\n')
  console.log('Created .env with DATABASE_URL')
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
