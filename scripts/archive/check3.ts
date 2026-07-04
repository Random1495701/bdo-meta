import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  const skill = await db.skill.findFirst({ 
    where: { skillId: 1119 }, 
    select: { skillId: true, name: true, description: true, tooltipRawHtml: true, syncedAt: true } 
  })
  if (skill?.tooltipRawHtml) {
    console.log('Raw HTML length:', skill.tooltipRawHtml.length)
    console.log('First 300:', JSON.stringify(skill.tooltipRawHtml.slice(0, 300)))
    console.log('Has tag_skill-description:', skill.tooltipRawHtml.includes('tag_skill-description'))
    console.log('Has card item_info:', skill.tooltipRawHtml.includes('card item_info'))
  } else {
    console.log('No raw HTML saved')
  }
  // Check skills with description
  const withDesc = await db.skill.findFirst({ 
    where: { description: { not: null } }, 
    select: { skillId: true, name: true, description: true, syncedAt: true } 
  })
  console.log('Sample with desc:', JSON.stringify(withDesc))
  await db.$disconnect()
}
main().catch(console.error)
