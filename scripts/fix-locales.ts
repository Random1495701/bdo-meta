import { db } from '../src/lib/db'
async function main() {
  // Find skills with non-English descriptions (contain Korean, German, French, or Spanish chars)
  // Korean: Hangul range 가-힣, German: äöüß, French: éèêëàâ, Spanish: ñ¿¡
  const skills = await db.skill.findMany({
    where: { description: { not: null } },
    select: { skillId: true, description: true, className: true, syncedAt: true },
  })
  let count = 0
  for (const s of skills) {
    const desc = s.description || ''
    const cls = s.className || ''
    // Check for non-ASCII / non-English characters
    const hasKorean = /[가-힣]/.test(desc) || /[가-힣]/.test(cls)
    const hasGerman = /ä|ö|ü|ß/i.test(desc) || /ä|ö|ü|ß/i.test(cls)
    const hasFrench = /é|è|ê|ë|à|â|ù|û|ï|î/i.test(desc)
    const hasSpanish = /ñ|¿|¡/i.test(desc)
    // Check for German command keywords
    const hasGermanCmd = /RMT|LMT/i.test(desc) // German "Rechte Maustaste" vs English "RMB"
    
    if (hasKorean || hasGerman || hasFrench || hasSpanish) {
      console.log(`  Skill ${s.skillId}: non-English data detected (${hasKorean ? 'KR' : ''}${hasGerman ? 'DE' : ''}${hasFrench ? 'FR' : ''}${hasSpanish ? 'ES' : ''})`)
      // Clear the description so the lurker will re-fetch it from English endpoints
      await db.skill.update({
        where: { skillId: s.skillId },
        data: {
          description: null,
          command: null,
          className: null,
          damageRowsJson: null,
          ccTypes: null,
          protectionTypes: null,
          cooldown: null,
          cooldownSec: null,
        },
      })
      count++
    }
  }
  console.log(`\nCleared ${count} skills with non-English data. The lurker will re-fetch them from English endpoints.`)
  await db.$disconnect()
}
main().catch(console.error)
