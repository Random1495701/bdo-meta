// Crash-test suite — iterates all class×spec combinations and fetches skills.
// Logs any API errors or empty responses.
// Usage: bun run scripts/crash-test.ts

const BASE = 'http://localhost:3000'

async function main() {
  console.log('=== Crash Test Suite ===')
  console.log('Testing all class×spec combinations...\n')

  const classesRes = await fetch(`${BASE}/api/classes`)
  const classesData = await classesRes.json()
  const classes = classesData.classes || classesData

  let pass = 0
  let fail = 0
  const issues: string[] = []

  for (const cls of classes) {
    if (cls.name.startsWith('NEW_CLASS')) continue

    const specs = cls.isAscension
      ? ['ascension']
      : ['awakening', 'succession']

    for (const spec of specs) {
      try {
        const url = `${BASE}/api/skills?class=${cls.id}&specs=${spec}&pageSize=5`
        const res = await fetch(url)
        const data = await res.json()

        if (!res.ok) {
          issues.push(`❌ ${cls.name} ${spec}: HTTP ${res.status}`)
          fail++
          continue
        }

        if (!data.items || data.items.length === 0) {
          issues.push(`⚠️  ${cls.name} ${spec}: 0 skills returned`)
          fail++
          continue
        }

        // Check for Awakening leaks in Succession
        if (spec === 'succession') {
          const leaks = data.items.filter((s: any) => s.isAwakening)
          if (leaks.length > 0) {
            issues.push(`❌ ${cls.name} ${spec}: ${leaks.length} Awakening leaks`)
            fail++
            continue
          }
        }

        pass++
      } catch (e) {
        issues.push(`❌ ${cls.name} ${spec}: ${String(e).slice(0, 100)}`)
        fail++
      }
    }
  }

  // Also test no-spec (default) view
  try {
    const res = await fetch(`${BASE}/api/skills?pageSize=5`)
    const data = await res.json()
    if (data.items && data.items.length > 0) {
      pass++
    } else {
      issues.push('❌ Default (no spec): 0 skills')
      fail++
    }
  } catch (e) {
    issues.push(`❌ Default: ${String(e).slice(0, 100)}`)
    fail++
  }

  // Test meta API
  try {
    const res = await fetch(`${BASE}/api/meta`)
    const data = await res.json()
    if (data.classes && data.classes.length > 0) {
      pass++
    } else {
      issues.push('❌ Meta API: 0 classes')
      fail++
    }
  } catch (e) {
    issues.push(`❌ Meta API: ${String(e).slice(0, 100)}`)
    fail++
  }

  console.log(`Results: ${pass} passed, ${fail} failed\n`)
  if (issues.length > 0) {
    console.log('Issues:')
    for (const i of issues) console.log(`  ${i}`)
  } else {
    console.log('✅ All class×spec combinations pass')
  }
}

main().catch(console.error)
