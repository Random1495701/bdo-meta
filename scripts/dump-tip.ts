const BDOCODEX = 'https://bdocodex.com'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

async function main() {
  const url = `${BDOCODEX}/tip.php?id=skill--1119&l=us&nf=on`
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Referer: `${BDOCODEX}/us/skillbuilder/` } })
  const text = await res.text()
  console.log('Status:', res.status, 'Length:', text.length)
  console.log('First 200 chars:', JSON.stringify(text.slice(0, 200)))
  console.log('Has tag_skill-description:', text.includes('tag_skill-description'))
  console.log('Has BOM:', text.charCodeAt(0) === 0xfeff)
  // Find the description span
  const idx = text.indexOf('tag_skill-description')
  if (idx >= 0) {
    console.log('Context:', JSON.stringify(text.slice(idx - 20, idx + 150)))
  }
  // Try the regex
  const m = text.match(/<span class="tag_skill-description">([\s\S]*?)<\/span>/)
  console.log('Regex match:', m ? JSON.stringify(m[1]).slice(0, 100) : 'NO MATCH')
  // Try without the < before span
  const m2 = text.match(/tag_skill-description">([\s\S]*?)<\/span>/)
  console.log('Regex2 match:', m2 ? JSON.stringify(m2[1]).slice(0, 100) : 'NO MATCH')
}
main().catch(console.error)
