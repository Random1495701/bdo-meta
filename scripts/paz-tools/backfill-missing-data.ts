#!/usr/bin/env bun
/**
 * Backfill missing data from PAZ-sourced tooltip extracts:
 *   1. BSR pvp% (23 skills) — copied from non-BSR counterparts (BSR = 100% rage version)
 *   2. Active skill damageRows (1 skill — Absorb Heuklang) — copied from counterpart
 *   3. Multi-attack animation phases (298 skills) — stored in new `animationPhasesJson` column
 *   4. BSR rage cost (default 100% for all BSR skills; tooltiptable decode is a future RE task)
 *
 * Output: updates the skills table in-place. Idempotent — re-running is safe.
 */
import { db } from '../../src/lib/db'
import { readFileSync, writeFileSync } from 'node:fs'

type MultiPhaseEntry = {
  skillId: number
  skillName: string
  btString: string
  base: string
  primaryAnimMs: number | null
  phases: { phase: number; file: string; actionName: string; durationMs: number | null }[]
}

type BsrBackfill = { skillId: number; fromSkillId: number; pvpDamagePercent: number }

async function main() {
  // 1. BSR pvp% backfill (23 entries)
  const bsrBackfill: BsrBackfill[] = JSON.parse(readFileSync('data/bsr-pvp-backfill.json', 'utf-8'))
  console.log(`BSR pvp% backfill: ${bsrBackfill.length} entries`)
  let bsrUpdated = 0
  for (const e of bsrBackfill) {
    const res = await db.skill.updateMany({
      where: { skillId: e.skillId, pvpDamagePercent: null },
      data: { pvpDamagePercent: e.pvpDamagePercent },
    })
    bsrUpdated += res.count
  }
  console.log(`  BSR skills updated with pvp%: ${bsrUpdated}`)

  // 2. Active skills damageRowsJson backfill (1 entry — Absorb Heuklang)
  const activeBackfill = JSON.parse(readFileSync('data/active-skills-damage-backfill.json', 'utf-8')) as
    Array<{ skillId: number; fromSkillId: number; hasDamageRows: boolean; hasPvpPct: boolean }>
  console.log(`Active skills damage backfill: ${activeBackfill.length} entries`)
  let activeUpdated = 0
  for (const e of activeBackfill) {
    if (!e.hasDamageRows) continue
    const from = await db.skill.findUnique({
      where: { skillId: e.fromSkillId },
      select: { damageRowsJson: true, pvpDamagePercent: true },
    })
    if (!from?.damageRowsJson) continue
    const data: { damageRowsJson?: string; pvpDamagePercent?: number } = { damageRowsJson: from.damageRowsJson }
    if (e.hasPvpPct && from.pvpDamagePercent !== null) data.pvpDamagePercent = from.pvpDamagePercent
    const res = await db.skill.updateMany({ where: { skillId: e.skillId, damageRowsJson: null }, data })
    activeUpdated += res.count
  }
  console.log(`  Active skills updated with damageRows: ${activeUpdated}`)

  // 3. Multi-attack animation phases — store as JSON in animationPhasesJson column
  const multi: MultiPhaseEntry[] = JSON.parse(readFileSync('data/skill-multi-attack-durations.json', 'utf-8'))
  console.log(`\nMulti-attack animation phases: ${multi.length} entries`)
  const validMulti = multi.filter(m => m.phases.some(p => p.durationMs != null))
  console.log(`  with valid durations: ${validMulti.length}`)
  // Stats: how many phases per skill?
  const phaseDist: Record<number, number> = {}
  for (const m of validMulti) phaseDist[m.phases.length] = (phaseDist[m.phases.length] || 0) + 1
  console.log(`  phase count distribution:`, phaseDist)

  let phasesUpdated = 0
  let totalPhases = 0
  for (const m of validMulti) {
    const phases = m.phases.filter(p => p.durationMs != null).map(p => ({
      phase: p.phase,
      durationMs: p.durationMs,
      file: p.file,
    }))
    if (phases.length < 2) continue // only multi-attack
    const phasesJson = JSON.stringify(phases)
    const res = await db.skill.updateMany({
      where: { skillId: m.skillId },
      data: { animationPhasesJson: phasesJson },
    })
    phasesUpdated += res.count
    totalPhases += phases.length
  }
  console.log(`  skills updated with phases: ${phasesUpdated}`)
  console.log(`  total phases stored: ${totalPhases}`)

  // 4. BSR cost — default 100% for all BSR skills (BSR skills cost 100% Black Spirit rage)
  const bsrCostRes = await db.skill.updateMany({
    where: { isBlackSpirit: true, bsrCostPercent: null },
    data: { bsrCostPercent: 100.0 },
  })
  console.log(`\nBSR cost default (100%) applied to: ${bsrCostRes.count} skills`)

  console.log(`\n=== SUMMARY ===`)
  console.log(`  BSR pvp% backfilled:          ${bsrUpdated}`)
  console.log(`  Active damageRows backfilled: ${activeUpdated}`)
  console.log(`  Multi-attack phases stored:  ${phasesUpdated} (total ${totalPhases} phases)`)
  console.log(`  BSR cost defaulted:           ${bsrCostRes.count}`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
