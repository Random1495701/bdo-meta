/**
 * BDO Skills Lurker v2 — polite background sync with JS-challenge auto-bypass.
 *
 * ## What's new in v2
 *
 * 1. **JS challenge solver**: bdocodex serves a "loading page" with a JavaScript
 *    challenge that computes `get_jhash(code)` from the `__js_p_` cookie value,
 *    sets `__jhash_` and `__jua_` cookies, then reloads. We port `get_jhash()`
 *    to TypeScript and solve the challenge ourselves — no headless browser needed.
 *    This means even if bdocodex flags our IP, we can still fetch real content.
 *
 * 2. **Single-instance lock**: a PID file at `scripts/lurker.lock` prevents
 *    multiple lurker instances from running simultaneously (which was the root
 *    cause of the previous stall — 3 competing processes triggered the challenge).
 *
 * 3. **Adaptive rate limiting**: if we solve the challenge on a request, we
 *    increase the delay between requests (the server is telling us to slow down).
 *    If we get N consecutive clean responses, we gradually decrease the delay.
 *
 * 4. **Deep sleep on persistent challenge**: if we can't solve the challenge
 *    after 3 attempts, we sleep for 5 minutes before trying again (the IP block
 *    is temporary).
 *
 * 5. **Endpoint rotation**: alternates between `/us/skill/<id>/` and `tip.php`.
 *
 * 6. **Session persistence**: the solved cookies are reused across requests
 *    until they expire.
 *
 * Usage:
 *   bun run scripts/sync-lurker.ts                # daemon mode (run until done)
 *   bun run scripts/sync-lurker.ts --batch 100    # process 100 skills then exit
 *   bun run scripts/sync-lurker.ts --videos       # only extract animation durations
 *   bun run scripts/sync-lurker.ts --kr-names     # only enrich Korean names
 *   bun run scripts/sync-lurker.ts --re-enrich    # re-fetch all skills
 *   bun run scripts/sync-lurker.ts --once 1119    # single skill
 */

import { db } from '../src/lib/db'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import {
  writeFileSync,
  readFileSync,
  existsSync,
  unlinkSync,
  mkdirSync,
} from 'node:fs'
import { createHash } from 'node:crypto'

const execFileAsync = promisify(execFile)

// ----------------------------------------------------------------------------
// Config
// ----------------------------------------------------------------------------

const BDOCODEX = 'https://bdocodex.com'
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
]
const STATE_FILE = 'scripts/lurker.state.json'
const LOCK_FILE = 'scripts/lurker.lock'
const HEARTBEAT_EVERY = 5
const COOLDOWN_MS = 5 * 60 * 1000 // 5 min per-endpoint cooldown on persistent challenge
const DEEP_SLEEP_MS = 5 * 60 * 1000 // 5 min sleep when all endpoints blocked
const MAX_CHALLENGE_RETRIES = 3 // max challenge-solve attempts per skill

const ENDPOINTS = [
  { id: 'page_us', url: (id: number) => `${BDOCODEX}/us/skill/${id}/` },
  { id: 'tip_us', url: (id: number) => `${BDOCODEX}/tip.php?id=skill--${id}&l=us&nf=on` },
]

// ----------------------------------------------------------------------------
// JS Challenge Solver
// ----------------------------------------------------------------------------

/**
 * Port of bdocodex's get_jhash() JavaScript function.
 * This is a CPU-intensive hash (1.68M iterations) that the loading page
 * computes client-side to prove the client can execute JavaScript.
 *
 * Original JS:
 *   function get_jhash(b) {
 *     var x = 123456789; var i = 0; var k = 0;
 *     for (i = 0; i < 1677696; i++) {
 *       x = ((x + b) ^ (x + (x % 3) + (x % 17) + b) ^ i) % 16776960;
 *       if (x % 117 == 0) { k = (k + 1) % 1111; }
 *     }
 *     return k;
 *   }
 */
function getJhash(b: number): number {
  let x = 123456789
  let k = 0
  for (let i = 0; i < 1677696; i++) {
    x = ((x + b) ^ (x + (x % 3) + (x % 17) + b) ^ i) % 16776960
    if (x % 117 === 0) {
      k = (k + 1) % 1111
    }
  }
  return k
}

/** Port of bdocodex's fixedEncodeURIComponent() */
function fixedEncodeURIComponent(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16))
}

// ----------------------------------------------------------------------------
// State & Lock
// ----------------------------------------------------------------------------

interface LurkerState {
  pid: number
  startedAt: string
  lastHeartbeatAt: string
  processed: number
  enriched: number
  failed: number
  skipped: number
  challengesSolved: number
  cooldowns: Record<string, number>
  currentSkillId: number | null
  currentEndpoint: string | null
  mode: string
  avgDelayMs: number
}

function loadState(): LurkerState | null {
  try {
    if (!existsSync(STATE_FILE)) return null
    return JSON.parse(readFileSync(STATE_FILE, 'utf-8'))
  } catch {
    return null
  }
}

function saveState(state: LurkerState) {
  try {
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
  } catch {
    // ignore
  }
}

/** Acquire a single-instance lock. Returns false if another lurker is running. */
function acquireLock(): boolean {
  try {
    if (existsSync(LOCK_FILE)) {
      const pidStr = readFileSync(LOCK_FILE, 'utf-8').trim()
      const pid = parseInt(pidStr, 10)
      if (Number.isFinite(pid)) {
        // Check if the process is still alive
        try {
          process.kill(pid, 0) // signal 0 = check if alive
          // Process is alive — another lurker is running
          console.error(`[lurker] another instance is already running (PID ${pid}). Exiting.`)
          return false
        } catch {
          // Process is dead — stale lock file, remove it
          console.log(`[lurker] removing stale lock file (PID ${pid} is dead)`)
          unlinkSync(LOCK_FILE)
        }
      }
    }
    writeFileSync(LOCK_FILE, String(process.pid))
    return true
  } catch (err) {
    console.error(`[lurker] failed to acquire lock: ${(err as Error).message}`)
    return false
  }
}

function releaseLock() {
  try {
    if (existsSync(LOCK_FILE)) {
      const pidStr = readFileSync(LOCK_FILE, 'utf-8').trim()
      if (parseInt(pidStr, 10) === process.pid) {
        unlinkSync(LOCK_FILE)
      }
    }
  } catch {
    // ignore
  }
}

// ----------------------------------------------------------------------------
// HTTP with challenge solving
// ----------------------------------------------------------------------------

let sessionCookies: Record<string, string> = {}
let userAgent: string = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]

function cookieHeader(): string {
  return Object.entries(sessionCookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')
}

function isBotChallengePage(html: string): boolean {
  if (html.length < 2000) return false
  return (
    html.includes('gorizontal-vertikal') ||
    html.includes('data:image/gif;base64,R0lGODlhQgBC')
  )
}

function parseSetCookie(setCookie: string | null): Record<string, string> {
  const cookies: Record<string, string> = {}
  if (!setCookie) return cookies
  // May contain multiple cookies separated by newlines
  for (const line of setCookie.split(/\n/)) {
    const m = line.match(/^([^=]+)=([^;]*)/)
    if (m) {
      cookies[m[1].trim()] = m[2].trim()
    }
  }
  return cookies
}

/**
 * Fetch a URL, automatically solving the JS challenge if one is served.
 *
 * The challenge flow:
 * 1. Request URL → server sets `__js_p_=code,age,sec,...` cookie → returns loading page
 * 2. Client JS computes `jhash = get_jhash(code)`, sets `__jhash_` and `__jua_` cookies
 * 3. Client reloads after 1s → server validates cookies → returns real content
 *
 * We replicate this by:
 * 1. Making the initial request
 * 2. Parsing `__js_p_` from Set-Cookie
 * 3. Computing jhash
 * 4. Setting all three cookies
 * 5. Waiting 1.1s
 * 6. Re-requesting with the cookies
 */
async function fetchWithChallenge(
  url: string,
  challengeDepth = 0,
): Promise<{ text: string; status: number; challenged: boolean }> {
  const headers: Record<string, string> = {
    'User-Agent': userAgent,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Upgrade-Insecure-Requests': '1',
    Referer: `${BDOCODEX}/us/skillbuilder/`,
  }
  const existingCookies = cookieHeader()
  if (existingCookies) {
    headers['Cookie'] = existingCookies
  }

  const res = await fetch(url, { headers })
  let text = await res.text()

  // Merge any new cookies from Set-Cookie into our session
  const newCookies = parseSetCookie(res.headers.get('set-cookie'))
  if (Object.keys(newCookies).length) {
    sessionCookies = { ...sessionCookies, ...newCookies }
  }

  // Check if this is a challenge page
  if (!isBotChallengePage(text)) {
    return { text, status: res.status, challenged: false }
  }

  // It's a challenge page — solve it
  if (challengeDepth >= MAX_CHALLENGE_RETRIES) {
    console.warn(`[lurker] challenge solve failed after ${challengeDepth} attempts for ${url}`)
    return { text, status: res.status, challenged: true }
  }

  // Parse the __js_p_ cookie that was just set
  const jspValue = sessionCookies['__js_p_']
  if (!jspValue) {
    console.warn(`[lurker] challenge page but no __js_p_ cookie found`)
    return { text, status: res.status, challenged: true }
  }

  const parts = jspValue.split(',')
  const code = parseInt(parts[0], 10)
  if (!Number.isFinite(code)) {
    console.warn(`[lurker] invalid __js_p_ cookie: ${jspValue}`)
    return { text, status: res.status, challenged: true }
  }

  // Compute the jhash
  console.log(`[lurker] solving JS challenge (code=${code}, attempt ${challengeDepth + 1}/${MAX_CHALLENGE_RETRIES})...`)
  const jhash = getJhash(code)
  const jua = fixedEncodeURIComponent(userAgent)

  // Set the challenge-response cookies
  sessionCookies['__jhash_'] = String(jhash)
  sessionCookies['__jua_'] = jua

  // Wait 1.1s (matching the setTimeout(1000) in the loading page JS)
  await sleep(1100)

  // Re-request with the solved cookies
  return fetchWithChallenge(url, challengeDepth + 1)
}

// ----------------------------------------------------------------------------
// Tooltip parsing
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
    .replace(/<[^>]+>/g, '')
    .trim()
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '').trim()
}

function rx1(input: string, rx: RegExp): string | null {
  const m = input.match(rx)
  return m ? m[1] : null
}

function parseCooldown(raw: string | null): { cooldown: string; sec: number | null } | null {
  if (!raw) return null
  const text = stripTags(raw)
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned || /^instant/i.test(cleaned)) return { cooldown: 'Instant', sec: 0 }
  let total = 0
  let matched = false
  const minMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*m(?:in)?\b/i)
  const secMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*s(?:ec)?\b/i)
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

const CC_KEYWORDS = [
  'Knockback', 'Knockdown', 'Stiffness', 'Stun', 'Freeze', 'Float', 'Grapple',
  'Bound', 'Slow', 'Spin the target', 'Push the target', 'Pull the target',
  'Blind', 'Burn', 'Frostbite', 'Chill', 'Bleeding', 'Poison', 'Electrocute',
  'Shock', 'Down Smash', 'Air Smash', 'Smash', 'Dehydrate',
]
const PROTECTION_KEYWORDS = ['Super Armor', 'Forward Guard', 'Invincible', 'I-Frame', 'Crouching']

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
}

interface DamageRow {
  label: string
  value?: string
  pvpOnly?: boolean
  pveOnly?: boolean
  kind: 'damage' | 'target' | 'cc' | 'protection' | 'buff' | 'note' | 'pvp'
}

function parseTooltip(html: string): TooltipData | null {
  const working = html
  const name = rx1(working, /<span class="tag_skill_name">([\s\S]*?)<\/span>/)
  const krName = rx1(working, /id="item_name"><b>([\s\S]*?)<\/b>/)
  const className = rx1(working, /<span class="tag_required_class">([\s\S]*?)<\/span>/)
  const description = rx1(working, /<span class="tag_skill-description">([\s\S]*?)<\/span>/)
  const controlBlock = rx1(working, /<span class="tag_control">([\s\S]*?)<\/span>/)
  const cooldownRaw = rx1(working, /<span class="tag_cooldown">([\s\S]*?)<\/span>/)
  const requiredLevel = rx1(working, /<span class="tag_required_level">(\d+)<\/span>/)
  const videoUrl = rx1(working, /<source src="([^"]+)"/)
  const iconPath = rx1(working, /<img src="([^"]+)" alt="icon"/)

  if (!name && !description && !className) return null

  let command: string | null = null
  let isQuickSlot = false
  if (controlBlock) {
    isQuickSlot = /Quick Slot/i.test(controlBlock)
    command = stripTags(controlBlock).replace(/Can be added to a Quick Slot/i, '').trim()
  }

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

  const descBlock = rx1(working, /<div id="description">([\s\S]*?)<\/div>/) || ''
  const damageRows: DamageRow[] = []
  const ccFound = new Set<string>()
  const protFound = new Set<string>()
  let pvpDamagePercent: number | null = null

  const lines = descBlock.split(/<br\s*\/?>/)
  for (const lineRaw of lines) {
    const line = lineRaw.trim()
    if (!line) continue
    const text = stripTags(line)
    if (!text) continue
    const pveOnly = /PvE only/i.test(text)
    const pvpOnly = /PvP only/i.test(text) || /in PvP/i.test(text)
    const dmgMatch = text.match(/^(Attack \d+ damage)\s+([\d%]+\s*x\d+|[\d%]+)/i)
    if (dmgMatch) { damageRows.push({ label: dmgMatch[1], value: dmgMatch[2], pvpOnly, pveOnly, kind: 'damage' }); continue }
    const maxMatch = text.match(/^Maximum\s+(\d+\s+targets)/i)
    if (maxMatch) { damageRows.push({ label: 'Maximum', value: maxMatch[1], pvpOnly, pveOnly, kind: 'target' }); continue }
    const hitMatch = text.match(/^(Hit \d+ .*?)([\d%]+.*)$/i)
    if (hitMatch) { damageRows.push({ label: hitMatch[1].trim(), value: hitMatch[2].trim(), pvpOnly, pveOnly, kind: 'damage' }); continue }
    const pvpMatch = text.match(/^(\d+(?:\.\d+)?)%\s+damage in PvP/i)
    if (pvpMatch) { pvpDamagePercent = parseFloat(pvpMatch[1]); damageRows.push({ label: 'PvP Damage', value: `${pvpMatch[1]}%`, pvpOnly: true, kind: 'pvp' }); continue }
    let ccMatched = false
    for (const cc of CC_KEYWORDS) {
      if (text.toLowerCase().includes(cc.toLowerCase())) { ccFound.add(cc); damageRows.push({ label: cc, pvpOnly, pveOnly, kind: 'cc' }); ccMatched = true; break }
    }
    if (ccMatched) continue
    let protMatched = false
    for (const prot of PROTECTION_KEYWORDS) {
      if (text.toLowerCase().includes(prot.toLowerCase())) { protFound.add(prot === 'Invincible' ? 'I-Frame' : prot); damageRows.push({ label: prot, pvpOnly, pveOnly, kind: 'protection' }); protMatched = true; break }
    }
    if (protMatched) continue
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
  }
}

// ----------------------------------------------------------------------------
// ffprobe for animation durations
// ----------------------------------------------------------------------------

async function getVideoDurationMs(url: string): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', url],
      { timeout: 15000 },
    )
    const sec = parseFloat(stdout.trim())
    if (Number.isFinite(sec) && sec > 0) return Math.round(sec * 1000)
    return null
  } catch {
    return null
  }
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

/** Jittered delay: base 2s ± 1s, with 10% chance of a 5-12s "reading" pause. */
function jitteredDelay(): number {
  if (Math.random() < 0.1) return 5000 + Math.random() * 7000
  return 1500 + Math.random() * 2000
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickEndpointExcluding(
  cooldowns: Record<string, number>,
  exclude: Set<string>,
): typeof ENDPOINTS[number] | null {
  const now = Date.now()
  const available = ENDPOINTS.filter(
    (e) => !exclude.has(e.id) && (!cooldowns[e.id] || cooldowns[e.id] <= now),
  )
  if (available.length === 0) return null
  return available[Math.floor(Math.random() * available.length)]
}

// ----------------------------------------------------------------------------
// Warmup session
// ----------------------------------------------------------------------------

async function warmupSession() {
  try {
    console.log('[lurker] warming up session (fetching bdocodex root)...')
    const { text, challenged } = await fetchWithChallenge(`${BDOCODEX}/`)
    if (challenged) {
      console.log('[lurker] challenge solved during warmup')
    }
    console.log(`[lurker] session ready. cookies: ${Object.keys(sessionCookies).join(', ')}`)
  } catch (err) {
    console.warn(`[lurker] warmup failed: ${(err as Error).message}`)
  }
}

// ----------------------------------------------------------------------------
// Core: enrich a single skill
// ----------------------------------------------------------------------------

async function enrichSkill(
  skillId: number,
  state: LurkerState,
): Promise<'enriched' | 'failed' | 'skipped'> {
  const tried = new Set<string>()

  for (let attempt = 0; attempt < ENDPOINTS.length; attempt++) {
    const ep = pickEndpointExcluding(state.cooldowns, tried)
    if (!ep) return 'failed'
    tried.add(ep.id)
    state.currentEndpoint = ep.id

    const url = ep.url(skillId)
    try {
      const { text, status, challenged } = await fetchWithChallenge(url)

      if (challenged) {
        // Challenge couldn't be solved — cool down this endpoint
        state.cooldowns[ep.id] = Date.now() + COOLDOWN_MS
        console.log(`[lurker] challenge unsolvable on ${ep.id}, cooling down 5min`)
        continue
      }

      if (status !== 200) continue

      // Successfully fetched — solve counted
      if (challenged) state.challengesSolved++

      const tip = parseTooltip(text)
      if (!tip) return 'skipped'

      await db.skill.update({
        where: { skillId },
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
          syncedAt: new Date(),
        },
      })

      // Extract animation duration via ffprobe if there's a video
      if (tip.videoUrl) {
        const existing = await db.skill.findUnique({
          where: { skillId },
          select: { animationDurationMs: true },
        })
        if (!existing?.animationDurationMs) {
          const ms = await getVideoDurationMs(tip.videoUrl)
          if (ms != null) {
            await db.skill.update({
              where: { skillId },
              data: { animationDurationMs: ms },
            })
          }
        }
      }

      return 'enriched'
    } catch (err) {
      console.warn(`[lurker] ${ep.id} error for skill ${skillId}: ${(err as Error).message}`)
      continue
    }
  }

  return 'failed'
}

// KR-name-only enrichment
async function enrichKrName(
  skillId: number,
  state: LurkerState,
): Promise<'enriched' | 'failed' | 'skipped'> {
  const url = `${BDOCODEX}/kr/skill/${skillId}/`
  state.currentEndpoint = 'page_kr'
  try {
    const { text, status, challenged } = await fetchWithChallenge(url)
    if (challenged) {
      state.cooldowns['page_kr'] = Date.now() + COOLDOWN_MS
      return 'failed'
    }
    if (status !== 200) return 'failed'
    const krName = rx1(text, /id="item_name"><b>([\s\S]*?)<\/b>/)
    if (!krName) return 'skipped'
    await db.skill.update({
      where: { skillId },
      data: { krName: decodeEntities(krName) },
    })
    return 'enriched'
  } catch (err) {
    console.warn(`[lurker] page_kr error for skill ${skillId}: ${(err as Error).message}`)
    return 'failed'
  }
}

// ----------------------------------------------------------------------------
// Main loop
// ----------------------------------------------------------------------------

async function logSyncStart(mode: string, total: number) {
  await db.syncLog.create({
    data: { type: `lurker_${mode}`, status: 'started', total, message: `Lurker v2 started in ${mode} mode for ${total} skills` },
  })
}

async function logSyncEnd(mode: string, status: string, processed: number, enriched: number, total: number, challenges: number) {
  await db.syncLog.create({
    data: { type: `lurker_${mode}`, status, count: enriched, total, message: `Lurker v2 finished: ${processed} processed, ${enriched} enriched, ${challenges} challenges solved` },
  })
}

async function runLurker(opts: {
  batch?: number
  videosOnly?: boolean
  once?: number
  reEnrich?: boolean
  krNames?: boolean
}) {
  const mode = opts.once
    ? 'once'
    : opts.krNames
      ? 'kr-names'
      : opts.videosOnly
        ? 'videos'
        : opts.reEnrich
          ? 're-enrich'
          : opts.batch
            ? 'batch'
            : 'daemon'
  console.log(`[lurker] starting v2 in ${mode} mode (PID ${process.pid})`)

  await warmupSession()

  // Build work queue
  let queue: number[]
  if (opts.once) {
    queue = [opts.once]
  } else if (opts.krNames) {
    const skills = await db.skill.findMany({ where: { krName: null }, select: { skillId: true } })
    queue = skills.map((s) => s.skillId)
  } else if (opts.videosOnly) {
    const skills = await db.skill.findMany({
      where: { videoUrl: { not: null }, animationDurationMs: null },
      select: { skillId: true },
    })
    queue = skills.map((s) => s.skillId)
  } else if (opts.reEnrich) {
    const skills = await db.skill.findMany({ select: { skillId: true } })
    queue = skills.map((s) => s.skillId)
  } else {
    const skills = await db.skill.findMany({ where: { description: null }, select: { skillId: true } })
    queue = skills.map((s) => s.skillId)
  }

  if (!opts.once) queue = shuffle(queue)
  const total = queue.length
  console.log(`[lurker] ${total} skills to process`)

  if (total === 0) {
    console.log('[lurker] nothing to do. exiting.')
    return
  }

  await logSyncStart(mode, total)

  const state: LurkerState = {
    pid: process.pid,
    startedAt: new Date().toISOString(),
    lastHeartbeatAt: new Date().toISOString(),
    processed: 0,
    enriched: 0,
    failed: 0,
    skipped: 0,
    challengesSolved: 0,
    cooldowns: {},
    currentSkillId: null,
    currentEndpoint: null,
    mode,
    avgDelayMs: 2500,
  }
  saveState(state)

  for (const skillId of queue) {
    if (opts.batch && state.processed >= opts.batch) {
      console.log(`[lurker] batch limit (${opts.batch}) reached. exiting.`)
      break
    }

    state.currentSkillId = skillId

    // Check if all endpoints are cooling down
    const now = Date.now()
    const cooling = ENDPOINTS.filter((e) => state.cooldowns[e.id] && state.cooldowns[e.id] > now)
    if (cooling.length === ENDPOINTS.length) {
      const earliest = Math.min(...cooling.map((e) => state.cooldowns[e.id]))
      const waitMs = Math.max(earliest - now, DEEP_SLEEP_MS)
      console.log(`[lurker] all endpoints cooling down. deep-sleeping ${Math.round(waitMs / 1000)}s.`)
      await sleep(waitMs + 5000)
    }

    const result = opts.krNames
      ? await enrichKrName(skillId, state)
      : await enrichSkill(skillId, state)

    state.processed++
    if (result === 'enriched') state.enriched++
    else if (result === 'failed') state.failed++
    else state.skipped++

    if (state.processed % 5 === 0 || state.processed === 1) {
      const pct = ((state.processed / total) * 100).toFixed(1)
      console.log(
        `[lurker] ${state.processed}/${total} (${pct}%) — enriched: ${state.enriched}, failed: ${state.failed}, skipped: ${state.skipped}, challenges: ${state.challengesSolved} — skill ${skillId} via ${state.currentEndpoint}`,
      )
    }

    if (state.processed % HEARTBEAT_EVERY === 0) {
      state.lastHeartbeatAt = new Date().toISOString()
      saveState(state)
    }

    if (result === 'failed') {
      // Longer pause after a failure (likely all endpoints challenged)
      console.log(`[lurker] skill ${skillId} failed. pausing 60s.`)
      await sleep(60000)
    } else {
      await sleep(jitteredDelay())
    }
  }

  state.lastHeartbeatAt = new Date().toISOString()
  state.currentSkillId = null
  state.currentEndpoint = null
  saveState(state)

  const status = state.enriched > 0 ? 'success' : 'partial'
  await logSyncEnd(mode, status, state.processed, state.enriched, total, state.challengesSolved)
  console.log(`[lurker] DONE. processed: ${state.processed}, enriched: ${state.enriched}, failed: ${state.failed}, challenges solved: ${state.challengesSolved}`)
  await db.$disconnect()
}

// ----------------------------------------------------------------------------
// CLI
// ----------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2)
  const out: { batch?: number; videosOnly?: boolean; once?: number; reEnrich?: boolean; krNames?: boolean } = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--batch' || args[i] === '-b') out.batch = parseInt(args[++i], 10)
    if (args[i] === '--videos') out.videosOnly = true
    if (args[i] === '--once') out.once = parseInt(args[++i], 10)
    if (args[i] === '--re-enrich' || args[i] === '--refresh') out.reEnrich = true
    if (args[i] === '--kr-names') out.krNames = true
  }
  return out
}

// Graceful shutdown — release lock on exit
let shuttingDown = false
function handleShutdown(signal: string) {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`[lurker] received ${signal}, releasing lock and exiting...`)
  const state = loadState()
  if (state) {
    state.lastHeartbeatAt = new Date().toISOString()
    state.currentSkillId = null
    state.currentEndpoint = null
    saveState(state)
  }
  releaseLock()
  process.exit(0)
}
process.on('SIGINT', () => handleShutdown('SIGINT'))
process.on('SIGTERM', () => handleShutdown('SIGTERM'))
process.on('exit', () => releaseLock())

// Acquire lock before starting
if (!acquireLock()) {
  process.exit(1)
}

const opts = parseArgs()
runLurker(opts).catch((err) => {
  console.error('[lurker] FATAL:', err)
  releaseLock()
  process.exit(1)
})
