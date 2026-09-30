#!/usr/bin/env bun
/**
 * Parse BDO skill.dbss + buff.dbss → extract cooldown + CC types + CC durations
 * for every skill. This is the "combat data" piece of the PAZ pipeline.
 *
 * Format discoveries (reverse-engineered 2026-09-13):
 *
 *   skill.dbss record (variable-length):
 *     - Variable prefix (0-15 bytes header + optional inline string)
 *     - Cooldown as u32 LE (ms) — find via heuristic: first plausible value
 *       in range [1000, 600000] that's a multiple of 1000, excluding false
 *       positives (multiples of 32000 ≥ 64000). Validated 98% match against
 *       our bdocodex-scraped DB.
 *     - Buff list: u16 values starting at cd_offset + 4, terminated by 0
 *       or an index absent from buff.dbss. Max 40 entries.
 *
 *   buff.dbss record (per FORMATS.md + verified):
 *     - u16 Index
 *     - i64 name_len + UTF-16 LE Name (Korean, e.g. '[액션제한] 스턴' = Stun)
 *     - 12 bytes: Category(i16) CategoryLevel(u8) Level(u8) Group(i16)
 *                 Condition(i16) Module(u8) BuffType(u8) IsAbsolute(u8) IsOverlapped(u8)
 *     - 92 bytes EffectData
 *     - i32 DurationMs (the CC/buff duration)
 *
 *   CC type mapping (from Korean buff names, module 14 = action limit):
 *     '[액션제한] 스턴'     → Stun
 *     '[액션제한] 넉백'     → Knockback
 *     '[액션제한] 넉다운'   → Knockdown
 *     '[액션제한] 에어스매쉬' → Air Smash
 *     '[액션제한] 다운스매쉬' → Down Smash
 *     '[액션제한] 플로트'   → Float
 *     ... (more in CC_TYPE_MAP below)
 *
 * Usage:
 *   bun run scripts/paz-tools/parse-skill-buffs.ts \
 *     --skill-dir ./tool-results/bdo-binary-tables/skill \
 *     --buff-dir ./tool-results/bdo-binary-tables/buff \
 *     --out ./data/skill-combat-data.json
 */

import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    'skill-dir': { type: 'string' },
    'buff-dir': { type: 'string' },
    'out': { type: 'string' },
  },
})

// Korean CC type names → English (the [액션제한] = "action limit" prefix marks CC states)
const CC_TYPE_MAP: Record<string, string> = {
  '스턴': 'Stun',
  '넉백': 'Knockback',
  '넉다운': 'Knockdown',
  '에어스매쉬': 'Air Smash',
  '다운스매쉬': 'Down Smash',
  '플로트': 'Float',
  '띄우기': 'Float',              // "lift" = Float
  '스핀': 'Spin the target',
  'push': 'Push the target',
  '밀치기': 'Push the target',
  '그랩': 'Grapple',
  '스텀블': 'Stumble',
  '프리즈': 'Freeze',
  '빙결': 'Freeze',              // "freeze" = Freeze
  '캐치': 'Catch',
  '끌어당기기': 'Pull',
  '다운': 'Down',
  '스매쉬': 'Smash',
  '바운드': 'Bound',
  'bound': 'Bound',
  'knockdown': 'Knockdown',
  '경직': 'Stiffness',           // "stiffness" = Stiffness (a CC state)
  '가드크러시': 'Guard Crush',   // "guard crush"
  '가드 크러쉬': 'Guard Crush',
  '저항 무시': '',               // "ignore resistance" prefix — not a CC type itself
}

function extractCcType(buffName: string): string | null {
  // Strip duration suffixes like "1.5 초" (1.5 sec), "1초", "2 초" for cleaner matching
  const cleaned = buffName.replace(/\s*\d+(?:\.\d+)?\s*초\s*/g, '').trim()
  // Check for [액션제한] prefix (action limit = CC state)
  const ccMatch = cleaned.match(/\[액션제한\]\s*(.+)/)
  if (ccMatch) {
    let ccKr = ccMatch[1].trim()
    // Strip "저항 무시" (ignore resistance) prefix — keep the underlying CC
    ccKr = ccKr.replace(/^저항 무시\s*/, '').replace(/^공용\s*/, '').trim()
    // Try exact match first, then partial
    if (CC_TYPE_MAP[ccKr]) return CC_TYPE_MAP[ccKr]
    for (const [kr, en] of Object.entries(CC_TYPE_MAP)) {
      if (ccKr.includes(kr) && en) return en
    }
    return ccKr // unknown CC, keep Korean
  }
  return null
}

// --- PABR offset index parser (handles both 10-byte and 12-byte rows) ---
type IndexEntry = { key: number, offset: number, size: number }

function parseOffsetIndex(offData: Buffer): IndexEntry[] {
  if (offData.length < 16 || offData.toString('ascii', 0, 4) !== 'PABR') {
    throw new Error('not a PABR file')
  }
  const rows = offData.readUInt32LE(4)
  const stPos = Number(offData.readBigUInt64LE(offData.length - 8))
  const span = stPos - 8
  const bytesPerRow = span / rows
  const entries: IndexEntry[] = []
  if (bytesPerRow === 12) {
    // [u32 key][u32 offset][u32 size]
    for (let i = 0; i < rows; i++) {
      const o = 8 + i * 12
      if (o + 12 > stPos) break
      entries.push({
        key: offData.readUInt32LE(o),
        offset: offData.readUInt32LE(o + 4),
        size: offData.readUInt32LE(o + 8),
      })
    }
  } else if (bytesPerRow === 10) {
    // [u16 key][u32 offset][u32 size]
    for (let i = 0; i < rows; i++) {
      const o = 8 + i * 10
      if (o + 10 > stPos) break
      entries.push({
        key: offData.readUInt16LE(o),
        offset: offData.readUInt32LE(o + 2),
        size: offData.readUInt32LE(o + 6),
      })
    }
  } else {
    throw new Error(`unknown offset index row size: ${bytesPerRow}`)
  }
  return entries
}

// --- Cooldown finder (heuristic, validated 98% match) ---
function findCooldown(rec: Buffer): { offset: number, valueMs: number } | null {
  for (let i = 0; i < rec.length - 3; i++) {
    const v = rec.readUInt32LE(i)
    if (v >= 1000 && v <= 600000 && v % 1000 === 0) {
      // Exclude false positives: multiples of 32000 ≥ 64000 (bit-flag patterns)
      if (v % 32000 === 0 && v >= 64000) continue
      if ([512000, 256000, 224000].includes(v)) continue
      return { offset: i, valueMs: v }
    }
  }
  return null
}

// --- Buff reader ---
type Buff = { index: number, name: string, module: number, durationMs: number, ccType: string | null }

function readBuff(bid: number, buffData: Buffer, buffByKey: Map<number, IndexEntry>): Buff | null {
  const e = buffByKey.get(bid)
  if (!e) return null
  const brec = buffData.subarray(e.offset, e.offset + e.size)
  if (brec.length < 10) return null
  const idx = brec.readUInt16LE(0)
  const nameLen = Number(brec.readBigInt64LE(2))
  if (nameLen < 0 || nameLen > 200) return null
  const name = brec.subarray(10, 10 + nameLen * 2).toString('utf16le')
  const after = 10 + nameLen * 2
  if (after + 12 > brec.length) return null
  const moduleByte = brec[after + 8]
  const effStart = after + 12
  const durOff = effStart + 92
  if (durOff + 4 > brec.length) return null
  const durationMs = brec.readInt32LE(durOff)
  return {
    index: idx,
    name,
    module: moduleByte,
    durationMs,
    ccType: extractCcType(name),
  }
}

// --- Main ---
async function main() {
  const skillDir = values['skill-dir'] ?? './tool-results/bdo-binary-tables/skill'
  const buffDir = values['buff-dir'] ?? './tool-results/bdo-binary-tables/buff'
  const out = values.out ?? './data/skill-combat-data.json'

  console.log('Loading skill.dbss + skilloffset.dbss...')
  const skillOff = await readFile(join(skillDir, 'skilloffset.dbss'))
  const skillDat = await readFile(join(skillDir, 'skill.dbss'))
  const skillEntries = parseOffsetIndex(skillOff)
  const skillByKey = new Map(skillEntries.map(e => [e.key, e]))
  console.log(`  ${skillEntries.length} skill records`)

  console.log('Loading buff.dbss + buffoffset.dbss...')
  const buffOff = await readFile(join(buffDir, 'buffoffset.dbss'))
  const buffDat = await readFile(join(buffDir, 'buff.dbss'))
  const buffEntries = parseOffsetIndex(buffOff)
  const buffByKey = new Map(buffEntries.map(e => [e.key, e]))
  console.log(`  ${buffEntries.length} buff records`)

  console.log('\nParsing skills...')
  const results: Array<{
    skillKey: number,
    skillNo: number,
    cooldownMs: number,
    cooldownSec: number,
    ccTypes: string[],
    ccDurations: Record<string, number>,
    buffs: Array<{ index: number, name: string, module: number, durationMs: number, isCc: boolean }>,
  }> = []

  let withCooldown = 0
  let withCc = 0
  const t0 = Date.now()

  for (let i = 0; i < skillEntries.length; i++) {
    const e = skillEntries[i]
    const rec = skillDat.subarray(e.offset, e.offset + e.size)
    const cd = findCooldown(rec)
    const cooldownMs = cd ? cd.valueMs : 0
    if (cooldownMs > 0) withCooldown++

    const buffs: Buff[] = []
    if (cd) {
      for (let j = cd.offset + 4; j + 2 <= rec.length; j += 2) {
        const bid = rec.readUInt16LE(j)
        if (bid === 0) break
        const b = readBuff(bid, buffDat, buffByKey)
        if (!b) break
        buffs.push(b)
        if (buffs.length >= 40) break
      }
    }

    const ccTypes: string[] = []
    const ccDurations: Record<string, number> = {}
    for (const b of buffs) {
      if (b.ccType) {
        ccTypes.push(b.ccType)
        if (b.durationMs > 0) ccDurations[b.ccType] = b.durationMs
        withCc++
      }
    }

    results.push({
      skillKey: e.key,
      skillNo: e.key >>> 16,
      cooldownMs,
      cooldownSec: cooldownMs / 1000,
      ccTypes,
      ccDurations,
      buffs: buffs.map(b => ({
        index: b.index,
        name: b.name,
        module: b.module,
        durationMs: b.durationMs,
        isCc: b.ccType !== null,
      })),
    })

    if ((i + 1) % 5000 === 0) {
      console.log(`  ${i + 1}/${skillEntries.length} (${((i + 1) / ((Date.now() - t0) / 1000)).toFixed(0)}/s)`)
    }
  }

  console.log(`\nParsed ${results.length} skills in ${((Date.now() - t0) / 1000).toFixed(1)}s`)
  console.log(`  with cooldown: ${withCooldown}`)
  console.log(`  with CC types: ${withCc}`)

  // Sample
  console.log('\n=== first 5 skills with CC ===')
  const withCcResults = results.filter(r => r.ccTypes.length > 0)
  for (const r of withCcResults.slice(0, 5)) {
    console.log(`  skillNo=${r.skillNo} cd=${r.cooldownSec}s cc=[${r.ccTypes.join(', ')}]`)
    for (const b of r.buffs.filter(b => b.isCc)) {
      console.log(`    ${b.name} (${b.durationMs > 0 ? b.durationMs + 'ms' : 'instant'})`)
    }
  }

  await writeFile(out, JSON.stringify(results, null, 2))
  console.log(`\nWrote ${out}`)
}

main().catch(e => { console.error(e); process.exit(1) })
