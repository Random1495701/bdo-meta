import { db } from '../src/lib/db'

const BDOCODEX = 'https://bdocodex.com'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

async function httpGet(url: string) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Referer: `${BDOCODEX}/us/skillbuilder/` } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

function rx1(input: string, rx: RegExp): string | null {
  const m = input.match(rx)
  return m ? m[1] : null
}

function decodeEntities(s: string): string {
  return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/<[^>]+>/g, '').trim()
}

async function main() {
  const skillId = 1119
  const url = `${BDOCODEX}/tip.php?id=skill--${skillId}&l=us&nf=on`
  const html = await httpGet(url)
  console.log('HTML length:', html.length)
  const descRaw = rx1(html, /<span class="tag_skill-description">([\s\S]*?)<\/span>/)
  console.log('descRaw:', JSON.stringify(descRaw))
  console.log('descDecoded:', descRaw ? decodeEntities(descRaw) : null)
  
  // Check a few skills
  const samples = [1119, 173, 1029]
  for (const id of samples) {
    const html = await httpGet(`${BDOCODEX}/tip.php?id=skill--${id}&l=us&nf=on`)
    const descRaw = rx1(html, /<span class="tag_skill-description">([\s\S]*?)<\/span>/)
    console.log(`Skill ${id}: desc=${descRaw ? JSON.stringify(decodeEntities(descRaw)).slice(0, 80) : 'null'}`)
  }
  await db.$disconnect()
}
main().catch(console.error)
