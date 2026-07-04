import { db } from '../src/lib/db'
async function main() {
  const logs = await db.syncLog.findMany({ take: 8, orderBy: { createdAt: 'desc' } })
  for (const l of logs) {
    console.log(`${l.createdAt.toISOString()} [${l.type}] ${l.status} — ${l.message}`)
  }
  await db.$disconnect()
}
main().catch(console.error)
