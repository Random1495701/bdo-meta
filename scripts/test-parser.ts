import { readFileSync } from 'fs'

function decodeEntities(s: string): string {
  return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/<[^>]+>/g, '').trim()
}
function stripTags(s: string): string { return s.replace(/<[^>]+>/g, '').trim() }
function rx1(input: string, rx: RegExp): string | null {
  const m = input.match(rx)
  return m ? m[1] : null
}

const html = readFileSync('/tmp/skill_page.html', 'utf-8')

// Test 1: extract card section
const cardMatch = html.match(/<div class="card item_info[\s\S]*?<\/div>\s*<\/div>/)
console.log('cardMatch found:', !!cardMatch)
console.log('cardMatch length:', cardMatch?.[0]?.length)

// Test 2: try parsing the full html directly (no card extraction)
const name1 = rx1(html, /<span class="tag_skill_name">([\s\S]*?)<\/span>/)
console.log('name from full html:', name1)

// Test 3: try parsing the card section
if (cardMatch) {
  const name2 = rx1(cardMatch[0], /<span class="tag_skill_name">([\s\S]*?)<\/span>/)
  console.log('name from card section:', name2)
  const desc = rx1(cardMatch[0], /<span class="tag_skill-description">([\s\S]*?)<\/span>/)
  console.log('desc from card section:', desc ? decodeEntities(desc).slice(0, 80) : 'null')
}

// Test 4: check if the card regex is stopping too early
if (cardMatch) {
  console.log('card section ends with:', cardMatch[0].slice(-100))
  console.log('has tag_skill-description in card?', cardMatch[0].includes('tag_skill-description'))
}
