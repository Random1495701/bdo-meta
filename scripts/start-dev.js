const { spawn } = require('child_process')
const fs = require('fs')

const child = spawn('npx', ['next', 'dev', '-p', '3000'], {
  cwd: process.cwd(),
  detached: true,
  stdio: ['ignore', 'ignore', 'ignore'],
  env: { ...process.env, FORCE_COLOR: '0' }
})
child.unref()

// Write the PID to a file so we can manage it
fs.writeFileSync('scripts/dev.pid', String(child.pid))
console.log(`Dev server started with PID ${child.pid} (detached, unref'd)`)
