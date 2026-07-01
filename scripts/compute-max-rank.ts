// Compute baseName and isMaxRank for all skills in the DB.
// This replaces the JS-level max-rank filtering in the API with a DB-level filter.
//
// Logic:
// - Strip prefixes (Prime:, Succession:, Absolute:, Core:, Flow:) and rank suffixes (I, II, III...)
// - Group by (classId, baseName)
// - For each group:
//   - If Prime:/Succession: exists → mark as maxRank (for succession spec)
//   - If Absolute: exists → mark as maxRank (for awakening spec)
//   - If neither → mark highest rank as maxRank
// - Black Spirit, Passive, Flow:, Core: skills are always maxRank (own groups)
//
// Usage: bun run scripts/compute-max-rank.ts

import { db } from '../src/lib/db'

const RANK_SUFFIX = /\s+(XXX|XXIX|XXVIII|XXVII|XXVI|XXV|XXIV|XXIII|XXII|XXI|XX|XIX|XVIII|XVII|XVI|XV|XIV|XIII|XII|XI|IX|VIII|VII|VI|IV|V|III|II|I)$/
const RANK_MAP: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10,
  XI: 11, XII: 12, XIII: 13, XIV: 14, XV: 15, XVI: 16, XVII: 17, XVIII: 18,
  XIX: 19, XX: 20, XXI: 21, XXII: 22, XXIII: 23, XXIV: 24, XXV: 25,
  XXVI: 26, XXVII: 27, XXVIII: 28, XXIX: 29, XXX: 30,
}

function getBaseName(name: string): string {
  let base = name
  // Strip (Not in Use) prefix
  base = base.replace(/^\(Not in [Uu]se\)\s*/, '')
  // Strip spec prefixes to get the base skill name
  base = base.replace(/^(Prime:\s*|Succession:\s*|Absolute:\s*|Core:\s*|Flow:\s*)/i, '')
  // Strip rank suffix
  base = base.replace(RANK_SUFFIX, '')
  return base.trim()
}

function getRank(name: string): number {
  const match = name.match(RANK_SUFFIX)
  return match ? (RANK_MAP[match[1]] || 0) : 0
}

function getVariant(name: string): 'prime' | 'succession' | 'absolute' | 'core' | 'flow' | 'main' {
  if (/^Prime:\s/i.test(name)) return 'prime'
  if (/^Succession:\s/i.test(name)) return 'succession'
  if (/^Absolute:\s/i.test(name)) return 'absolute'
  if (/^Core:\s/i.test(name)) return 'core'
  if (/^Flow:\s/i.test(name)) return 'flow'
  return 'main'
}

async function main() {
  console.log('=== Compute Max Rank ===')

  const skills = await db.skill.findMany({
    select: { skillId: true, name: true, classId: true, isBlackSpirit: true, isPassive: true, isFlow: true, isCore: true },
    orderBy: { skillId: 'asc' },
  })
  console.log(`Total skills: ${skills.length}`)

  // Step 1: Compute baseName for all skills
  console.log('\n[1/3] Computing baseName...')
  let baseNameCount = 0
  for (const s of skills) {
    const baseName = getBaseName(s.name)
    await db.skill.update({ where: { skillId: s.skillId }, data: { baseName } })
    baseNameCount++
    if (baseNameCount % 1000 === 0) console.log(`  ${baseNameCount}/${skills.length}`)
  }
  console.log(`  ✓ baseName computed for ${baseNameCount} skills`)

  // Step 2: Group by (classId, baseName) and determine max-rank
  console.log('\n[2/3] Computing isMaxRank...')

  // Build groups
  const groups = new Map<string, typeof skills>()
  for (const s of skills) {
    // Skip stub skills (name starts with "Skill ")
    if (s.name.startsWith('Skill ')) continue

    // BS, Passive, Flow, Core skills are always max rank (their own group)
    if (s.isBlackSpirit || s.isPassive || s.isFlow || s.isCore) {
      await db.skill.update({ where: { skillId: s.skillId }, data: { isMaxRank: true } })
      continue
    }

    const baseName = getBaseName(s.name)
    const key = `${s.classId}-${baseName}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(s)
  }

  // For each group, determine max-rank
  let maxRankCount = 0
  for (const [key, groupSkills] of groups) {
    if (groupSkills.length === 1) {
      // Only one skill in group — it's max rank
      await db.skill.update({ where: { skillId: groupSkills[0].skillId }, data: { isMaxRank: true } })
      maxRankCount++
      continue
    }

    // Check for Prime:/Succession: variant (max for succession spec)
    const primeSkill = groupSkills.find(s => getVariant(s.name) === 'prime' || getVariant(s.name) === 'succession')
    // Check for Absolute: variant (max for awakening spec)
    const absSkill = groupSkills.find(s => getVariant(s.name) === 'absolute')
    // Main skills (no prefix)
    const mainSkills = groupSkills.filter(s => getVariant(s.name) === 'main')

    if (primeSkill) {
      await db.skill.update({ where: { skillId: primeSkill.skillId }, data: { isMaxRank: true } })
      maxRankCount++
    }

    if (absSkill) {
      await db.skill.update({ where: { skillId: absSkill.skillId }, data: { isMaxRank: true } })
      maxRankCount++
    }

    // If no Prime and no Absolute, find the highest rank main skill
    if (!primeSkill && !absSkill && mainSkills.length > 0) {
      // Sort by rank descending, pick highest
      const sorted = mainSkills.sort((a, b) => getRank(b.name) - getRank(a.name))
      await db.skill.update({ where: { skillId: sorted[0].skillId }, data: { isMaxRank: true } })
      maxRankCount++
    }

    // If only Prime exists (no Absolute, no main), Prime is max — already marked above
    // If only Absolute exists (no Prime, no main), Absolute is max — already marked above
  }

  console.log(`  ✓ ${maxRankCount} skills marked as maxRank`)

  // Step 3: Verify
  console.log('\n[3/3] Verifying...')
  const totalMaxRank = await db.skill.count({ where: { isMaxRank: true } })
  const totalEnrichedMaxRank = await db.skill.count({ where: { isMaxRank: true, description: { not: null } } })
  console.log(`  Total maxRank skills: ${totalMaxRank}`)
  console.log(`  Enriched maxRank skills: ${totalEnrichedMaxRank}`)

  // Sample check
  const warriorMaxRank = await db.skill.count({ where: { isMaxRank: true, className: 'Warrior' } })
  console.log(`  Warrior maxRank skills: ${warriorMaxRank}`)

  await db.$disconnect()
  console.log('\n=== Done ===')
}

main().catch(e => { console.error(e); process.exit(1) })
