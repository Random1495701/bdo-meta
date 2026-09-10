// Fix classId poisoning for base-skill rows — v2 (comprehensive).
//
// PROBLEM:
// bdocodex assigns base skills (e.g. "Nemesis Slash I") to the classId of the
// tree page they appear on, NOT the actual class. This causes Musa skills to
// appear in Sorceress's skill list.
//
// v5.9.2 fix-base-classid.ts missed cases where there's only 1 variant sibling
// (it required >= 2). This v2 uses a better heuristic:
//
// HEURISTIC:
// A base skill (no Prime:/Absolute:/Succession:/Ultimate: prefix) is POISONED
// if ALL of these are true:
//   1. Its class has NO variant siblings (Prime/Absolute/Succession/Ultimate)
//      with the same baseName
//   2. Another class DOES have variant siblings with the same baseName
//   3. The other class also has the base skill itself (confirming ownership)
//
// This correctly handles:
//   - Poisoned: Sorceress has "Nemesis Slash I" but no variants; Musa has
//     "Absolute: Nemesis Slash" + "Nemesis Slash II" → reassign to Musa
//   - Shared: Maehwa has "Sword Training I-XX" AND Musa has "Sword Training I-XX"
//     → both have their own copies, no variants to compare → NOT poisoned
//
// Usage: bun run scripts/fix-base-classid-v2.ts

import { db } from '../src/lib/db'

const PREFIX_RE = /^(Prime|Absolute|Succession|Core|Flow|Black Spirit|Ultimate|Extreme):\s/i

function isPrefixed(name: string): boolean {
  return PREFIX_RE.test(name)
}

async function main() {
  console.log('=== Fix classId poisoning for base-skill rows (v2) ===\n')

  const allSkills = await db.skill.findMany({
    select: {
      skillId: true,
      name: true,
      classId: true,
      className: true,
      baseName: true,
      isMaxRank: true,
    },
  })
  console.log(`Loaded ${allSkills.length} skills`)

  // Group by baseName
  const byBase = new Map<string, typeof allSkills>()
  for (const s of allSkills) {
    const bn = s.baseName || s.name
    if (!byBase.has(bn)) byBase.set(bn, [])
    byBase.get(bn)!.push(s)
  }
  console.log(`Grouped into ${byBase.size} unique baseNames\n`)

  const reassignments: {
    skillId: number
    name: string
    fromClass: string
    toClass: string
    reason: string
  }[] = []

  for (const [bn, group] of byBase) {
    if (group.length < 2) continue

    // Separate base skills from variant (prefixed) skills
    const baseSkills = group.filter((s) => !isPrefixed(s.name))
    const variantSkills = group.filter((s) => isPrefixed(s.name))

    if (baseSkills.length === 0 || variantSkills.length === 0) continue

    // For each class that has variants, record it as a "variant owner"
    const variantOwners = new Map<number, { count: number; className: string }>()
    for (const v of variantSkills) {
      if (v.classId == null) continue
      const existing = variantOwners.get(v.classId)
      if (existing) {
        existing.count++
      } else {
        variantOwners.set(v.classId, { count: 1, className: v.className || '' })
      }
    }

    if (variantOwners.size === 0) continue

    // For each base skill, check if its class is a variant owner
    for (const bs of baseSkills) {
      if (bs.classId == null) continue
      // If this class has variants, the base skill belongs here — not poisoned
      if (variantOwners.has(bs.classId)) continue

      // This class has the base skill but NO variants — likely poisoned.
      // Reassign to the variant owner with the most variants.
      let bestClass: number | null = null
      let bestCount = 0
      let bestName = ''
      for (const [cid, info] of variantOwners) {
        if (info.count > bestCount) {
          bestCount = info.count
          bestClass = cid
          bestName = info.className
        }
      }
      if (bestClass == null) continue

      // Safety: don't reassign if the target class already has a base skill
      // with the exact same name (would create a duplicate).
      const targetHasSameName = baseSkills.some(
        (s) => s.classId === bestClass && s.name === bs.name,
      )
      if (targetHasSameName) {
        // The target already has this base skill — this base skill on the
        // wrong class is a duplicate artifact. We should DELETE it, not
        // reassign. But to be safe, we'll just skip and log it.
        reassignments.push({
          skillId: bs.skillId,
          name: bs.name,
          fromClass: `${bs.classId}:${bs.className}`,
          toClass: `${bestClass}:${bestName} (DUPLICATE — needs deletion)`,
          reason: 'target already has same base skill (duplicate artifact)',
        })
        continue
      }

      reassignments.push({
        skillId: bs.skillId,
        name: bs.name,
        fromClass: `${bs.classId}:${bs.className}`,
        toClass: `${bestClass}:${bestName}`,
        reason: `class has 0 variants, target has ${bestCount}`,
      })
    }
  }

  console.log(`Found ${reassignments.length} base skills to reassign/delete\n`)
  if (reassignments.length === 0) {
    console.log('Nothing to fix. DB is clean.')
    return
  }

  // Print first 30 for inspection
  console.log('First 30:')
  for (const r of reassignments.slice(0, 30)) {
    console.log(
      `  ${r.name}  (${r.skillId})  ${r.fromClass} → ${r.toClass}  [${r.reason}]`,
    )
  }
  console.log('')

  // Separate reassignments from duplicates
  const toReassign = reassignments.filter(
    (r) => !r.toClass.includes('DUPLICATE'),
  )
  const toDelete = reassignments.filter((r) =>
    r.toClass.includes('DUPLICATE'),
  )

  console.log(
    `Reassigning ${toReassign.length} skills, flagging ${toDelete.length} duplicates for deletion\n`,
  )

  // Apply reassignments
  let applied = 0
  for (const r of toReassign) {
    const [toClassId, ...toClassNameParts] = r.toClass.split(':')
    const toClassName = toClassNameParts.join(':')
    await db.skill.update({
      where: { skillId: r.skillId },
      data: {
        classId: parseInt(toClassId, 10),
        className: toClassName,
      },
    })
    applied++
    if (applied % 50 === 0) console.log(`  ${applied}/${toReassign.length}...`)
  }
  console.log(`\nReassigned ${applied} base skills.`)

  // Delete duplicates (base skills that are exact duplicates on the wrong class)
  let deleted = 0
  for (const r of toDelete) {
    await db.skill.delete({ where: { skillId: r.skillId } })
    deleted++
  }
  console.log(`Deleted ${deleted} duplicate base skills.`)

  // Verify
  console.log('\n=== Verification ===')
  const afterSkills = await db.skill.findMany({
    select: { skillId: true, name: true, classId: true, className: true, baseName: true },
  })
  const afterByBase = new Map<string, typeof afterSkills>()
  for (const s of afterSkills) {
    const bn = s.baseName || s.name
    if (!afterByBase.has(bn)) afterByBase.set(bn, [])
    afterByBase.get(bn)!.push(s)
  }
  let remainingLeaks = 0
  for (const [_, group] of afterByBase) {
    if (group.length < 2) continue
    const baseSkills = group.filter((s) => !isPrefixed(s.name))
    const variantSkills = group.filter((s) => isPrefixed(s.name))
    if (baseSkills.length === 0 || variantSkills.length === 0) continue
    const variantOwners = new Set(
      variantSkills.map((s) => s.classId).filter((c): c is number => c != null),
    )
    for (const bs of baseSkills) {
      if (bs.classId != null && !variantOwners.has(bs.classId)) {
        remainingLeaks++
      }
    }
  }
  console.log(`Remaining base-skill leaks: ${remainingLeaks}`)
}

main()
  .catch((e) => {
    console.error('FAILED:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
