// Fix classId poisoning for base-skill rows.
//
// PROBLEM:
// bdocodex assigns base skills (e.g. "Kamasylvia Slash I") to the classId of
// the tree page they appear on (succession tree, awakening tree), NOT the
// actual class the skill belongs to. This causes Dark Knight skills to appear
// in Berserker's skill list.
//
// v5.9.0 fixed this for Prime:/Succession:/Absolute: variants via majority
// vote. But BASE skills (no prefix) were missed — they're still assigned to
// the wrong class.
//
// FIX:
// For each base skill (no Prime/Absolute/Succession/Core/Flow/Black Spirit
// prefix) that is maxRank, find all its variant siblings (Prime:/Absolute:/
// Succession:) by baseName. The correct classId is the majority class among
// the variants. If the base skill's classId doesn't match, reassign it.
//
// SAFETY:
// - Only reassigns if there are >= 2 variant siblings (need a majority)
// - Only reassigns if the base skill's class is NOT among the variant classes
//   (a real cross-class skill would have the base on the same class as variants)
// - Prints before/after for verification
// - Updates className alongside classId for consistency
//
// Usage: bun run scripts/fix-base-classid.ts

import { db } from '../src/lib/db'

async function main() {
  console.log('=== Fix classId poisoning for base-skill rows ===\n')

  // Get all maxRank skills with their baseName
  const skills = await db.skill.findMany({
    where: { isMaxRank: true },
    select: { skillId: true, name: true, classId: true, className: true, baseName: true }
  })
  console.log(`Loaded ${skills.length} maxRank skills`)

  // Group by baseName
  const byBase = new Map<string, typeof skills>()
  for (const s of skills) {
    const bn = s.baseName || s.name
    if (!byBase.has(bn)) byBase.set(bn, [])
    byBase.get(bn)!.push(s)
  }
  console.log(`Grouped into ${byBase.size} unique baseNames\n`)

  // For each base skill, check if its classId matches its variant siblings
  const reassignments: { skillId: number; name: string; fromClass: string; toClass: string }[] = []

  for (const [bn, group] of byBase) {
    if (group.length < 2) continue

    // Separate base skills from variant skills
    const isVariant = (name: string) =>
      /^(Prime|Absolute|Succession|Core|Flow|Black Spirit):\s/i.test(name)
    const baseSkills = group.filter((s) => !isVariant(s.name))
    const variantSkills = group.filter((s) => isVariant(s.name))

    if (baseSkills.length === 0 || variantSkills.length < 2) continue

    // Majority vote on classId among variants
    const classCounts = new Map<number, number>()
    const classNames = new Map<number, string>()
    for (const v of variantSkills) {
      if (v.classId == null) continue
      classCounts.set(v.classId, (classCounts.get(v.classId) || 0) + 1)
      classNames.set(v.classId, v.className || '')
    }
    if (classCounts.size === 0) continue

    // Find the majority class
    let majorityClassId: number | null = null
    let majorityCount = 0
    for (const [cid, cnt] of classCounts) {
      if (cnt > majorityCount) {
        majorityCount = cnt
        majorityClassId = cid
      }
    }
    if (majorityClassId == null) continue

    const majorityClassName = classNames.get(majorityClassId) || ''
    const variantClassIds = new Set(variantSkills.map((s) => s.classId).filter((c): c is number => c != null))

    // Check each base skill — if its classId is NOT in variantClassIds, reassign
    for (const bs of baseSkills) {
      if (bs.classId == null) continue
      if (variantClassIds.has(bs.classId)) continue // already matches a variant class — skip

      reassignments.push({
        skillId: bs.skillId,
        name: bs.name,
        fromClass: `${bs.classId}:${bs.className}`,
        toClass: `${majorityClassId}:${majorityClassName}`,
      })
    }
  }

  console.log(`Found ${reassignments.length} base skills to reassign\n`)
  if (reassignments.length === 0) {
    console.log('Nothing to fix. DB is clean.')
    return
  }

  // Print first 20 for inspection
  console.log('First 20 reassignments:')
  for (const r of reassignments.slice(0, 20)) {
    console.log(`  ${r.name}  (${r.skillId})  ${r.fromClass} → ${r.toClass}`)
  }
  console.log('')

  // Apply the updates
  console.log('Applying updates...')
  let applied = 0
  for (const r of reassignments) {
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
    if (applied % 50 === 0) console.log(`  ${applied}/${reassignments.length}...`)
  }
  console.log(`\nDone. ${applied} base skills reassigned.`)

  // Verify — count remaining mismatches
  console.log('\n=== Verification ===')
  const afterSkills = await db.skill.findMany({
    where: { isMaxRank: true },
    select: { skillId: true, name: true, classId: true, className: true, baseName: true }
  })
  const afterByBase = new Map<string, typeof afterSkills>()
  for (const s of afterSkills) {
    const bn = s.baseName || s.name
    if (!afterByBase.has(bn)) afterByBase.set(bn, [])
    afterByBase.get(bn)!.push(s)
  }
  let remainingMismatches = 0
  for (const [_, group] of afterByBase) {
    if (group.length < 2) continue
    const isVariant = (name: string) =>
      /^(Prime|Absolute|Succession|Core|Flow|Black Spirit):\s/i.test(name)
    const baseSkills = group.filter((s) => !isVariant(s.name))
    const variantSkills = group.filter((s) => isVariant(s.name))
    if (baseSkills.length === 0 || variantSkills.length < 2) continue
    const variantClassIds = new Set(variantSkills.map((s) => s.classId).filter((c): c is number => c != null))
    for (const bs of baseSkills) {
      if (bs.classId != null && !variantClassIds.has(bs.classId)) {
        remainingMismatches++
      }
    }
  }
  console.log(`Remaining mismatches: ${remainingMismatches}`)
}

main()
  .catch((e) => {
    console.error('FAILED:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
