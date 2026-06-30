import { writeFileSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

mkdirSync('data', { recursive: true })

async function fetchPage(url: string): Promise<string> {
  execFileSync('agent-browser', ['open', url], { stdio: 'pipe', timeout: 30000 })
  await new Promise(r => setTimeout(r, 10000))
  const result = execFileSync('agent-browser', ['eval', 'document.body.innerText'], {
    stdio: 'pipe', timeout: 15000,
  }).toString().trim()
  let text = result
  if (text.startsWith('"') && text.endsWith('"')) text = text.slice(1, -1)
  return text.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\'/g, "'")
}

function parseClassChanges(text: string) {
  const classes = [
    'Warrior', 'Ranger', 'Sorceress', 'Berserker', 'Tamer', 'Valkyrie',
    'Wizard', 'Witch', 'Musa', 'Maehwa', 'Striker', 'Mystic', 'Lahn',
    'Archer', 'Shai', 'Guardian', 'Hashashin', 'Nova', 'Sage', 'Corsair',
    'Drakania', 'Woosa', 'Maegu', 'Scholar', 'Dosa', 'Seraph', 'Deadeye',
    'Wukong', 'Kunoichi', 'Ninja', 'Dark Knight',
  ]

  const positions: { class: string; pos: number }[] = []
  for (const cls of classes) {
    const regex = new RegExp(`^\\s*(${cls}|${cls.toUpperCase()})\\s*$`, 'gm')
    let match
    while ((match = regex.exec(text)) !== null) {
      // Make sure this isn't inside a sentence (check surrounding context)
      const before = text.slice(Math.max(0, match.index - 30), match.index)
      const after = text.slice(match.index + match[0].length, match.index + match[0].length + 30)
      // Class heading should have newline or start before it, and newline after
      if (/\n\s*$/.test(before) || match.index === 0) {
        positions.push({ class: cls, pos: match.index + match[0].length })
      }
    }
  }
  positions.sort((a, b) => a.pos - b.pos)

  const changes: { className: string; changes: string }[] = []
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].pos
    const end = i + 1 < positions.length ? positions[i + 1].pos : Math.min(start + 3000, text.length)
    let changeText = text.slice(start, end).trim()
    changeText = changeText.replace(/\n{3,}/g, '\n\n')
    if (changeText.length > 20) {
      changes.push({ className: positions[i].class, changes: changeText.slice(0, 2000) })
    }
  }
  return changes
}

async function main() {
  // Known recent patch note URLs from the Asia site
  const patches = [
    { date: 'June 25, 2026', boardNo: 13348 },
    { date: 'April 3, 2025', boardNo: 7714 },
  ]

  const results: { date: string; url: string; classChanges: { className: string; changes: string }[] }[] = []

  for (const patch of patches) {
    const url = `https://blackdesert.pearlabyss.com/Asia/en-US/News/Notice/Detail?_boardNo=${patch.boardNo}`
    console.log(`Fetching ${patch.date}...`)
    try {
      const text = await fetchPage(url)
      const classChanges = parseClassChanges(text)
      console.log(`  Found ${classChanges.length} class changes`)
      if (classChanges.length > 0) {
        results.push({ date: patch.date, url, classChanges })
      }
    } catch (err) {
      console.error(`  Error: ${(err as Error).message}`)
    }
  }

  writeFileSync('data/patch-notes.json', JSON.stringify(results, null, 2))
  console.log(`\nSaved ${results.length} patches to data/patch-notes.json`)
}

main().catch(console.error)
