import { db } from '../src/lib/db'
async function main() {
  const succFlagged = await db.skill.count({ where: { isSuccession: true } })
  const primeName = await db.skill.count({ where: { name: { startsWith: 'Prime:' } } })
  const primeAndSucc = await db.skill.count({ where: { name: { startsWith: 'Prime:' }, isSuccession: true } })
  const primeNotSucc = await db.skill.count({ where: { name: { startsWith: 'Prime:' }, isSuccession: false } })
  console.log(`isSuccession=true: ${succFlagged}`)
  console.log(`name startsWith 'Prime:': ${primeName}`)
  console.log(`Prime: AND isSuccession=true: ${primeAndSucc}`)
  console.log(`Prime: AND isSuccession=false: ${primeNotSucc}`)
  await db.$disconnect()
}
main().catch(console.error)
