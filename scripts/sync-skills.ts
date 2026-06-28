/**
 * BDO Skills Database - Data Ingestion Script
 *
 * Fetches skill data from bdocodex.com (the same source the bdocodex skillbuilder uses):
 *   1. GET https://bdocodex.com/query.php?a=skills&type=skillbuilder&id=1&l=us
 *      -> DataTables JSON {aaData: [[skill_id, icon_html, name_html, required_level, class_name, 1], ...]}
 *      -> Full skill roster (~9599 rows). One request, instant.
 *
 *   2. For each class 0..34: GET https://bdocodex.com/ajax.php?a=skill_list2&class_id=N&l=us
 *      -> {result:1, data:"<HTML with skill_cells>"}
 *      -> Each .skill_cell has data-gid/data-id/data-level/data-sp/data-psid/data-psid2/data-max_level
 *      -> Lets us enrich groupId, maxLevel, skillPoints, prerequisites, and classId mapping.
 *      -> Also lets us detect Absolute / Awakening / Succession / Black Spirit from section headings.
 *
 *   3. For each skill_id: GET https://bdocodex.com/tip.php?id=skill--<id>&l=us&nf=on
 *      -> HTML tooltip with .tag_skill_name, .tag_required_class, .tag_skill-description,
 *         .tag_control, .tag_required_level, #description (damage rows / CC / protection),
 *         KR name, video source URL.
 *
 *   4. For each skill with a video URL: `ffprobe -show_entries format=duration`
 *      -> Animation duration in seconds (the bdocodex preview video shows the in-game skill
 *         animation loop, so its duration is a faithful proxy for the animation duration).
 *
 * The script is resumable: it tracks progress via the SyncLog table and skips skills that
 * already have tooltip / animation data.
 *
 * Usage:
 *   bun run scripts/sync-skills.ts                # full sync (list + trees + tooltips + videos)
 *   bun run scripts/sync-skills.ts --phase=list    # only the skill roster
 *   bun run scripts/sync-skills.ts --phase=trees   # only the per-class trees
 *   bun run scripts/sync-skills.ts --phase=tooltips --limit=400   # tooltips, capped
 *   bun run scripts/sync-skells.ts --phase=videos  # animation durations via ffprobe
 */

import { db } from '../src/lib/db'

// ----------------------------------------------------------------------------
// Config
// ----------------------------------------------------------------------------

const BDOCODEX = 'https://bdocodex.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const REFERER = `${BDOCODEX}/us/skillbuilder/`
// Be respectful to bdocodex: low concurrency + small delay keeps us under the
// anti-bot threshold. Higher values trigger the "loading page" challenge.
const CONCURRENCY = 3
const PER_REQUEST_DELAY_MS = 250 // ~12 req/sec across workers

// All 35 bdocodex class slots. Placeholder slots (NEW_CLASS) are kept so we don't break
// the indexing, but they'll usually return empty trees.
const CLASS_IDS = Array.from({ length: 35 }, (_, i) => i)

// ----------------------------------------------------------------------------
// HTTP helpers
// ----------------------------------------------------------------------------

async function httpGet(url: string, asBuffer = false): Promise<string | Buffer> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Referer: REFERER,
      Accept: '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`)
  }
  if (asBuffer) return Buffer.from(await res.arrayBuffer())
  // bdocodex serves UTF-8 with BOM; strip it.
  const text = await res.text()
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

// bdocodex serves an anti-bot "loading" page (with a base64 GIF spinner) when it
// detects rapid automated requests. The page contains "gorizontal-vertikal" and is
// ~13KB. Detect it so callers can retry with backoff.
function isBotChallengePage(html: string): boolean {
  if (html.length < 2000) return false
  return html.includes('gorizontal-vertikal') || html.includes('data:image/gif;base64,R0lGODlhQgBC')
}

// Fetch a URL with retry-on-bot-challenge. Waits longer each time bdocodex serves
// the loading page instead of the real content.
async function httpGetWithRetry(url: string, maxRetries = 4): Promise<string> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const text = (await httpGet(url)) as string
    if (!isBotChallengePage(text)) return text
    // Exponential backoff: 2s, 5s, 12s, 30s
    const wait = Math.min(30000, 2000 * Math.pow(2.5, attempt))
    await sleep(wait)
  }
  // Last attempt - return whatever we got (caller can decide to skip)
  return (await httpGet(url)) as string
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

// Concurrent pool runner with rate limit. cb receives an item and an index.
async function pool<T>(
  items: T[],
  size: number,
  cb: (item: T, index: number) => Promise<void>,
  label = 'work',
) {
  let cursor = 0
  let done = 0
  const total = items.length
  const start = Date.now()
  const errors: { item: T; err: unknown }[] = []

  async function worker(workerId: number) {
    while (true) {
      const idx = cursor++
      if (idx >= total) return
      try {
        await cb(items[idx], idx)
      } catch (err) {
        errors.push({ item: items[idx], err })
      } finally {
        done++
        if (done % 25 === 0 || done === total) {
          const elapsed = ((Date.now() - start) / 1000).toFixed(1)
          const rate = (done / Math.max(1, Date.now() - start) * 1000).toFixed(1)
          console.log(`[${label}] ${done}/${total} (${rate}/s, ${elapsed}s elapsed)`)
        }
        await sleep(PER_REQUEST_DELAY_MS)
      }
    }
  }

  await Promise.all(Array.from({ length: size }, (_, i) => worker(i)))
  if (errors.length) {
    console.warn(`[${label}] ${errors.length} errors. First few:`)
    for (const e of errors.slice(0, 5)) {
      console.warn(`  -`, (e.err as Error)?.message ?? e.err)
    }
  }
}

// ----------------------------------------------------------------------------
// HTML parsing helpers (regex-based, no dependency on a DOM lib)
// ----------------------------------------------------------------------------

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<[^>]+>/g, '') // strip remaining tags
    .trim()
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '').trim()
}

// Extract first match of a regex against a string.
function rx1(input: string, rx: RegExp): string | null {
  const m = input.match(rx)
  return m ? m[1] : null
}

// Extract all matches of a regex.
function rxAll(input: string, rx: RegExp): string[] {
  const out: string[] = []
  let m: RegExpExecArray | null
  const re = new RegExp(rx.source, rx.flags.includes('g') ? rx.flags : rx.flags + 'g')
  while ((m = re.exec(input))) {
    out.push(m[1])
  }
  return out
}

// Parse cooldown string like "5 sec", "30 sec", "1 min 30 sec", "Instant"
function parseCooldown(raw: string | null): { cooldown: string; sec: number | null } | null {
  if (!raw) return null
  const text = stripTags(raw)
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned || /^instant/i.test(cleaned)) return { cooldown: 'Instant', sec: 0 }
  let total = 0
  let matched = false
  const minMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*min/i)
  const secMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*sec/i)
  if (minMatch) {
    total += parseFloat(minMatch[1]) * 60
    matched = true
  }
  if (secMatch) {
    total += parseFloat(secMatch[1])
    matched = true
  }
  return { cooldown: cleaned, sec: matched ? total : null }
}

// ----------------------------------------------------------------------------
// Phase 1: Skill roster from query.php
// ----------------------------------------------------------------------------

interface RosterRow {
  skillId: number
  name: string
  iconPath: string | null
  requiredLevel: number
  className: string | null
}

async function fetchRoster(): Promise<RosterRow[]> {
  const url = `${BDOCODEX}/query.php?a=skills&type=skillbuilder&id=1&l=us`
  const text = (await httpGet(url)) as string
  // Strip BOM, then parse JSON
  const json = JSON.parse(text) as { aaData: [number, string, string, number, string, number][] }
  const rows: RosterRow[] = []
  for (const [skillId, iconHtml, nameHtml, requiredLevel, className] of json.aaData) {
    const name = decodeEntities(nameHtml)
    const iconPath = rx1(iconHtml, /src="([^"]+)"/)
    rows.push({
      skillId,
      name,
      iconPath: iconPath ? iconPath.replace(/^\//, '') : null,
      requiredLevel: typeof requiredLevel === 'number' ? requiredLevel : 1,
      className: className || null,
    })
  }
  return rows
}

// ----------------------------------------------------------------------------
// Phase 2: Per-class skill tree (ajax.php?a=skill_list2)
// ----------------------------------------------------------------------------

interface TreeEnrichment {
  skillId: number
  groupId: number | null
  classId: number
  skillPoints: number
  maxLevel: number
  prerequisiteIds: number[]
  isAbsolute: boolean
  isAwakening: boolean
  isSuccession: boolean
  isBlackSpirit: boolean
  isPassive: boolean
}

async function fetchClassTree(classId: number): Promise<TreeEnrichment[]> {
  const url = `${BDOCODEX}/ajax.php?a=skill_list2&class_id=${classId}&l=us`
  const text = (await httpGet(url)) as string
  // Response is JSON with {result, data:"<html>"}
  const json = JSON.parse(text) as { result: number; data: string }
  const html = json.data

  const out: TreeEnrichment[] = []
  // Split the HTML into sections by Main Skills / Awakening / Succession / Passive headings,
  // then walk each section. Headings look like:
  //   <td colspan="10" class="medium_title sb_skill_type"> Main Skills</td>
  //   <td colspan="10" class="medium_title sb_skill_type"> Awakening Skills</td>
  // We'll process by section.
  const sections = html.split(/sb_skill_type"[^>]*>\s*/)
  // First chunk is preamble (before any heading). Skip it.
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i]
    const heading = (section.split('</td>')[0] || '').toLowerCase()
    const isAbsolute = heading.includes('absolute')
    const isAwakening = heading.includes('awaken') && !isAbsolute
    const isSuccession = heading.includes('succession')
    const isBlackSpirit = heading.includes('black spirit')
    const isPassive = heading.includes('passive')

    // Find all .skill_cell divs in this section
    const cellRx = /<div class="skill_cell"[^>]*data-gid="([^"]*)"[^>]*data-id="([^"]*)"[^>]*data-level="([^"]*)"[^>]*data-sp="([^"]*)"[^>]*data-psid="([^"]*)"[^>]*data-psid2="([^"]*)"/g
    let m: RegExpExecArray | null
    while ((m = cellRx.exec(section))) {
      const groupId = m[1] && m[1] !== '0' ? parseInt(m[1], 10) : null
      const skillId = parseInt(m[2], 10)
      const sp = parseInt(m[4], 10) || 0
      const psid1 = parseInt(m[5], 10) || 0
      const psid2 = parseInt(m[6], 10) || 0
      // max_level is in a child div: <div class="level_cell current_level" data-max_level="10">
      const after = section.slice(m.index)
      const maxLevelMatch = after.match(/data-max_level="(\d+)"/)
      const maxLevel = maxLevelMatch ? parseInt(maxLevelMatch[1], 10) : 1
      const prerequisiteIds = [psid1, psid2].filter((x) => x > 0)
      out.push({
        skillId,
        groupId,
        classId,
        skillPoints: sp,
        maxLevel,
        prerequisiteIds,
        isAbsolute,
        isAwakening,
        isSuccession,
        isBlackSpirit,
        isPassive,
      })
    }
  }
  return out
}

// ----------------------------------------------------------------------------
// Phase 3: Per-skill tooltip (tip.php)
// ----------------------------------------------------------------------------

interface TooltipData {
  name: string | null
  krName: string | null
  className: string | null
  description: string | null
  command: string | null
  isQuickSlot: boolean
  cooldownRaw: string | null
  cooldownSec: number | null
  requiredLevel: number | null
  videoUrl: string | null
  damageRowsJson: string | null
  ccTypes: string | null
  protectionTypes: string | null
  pvpDamagePercent: number | null
  iconPath: string | null
  rawHtml: string
}

// Damage rows look like:
//   Attack 1 damage <span...>433% x2 </span>
//   Attack 2 damage <span...>433% x1 </span>
//   Maximum <span>10 targets</span>
//   Spin the target on hits (PvE only)
//   <span>Air Attack</span>
//   70% damage in PvP only
interface DamageRow {
  label: string
  value?: string
  pvpOnly?: boolean
  pveOnly?: boolean
  kind: 'damage' | 'target' | 'cc' | 'protection' | 'buff' | 'note' | 'pvp'
}

const CC_KEYWORDS = [
  'Knockback',
  'Knockdown',
  'Stiffness',
  'Stun',
  'Freeze',
  'Float',
  'Grapple',
  'Bound',
  'Slow',
  'Spin the target',
  'Push the target',
  'Pull the target',
  'Blind',
  'Burn',
  'Frostbite',
  'Chill',
  'Bleeding',
  'Poison',
  'Electrocute',
  'Shock',
  'Down Smash',
  'Air Smash',
  'Smash',
  'Dehydrate',
]

const PROTECTION_KEYWORDS = ['Super Armor', 'Forward Guard', 'Invincible', 'I-Frame', 'Crouching']

function parseTooltip(html: string): TooltipData {
  const name = rx1(html, /<span class="tag_skill_name">([\s\S]*?)<\/span>/)
  const krName = rx1(html, /id="item_name"><b>([\s\S]*?)<\/b>/)
  const className = rx1(html, /<span class="tag_required_class">([\s\S]*?)<\/span>/)
  const description = rx1(html, /<span class="tag_skill-description">([\s\S]*?)<\/span>/)
  const controlBlock = rx1(html, /<span class="tag_control">([\s\S]*?)<\/span>/)
  const cooldownRaw = rx1(html, /<span class="tag_cooldown">([\s\S]*?)<\/span>/)
  const requiredLevel = rx1(html, /<span class="tag_required_level">(\d+)<\/span>/)
  const videoUrl = rx1(html, /<source src="([^"]+)"/)
  const iconPath = rx1(html, /<img src="([^"]+)" alt="icon"/)

  // Parse control block: contains key + optional "Can be added to a Quick Slot"
  let command: string | null = null
  let isQuickSlot = false
  if (controlBlock) {
    isQuickSlot = /Quick Slot/i.test(controlBlock)
    command = stripTags(controlBlock).replace(/Can be added to a Quick Slot/i, '').trim()
  }

  // Parse cooldown
  let cooldownSec: number | null = null
  let cooldownStr: string | null = null
  if (cooldownRaw) {
    const parsed = parseCooldown(cooldownRaw)
    if (parsed) {
      cooldownStr = parsed.cooldown
      cooldownSec = parsed.sec
    } else {
      cooldownStr = stripTags(cooldownRaw)
    }
  }

  // Parse #description block
  const descBlock = rx1(html, /<div id="description">([\s\S]*?)<\/div>/) || ''
  const damageRows: DamageRow[] = []
  const ccFound = new Set<string>()
  const protFound = new Set<string>()
  let pvpDamagePercent: number | null = null

  // Split the description by <br>
  const lines = descBlock.split(/<br\s*\/?>/)
  for (const lineRaw of lines) {
    const line = lineRaw.trim()
    if (!line) continue
    const text = stripTags(line)
    if (!text) continue

    const pveOnly = /PvE only/i.test(text)
    const pvpOnly = /PvP only/i.test(text) || /in PvP/i.test(text)

    // Damage rows: "Attack 1 damage 433% x2"
    const dmgMatch = text.match(/^(Attack \d+ damage)\s+([\d%]+\s*x\d+|[\d%]+)/i)
    if (dmgMatch) {
      damageRows.push({
        label: dmgMatch[1],
        value: dmgMatch[2],
        pvpOnly,
        pveOnly,
        kind: 'damage',
      })
      continue
    }

    // Max targets
    const maxMatch = text.match(/^Maximum\s+(\d+\s+targets)/i)
    if (maxMatch) {
      damageRows.push({ label: 'Maximum', value: maxMatch[1], pvpOnly, pveOnly, kind: 'target' })
      continue
    }

    // Hit counts / critical etc.
    const hitMatch = text.match(/^(Hit \d+ .*?)([\d%]+.*)$/i)
    if (hitMatch) {
      damageRows.push({
        label: hitMatch[1].trim(),
        value: hitMatch[2].trim(),
        pvpOnly,
        pveOnly,
        kind: 'damage',
      })
      continue
    }

    // PvP damage multiplier: "70% damage in PvP only" or "PvP Damage Reduction 50%"
    const pvpMatch = text.match(/^(\d+(?:\.\d+)?)%\s+damage in PvP/i)
    if (pvpMatch) {
      pvpDamagePercent = parseFloat(pvpMatch[1])
      damageRows.push({
        label: 'PvP Damage',
        value: `${pvpMatch[1]}%`,
        pvpOnly: true,
        kind: 'pvp',
      })
      continue
    }

    // CC types
    let ccMatched = false
    for (const cc of CC_KEYWORDS) {
      if (text.toLowerCase().includes(cc.toLowerCase())) {
        ccFound.add(cc)
        damageRows.push({ label: cc, pvpOnly, pveOnly, kind: 'cc' })
        ccMatched = true
        break
      }
    }
    if (ccMatched) continue

    // Protection types
    let protMatched = false
    for (const prot of PROTECTION_KEYWORDS) {
      if (text.toLowerCase().includes(prot.toLowerCase())) {
        protFound.add(prot === 'Invincible' ? 'I-Frame' : prot)
        damageRows.push({ label: prot, pvpOnly, pveOnly, kind: 'protection' })
        protMatched = true
        break
      }
    }
    if (protMatched) continue

    // Otherwise a note/buff
    damageRows.push({ label: text, pvpOnly, pveOnly, kind: 'note' })
  }

  return {
    name: name ? decodeEntities(name) : null,
    krName: krName ? decodeEntities(krName) : null,
    className: className ? decodeEntities(className) : null,
    description: description ? decodeEntities(description) : null,
    command,
    isQuickSlot,
    cooldownRaw: cooldownStr,
    cooldownSec,
    requiredLevel: requiredLevel ? parseInt(requiredLevel, 10) : null,
    videoUrl: videoUrl ? videoUrl.replace(/^\/\//, 'https://') : null,
    damageRowsJson: damageRows.length ? JSON.stringify(damageRows) : null,
    ccTypes: ccFound.size ? Array.from(ccFound).join(',') : null,
    protectionTypes: protFound.size ? Array.from(protFound).join(',') : null,
    pvpDamagePercent,
    iconPath: iconPath ? iconPath.replace(/^\//, '') : null,
    rawHtml: html,
  }
}

async function fetchTooltip(skillId: number): Promise<TooltipData | null> {
  const url = `${BDOCODEX}/tip.php?id=skill--${skillId}&l=us&nf=on`
  try {
    const text = await httpGetWithRetry(url)
    if (isBotChallengePage(text)) {
      // bdocodex is still serving the loading page after retries - skip this skill.
      return null
    }
    return parseTooltip(text)
  } catch (err) {
    return null
  }
}

// ----------------------------------------------------------------------------
// Phase 4: Animation duration via ffprobe
// ----------------------------------------------------------------------------

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const execFileAsync = promisify(execFile)

async function getVideoDurationMs(url: string): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', url],
      { timeout: 15000 },
    )
    const sec = parseFloat(stdout.trim())
    if (Number.isFinite(sec) && sec > 0) {
      return Math.round(sec * 1000)
    }
    return null
  } catch {
    return null
  }
}

// ----------------------------------------------------------------------------
// SyncLog helper
// ----------------------------------------------------------------------------

async function logSync(
  type: string,
  status: string,
  count = 0,
  total?: number,
  message?: string,
) {
  await db.syncLog.create({
    data: { type, status, count, total, message },
  })
}

// ----------------------------------------------------------------------------
// Phase runners
// ----------------------------------------------------------------------------

const BDO_CLASSES: { id: number; name: string; slug: string }[] = [
  { id: 0, name: 'Warrior', slug: 'warrior' },
  { id: 1, name: 'Hashashin', slug: 'hashashin' },
  { id: 2, name: 'Sage', slug: 'sage' },
  { id: 3, name: 'Wukong', slug: 'wukong' },
  { id: 4, name: 'Ranger', slug: 'ranger' },
  { id: 5, name: 'Guardian', slug: 'guardian' },
  { id: 6, name: 'Scholar', slug: 'scholar' },
  { id: 7, name: 'Drakania', slug: 'drakania' },
  { id: 8, name: 'Sorceress', slug: 'sorceress' },
  { id: 9, name: 'Nova', slug: 'nova' },
  { id: 10, name: 'Corsair', slug: 'corsair' },
  { id: 11, name: 'Lahn', slug: 'lahn' },
  { id: 12, name: 'Berserker', slug: 'berserker' },
  { id: 15, name: 'Maegu', slug: 'maegu' },
  { id: 16, name: 'Tamer', slug: 'tamer' },
  { id: 17, name: 'Shai', slug: 'shai' },
  { id: 19, name: 'Striker', slug: 'striker' },
  { id: 20, name: 'Musa', slug: 'musa' },
  { id: 21, name: 'Maehwa', slug: 'maehwa' },
  { id: 23, name: 'Mystic', slug: 'mystic' },
  { id: 24, name: 'Valkyrie', slug: 'valkyrie' },
  { id: 25, name: 'Kunoichi', slug: 'kunoichi' },
  { id: 26, name: 'Ninja', slug: 'ninja' },
  { id: 27, name: 'Dark Knight', slug: 'dark-knight' },
  { id: 28, name: 'Wizard', slug: 'wizard' },
  { id: 29, name: 'Archer', slug: 'archer' },
  { id: 30, name: 'Woosa', slug: 'woosa' },
  { id: 31, name: 'Witch', slug: 'witch' },
  { id: 32, name: 'Seraph', slug: 'seraph' },
  { id: 33, name: 'Dosa', slug: 'dosa' },
  { id: 34, name: 'Deadeye', slug: 'deadeye' },
]

async function seedClasses() {
  console.log('[classes] seeding bdo class table...')
  for (const c of BDO_CLASSES) {
    await db.bdoClass.upsert({
      where: { id: c.id },
      create: { id: c.id, name: c.name, slug: c.slug },
      update: { name: c.name, slug: c.slug },
    })
  }
  console.log(`[classes] ${BDO_CLASSES.length} classes seeded`)
}

async function phaseList() {
  const startedAt = Date.now()
  await logSync('skill_list', 'started')
  console.log('[list] fetching skill roster from bdocodex...')
  const rows = await fetchRoster()
  console.log(`[list] got ${rows.length} skill rows. Upserting...`)

  // Build className -> classId map for FK linking
  const nameToId = new Map<string, number>()
  for (const c of BDO_CLASSES) nameToId.set(c.name.toLowerCase(), c.id)

  let n = 0
  for (const r of rows) {
    const classId = r.className ? nameToId.get(r.className.toLowerCase()) ?? null : null
    await db.skill.upsert({
      where: { skillId: r.skillId },
      create: {
        skillId: r.skillId,
        name: r.name,
        iconPath: r.iconPath,
        requiredLevel: r.requiredLevel,
        className: r.className,
        classId,
      },
      update: {
        name: r.name,
        iconPath: r.iconPath ?? undefined,
        requiredLevel: r.requiredLevel,
        className: r.className ?? undefined,
        classId: classId ?? undefined,
        syncedAt: new Date(),
      },
    })
    n++
    if (n % 500 === 0) console.log(`[list] upserted ${n}/${rows.length}`)
  }
  await logSync('skill_list', 'success', rows.length, rows.length, `${Date.now() - startedAt}ms`)
  console.log(`[list] done in ${Date.now() - startedAt}ms`)
}

async function phaseTrees() {
  const startedAt = Date.now()
  await logSync('class_tree', 'started')
  console.log('[trees] fetching per-class skill trees...')
  let total = 0
  for (const classId of CLASS_IDS) {
    try {
      const enrichments = await fetchClassTree(classId)
      for (const e of enrichments) {
        await db.skill.updateMany({
          where: { skillId: e.skillId },
          data: {
            groupId: e.groupId,
            classId: e.classId,
            skillPoints: e.skillPoints,
            maxLevel: e.maxLevel,
            prerequisiteIds: e.prerequisiteIds.length ? e.prerequisiteIds.join(',') : null,
            isAbsolute: e.isAbsolute,
            isAwakening: e.isAwakening,
            isSuccession: e.isSuccession,
            isBlackSpirit: e.isBlackSpirit,
            isPassive: e.isPassive,
          },
        })
        total++
      }
      console.log(`[trees] class ${classId}: +${enrichments.length} enrichments`)
    } catch (err) {
      console.warn(`[trees] class ${classId} failed:`, (err as Error).message)
    }
    await sleep(PER_REQUEST_DELAY_MS)
  }
  await logSync('class_tree', 'success', total, total, `${Date.now() - startedAt}ms`)
  console.log(`[trees] done, ${total} enrichments in ${Date.now() - startedAt}ms`)
}

async function phaseTooltips(limit?: number) {
  const startedAt = Date.now()
  await logSync('tooltip', 'started')
  // Only fetch tooltips for skills that don't yet have description set.
  // (Tooltip is the main enrichment; once description is set, we consider it synced.)
  const skills = await db.skill.findMany({
    where: { description: null },
    select: { skillId: true },
    orderBy: { skillId: 'asc' },
    ...(limit ? { take: limit } : {}),
  })
  console.log(`[tooltips] ${skills.length} skills to fetch${limit ? ` (capped at ${limit})` : ''}`)
  let done = 0
  let ok = 0

  await pool(
    skills,
    CONCURRENCY,
    async (s) => {
      const tip = await fetchTooltip(s.skillId)
      if (tip) {
        await db.skill.update({
          where: { skillId: s.skillId },
          data: {
            name: tip.name ?? undefined,
            krName: tip.krName ?? undefined,
            className: tip.className ?? undefined,
            description: tip.description ?? undefined,
            command: tip.command ?? undefined,
            isQuickSlot: tip.isQuickSlot,
            cooldown: tip.cooldownRaw ?? undefined,
            cooldownSec: tip.cooldownSec ?? undefined,
            requiredLevel: tip.requiredLevel ?? undefined,
            videoUrl: tip.videoUrl ?? undefined,
            iconPath: tip.iconPath ?? undefined,
            damageRowsJson: tip.damageRowsJson ?? undefined,
            ccTypes: tip.ccTypes ?? undefined,
            protectionTypes: tip.protectionTypes ?? undefined,
            pvpDamagePercent: tip.pvpDamagePercent ?? undefined,
            tooltipRawHtml: tip.rawHtml,
            syncedAt: new Date(),
          },
        })
        ok++
      }
      done++
    },
    'tooltips',
  )

  await logSync('tooltip', 'success', ok, skills.length, `${Date.now() - startedAt}ms`)
  console.log(`[tooltips] done. ${ok}/${skills.length} enriched in ${Date.now() - startedAt}ms`)
}

async function phaseVideos(limit?: number) {
  const startedAt = Date.now()
  await logSync('video_duration', 'started')
  // Only fetch durations for skills with a video URL but no animation_duration_ms.
  const skills = await db.skill.findMany({
    where: {
      videoUrl: { not: null },
      animationDurationMs: null,
    },
    select: { skillId: true, videoUrl: true },
    orderBy: { skillId: 'asc' },
    ...(limit ? { take: limit } : {}),
  })
  console.log(`[videos] ${skills.length} videos to probe${limit ? ` (capped at ${limit})` : ''}`)
  let done = 0
  let ok = 0

  await pool(
    skills,
    Math.min(CONCURRENCY, 4), // ffprobe is heavier, use fewer workers
    async (s) => {
      if (!s.videoUrl) return
      const ms = await getVideoDurationMs(s.videoUrl)
      if (ms != null) {
        await db.skill.update({
          where: { skillId: s.skillId },
          data: { animationDurationMs: ms },
        })
        ok++
      }
      done++
    },
    'videos',
  )

  await logSync('video_duration', 'success', ok, skills.length, `${Date.now() - startedAt}ms`)
  console.log(`[videos] done. ${ok}/${skills.length} durations in ${Date.now() - startedAt}ms`)
}

// ----------------------------------------------------------------------------
// CLI entry
// ----------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2)
  const out: { phase?: string; limit?: number } = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--phase' || args[i] === '-p') out.phase = args[++i]
    if (args[i] === '--limit' || args[i] === '-l') out.limit = parseInt(args[++i], 10)
  }
  return out
}

async function main() {
  const { phase, limit } = parseArgs()
  console.log('=== BDO Skills Sync ===')
  console.log(`Phase: ${phase ?? 'all'}, limit: ${limit ?? 'none'}`)

  await seedClasses()

  if (!phase || phase === 'list') await phaseList()
  if (!phase || phase === 'trees') await phaseTrees()
  if (!phase || phase === 'tooltips') await phaseTooltips(limit)
  if (!phase || phase === 'videos') await phaseVideos(limit)

  console.log('=== Sync complete ===')
  await db.$disconnect()
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
