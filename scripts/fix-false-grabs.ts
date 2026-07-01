// Fix false grabs: check all skills with Grapple in ccTypes against bdocodex
// to find which ones have "except Grapple" (resistance buff, not a real grab)
// and remove Grapple from their ccTypes.
//
// Usage: bun run scripts/fix-false-grabs.ts

import { db } from '../src/lib/db'
import { execFileSync } from 'node:child_process'

async function fetchSkillTooltip(skillId: number): Promise<string> {
  try {
    execFileSync('agent-browser', ['open', `https://bdocodex.com/us/skill/${skillId}/`], { stdio: 'pipe', timeout: 30000 })
    await new Promise(r => setTimeout(r, 6000))
    const result = execFileSync('agent-browser', ['eval', 'document.body.innerText'], {
      stdio: 'pipe', timeout: 15000,
    }).toString().trim()
    let text = result
    if (text.startsWith('"') && text.endsWith('"')) text = text.slice(1, -1)
    return text.replace(/\\n/g, '\n').replace(/\\"/g, '"')
  } catch {
    return ''
  }
}

async function main() {
  console.log('=== Fix False Grabs ===')
  const skills = await db.skill.findMany({
    where: { ccTypes: { contains: 'Grapple' } },
    select: { skillId: true, name: true, className: true, ccTypes: true }
  })
  console.log(`Found ${skills.length} skills with Grapple in ccTypes`)

  let fixed = 0
  let checked = 0
  for (const s of skills) {
    checked++
    const tooltip = await fetchSkillTooltip(s.skillId)
    const hasExceptGrapple = tooltip.toLowerCase().includes('except grapple')
    const hasOnGrapple = tooltip.toLowerCase().includes('on grapple')

    if (hasExceptGrapple && !hasOnGrapple) {
      // This is a false grab — remove Grapple from ccTypes
      const newCcTypes = s.ccTypes.split(',').map((x: string) => x.trim()).filter((x: string) => x !== 'Grapple').join(',')
      await db.skill.update({
        where: { skillId: s.skillId },
        data: { ccTypes: newCcTypes || null }
      })
      console.log(`  FIXED: ${s.className} - ${s.name} (id: ${s.skillId}) — removed Grapple from ccTypes`)
      fixed++
    } else if (hasExceptGrapple && hasOnGrapple) {
      console.log(`  SKIP (has both): ${s.className} - ${s.name} (id: ${s.skillId})`)
    }

    if (checked % 5 === 0) console.log(`  ... checked ${checked}/${skills.length}`)
    await new Promise(r => setTimeout(r, 1000)) // be polite
  }

  console.log(`\n=== Done ===`)
  console.log(`  Checked: ${checked}`)
  console.log(`  Fixed (false grabs removed): ${fixed}`)
  await db.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
