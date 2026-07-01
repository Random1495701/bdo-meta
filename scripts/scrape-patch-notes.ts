// Structured patch notes scraper for BDO Meta
// Fetches PA patch notes, parses them into structured skill changes,
// saves the LATEST patch to data/patch-notes.json and appends ALL patches
// to data/patch-archive.json.
//
// Usage: bun run scripts/scrape-patch-notes.ts
import { writeFileSync, readFileSync, existsSync } from 'node:fs'

const PA_BASE = 'https://blackdesert.pearlabyss.com/Asia/en-US/News/Notice'

// ─── Types ──────────────────────────────────────────────────────────

type ChangeType =
  | 'damage_up' | 'damage_down'
  | 'cooldown_up' | 'cooldown_down'
  | 'added_effect' | 'removed_effect'
  | 'cc_change' | 'combo_change' | 'animation_change'
  | 'note' | 'other'

interface SkillChange {
  skillName: string
  changeType: ChangeType
  before?: string
  after?: string
  description: string
}

interface ClassChangeBlock {
  className: string
  spec: string | null
  intro: string
  changes: SkillChange[]
}

interface PatchNote {
  date: string
  url: string
  classChanges: ClassChangeBlock[]
}

// ─── Page fetching via agent-browser ────────────────────────────────

async function fetchPage(url: string): Promise<string> {
  const { execFileSync } = await import('node:child_process')
  execFileSync('agent-browser', ['open', url], { stdio: 'pipe', timeout: 30000 })
  await new Promise(r => setTimeout(r, 8000))
  const result = execFileSync('agent-browser', ['eval', 'document.body.innerText'], {
    stdio: 'pipe', timeout: 15000,
  }).toString().trim()
  let text = result
  if (text.startsWith('"') && text.endsWith('"')) text = text.slice(1, -1)
  return text.replace(/\\n/g, '\n').replace(/\\"/g, '"')
}

// Extract board IDs from the listing page by querying anchor hrefs directly
async function fetchBoardIds(listingUrl: string): Promise<{ boardNo: number; date: string; url: string }[]> {
  const { execFileSync } = await import('node:child_process')
  execFileSync('agent-browser', ['open', listingUrl], { stdio: 'pipe', timeout: 30000 })
  await new Promise(r => setTimeout(r, 8000))

  // Get all anchor hrefs that contain boardNo
  const js = `JSON.stringify(Array.from(document.querySelectorAll('a[href*="boardNo"]')).map(a => ({href: a.href, text: a.textContent.trim()})))`
  const result = execFileSync('agent-browser', ['eval', js], { stdio: 'pipe', timeout: 15000 }).toString().trim()
  let jsonStr = result
  if (jsonStr.startsWith('"') && jsonStr.endsWith('"')) jsonStr = JSON.parse(jsonStr)

  const links: { href: string; text: string }[] = JSON.parse(jsonStr)

  // Extract boardNo from each href
  const seen = new Set<number>()
  const patches: { boardNo: number; date: string; url: string }[] = []
  for (const link of links) {
    const m = link.href.match(/boardNo=(\d+)/)
    if (!m) continue
    const boardNo = parseInt(m[1], 10)
    if (seen.has(boardNo)) continue
    seen.add(boardNo)

    // Try to find a date near this link — check the link text and surrounding context
    const dateMatch = link.text.match(/((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d+,?\s+\d{4})/)
    patches.push({
      boardNo,
      date: dateMatch ? dateMatch[1] : 'Unknown',
      url: link.href,
    })
  }

  // Also try to get dates from the page text to fill in any "Unknown" dates
  const textResult = execFileSync('agent-browser', ['eval', 'document.body.innerText'], {
    stdio: 'pipe', timeout: 15000,
  }).toString().trim()
  let pageText = textResult
  if (pageText.startsWith('"') && pageText.endsWith('"')) pageText = pageText.slice(1, -1)
  pageText = pageText.replace(/\\n/g, '\n').replace(/\\"/g, '"')

  const dateRegex = /((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d+,?\s+\d{4})/g
  const dates: string[] = []
  let dm
  while ((dm = dateRegex.exec(pageText)) !== null) dates.push(dm[1])

  // If we have dates but patches have "Unknown", pair them in order
  for (let i = 0; i < patches.length && i < dates.length; i++) {
    if (patches[i].date === 'Unknown') patches[i].date = dates[i]
  }

  return patches
}

// ─── Class list ─────────────────────────────────────────────────────

const CLASSES = [
  'Warrior', 'Ranger', 'Sorceress', 'Berserker', 'Tamer', 'Valkyrie',
  'Wizard', 'Witch', 'Musa', 'Maehwa', 'Striker', 'Mystic', 'Lahn',
  'Archer', 'Shai', 'Guardian', 'Hashashin', 'Nova', 'Sage', 'Corsair',
  'Drakania', 'Woosa', 'Maegu', 'Scholar', 'Dosa', 'Seraph', 'Deadeye',
  'Wukong', 'Kunoichi', 'Ninja', 'Dark Knight',
]

// ─── Structured parser ──────────────────────────────────────────────
// Parses raw patch note text into structured skill changes.

function classifyChange(desc: string): ChangeType {
  const lower = desc.toLowerCase()
  if (/increased.*damage|damage.*increased|damage.*has been increased/.test(lower)) return 'damage_up'
  if (/decreased.*damage|damage.*decreased|damage.*has been decreased|reduced.*damage/.test(lower)) return 'damage_down'
  if (/decreased.*cooldown|cooldown.*decreased|cooldown.*reduced/.test(lower)) return 'cooldown_down'
  if (/increased.*cooldown|cooldown.*increased/.test(lower)) return 'cooldown_up'
  if (/^added\s+(super armor|forward guard|i-frame|invincible|superarmor)/i.test(lower) || /added.*guard|added.*super armor|added.*invincib/i.test(lower)) return 'added_effect'
  if (/^removed\s+(super armor|forward guard|i-frame|invincible|superarmor)/i.test(lower) || /removed.*guard|removed.*super armor/i.test(lower)) return 'removed_effect'
  if (/stiffness|knockback|knockdown|bound|stun|freeze|slow|stiff|grapple|float|air strike|knockdown/i.test(lower)) return 'cc_change'
  if (/combo/i.test(lower)) return 'combo_change'
  if (/animation|motion|idle stance/i.test(lower)) return 'animation_change'
  if (/changed|improved|adjusted|updated/i.test(lower)) return 'note'
  return 'other'
}

function extractBeforeAfter(desc: string): { before?: string; after?: string } {
  // Pattern: "X → Y" or "X → Y" (arrow)
  const arrowMatch = desc.match(/([^→\n]+?)\s*→\s*([^→\n]+)/)
  if (arrowMatch) {
    return { before: arrowMatch[1].trim(), after: arrowMatch[2].trim() }
  }
  // Pattern: "Before...After..." table rows
  return {}
}

function parseClassChanges(text: string, className: string): ClassChangeBlock | null {
  // Find the class heading position
  const classRegex = new RegExp(`^\\s*(${className}|${className.toUpperCase()})\\s*$`, 'm')
  const classMatch = classRegex.exec(text)
  if (!classMatch) return null

  const startPos = classMatch.index + classMatch[0].length

  // Find the next class heading (or end of text)
  let endPos = text.length
  for (const otherClass of CLASSES) {
    if (otherClass === className) continue
    const otherRegex = new RegExp(`^\\s*(${otherClass}|${otherClass.toUpperCase()})\\s*$`, 'm')
    const otherMatch = otherRegex.exec(text.slice(startPos))
    if (otherMatch) {
      const absPos = startPos + otherMatch.index
      if (absPos < endPos) endPos = absPos
    }
  }

  const blockText = text.slice(startPos, endPos).trim()

  // Detect spec (Awakening/Succession/Ascension/Main Weapon)
  let spec: string | null = null
  const specMatch = blockText.match(/^(Awakening|Succession|Ascension|Main Weapon)\s*$/m)
  if (specMatch) spec = specMatch[1]

  // Extract intro paragraph (text before the first spec heading or skill name)
  const specHeadingPos = specMatch ? blockText.indexOf(specMatch[0]) : blockText.length
  const intro = blockText.slice(0, specHeadingPos).trim().replace(/\n{3,}/g, '\n\n').slice(0, 600)

  // Parse skill changes
  // Skill names are lines that:
  // - Start with a capital letter
  // - Are relatively short (< 80 chars)
  // - Don't end with common sentence endings
  // - Aren't spec headings
  const lines = blockText.split('\n').map(l => l.trim()).filter(Boolean)
  const changes: SkillChange[] = []
  let currentSkill: string | null = null
  let currentDesc: string[] = []
  let inTable = false

  const SPEC_HEADINGS = ['Awakening', 'Succession', 'Ascension', 'Main Weapon', 'Absolute', 'Prime']
  const isSpecHeading = (line: string) => SPEC_HEADINGS.some(h => line === h)

  const flushSkill = () => {
    if (currentSkill && currentDesc.length > 0) {
      const desc = currentDesc.join(' ').replace(/\s+/g, ' ').trim()
      const { before, after } = extractBeforeAfter(desc)
      changes.push({
        skillName: currentSkill,
        changeType: classifyChange(desc),
        before,
        after,
        description: desc,
      })
    }
    currentSkill = null
    currentDesc = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Skip spec headings
    if (isSpecHeading(line)) {
      flushSkill()
      continue
    }

    // Detect table header
    if (/Before.*After/i.test(line) && line.includes('\t')) {
      inTable = true
      flushSkill()
      continue
    }

    // Table rows: "SkillName\tBefore...\tAfter..."
    if (inTable && line.includes('\t')) {
      const parts = line.split('\t').map(p => p.trim()).filter(Boolean)
      if (parts.length >= 2) {
        flushSkill()
        const skillName = parts[0]
        const before = parts.length >= 3 ? parts[1] : undefined
        const after = parts[parts.length - 1]
        changes.push({
          skillName,
          changeType: /damage/i.test(before || after) ? (/increased/i.test(after) ? 'damage_up' : 'damage_down') : 'note',
          before,
          after,
          description: `${before ? `Before: ${before}. ` : ''}After: ${after}`,
        })
        continue
      }
    }

    // End of table
    if (inTable && !line.includes('\t') && line.length > 0) {
      inTable = false
    }

    // Detect skill name: short line, starts with capital, not a sentence
    const isSkillName = line.length < 80
      && /^[A-Z]/.test(line)
      && !line.endsWith('.')
      && !/^(The|This|With|Additionally|However|Furthermore|Accordingly|When|For|In|To|A|An)\s/i.test(line)
      && !/\d/.test(line)  // skill names don't usually start with digits
      && !isSpecHeading(line)

    if (isSkillName && !inTable) {
      flushSkill()
      currentSkill = line
    } else if (currentSkill) {
      currentDesc.push(line)
    } else if (line.length > 20) {
      // Intro text that wasn't captured
    }
  }
  flushSkill()

  if (changes.length === 0 && !intro) return null

  return {
    className,
    spec,
    intro: intro || '',
    changes,
  }
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log('=== BDO Meta Patch Notes Scraper ===')
  console.log('\n[1/3] Fetching patch notes listing...')

  const patches = await fetchBoardIds(`${PA_BASE}?_categoryNo=2`)

  console.log(`  Found ${patches.length} patch links.`)
  for (const p of patches.slice(0, 5)) {
    console.log(`    ${p.date} — boardNo=${p.boardNo}`)
  }

  // Load existing archive
  let archive: PatchNote[] = []
  if (existsSync('data/patch-archive.json')) {
    try { archive = JSON.parse(readFileSync('data/patch-archive.json', 'utf-8')) } catch {}
  }
  const archiveUrls = new Set(archive.map(p => p.url))

  // [2/3] Fetch and parse each patch
  console.log('\n[2/3] Fetching and parsing patches...')
  const newPatches: PatchNote[] = []

  for (const patch of patches.slice(0, 5)) {
    // Skip if already in archive (avoid re-fetching)
    if (archiveUrls.has(patch.url)) {
      console.log(`  [skip] ${patch.date} (${patch.boardNo}) — already in archive`)
      // Find it in archive to include in newPatches
      const existing = archive.find(p => p.url === patch.url)
      if (existing) newPatches.push(existing)
      continue
    }

    console.log(`  [fetch] ${patch.date} (${patch.boardNo})...`)
    try {
      const text = await fetchPage(patch.url)
      const classChanges: ClassChangeBlock[] = []
      for (const cls of CLASSES) {
        const parsed = parseClassChanges(text, cls)
        if (parsed && (parsed.changes.length > 0 || parsed.intro)) {
          classChanges.push(parsed)
        }
      }
      console.log(`    → ${classChanges.length} class blocks, ${classChanges.reduce((s, c) => s + c.changes.length, 0)} skill changes`)
      newPatches.push({ date: patch.date, url: patch.url, classChanges })
    } catch (err) {
      console.error(`    ✗ Error: ${(err as Error).message}`)
    }
  }

  if (newPatches.length === 0) {
    console.log('\nNo patches to save.')
    return
  }

  // [3/3] Save: latest patch to patch-notes.json, all to archive
  console.log('\n[3/3] Saving...')

  // Sort by date (newest first) — simple string sort works for "Month DD, YYYY"
  // Actually we need proper date parsing. Use the order from the listing (already newest-first).
  // The listing page shows newest first, so patches[0] is newest.

  // Save the LATEST patch WITH class changes as patch-notes.json.
  // The listing may include non-balance patches (general notices) that have 0
  // class changes — we want the most recent actual balance patch.
  const latestPatch = newPatches.find(p => p.classChanges.length > 0) || newPatches[0]
  writeFileSync('data/patch-notes.json', JSON.stringify([latestPatch], null, 2))
  console.log(`  ✓ Latest patch (${latestPatch.date}) → data/patch-notes.json`)

  // Append ALL new patches to archive (dedup by URL)
  for (const p of newPatches) {
    if (!archiveUrls.has(p.url)) {
      archive.push(p)
      archiveUrls.add(p.url)
    }
  }
  // Sort archive by date descending (best effort)
  archive.sort((a, b) => {
    const da = new Date(a.date).getTime()
    const db = new Date(b.date).getTime()
    return db - da
  })
  writeFileSync('data/patch-archive.json', JSON.stringify(archive, null, 2))
  console.log(`  ✓ Archive (${archive.length} patches) → data/patch-archive.json`)

  console.log('\n=== Done ===')
  console.log(`  Latest patch: ${latestPatch.date}`)
  console.log(`  Classes changed: ${latestPatch.classChanges.length}`)
  console.log(`  Total skill changes: ${latestPatch.classChanges.reduce((s, c) => s + c.changes.length, 0)}`)
  console.log(`  Archive total: ${archive.length} patches`)
}

main().catch(e => { console.error(e); process.exit(1) })
