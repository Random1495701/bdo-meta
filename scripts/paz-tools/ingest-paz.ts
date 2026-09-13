#!/usr/bin/env bun
/**
 * PAZ Ingest Pipeline — merges the three PAZ-sourced data pieces into our DB schema,
 * producing a JSON file ready for upload via POST /api/upload/skills-json.
 *
 * Input data pieces (all produced by scripts/paz-tools/):
 *   1. class_skills.json (from bdo-data-extractor) — skill structure: groups, ranks,
 *      class grids, kind, names, descriptions (flavor text only).
 *   2. data/skill-animations.json (from parse-paa-from-7z) — action-name → animationDurationMs
 *      for 3,636 skill-tagged animations, cross-referenced with the .paac action chart index.
 *   3. data/skill-combat-data.json (from parse-skill-buffs) — cooldownMs + CC types +
 *      CC durations for every skill, from skill.dbss + buff.dbss.
 *
 * Output: data/paz-skills.json — array of skills in our DB schema, ready for upsert
 * via POST /api/upload/skills-json or direct Prisma upsert.
 *
 * Usage:
 *   bun run scripts/paz-tools/ingest-paz.ts \
 *     --class-skills ./upload/class_skills.json \
 *     --animations ./data/skill-animations.json \
 *     --combat ./data/skill-combat-data.json \
 *     --out ./data/paz-skills.json
 *
 * The output JSON has the shape:
 *   { "skills": [{ "skillId": 4063, "name": "Prime: Heavy Strike I", "className": "Warrior",
 *                  "cooldownSec": 7, "ccTypes": "Bleeding,Spin the target,...",
 *                  "animationDurationMs": 2033, ... }] }
 */

import { readFile, writeFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    'class-skills': { type: 'string' },
    'animations': { type: 'string' },
    'combat': { type: 'string' },
    'out': { type: 'string' },
  },
})

// Binaryactionchart folder prefix → BDO class name (from parse-paac-index.ts)
const PREFIX_TO_CLASS: Record<string, string> = {
  '1_phm': 'Warrior', '2_phw': 'Sorceress', '3_pew': 'Ranger', '4_pgm': 'Berserker',
  '5_pbw': 'Tamer', '6_pkm': 'Musa', '7_pvw': 'Valkyrie', '8_pwm': 'Witch',
  '8_pwmm': 'Wizard', '9_pem': 'Archer', '11_pgw': 'Lahn', '12_pkw': 'Maehwa',
  '13_pnw': 'Kunoichi', '14_plw': 'Shai', '15_pdew': 'Dark Knight',
  '16_pcm': 'Striker', '16_pcw': 'Mystic', '17_psw': 'Hashashin',
  '18_pam': 'Nova', '20_pjkd': 'Guardian', '21_phwb': 'Corsair',
  '22_pkww': 'Maegu', '23_ppm': 'Sage', '24_pfw': 'Drakania',
  '25_pqw': 'Nova', '27_pkow': 'Woosa', '28_pmyf': 'Maegu',
  '29_pnyw': 'Scholar', '30_pdkl': 'Drakania', '31_prsa': 'Corsair',
  '32_pwge': 'Scholar', '34_pgms': 'Dosa',
}

// BDO class name → our DB classId (bdocodex convention)
const CLASS_NAME_TO_ID: Record<string, number> = {
  'Warrior': 0, 'Ranger': 1, 'Sorceress': 2, 'Berserker': 3, 'Tamer': 4,
  'Valkyrie': 5, 'Wizard': 6, 'Witch': 7, 'Musa': 8, 'Maehwa': 9,
  'Lahn': 10, 'Striker': 11, 'Mystic': 12, 'Kunoichi': 13, 'Ninja': 14,
  'Dark Knight': 15, 'Archer': 16, 'Shai': 17, 'Guardian': 18, 'Hashashin': 19,
  'Nova': 20, 'Sage': 21, 'Corsair': 22, 'Drakania': 23, 'Woosa': 24,
  'Maegu': 25, 'Scholar': 26, 'Dosa': 27, 'Deadeye': 28, 'Wukong': 29, 'Seraph': 30,
}

// Map action-name → animationDurationMs from the skill-animations data
function buildAnimMap(animations: any[]): Map<string, number> {
  // The animations array has entries like {actionName, paaPath, animationDurationMs, classPrefix, isSkill}
  // We map by actionName (case-insensitive) → durationMs
  const m = new Map<string, number>()
  for (const a of animations) {
    if (a.animationDurationMs > 0) {
      m.set(a.actionName.toLowerCase(), a.animationDurationMs)
    }
  }
  return m
}

// Match a skill's action name from its class_skills.json entry.
// class_skills.json doesn't directly give us action names, but the .paac index
// maps actionName → paaPath. The skill's animation is found by matching the
// skill name to action names. For now, we use the skillNo → skill animations.
function findAnimForSkill(skillNo: number, animMap: Map<string, number>): number {
  // This is a simplification — the real mapping requires the .paac index which
  // links actionName to .paa files, and class_skills.json links skillNo to name.
  // A full match needs the actionName → skillName mapping which isn't 1:1.
  // For the ingest pipeline, we'd need to do fuzzy matching or use the .paac
  // index's actionName → paaPath → skill name lookup.
  // For now, return 0 (no animation) — the animMap lookup is done elsewhere.
  return 0
}

async function main() {
  const classSkillsPath = values['class-skills'] ?? './upload/class_skills.json'
  const animPath = values.animations ?? './data/skill-animations.json'
  const combatPath = values.combat ?? './data/skill-combat-data.json'
  const out = values.out ?? './data/paz-skills.json'

  console.log('Loading class_skills.json (structure)...')
  const cs = JSON.parse(await readFile(classSkillsPath, 'utf-8'))
  console.log(`  ${cs.groups.length} skill groups, ${cs.trees.length} class trees`)

  console.log('Loading skill-animations.json (animation durations)...')
  const anims = JSON.parse(await readFile(animPath, 'utf-8'))
  const animByAction = buildAnimMap(anims)
  console.log(`  ${animByAction.size} animation entries`)

  // Load the skill → animation links (built by the skillNo → actionName matcher)
  let skillAnimLinks: Record<string, number> = {}
  try {
    const linksRaw = JSON.parse(await readFile('./data/skill-animation-links.json', 'utf-8'))
    skillAnimLinks = Object.fromEntries(
      Object.entries(linksRaw).map(([k, v]: [string, any]) => [k, v.animationDurationMs as number])
    )
    console.log(`  ${Object.keys(skillAnimLinks).length} skillNo → animation links`)
  } catch {
    console.log('  (skill-animation-links.json not found — animations will be 0)')
  }

  console.log('Loading skill-combat-data.json (cooldown + CC)...')
  const combat = JSON.parse(await readFile(combatPath, 'utf-8'))
  const combatByKey = new Map(combat.map((c: any) => [c.skillKey, c]))
  console.log(`  ${combatByKey.size} combat records`)

  console.log('\nMerging into DB schema...')
  const skills: any[] = []
  let matchedCombat = 0
  let matchedAnim = 0

  for (const group of cs.groups) {
    // Determine className from the group's class list (first playable class)
    // For simplicity, use the class tree to find the class prefix
    let className: string | null = null
    for (const tree of cs.trees) {
      if (group.classes.includes(tree.classType)) {
        // The tree doesn't directly give us the prefix, but the groups are
        // class-specific. For now, leave className null — it'll be filled by
        // the existing DB (we upsert by skillId, preserving className).
        break
      }
    }

    for (const rank of group.ranks) {
      if (rank.skillKey === 0) continue
      const skillNo = rank.skillNo
      const combatData = combatByKey.get(rank.skillKey)
      if (combatData) matchedCombat++

      // Animation: use the skill-animation-links.json (matched by class prefix + name normalization)
      const animDurationMs = skillAnimLinks[String(skillNo)] || 0
      if (animDurationMs > 0) matchedAnim++

      skills.push({
        skillId: skillNo,
        name: rank.name || group.name,
        kind: rank.kind, // 1=active, 2=passive
        sourceName: rank.sourceName,
        sourceGroupName: rank.sourceGroupName,
        description: rank.description,
        cooldownSec: combatData ? combatData.cooldownSec : null,
        ccTypes: combatData && combatData.ccTypes.length > 0
          ? combatData.ccTypes.join(',')
          : null,
        // ccDurations is new data — could be added as a new column
        ccDurations: combatData && Object.keys(combatData.ccDurations).length > 0
          ? combatData.ccDurations
          : null,
        // animationDurationMs from the .paa files (via skill-animation-links)
        animationDurationMs: animDurationMs > 0 ? animDurationMs : undefined,
        pazSource: 'skill.dbss + buff.dbss + .paa',
      })
    }
  }

  console.log(`\nMerged ${skills.length} skills`)
  console.log(`  matched combat data (cooldown/CC): ${matchedCombat}`)
  console.log(`  matched animation: ${matchedAnim} (TODO: skillNo → actionName mapping)`)

  // Sample
  console.log('\n=== first 3 skills with combat data ===')
  for (const s of skills.filter(s => s.cooldownSec !== null).slice(0, 3)) {
    console.log(`  skillId=${s.skillId} name='${s.name}' cd=${s.cooldownSec}s cc=${s.ccTypes}`)
  }

  await writeFile(out, JSON.stringify({ skills }, null, 2))
  console.log(`\nWrote ${out} (${skills.length} skills)`)
  console.log('\nUpload via: POST /api/upload/skills-json (with the file)')
  console.log('Or: bun run scripts/paz-tools/upsert-paz-skills.ts (direct Prisma upsert)')
}

main().catch(e => { console.error(e); process.exit(1) })
