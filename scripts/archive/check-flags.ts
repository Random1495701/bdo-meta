import { db } from '../src/lib/db'
async function main() {
  console.log(`isSuccession=true: ${await db.skill.count({ where: { isSuccession: true } })}`)
  console.log(`isAwakening=true: ${await db.skill.count({ where: { isAwakening: true } })}`)
  console.log(`isAbsolute=true: ${await db.skill.count({ where: { isAbsolute: true } })}`)
  console.log(`isBlackSpirit=true: ${await db.skill.count({ where: { isBlackSpirit: true } })}`)
  console.log(`isPassive=true: ${await db.skill.count({ where: { isPassive: true } })}`)
  await db.$disconnect()
}
main().catch(console.error)
