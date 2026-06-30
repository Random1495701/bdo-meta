import { writeFileSync } from 'node:fs'

const PA_BASE = 'https://blackdesert.pearlabyss.com/Asia/en-US/News/Notice'

// Use agent-browser to fetch pages (bypasses Incapsula)
async function fetchPage(url: string): Promise<string> {
  const { execFileSync } = await import('node:child_process')
  // Open the page in agent-browser
  execFileSync('agent-browser', ['open', url], { stdio: 'pipe', timeout: 30000 })
  // Wait for page to load
  await new Promise(r => setTimeout(r, 8000))
  // Extract text
  const result = execFileSync('agent-browser', ['eval', 'document.body.innerText'], {
    stdio: 'pipe',
    timeout: 15000,
  }).toString().trim()
  // Remove quotes wrapping
  let text = result
  if (text.startsWith('"') && text.endsWith('"')) text = text.slice(1, -1)
  return text.replace(/\\n/g, '\n').replace(/\\"/g, '"')
}

function parseClassChanges(text: string) {
  const classes = [
    'Warrior', 'Ranger', 'Sorceress', 'Berserker', 'Tamer', 'Valkyrie',
    'Wizard', 'Witch', 'Musa', 'Maehwa', 'Striker', 'Mystic', 'Lahn',
    'Archer', 'Shai', 'Guardian', 'Hashashin', 'Nova', 'Sage', 'Corsair',
    'Drakania', 'Woosa', 'Maegu', 'Scholar', 'Dosa', 'Seraph', 'Deadeye',
    'Wukong', 'Kunoichi', 'Ninja', 'Dark Knight',
  ]

  // Find class headings (class name on its own line, possibly uppercase)
  const positions: { class: string; pos: number }[] = []
  for (const cls of classes) {
    // Match class name at start of a line (with optional whitespace)
    const regex = new RegExp(`^\\s*(${cls}|${cls.toUpperCase()})\\s*$`, 'gm')
    let match
    while ((match = regex.exec(text)) !== null) {
      positions.push({ class: cls, pos: match.index + match[0].length })
    }
  }
  positions.sort((a, b) => a.pos - b.pos)

  // Extract text between each class heading
  const changes: { className: string; changes: string }[] = []
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].pos
    const end = i + 1 < positions.length ? positions[i + 1].pos : Math.min(start + 3000, text.length)
    let changeText = text.slice(start, end).trim()
    // Clean up
    changeText = changeText.replace(/\n{3,}/g, '\n\n')
    if (changeText.length > 20) {
      changes.push({ className: positions[i].class, changes: changeText.slice(0, 2000) })
    }
  }

  return changes
}

async function main() {
  console.log('Fetching patch notes listing...')
  const listText = await fetchPage(`${PA_BASE}?_categoryNo=2`)

  // Find update links
  const linkRegex = /\/News\/Notice\/Detail\?_boardNo=(\d+)/g
  const boardIds: number[] = []
  let match
  while ((match = linkRegex.exec(listText)) !== null) {
    const id = parseInt(match[1], 10)
    if (!boardIds.includes(id)) boardIds.push(id)
  }

  // Also find dates and titles
  const dateRegex = /(\w+ \d+,? \d{4}).*?Update Details/g
  const patches: { boardNo: number; date: string; url: string }[] = []
  let dateMatch
  let linkIdx = 0
  while ((dateMatch = dateRegex.exec(listText)) !== null) {
    if (linkIdx < boardIds.length) {
      patches.push({
        boardNo: boardIds[linkIdx],
        date: dateMatch[1],
        url: `${PA_BASE}/Detail?_boardNo=${boardIds[linkIdx]}`,
      })
      linkIdx++
    }
  }

  // If no structured patches found, just use the first few board IDs
  if (patches.length === 0) {
    for (const id of boardIds.slice(0, 5)) {
      patches.push({ boardNo: id, date: 'Unknown', url: `${PA_BASE}/Detail?_boardNo=${id}` })
    }
  }

  console.log(`Found ${patches.length} patch notes. Fetching top 3...`)

  const results: { date: string; url: string; classChanges: { className: string; changes: string }[] }[] = []

  for (const patch of patches.slice(0, 3)) {
    console.log(`  Fetching ${patch.date} (${patch.boardNo})...`)
    try {
      const text = await fetchPage(patch.url)
      const classChanges = parseClassChanges(text)
      console.log(`    Found ${classChanges.length} class changes`)
      results.push({ date: patch.date, url: patch.url, classChanges })
    } catch (err) {
      console.error(`    Error: ${(err as Error).message}`)
    }
  }

  writeFileSync('data/patch-notes.json', JSON.stringify(results, null, 2))
  console.log(`\nSaved ${results.length} patches with class changes to data/patch-notes.json`)
}

main().catch(console.error)
