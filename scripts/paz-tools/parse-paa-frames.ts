#!/usr/bin/env bun
/**
 * Parse BDO `.paa` (Pearl Abyss Animation) files → extract animationDurationMs.
 *
 * Format reference: XeNTaX forum thread "Black Desert Online File Formats
 * (PAB, PAC, PAA)" — https://xentaxbackup.github.io (topic 11849).
 * The key insight: BDO .paa files have a float `animationDuration` (seconds)
 * at offset 0x12, right after the `boneCount` u16 at 0x10. Framerate is 30 FPS.
 *
 * Header layout (verified against phm_01_01_att_skill_shield_dashthrust_01.paa):
 *   0x00-0x03  "PAR " magic (4 bytes)
 *   0x04-0x07  version/flags (4 bytes: 02 02 00 01 in observed files)
 *   0x08-0x0F  8-byte signature (incrementing 02 03 04 05 06 07 08 09)
 *   0x10-0x11  boneCount (u16 LE)
 *   0x12-0x15  animationDuration (float LE, in SECONDS)  ← THE FIELD WE WANT
 *   0x16-0x19  4 unknown bytes
 *   0x1A+      per-bone keyframe data (see parseBoneData below)
 *
 * Per-bone keyframe data (repeats boneCount times):
 *   u32 boneHash
 *   u16 scaleKeyframeCount, then scaleKeyframeCount × (half keyframe + 3× half scale) = ×8 bytes
 *   u16 rotationKeyframeCount, then rotationKeyframeCount × (half keyframe + 4× half quat) = ×10 bytes
 *   u16 positionKeyframeCount, then positionKeyframeCount × (half keyframe + 3× half pos) = ×8 bytes
 *
 * Keyframe timing: each keyframe's u16 value, divided by 33, gives the frame
 * index. BDO animation framerate is 30 FPS (NumFrames = animationDuration × 30).
 *
 * Usage:
 *   bun run scripts/parse-paa-frames.ts --paa-dir ./data/raw-paa --out ./data/animations.json
 *   bun run scripts/parse-paa-frames.ts --paa-file ./phm_01_01_att_skill_shield_dashthrust_01.paa
 *
 * Output: Array<{ skillId: number, actionName: string, animationDurationMs: number, frameCount: number, boneCount: number }>
 *
 * The skillId is extracted from the filename pattern `{prefix}_NN_NN_..._{skillname}_{NN}.paa`
 * (e.g. `phm_01_01_att_skill_shield_dashthrust_01.paa` → actionName = "Att_Skill_Shield_DashThrust_01").
 * The mapping from .paa filename → BDO skillId is done by the .paac action
 * chart index (see parse-paac-index.ts) which lists actionName → .paa path.
 */

import { readdir, readFile, writeFile, stat } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    'paa-dir': { type: 'string' },
    'paa-file': { type: 'string' },
    'out': { type: 'string' },
  },
})

type PaaAnimation = {
  file: string
  actionName: string                  // extracted from filename
  animationDurationMs: number         // = animationDuration × 1000
  animationDurationSec: number       // the raw float
  frameCount: number                 // = int(animationDuration × 30)
  boneCount: number
  parseOk: boolean
  bytesConsumed: number              // should equal file size if parse is clean
  fileSize: number
}

// Read a little-endian u16
function u16(buf: Buffer, off: number): number {
  return buf.readUInt16LE(off)
}

// Read a little-endian u32
function u32(buf: Buffer, off: number): number {
  return buf.readUInt32LE(off)
}

// Read a little-endian float32
function f32(buf: Buffer, off: number): number {
  return buf.readFloatLE(off)
}

/**
 * Parse a single .paa file. Returns the animation metadata + a parse-OK flag.
 * parseOk is true iff the parser consumed exactly the whole file (strong
 * signal that the format interpretation is correct for this file).
 */
function parsePaa(buf: Buffer, file: string): PaaAnimation {
  const fileSize = buf.length
  const actionName = actionNameFromPath(file)

  // Minimum header size check
  if (fileSize < 0x1a + 6) {
    return { file, actionName, animationDurationMs: 0, animationDurationSec: 0, frameCount: 0, boneCount: 0, parseOk: false, bytesConsumed: 0, fileSize }
  }

  // Magic check (be tolerant — accept "PAR " and any 4-byte prefix; warn if not PAR)
  const magic = buf.toString('ascii', 0, 4)
  if (magic !== 'PAR ') {
    return { file, actionName, animationDurationMs: 0, animationDurationSec: 0, frameCount: 0, boneCount: 0, parseOk: false, bytesConsumed: 0, fileSize }
  }

  const boneCount = u16(buf, 0x10)
  const animationDurationSec = f32(buf, 0x12)
  // 4 unknown bytes at 0x16 are skipped
  let off = 0x1a

  // Parse bone data to validate the structure (and reach EOF cleanly)
  let bonesParsed = 0
  for (let i = 0; i < boneCount; i++) {
    // u32 boneHash
    if (off + 4 > fileSize) break
    off += 4 // boneHash (u32)

    // scaleKeyframeCount + scaleData (each entry = 2 + 6 = 8 bytes)
    if (off + 2 > fileSize) break
    const scaleCount = u16(buf, off)
    off += 2 + scaleCount * 8

    // rotationKeyframeCount + rotData (each entry = 2 + 8 = 10 bytes)
    if (off + 2 > fileSize) break
    const rotCount = u16(buf, off)
    off += 2 + rotCount * 10

    // positionKeyframeCount + posData (each entry = 2 + 6 = 8 bytes)
    if (off + 2 > fileSize) break
    const posCount = u16(buf, off)
    off += 2 + posCount * 8

    bonesParsed++
  }

  // parseOk: consumed all boneCount bones AND reached exactly EOF
  const parseOk = bonesParsed === boneCount && off === fileSize

  // Sanity-check the animationDuration float (BDO skill anims are 0.1s–10s)
  const durationPlausible = animationDurationSec > 0 && animationDurationSec < 60

  return {
    file,
    actionName,
    animationDurationSec: durationPlausible ? animationDurationSec : 0,
    animationDurationMs: durationPlausible ? Math.round(animationDurationSec * 1000) : 0,
    frameCount: durationPlausible ? Math.round(animationDurationSec * 30) : 0,
    boneCount,
    parseOk: parseOk && durationPlausible,
    bytesConsumed: off,
    fileSize,
  }
}

/**
 * Extract the action name from the .paa filename.
 * `phm_01_01_att_skill_shield_dashthrust_01.paa` → `Att_Skill_Shield_DashThrust_01`
 * Pattern: `{prefix}_{NN}_{NN}_{actionname}_{NN}.paa` where actionname is
 * everything from the 3rd underscore-separated segment onward.
 */
function actionNameFromPath(file: string): string {
  const b = basename(file).replace(/\.paa$/i, '')
  const parts = b.split('_')
  // Skip the first 2 segments (prefix + first number), join the rest, drop the trailing number
  if (parts.length < 4) return b
  const middle = parts.slice(2, -1) // e.g. ['att', 'skill', 'shield', 'dashthrust']
  return middle.map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).join('_')
}

async function main() {
  const paaDir = values['paa-dir']
  const paaFile = values['paa-file']
  const out = values.out ?? './data/animations.json'

  const files: string[] = []
  if (paaFile) {
    files.push(paaFile)
  } else if (paaDir) {
    const all = await readdir(paaDir, { recursive: true })
    for (const f of all) files.push(join(paaDir, f.toString()))
  } else {
    console.error('Provide --paa-file <path> or --paa-dir <dir>')
    process.exit(1)
  }

  const paaFiles = files.filter(f => f.toLowerCase().endsWith('.paa'))
  console.log(`Found ${paaFiles.length} .paa files`)

  const results: PaaAnimation[] = []
  let parsed = 0, ok = 0, failed = 0
  for (const file of paaFiles) {
    try {
      const buf = await readFile(file)
      const res = parsePaa(buf, file)
      results.push(res)
      if (res.parseOk) ok++
      else failed++
    } catch (e) {
      failed++
    }
    if (++parsed % 500 === 0) console.log(`  ${parsed}/${paaFiles.length}`)
  }

  console.log(`\nParsed ${ok}/${paaFiles.length} OK, ${failed} failed/partial`)

  // Sample output
  console.log('\n=== first 5 results ===')
  for (const r of results.slice(0, 5)) {
    console.log(`  ${r.file}`)
    console.log(`    boneCount=${r.boneCount}, durationMs=${r.animationDurationMs}, frames=${r.frameCount}, parseOk=${r.parseOk}`)
  }

  // Stats
  const durations = results.filter(r => r.parseOk).map(r => r.animationDurationMs)
  if (durations.length) {
    durations.sort((a, b) => a - b)
    const sum = durations.reduce((s, d) => s + d, 0)
    console.log(`\n=== duration stats (ms) across ${durations.length} parsed files ===`)
    console.log(`  min: ${durations[0]}, median: ${durations[Math.floor(durations.length / 2)]}, max: ${durations[durations.length - 1]}, mean: ${Math.round(sum / durations.length)}`)
  }

  if (out) {
    await writeFile(out, JSON.stringify(results, null, 2))
    console.log(`\nWrote ${out}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
