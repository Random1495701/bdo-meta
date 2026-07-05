// Fix classId poisoning for base-skill rows — v3 (safe heuristic).
//
// PROBLEM:
// bdocodex assigns base skills (e.g. "Nemesis Slash I") to the classId of the
// tree page they appear on, NOT the actual class. This causes Musa skills to
// appear in Sorceress's skill list.
//
// SAFE HEURISTIC (v3):
// A base skill (no Prime:/Absolute:/Succession:/Ultimate: prefix) is POISONED
// only if ALL of these are true:
//   1. Its class has ONLY this one skill with this baseName (no variants, no
//      other ranks — completely isolated)
//   2. Another class has BOTH:
//      a. A base skill with the same NAME (confirming it's the same skill)
//      b. At least one variant (Prime:/Absolute:/Succession:/Ultimate:) with
//         the same baseName
//
// This avoids false positives like:
//   - "Evasion" (universal skill — every class has it, only Witch has Prime:
//     Evasion variant → NOT poisoned, don't reassign)
//   - "Sword Training" (shared between Musa/Maehwa, no variants → NOT poisoned)
//
// Usage: bun run scripts/fix-base-classid-v3.ts

import { db } from '../src/lib/db'

const PREFIX_RE = /^(Prime|Absolute|Succession|Core|Flow|Black Spirit|Ultimate|Extreme):\s/i

function isPrefixed(name: string): boolean {
  return PREFIX_RE.test(name)
}

async function main() {
  console.log('=== Fix classId poisoning for base-skill rows (v3 — safe) ===\n')

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

    // Separate base skills (no prefix) from variant (prefixed) skills
    const baseSkills = group.filter((s) => !isPrefixed(s.name))
    const variantSkills = group.filter((s) => isPrefixed(s.name))

    if (baseSkills.length === 0 || variantSkills.length === 0) continue

    // Group base skills by classId + name
    // Key: `${classId}:${name}` → skills
    const baseByKey = new Map<string, typeof baseSkills>()
    for (const bs of baseSkills) {
      if (bs.classId == null) continue
      const key = `${bs.classId}:${bs.name}`
      if (!baseByKey.has(key)) baseByKey.set(key, [])
      baseByKey.get(key)!.push(bs)
    }

    // Group variant skills by classId
    const variantsByClass = new Map<number, number>()
    const classNames = new Map<number, string>()
    for (const v of variantSkills) {
      if (v.classId == null) continue
      variantsByClass.set(v.classId, (variantsByClass.get(v.classId) || 0) + 1)
      classNames.set(v.classId, v.className || '')
    }

    // For each base skill, check if it's poisoned:
    // - Its class has ONLY 1 skill with this baseName (isolated)
    // - Another class has the same base skill name AND variants
    for (const bs of baseSkills) {
      if (bs.classId == null) continue

      // Count how many skills with this baseName are on this class
      const skillsOnThisClass = group.filter((s) => s.classId === bs.classId)
      if (skillsOnThisClass.length > 1) continue // has siblings — not isolated

      // This class is isolated (only 1 skill with this baseName).
      // Check if this class has any variants of this baseName.
      if (variantsByClass.has(bs.classId)) continue // has variants — not poisoned

      // Find a target class that has BOTH:
      // a. A BASE skill (no prefix) with the same baseName (not just a variant)
      //    — this confirms the target class actually owns this skill family
      // b. At least one variant (Prime:/Absolute:/etc.) of this baseName
      //    — this confirms the target class has the full skill chain
      let targetClass: number | null = null
      let targetVariantCount = 0
      for (const [cid, vCount] of variantsByClass) {
        if (cid === bs.classId) continue
        // Does this class have ANY BASE skill (no prefix) with this baseName?
        const targetBases = baseSkills.filter((s) => s.classId === cid)
        if (targetBases.length === 0) continue // target only has variants, no base — skip
        // This class has a base skill AND variants — candidate
        if (vCount > targetVariantCount) {
          targetVariantCount = vCount
          targetClass = cid
        }
      }

      if (targetClass == null) continue

      // If the target already has a base skill with the EXACT same name AND
      // same skillId is different, this is a duplicate artifact — delete it.
      const targetBaseSkills = baseByKey.get(`${targetClass}:${bs.name}`) || []
      if (targetBaseSkills.length > 0) {
        // Target already has this exact base skill — the one on the wrong
        // class is a duplicate. Mark for deletion.
        reassignments.push({
          skillId: bs.skillId,
          name: bs.name,
          fromClass: `${bs.classId}:${bs.className}`,
          toClass: `${targetClass}:${classNames.get(targetClass)} (DUPLICATE — delete)`,
          reason: `isolated on ${bs.className}, target ${classNames.get(targetClass)} has base+${targetVariantCount} variants`,
        })
      } else {
        // Target has a base skill with a DIFFERENT rank (e.g. "II" vs "I")
        // but same baseName — this is still a duplicate artifact from
        // bdocodex's tree-page assignment. Delete the wrong-class copy.
        reassignments.push({
          skillId: bs.skillId,
          name: bs.name,
          fromClass: `${bs.classId}:${bs.className}`,
          toClass: `${targetClass}:${classNames.get(targetClass)} (DUPLICATE — delete)`,
          reason: `isolated on ${bs.className}, target has base (different rank) + ${targetVariantCount} variants`,
        })
      }
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
  if (reassignments.length > 30) {
    console.log(`  ... and ${reassignments.length - 30} more`)
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
    `Reassigning ${toReassign.length} skills, deleting ${toDelete.length} duplicates\n`,
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

  // Delete duplicates
  let deleted = 0
  for (const r of toDelete) {
    await db.skill.delete({ where: { skillId: r.skillId } })
    deleted++
  }
  console.log(`Deleted ${deleted} duplicate base skills.`)

  // Verify — check for the specific Nemesis Slash case
  console.log('\n=== Verification ===')
  const nemesis = await db.skill.findMany({
    where: { name: { contains: 'Nemesis Slash' } },
    select: { skillId: true, name: true, classId: true, className: true },
  })
  console.log('Nemesis Slash skills after fix:')
  const nemesisByClass = new Map<string, string[]>()
  for (const s of nemesis) {
    const k = `${s.classId}:${s.className}`
    if (!nemesisByClass.has(k)) nemesisByClass.set(k, [])
    nemesisByClass.get(k)!.push(s.name)
  }
  for (const [k, v] of nemesisByClass) {
    console.log(`  ${k}: ${v.length} skills`)
  }
}

main()
  .catch((e) => {
    console.error('FAILED:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
