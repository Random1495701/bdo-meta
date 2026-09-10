// Backfill pvpDamagePercent for maxRank skills that are missing it.
//
// Two-phase strategy:
//   Phase 1 (DB-only, fast): re-parse existing damageRowsJson for pvpOnly note
//   rows that the original sync-skills.ts parser missed because its regex was
//   too strict (it only matched "X% damage in PvP" but missed the more common
//   bdocodex patterns "X% attack 1 damage in PvP", "X% spin attack damage in
//   PvP", "X% blade attack damage in PvP", etc.).
//
//   Phase 2 (network, rate-limited): for the remaining active-looking skills
//   whose damageRowsJson contains no PvP% row at all, re-fetch the tooltip
//   from bdocodex (tip.php) and parse the description div with the improved
//   regex. bdocodex tooltips occasionally gain PvP% lines after balance
//   patches, so re-fetching recovers data that was never scraped.
//
// Multi-phase PvP% (e.g. "70.5% attack 1", "70.5% extra attack", "55% last
// attack" on the same skill) is collapsed to a simple average — matches the
// single-percent semantics of pvpDamagePercent in src/lib/damage.ts.
//
// Usage:
//   bun run scripts/backfill-pvp-percent.ts            # both phases
//   bun run scripts/backfill-pvp-percent.ts --phase1   # DB-only (no network)
//   bun run scripts/backfill-pvp-percent.ts --phase2   # network only
//   bun run scripts/backfill-pvp-percent.ts --dry-run  # no DB writes

import { db } from '../src/lib/db'

// --- Types -----------------------------------------------------------------

type DamageRow = {
  label: string
  value?: string
  pvpOnly?: boolean
  pveOnly?: boolean
  kind: string
}

// --- Helpers ---------------------------------------------------------------

// Matches any "X% [phase] damage in PvP [only]" line — far more permissive
// than the original sync-skills.ts regex `^(\d+(?:\.\d+)?)%\s+damage in PvP`
// which required "damage" to be the very next word after the percentage.
const PVP_PERCENT_REGEX = /^(\d+(?:\.\d+)?)%[^]*?\bdamage in PvP/i

function parseRows(json: unknown): DamageRow[] {
  if (!json) return []
  if (typeof json === 'string') {
    try {
      const parsed = JSON.parse(json)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return Array.isArray(json) ? (json as DamageRow[]) : []
}

// Extract a single overall PvP% from a list of damage rows.
// Returns null if no pvpOnly note row matches the pattern.
function computePvpPercent(rows: DamageRow[]): number | null {
  const pvpRows = rows.filter(
    (r) =>
      r.pvpOnly === true &&
      r.kind === 'note' &&
      PVP_PERCENT_REGEX.test(r.label),
  )
  if (pvpRows.length === 0) return null

  const vals = pvpRows.map((r) => {
    const m = r.label.match(PVP_PERCENT_REGEX)!
    return parseFloat(m[1])
  })

  if (vals.length === 1) return vals[0]

  // Multiple per-phase PvP% — collapse to simple average (matches the
  // single-percent semantics of pvpDamagePercent in damage.ts).
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  return Math.round(avg * 100) / 100
}

// Passive-like skill name patterns that don't have meaningful PvP damage.
const PASSIVE_NAME_RE =
  /^(Training|Passive|Blessing|Buff|Evasion|Evasive|Elvia:|PRI|DUO|TRI|TET|PEN|Chain:|Succession:|Awakening:|Flow:|Prime: Absolute|Absolute|Rabam)/i

function isActiveLooking(name: string): boolean {
  return !PASSIVE_NAME_RE.test(name)
}

// Extract PvP% from raw bdocodex tooltip HTML.
// The description div contains lines like:
//   <span ...>33.92%</span><span ...> damage in PvP only </span>
//   <span ...>70.5% </span><span ...>attack 1 damage</span> <span ...>in PvP only </span>
//
// IMPORTANT: Ultimate / Prime skills have TWO <div id="description"> blocks —
// the first is the base skill's description, the second is the Ultimate's
// modified description (which usually has the PvP% line). A naive
// non-greedy `/<div id="description">([\s\S]*?)<\/div>/` matches only the
// first block and misses the PvP% entirely. Use a global regex and prefer
// the LAST description's PvP% (the Ultimate/Prime version supersedes base).
function parsePvpFromTooltip(html: string): number | null {
  const descRegex = /<div id="description">([\s\S]*?)<\/div>/g
  const allPercents: number[] = []
  let descMatch: RegExpExecArray | null
  while ((descMatch = descRegex.exec(html)) !== null) {
    const desc = descMatch[1]
    const lines = desc.split(/<br\s*\/?>/i)
    const percentsThisBlock: number[] = []
    for (const lineRaw of lines) {
      const text = lineRaw.replace(/<[^>]+>/g, '').trim()
      if (!text) continue
      const m = text.match(PVP_PERCENT_REGEX)
      if (m) percentsThisBlock.push(parseFloat(m[1]))
    }
    if (percentsThisBlock.length > 0) {
      // Collapse per-block to a single value (simple average if multi-phase),
      // then add to the global list. Last block wins (Ultimate/Prime variant).
      const blockVal =
        percentsThisBlock.length === 1
          ? percentsThisBlock[0]
          : Math.round(
              (percentsThisBlock.reduce((a, b) => a + b, 0) /
                percentsThisBlock.length) *
                100,
            ) / 100
      allPercents.push(blockVal)
    }
  }
  if (allPercents.length === 0) return null
  // Prefer the LAST description block (Ultimate/Prime variant) — its PvP%
  // supersedes the base skill's value.
  return allPercents[allPercents.length - 1]
}

async function fetchTooltip(skillId: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://bdocodex.com/tip.php?id=skill--${skillId}&l=us&nf=on`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; BDO-Meta-backfill/1.0; +https://github.com)',
        },
        signal: AbortSignal.timeout(10000),
      },
    )
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

// --- Phase 1: DB-only reparse ----------------------------------------------

async function phase1(dryRun: boolean): Promise<{
  found: number
  updated: number
  samples: { skillId: number; name: string; className: string; pvp: number }[]
}> {
  const missing = await db.skill.findMany({
    where: {
      isMaxRank: true,
      pvpDamagePercent: null,
      damageRowsJson: { not: null },
    },
    select: { skillId: true, name: true, className: true, damageRowsJson: true },
  })

  console.log(
    `[Phase 1] ${missing.length} maxRank skills missing pvpDamagePercent with damage rows`,
  )

  const samples: { skillId: number; name: string; className: string; pvp: number }[] = []
  let found = 0
  let updated = 0

  for (const s of missing) {
    const rows = parseRows(s.damageRowsJson)
    const pvp = computePvpPercent(rows)
    if (pvp === null) continue
    found++
    if (samples.length < 15) {
      samples.push({ skillId: s.skillId, name: s.name, className: s.className, pvp })
    }
    if (!dryRun) {
      await db.skill.update({
        where: { skillId: s.skillId },
        data: { pvpDamagePercent: pvp },
      })
      updated++
    }
  }

  console.log(`[Phase 1] found ${found} skills with PvP% in existing damageRowsJson`)
  if (dryRun) {
    console.log(`[Phase 1] (dry-run — no DB writes)`)
  } else {
    console.log(`[Phase 1] updated ${updated} rows in DB`)
  }
  if (samples.length > 0) {
    console.log(`[Phase 1] samples:`)
    for (const s of samples) {
      console.log(`    ${s.skillId} ${s.className} | ${s.name} => ${s.pvp}%`)
    }
  }

  return { found, updated, samples }
}

// --- Phase 2: network backfill from bdocodex ------------------------------

async function phase2(
  dryRun: boolean,
  batchSize = 5,
  rateLimitPerSec = 3,
): Promise<{
  found: number
  updated: number
  failed: number
  samples: { skillId: number; name: string; className: string; pvp: number }[]
}> {
  // Only fetch tooltips for skills still missing pvpDamagePercent after Phase 1
  // and that look like active damage skills (skip passives/training/buffs).
  const stillMissing = await db.skill.findMany({
    where: {
      isMaxRank: true,
      pvpDamagePercent: null,
      damageRowsJson: { not: null },
      isPassive: false,
      isBlackSpirit: false,
    },
    select: { skillId: true, name: true, className: true },
  })

  const active = stillMissing.filter((s) => isActiveLooking(s.name))
  console.log(
    `[Phase 2] ${stillMissing.length} skills still missing pvpDamagePercent; ${active.length} look active (will fetch tooltips)`,
  )

  const samples: { skillId: number; name: string; className: string; pvp: number }[] = []
  let found = 0
  let updated = 0
  let failed = 0
  // Total throughput is capped at `rateLimitPerSec` requests/sec. With
  // `batchSize` requests in parallel per batch, each batch must take at least
  // batchSize/rateLimitPerSec seconds to stay under the cap.
  const batchDelayMs = Math.ceil((batchSize / rateLimitPerSec) * 1000)

  // Process in batches of `batchSize`, with a delay between batches to respect
  // the rate limit. Within a batch, requests run in parallel.
  for (let i = 0; i < active.length; i += batchSize) {
    const batchStart = Date.now()
    const batch = active.slice(i, i + batchSize)
    const results = await Promise.all(
      batch.map(async (s) => {
        const html = await fetchTooltip(s.skillId)
        if (html === null) {
          return { skill: s, pvp: null as number | null, failed: true }
        }
        const pvp = parsePvpFromTooltip(html)
        return { skill: s, pvp, failed: false }
      }),
    )

    for (const r of results) {
      if (r.failed) {
        failed++
        continue
      }
      if (r.pvp === null) continue
      found++
      if (samples.length < 15) {
        samples.push({
          skillId: r.skill.skillId,
          name: r.skill.name,
          className: r.skill.className,
          pvp: r.pvp,
        })
      }
      if (!dryRun) {
        await db.skill.update({
          where: { skillId: r.skill.skillId },
          data: { pvpDamagePercent: r.pvp },
        })
        updated++
      }
    }

    // Progress every ~10 batches
    if (Math.floor(i / batchSize) % 10 === 0 && i > 0) {
      console.log(
        `[Phase 2] progress: ${i}/${active.length} fetched, found=${found}, failed=${failed}`,
      )
    }

    // Rate-limit delay between batches (subtract the time the batch already took)
    const elapsed = Date.now() - batchStart
    const remaining = batchDelayMs - elapsed
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining))
    }
  }

  console.log(
    `[Phase 2] fetched ${active.length} tooltips; found ${found} with PvP%; failed=${failed}`,
  )
  if (dryRun) {
    console.log(`[Phase 2] (dry-run — no DB writes)`)
  } else {
    console.log(`[Phase 2] updated ${updated} rows in DB`)
  }
  if (samples.length > 0) {
    console.log(`[Phase 2] samples:`)
    for (const s of samples) {
      console.log(`    ${s.skillId} ${s.className} | ${s.name} => ${s.pvp}%`)
    }
  }

  return { found, updated, failed, samples }
}

// --- Main ------------------------------------------------------------------

async function main() {
  const args = new Set(process.argv.slice(2))
  const dryRun = args.has('--dry-run')
  const onlyPhase1 = args.has('--phase1')
  const onlyPhase2 = args.has('--phase2')

  if (dryRun) console.log('=== DRY RUN — no DB writes ===\n')

  const before = await db.skill.count({
    where: { isMaxRank: true, pvpDamagePercent: null },
  })
  console.log(`Before backfill: ${before} maxRank skills missing pvpDamagePercent\n`)

  let p1Found = 0
  let p1Updated = 0
  let p2Found = 0
  let p2Updated = 0
  let p2Failed = 0

  if (!onlyPhase2) {
    const p1 = await phase1(dryRun)
    p1Found = p1.found
    p1Updated = p1.updated
    console.log('')
  }

  if (!onlyPhase1) {
    const p2 = await phase2(dryRun)
    p2Found = p2.found
    p2Updated = p2.updated
    p2Failed = p2.failed
    console.log('')
  }

  const after = await db.skill.count({
    where: { isMaxRank: true, pvpDamagePercent: null },
  })
  console.log('=== Summary ===')
  console.log(`Before:            ${before} missing`)
  console.log(`Phase 1 (DB):      found=${p1Found} updated=${p1Updated}`)
  console.log(`Phase 2 (network): found=${p2Found} updated=${p2Updated} failed=${p2Failed}`)
  console.log(`After:             ${after} missing`)
  console.log(`Net reduction:     ${before - after} skills backfilled`)

  await db.$disconnect()
}

main().catch((err) => {
  console.error('Backfill failed:', err)
  process.exit(1)
})
