#!/usr/bin/env bun
/**
 * Streaming PAA parser: extract .paa files from a 7z archive one at a time,
 * parse each for animationDurationMs, and discard the bytes — keeping
 * memory + disk usage low (we only need ~1 file in memory at a time).
 *
 * Usage:
 *   bun run scripts/paz-tools/parse-paa-from-7z.ts --7z ./motion.7z --out ./data/animations.json
 *
 * Output: Array<{ file: string, actionName: string, animationDurationMs: number, frameCount: number, boneCount: number, parseOk: boolean }>
 *
 * The 7z is never fully extracted — each .paa is read into memory, parsed, then
 * discarded. This works within tight memory + disk constraints (e.g. 2.5GB disk
 * for a 6.3GB archive of 38k .paa files).
 */

import { writeFile, readFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { basename } from 'node:path'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    '7z': { type: 'string' },
    'out': { type: 'string' },
    'limit': { type: 'string' },  // optional: only parse first N files (for testing)
  },
})

type PaaResult = {
  file: string
  actionName: string
  animationDurationMs: number
  frameCount: number
  boneCount: number
  parseOk: boolean
}

// Parse a .paa buffer → animation metadata. Same logic as parse-paa-frames.ts
// but inlined so we don't need to extract to disk.
function parsePaa(buf: Buffer, file: string): PaaResult {
  const actionName = actionNameFromPath(file)
  if (buf.length < 0x1a + 6) {
    return { file, actionName, animationDurationMs: 0, frameCount: 0, boneCount: 0, parseOk: false }
  }
  if (buf.toString('ascii', 0, 4) !== 'PAR ') {
    return { file, actionName, animationDurationMs: 0, frameCount: 0, boneCount: 0, parseOk: false }
  }
  const boneCount = buf.readUInt16LE(0x10)
  const animationDurationSec = buf.readFloatLE(0x12)
  let off = 0x1a
  let bonesParsed = 0
  for (let i = 0; i < boneCount; i++) {
    if (off + 4 > buf.length) break
    off += 4 // boneHash
    if (off + 2 > buf.length) break
    const scaleCount = buf.readUInt16LE(off)
    off += 2 + scaleCount * 8
    if (off + 2 > buf.length) break
    const rotCount = buf.readUInt16LE(off)
    off += 2 + rotCount * 10
    if (off + 2 > buf.length) break
    const posCount = buf.readUInt16LE(off)
    off += 2 + posCount * 8
    bonesParsed++
  }
  const parseOk = bonesParsed === boneCount && off === buf.length
  const plausible = animationDurationSec > 0 && animationDurationSec < 60
  return {
    file,
    actionName,
    animationDurationMs: plausible ? Math.round(animationDurationSec * 1000) : 0,
    frameCount: plausible ? Math.round(animationDurationSec * 30) : 0,
    boneCount,
    parseOk: parseOk && plausible,
  }
}

function actionNameFromPath(file: string): string {
  const b = basename(file).replace(/\.paa$/i, '')
  const parts = b.split('_')
  if (parts.length < 4) return b
  const middle = parts.slice(2, -1)
  return middle.map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).join('_')
}

// List the .paa files in the 7z via python3.13 + py7zr (lightweight, no extraction)
async function listPaaFiles(sevenZpath: string): Promise<string[]> {
  const py = `import py7zr
with py7zr.SevenZipFile(${JSON.stringify(sevenZpath)}, mode='r') as z:
    for n in z.getnames():
        if n.endswith('.paa'):
            print(n)
`
  return new Promise((resolve, reject) => {
    const p = spawn('python3.13', ['-c', py])
    let out = ''
    let err = ''
    p.stdout.on('data', (d) => { out += d.toString() })
    p.stderr.on('data', (d) => { err += d.toString() })
    p.on('close', (code) => {
      if (code !== 0) reject(new Error(`list failed: ${err}`))
      else resolve(out.split('\n').filter(s => s.trim()))
    })
  })
}

// Extract a single .paa file's bytes from the 7z (no disk write — returns Buffer)
async function readPaaFrom7z(sevenZpath: string, paaFile: string): Promise<Buffer> {
  const py = `import py7zr, sys, io
with py7zr.SevenZipFile(${JSON.stringify(sevenZpath)}, mode='r') as z:
    bio = z.read([${JSON.stringify(paaFile)}])
    if bio and ${JSON.stringify(paaFile)} in bio:
        sys.stdout.buffer.write(bio[${JSON.stringify(paaFile)}].read())
`
  return new Promise((resolve, reject) => {
    const p = spawn('python3.13', ['-c', py])
    const chunks: Buffer[] = []
    p.stdout.on('data', (d) => chunks.push(Buffer.from(d)))
    p.stderr.on('data', (d) => { /* swallow per-file errors */ })
    p.on('close', (code) => {
      if (code !== 0) reject(new Error(`read ${paaFile} failed`))
      else resolve(Buffer.concat(chunks))
    })
  })
}

async function main() {
  const sevenZ = values['7z']
  const out = values.out ?? './data/animations.json'
  const limit = values.limit ? parseInt(values.limit, 10) : undefined

  if (!sevenZ) {
    console.error('Provide --7z <path>')
    process.exit(1)
  }

  console.log(`Listing .paa files in ${sevenZ}...`)
  const allPaa = await listPaaFiles(sevenZ)
  console.log(`Found ${allPaa.length} .paa files`)
  const paaFiles = limit ? allPaa.slice(0, limit) : allPaa

  const results: PaaResult[] = []
  let ok = 0, failed = 0
  const t0 = Date.now()
  for (let i = 0; i < paaFiles.length; i++) {
    try {
      const buf = await readPaaFrom7z(sevenZ, paaFiles[i])
      const res = parsePaa(buf, paaFiles[i])
      results.push(res)
      if (res.parseOk) ok++
      else failed++
    } catch (e) {
      failed++
    }
    if ((i + 1) % 100 === 0) {
      const elapsed = (Date.now() - t0) / 1000
      const rate = (i + 1) / elapsed
      const eta = (paaFiles.length - i - 1) / rate
      console.log(`  ${i + 1}/${paaFiles.length} (${ok} ok, ${failed} fail) — ${rate.toFixed(1)}/s, ETA ${Math.round(eta)}s`)
    }
  }
  console.log(`\nParsed ${ok}/${paaFiles.length} OK, ${failed} failed`)

  // Stats
  const durations = results.filter(r => r.parseOk).map(r => r.animationDurationMs)
  if (durations.length) {
    durations.sort((a, b) => a - b)
    const sum = durations.reduce((s, d) => s + d, 0)
    console.log(`\nduration stats (ms): min=${durations[0]}, median=${durations[Math.floor(durations.length / 2)]}, max=${durations[durations.length - 1]}, mean=${Math.round(sum / durations.length)}`)
  }

  console.log('\n=== first 5 results ===')
  for (const r of results.slice(0, 5)) {
    console.log(`  ${r.file}: boneCount=${r.boneCount}, durationMs=${r.animationDurationMs}, frames=${r.frameCount}, parseOk=${r.parseOk}`)
  }

  if (out) {
    await writeFile(out, JSON.stringify(results, null, 2))
    console.log(`\nWrote ${out}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
