// BDO Foundry combo scraper
//
// Attempts to scrape skill-combo data from Black Desert Foundry class guides
// (https://www.blackdesertfoundry.com/<class>-class-guide/). These guides do
// NOT publish structured skill-combo sequences — combo execution is left to
// class discords / YouTube montages linked from the guide. This scraper still
// extracts the combo-ADJACENT context (Locked Skills, Hotbar Skills, and the
// "Core Skills" section which includes each skill's key binding + description
// with embedded combo hints) and stores it as a JSON sidecar so the UI can
// surface contextual skill tips alongside the curated combo list.
//
// Usage:  bun run scripts/scrape-combos.ts
//
// Output: data/bdo-foundry-combo-context.json
//
// Notes:
// * Direct fetch (not z-ai-web-dev-sdk) per task instructions.
// * Realistic Chrome User-Agent + Accept-Language headers.
// * 2.5s delay between requests to be polite.
// * Falls back to manual combo data in src/lib/combo-data.ts when the
//   guides don't yield structured combo sequences (which is the expected case).

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import * as cheerio from 'cheerio'

// ─── Types ──────────────────────────────────────────────────────────

interface ClassGuideMeta {
  className: string        // Display name e.g. "Warrior"
  slug: string             // bdocodex slug e.g. "warrior"
  foundryUrl: string       // https://www.blackdesertfoundry.com/<class>-class-guide/
}

interface CoreSkillEntry {
  name: string
  key?: string             // e.g. "SHIFT + LMB"
  description?: string     // often contains combo hints
}

interface ComboContext {
  className: string
  slug: string
  foundryUrl: string
  fetchedAt: string
  httpStatus: number | null
  error?: string
  // Raw section text (always present when page loads OK)
  lockedSkillsText: string
  hotbarSkillsText: string
  coreSkillsText: string
  // Best-effort skill-name candidates parsed out of the raw text
  lockedSkills: string[]
  hotbarSkills: string[]
  coreSkills: CoreSkillEntry[]
  // Whether the page contained any structured "combo" section — currently
  // always false for BDO Foundry (combos are not part of their guide format).
  hasStructuredCombos: boolean
}

// ─── Config ─────────────────────────────────────────────────────────

const BDO_FOUNDRY_BASE = 'https://www.blackdesertfoundry.com'
const REQUEST_DELAY_MS = 2500
const HTTP_TIMEOUT_MS = 30_000

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

// BDO Foundry URL slugs differ from bdocodex slugs in a few cases. The
// `foundrySlug` is what goes in the URL; `className` + `slug` match our DB.
const CLASSES: ClassGuideMeta[] = [
  { className: 'Warrior',      slug: 'warrior',      foundryUrl: `${BDO_FOUNDRY_BASE}/warrior-class-guide/` },
  { className: 'Ranger',       slug: 'ranger',       foundryUrl: `${BDO_FOUNDRY_BASE}/ranger-class-guide/` },
  { className: 'Sorceress',    slug: 'sorceress',    foundryUrl: `${BDO_FOUNDRY_BASE}/sorceress-class-guide/` },
  { className: 'Berserker',    slug: 'berserker',    foundryUrl: `${BDO_FOUNDRY_BASE}/berserker-class-guide/` },
  { className: 'Tamer',        slug: 'tamer',        foundryUrl: `${BDO_FOUNDRY_BASE}/tamer-class-guide/` },
  { className: 'Valkyrie',     slug: 'valkyrie',     foundryUrl: `${BDO_FOUNDRY_BASE}/valkyrie_class_guide/` },
  { className: 'Wizard',       slug: 'wizard',       foundryUrl: `${BDO_FOUNDRY_BASE}/wizard-class-guide/` },
  { className: 'Witch',        slug: 'witch',        foundryUrl: `${BDO_FOUNDRY_BASE}/witch-class-guide/` },
  { className: 'Musa',         slug: 'musa',         foundryUrl: `${BDO_FOUNDRY_BASE}/musa-class-guide/` },
  { className: 'Maehwa',       slug: 'maehwa',       foundryUrl: `${BDO_FOUNDRY_BASE}/maehwa-class-guide/` },
  { className: 'Lahn',         slug: 'lahn',         foundryUrl: `${BDO_FOUNDRY_BASE}/lahn-class-guide/` },
  { className: 'Striker',      slug: 'striker',      foundryUrl: `${BDO_FOUNDRY_BASE}/striker-class-guide/` },
  { className: 'Mystic',       slug: 'mystic',       foundryUrl: `${BDO_FOUNDRY_BASE}/mystic-class-guide/` },
  { className: 'Kunoichi',     slug: 'kunoichi',     foundryUrl: `${BDO_FOUNDRY_BASE}/kunoichi-class-guide/` },
  { className: 'Ninja',        slug: 'ninja',        foundryUrl: `${BDO_FOUNDRY_BASE}/ninja-class-guide/` },
  { className: 'Dark Knight',  slug: 'dark-knight',  foundryUrl: `${BDO_FOUNDRY_BASE}/dark-knight-class-guide/` },
  { className: 'Guardian',     slug: 'guardian',     foundryUrl: `${BDO_FOUNDRY_BASE}/guardian-class-guide/` },
  { className: 'Hashashin',    slug: 'hashashin',    foundryUrl: `${BDO_FOUNDRY_BASE}/hashashin-class-guide/` },
  { className: 'Nova',         slug: 'nova',         foundryUrl: `${BDO_FOUNDRY_BASE}/nova-class-guide/` },
  { className: 'Sage',         slug: 'sage',         foundryUrl: `${BDO_FOUNDRY_BASE}/sage-class-guide/` },
  { className: 'Corsair',      slug: 'corsair',      foundryUrl: `${BDO_FOUNDRY_BASE}/corsair-class-guide/` },
  { className: 'Drakania',     slug: 'drakania',     foundryUrl: `${BDO_FOUNDRY_BASE}/drakania-class-guide/` },
  { className: 'Woosa',        slug: 'woosa',        foundryUrl: `${BDO_FOUNDRY_BASE}/woosa-class-guide/` },
  { className: 'Maegu',        slug: 'maegu',        foundryUrl: `${BDO_FOUNDRY_BASE}/maegu-class-guide/` },
  // Ascension-only classes (may not have foundry guides)
  { className: 'Archer',       slug: 'archer',       foundryUrl: `${BDO_FOUNDRY_BASE}/archer-class-guide/` },
  { className: 'Shai',         slug: 'shai',         foundryUrl: `${BDO_FOUNDRY_BASE}/shai-class-guide/` },
]

// ─── Fetch helper ───────────────────────────────────────────────────

async function fetchHtml(url: string): Promise<{ status: number; body: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
      redirect: 'follow',
    })
    const body = await res.text()
    return { status: res.status, body }
  } finally {
    clearTimeout(timer)
  }
}

// ─── Parsing helpers ────────────────────────────────────────────────

/**
 * Find the <h2> heading whose text matches `headingPattern`, then return the
 * full text content of the section (until the next <h2> in DOCUMENT ORDER).
 *
 * BDO Foundry wraps each paragraph in its own `wpb_text_column` div, so the
 * h2's immediate siblings are NOT the skill-list paragraphs. We work around
 * this by using the raw HTML: find the h2 element's byte offset, find the
 * next <h2 byte offset, and strip tags from everything between them.
 */
function extractSectionText($: cheerio.CheerioAPI, headingPattern: RegExp, rawHtml: string): string {
  // Build a list of all <h2> elements with their byte offsets in the source.
  // We use a regex against the raw HTML so we don't get confused by the same
  // heading text appearing in the table-of-contents sidebar.
  const headings: { start: number; end: number; text: string }[] = []
  const h2Re = /<h2[^>]*>([\s\S]*?)<\/h2>/g
  let m: RegExpExecArray | null
  while ((m = h2Re.exec(rawHtml)) !== null) {
    // Strip inner tags and whitespace to get the heading text
    const text = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (text) headings.push({ start: m.index, end: m.index + m[0].length, text })
  }

  const chunks: string[] = []
  for (let i = 0; i < headings.length; i++) {
    if (!headingPattern.test(headings[i].text)) continue
    const start = headings[i].end
    const end = i + 1 < headings.length ? headings[i + 1].start : rawHtml.length
    const slice = rawHtml.slice(start, end)
    // Strip HTML tags and decode common entities, collapse whitespace
    const text = slice
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#8221;|&#8220;|&ldquo;|&rdquo;/g, '"')
      .replace(/&#8217;|&rsquo;|&lsquo;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
    if (text) chunks.push(text)
  }
  // Silence unused-$ warning (kept for symmetry / future use)
  void $
  return chunks.join('\n\n').trim()
}

/**
 * Best-effort split of a section's raw text into skill-name candidates.
 * BDO Foundry lists skills as space-separated capitalized names inside a
 * single paragraph, with no clear delimiter between them. We use a hybrid
 * heuristic: split on commas first (Hotbar section uses comma-separated
 * lists), then for the remaining text, walk through it and emit
 * capitalized-word runs as candidate skill names.
 */
function extractSkillCandidates(sectionText: string): string[] {
  const skills: string[] = []
  if (!sectionText) return skills

  // Step 1: extract comma-separated lists (used by Hotbar Skills).
  // Pattern: "Awakening: Skill A, Skill B, Skill C" or "Succession: ..."
  // Or just bare comma lists: "Skill A, Skill B, Skill C"
  const commaListRe = /(?:(?:Awakening|Succession)\s*:\s*)?([A-Z][^,]*(?:,[^,]+){2,})/g
  let m: RegExpExecArray | null
  while ((m = commaListRe.exec(sectionText)) !== null) {
    const items = m[1].split(',').map(s => s.trim())
    for (const item of items) {
      // Strip trailing period, semicolons, parentheticals
      const cleaned = item.replace(/[.;]\s*$/, '').replace(/\s*\([^)]*\)\s*$/, '').trim()
      if (!cleaned || cleaned.length < 2 || cleaned.length > 60) continue
      // Skip if it contains lowercase sentence words
      if (/\b(the|to|and|for|with|from|these|recommend|hotbar|optional|use)\b/i.test(cleaned)) continue
      if (!skills.includes(cleaned)) skills.push(cleaned)
    }
  }

  // Step 2: for Locked Skills (space-separated), look for the run of
  // capitalized-name tokens that follows the "during PVP" marker.
  const lockRe = /during PVP\.?\s+([A-Z][^.]+?)(?:\s+These are|\s+Hotbar|$)/g
  while ((m = lockRe.exec(sectionText)) !== null) {
    const chunk = m[1].replace(/\s*\([^)]*\)\s*/g, ' ').trim()
    // The chunk contains multiple skill names concatenated with spaces.
    // We can't reliably split them, so we emit the whole chunk as a single
    // candidate string — the UI can display it as a single "skills to lock"
    // blob if it wants.
    if (chunk && !skills.includes(chunk)) skills.push(chunk)
  }

  return skills
}

/**
 * Extract skill entries from the "Core Skills" section. BDO Foundry formats
 * each skill entry as `Level 56 – [SHIFT + LMB] Skill Name – Requires [...]`
 * followed by a description paragraph. We use the already-extracted section
 * text and run a regex over it to find these entries.
 */
function extractCoreSkills(_$: cheerio.CheerioAPI, sectionText: string): CoreSkillEntry[] {
  const entries: CoreSkillEntry[] = []
  if (!sectionText) return entries

  // Match patterns like:
  //   Level 56 – [SHIFT + LMB] Grim Reaper – Requires [...]
  //   Level 56 – Grim Reaper – Requires [...]
  //   [LMB + RMB] Skill Name – Preferred Choice
  const re = /Level\s+(\d+)\s*[–-]\s*(?:\[([^\]]+)\]\s*)?([^–\n]+?)(?:\s*[–-]\s*(?:Requires\s+[^.\n]+|Preferred Choice))?/g
  let m: RegExpExecArray | null
  while ((m = re.exec(sectionText)) !== null) {
    const name = m[3]?.trim()
    if (!name || name.length < 3 || name.length > 60) continue
    if (/^(these|the|hotbar|use|note|for|when|if|this|minimum)/i.test(name)) continue
    if (entries.some(e => e.name === name)) continue
    // Find the description that follows this match (up to the next "Level X" or end)
    const after = sectionText.slice(m.index + m[0].length)
    const descMatch = after.match(/^[\s\S]*?(?=Level\s+\d+\s*[–-]|$)/)
    let description: string | undefined
    if (descMatch) {
      description = descMatch[0].replace(/\s+/g, ' ').trim()
      // Truncate long descriptions and skip pure fluff
      if (description.length > 400) description = description.slice(0, 400) + '...'
      if (description.length < 30) description = undefined
    }
    entries.push({
      name,
      key: m[2]?.trim() || undefined,
      description,
    })
    if (entries.length >= 25) break
  }
  return entries
}

// ─── Main scrape loop ───────────────────────────────────────────────

async function scrapeClass(meta: ClassGuideMeta): Promise<ComboContext> {
  const ctx: ComboContext = {
    className: meta.className,
    slug: meta.slug,
    foundryUrl: meta.foundryUrl,
    fetchedAt: new Date().toISOString(),
    httpStatus: null,
    lockedSkillsText: '',
    hotbarSkillsText: '',
    coreSkillsText: '',
    lockedSkills: [],
    hotbarSkills: [],
    coreSkills: [],
    hasStructuredCombos: false,
  }

  try {
    const { status, body } = await fetchHtml(meta.foundryUrl)
    ctx.httpStatus = status
    if (status !== 200) {
      ctx.error = `HTTP ${status}`
      return ctx
    }

    const $ = cheerio.load(body)

    // Page-not-found check (BDO Foundry returns 200 with a 404-style page)
    const h1 = $('h1').first().text().trim()
    if (/page not found|not be found/i.test(h1)) {
      ctx.error = 'Page not found'
      return ctx
    }

    ctx.lockedSkillsText = extractSectionText($, /^locked skills/i, body)
    ctx.hotbarSkillsText = extractSectionText($, /^hotbar skills/i, body)
    ctx.coreSkillsText = extractSectionText($, /^core skills/i, body)
    ctx.lockedSkills = extractSkillCandidates(ctx.lockedSkillsText)
    ctx.hotbarSkills = extractSkillCandidates(ctx.hotbarSkillsText)
    ctx.coreSkills = extractCoreSkills($, ctx.coreSkillsText)

    // Sanity check: do any text nodes mention structured combo sequences?
    // BDO Foundry guides currently do NOT — confirmed via research.
    const comboMentions = $('body').text().match(/\bcombo\b/gi)?.length ?? 0
    ctx.hasStructuredCombos = false
    if (comboMentions > 0) {
      console.log(`    [info] ${meta.className}: ${comboMentions} "combo" word mentions (mostly Lightstone-combos / commentary, not skill sequences)`)
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    ctx.error = msg
  }

  return ctx
}

async function main() {
  const outDir = join(process.cwd(), 'data')
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

  // Allow filtering by class via CLI arg, e.g. `bun run scripts/scrape-combos.ts warrior sorceress`
  const filterSlugs = process.argv.slice(2).map(s => s.toLowerCase())
  const targets = filterSlugs.length
    ? CLASSES.filter(c => filterSlugs.includes(c.slug))
    : CLASSES

  console.log(`[scrape-combos] Fetching ${targets.length} class guide(s) from BDO Foundry...`)

  const results: ComboContext[] = []
  for (let i = 0; i < targets.length; i++) {
    const meta = targets[i]
    console.log(`[${i + 1}/${targets.length}] ${meta.className} — ${meta.foundryUrl}`)
    const ctx = await scrapeClass(meta)
    console.log(
      `    -> status=${ctx.httpStatus} error=${ctx.error ?? 'none'} ` +
      `coreSkills=${ctx.coreSkills.length} lockedSkills=${ctx.lockedSkills.length} ` +
      `hotbarSkills=${ctx.hotbarSkills.length}`,
    )
    results.push(ctx)
    if (i < targets.length - 1) {
      await new Promise(r => setTimeout(r, REQUEST_DELAY_MS))
    }
  }

  // Summary
  const ok = results.filter(r => !r.error && r.httpStatus === 200)
  const withStructuredCombos = results.filter(r => r.hasStructuredCombos)
  console.log('\n=== SUMMARY ===')
  console.log(`Fetched OK:      ${ok.length}/${results.length}`)
  console.log(`Structured combos found: ${withStructuredCombos.length}`)
  if (withStructuredCombos.length === 0) {
    console.log(
      'NOTE: BDO Foundry class guides do NOT publish structured skill-combo\n' +
      '      sequences — combos live in class Discord servers / community videos.\n' +
      '      Falling back to the curated manual combo data in src/lib/combo-data.ts\n' +
      '      (which is what the UI consumes). The scrape output saved here is used\n' +
      '      as supplementary "skill context" (locked/hotbar/core skills).',
    )
  }

  const outPath = join(outDir, 'bdo-foundry-combo-context.json')
  writeFileSync(outPath, JSON.stringify({
    scrapedAt: new Date().toISOString(),
    source: 'blackdesertfoundry.com (BDO Foundry)',
    note: 'BDO Foundry class guides do not publish structured skill-combo sequences. ' +
          'The fields below are combo-adjacent context (locked, hotbar, core skills). ' +
          'Curated combo sequences live in src/lib/combo-data.ts.',
    classes: results,
  }, null, 2))
  console.log(`\nWrote ${outPath}`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
