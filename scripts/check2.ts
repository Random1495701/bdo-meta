import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  const result = await db.$queryRaw`SELECT COUNT(*) as total, SUM(CASE WHEN description IS NOT NULL THEN 1 ELSE 0 END) as with_desc FROM skills`
  console.log('Raw query:', result)
  // Check a recently-synced skill
  const recent = await db.skill.findFirst({ where: { skillId: 1119 }, select: { skillId: true, name: true, description: true, syncedAt: true } })
  console.log('Skill 1119:', JSON.stringify(recent))
  await db.$disconnect()
}
main().catch(console.error)
