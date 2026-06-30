import { db } from '../src/lib/db'
async function main() {
  const count = await db.skill.count({
    where: {
      AND: [
        { protectionTypes: { contains: 'I-Frame' } },
        { name: { not: { contains: 'Evasion' } } },
        { name: { not: { contains: 'Evasive' } } },
        { name: { not: { contains: '(Not in use)' } } },
        { name: { not: { contains: '(Not in Use)' } } },
        { className: { not: { startsWith: 'NEW_CLASS' } } },
      ],
    },
  })
  console.log(`I-Frame skills surviving all filters: ${count}`)
  
  // Check if the issue is the 'iframe' keyword matching 'if' inside it
  // When 'iframe' is removed from the query, remaining might be ''
  // But 'if' might also match inside 'iframe' with word boundary...
  const q = 'iframe'
  let remaining = q
  // 'i-frame' (len 7) checked first, no match
  // 'iframe' (len 6) checked, matches! remaining = ''
  // 'float' (len 5) checked, no match  
  // 'if' (len 2) checked with word boundary: /\bif\b/i.test('') = false
  console.log('Remaining after keyword removal:', remaining.replace(/iframe/gi, '').trim())
  
  await db.$disconnect()
}
main().catch(console.error)
