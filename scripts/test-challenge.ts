// Port of bdocodex's get_jhash() JS function
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

function fixedEncodeURIComponent(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16))
}

const BDOCODEX = 'https://bdocodex.com'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

async function solveChallenge(url: string): Promise<string | null> {
  // Step 1: initial request — server will set __js_p_ cookie and return loading page
  const res1 = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: `${BDOCODEX}/us/skillbuilder/`,
    },
  })
  const setCookie = res1.headers.get('set-cookie') || ''
  const text1 = await res1.text()
  console.log(`Step 1: HTTP ${res1.status}, ${text1.length} bytes, loading page: ${text1.includes('gorizontal-vertikal')}`)
  console.log(`  Set-Cookie: ${setCookie.slice(0, 100)}`)
  
  // Parse __js_p_ cookie
  const jspMatch = setCookie.match(/__js_p_=([^;]+)/)
  if (!jspMatch) {
    console.log('  No __js_p_ cookie — not a challenge page, return as-is')
    return text1
  }
  const jspValue = jspMatch[1]
  const parts = jspValue.split(',')
  const code = parseInt(parts[0], 10)
  const age = parseInt(parts[1], 10) || 2700
  const sec = parseInt(parts[2], 10) || 0
  
  console.log(`  __js_p_ = ${jspValue} → code=${code}, age=${age}, sec=${sec}`)
  
  // Step 2: compute jhash
  const jhash = getJhash(code)
  const jua = fixedEncodeURIComponent(UA)
  console.log(`  Computed jhash=${jhash}, jua=${jua.slice(0, 50)}...`)
  
  // Step 3: wait 1s (matching the setTimeout in the JS)
  await new Promise(r => setTimeout(r, 1100))
  
  // Step 4: re-request with all three cookies
  const cookieStr = `__js_p_=${jspValue}; __jhash_=${jhash}; __jua_=${jua}`
  const res2 = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: `${BDOCODEX}/us/skillbuilder/`,
      Cookie: cookieStr,
    },
  })
  const text2 = await res2.text()
  console.log(`Step 2: HTTP ${res2.status}, ${text2.length} bytes, loading page: ${text2.includes('gorizontal-vertikal')}`)
  console.log(`  Has tag_skill_name: ${text2.includes('tag_skill_name')}`)
  console.log(`  Has tag_skill-description: ${text2.includes('tag_skill-description')}`)
  
  return text2
}

async function main() {
  console.log('=== Testing JS challenge solver on tip.php ===')
  const result = await solveChallenge(`${BDOCODEX}/tip.php?id=skill--1119&l=us&nf=on`)
  if (result && !result.includes('gorizontal-vertikal')) {
    console.log('\n✅ CHALLENGE SOLVED! Real content retrieved.')
  } else {
    console.log('\n❌ Still getting loading page.')
  }
  
  console.log('\n=== Testing on /us/skill/ page ===')
  const result2 = await solveChallenge(`${BDOCODEX}/us/skill/1119/`)
  if (result2 && !result2.includes('gorizontal-vertikal')) {
    console.log('\n✅ CHALLENGE SOLVED! Real content retrieved.')
  } else {
    console.log('\n❌ Still getting loading page.')
  }
}

main().catch(console.error)
