#!/usr/bin/env bun
/**
 * Parse BDO `.paac` action-chart index files → extract action-name → .paa-file mappings.
 *
 * A `.paac` file (e.g. `character/binaryactionchart/pc/1_phm/fighteraction_noweapon.paac`)
 * is a PABR-framed binary file that serves as an INDEX: it maps animation action
 * names (e.g. `Ani_Battle_Skill_Maddening2`) to `.paa` animation file paths
 * (e.g. `1_PC/1_PHM/PHM_01_01_Att_Skill_Shield_DashThrust_01.paa`).
 *
 * Format (verified against the warrior fighteraction_noweapon.paac):
 *   PABR framing:
 *     0x00-0x03  "PABR" magic
 *     0x04-0x07  rows (u32 LE) — usually 1 for these files
 *     0x08...     record data (the action-chart blob)
 *     last 8 bytes  u64 LE stringTableOffset
 *   String table (at stringTableOffset, ends 8 bytes before EOF):
 *     First record (special):  [u32 id][u8 sep=0][u8 length][string bytes + null]
 *     Subsequent records:      [u32 length][string bytes + null]
 *     Records alternate: action-name, then .paa/.paac file path
 *
 * Usage:
 *   bun run scripts/paz-tools/parse-paac-index.ts --paac-dir ./data/binaryactionchart/pc --out ./data/action-index.json
 *   bun run scripts/paz-tools/parse-paac-index.ts --paac-file ./fighteraction_noweapon.paac
 *
 * Output: Array<{ classPrefix: string, actionName: string, paaPath: string, isSkill: boolean }>
 * isSkill = true when actionName contains "Skill" or "Att_" (skill animations).
 */

import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    'paac-dir': { type: 'string' },
    'paac-file': { type: 'string' },
    'out': { type: 'string' },
  },
})

type ActionEntry = {
  classPrefix: string    // e.g. "1_phm" extracted from filename
  classFile: string      // e.g. "fighteraction_noweapon.paac"
  actionName: string     // e.g. "Ani_Battle_Skill_Maddening2"
  paaPath: string        // e.g. "1_PC/1_PHM/PHM_01_01_Att_Skill_Shield_DashThrust_01.paa"
  isSkill: boolean       // true if actionName looks like a skill animation
}

// Class prefix → BDO class name mapping (inferred from the .paac filenames).
// The number in the folder prefix is the binaryactionchart ID, NOT the
// classType enum from class_skills.json (which is a different mapping).
// This table was built from the .paac file naming (e.g. fighteraction=Warrior).
const PREFIX_TO_CLASS: Record<string, string> = {
  '1_phm': 'Warrior',           // fighteraction
  '2_phw': 'Sorceress',         // sorceressaction
  '3_pew': 'Ranger',            // elfaction (KR naming)
  '4_pgm': 'Berserker',         // giantaction
  '5_pbw': 'Tamer',             // tameraaction
  '6_pkm': 'Musa',              // blademasteraction
  '7_pvw': 'Valkyrie',          // valkyrieaction
  '8_pwm': 'Witch',             // whitemageaction (female)
  '8_pwmm': 'Wizard',           // whitemageaction (male variant)
  '9_pem': 'Archer',            // elfmanaction — TODO verify (could be Dark Knight)
  '11_pgw': 'Lahn',             // giantwomenaction
  '12_pkw': 'Maehwa',           // bladewomenaction
  '13_pnw': 'Kunoichi',         // ninjawomenaction
  '14_plw': 'Shai',             // shytribeaction
  '15_pdew': 'Dark Knight',     // darkelfaction
  '16_pcm': 'Striker',          // combattantaction
  '16_pcw': 'Mystic',           // combattantwomanaction
  '17_psw': 'Hashashin',        // chineseaction — TODO verify
  '18_pam': 'Nova',             // valenciafighteraction — TODO verify
  '20_pjkd': 'Guardian',        // pjkdaction — TODO verify
  '21_phwb': 'Corsair',         // blackfighterwomenaction — TODO verify
  '22_pkww': 'Maegu',            // bladewomen2action — TODO verify
  '23_ppm': 'Sage',             // ppmaction
  '24_pfw': 'Drakania',         // pfwaction — TODO verify
  '25_pqw': 'Nova',             // pqwaction — TODO verify
  '27_pkow': 'Woosa',           // pkowaction
  '28_pmyf': 'Maegu',           // pmyfaction
  '29_pnyw': 'Scholar',         // pnywaction — TODO verify
  '30_pdkl': 'Drakania',        // pdklaction
  '31_prsa': 'Corsair',         // prsaaction — TODO verify
  '32_pwge': 'Scholar',         // pwgeaction
  '33_pdkl': 'Dosa',            // pdklaction (duplicate prefix? verify)
  '34_pgms': 'Dosa',            // pgmsaction
}

function classPrefixFromPath(file: string): string {
  // path like .../pc/1_phm/fighteraction_noweapon.paac → "1_phm"
  const m = file.match(/pc[\\/](\d+_\w+?)[\\/]/)
  return m ? m[1].toLowerCase() : ''
}

function classNameFromPrefix(prefix: string): string {
  return PREFIX_TO_CLASS[prefix] ?? `(unknown: ${prefix})`
}

/**
 * Parse one .paac file's string table → list of (actionName, paaPath) pairs.
 */
function parsePaacIndex(buf: Buffer): Array<[string, string]> {
  if (buf.length < 16) return []
  if (buf.toString('ascii', 0, 4) !== 'PABR') return []

  // string table offset is the last u64 LE
  const stPos = Number(buf.readBigUInt64LE(buf.length - 8))
  if (stPos <= 8 || stPos > buf.length) return []

  const stData = buf.subarray(stPos, buf.length - 8)

  // Parse the string table.
  // First record is special: [u32 id][u8 sep=0][u8 length][string + null]
  // Subsequent records: [u32 length][string + null]
  const strings: string[] = []
  let off = 0
  // First record
  if (off + 9 <= stData.length) {
    const len1 = stData.readUInt8(5)
    const s1 = stData.subarray(9, 9 + len1).toString('utf8')
    strings.push(s1)
    off = 9 + len1 + 1 // +null
  }
  // Subsequent records
  while (off + 4 <= stData.length) {
    const slen = stData.readUInt32LE(off)
    off += 4
    if (slen === 0 || slen > 1000 || off + slen > stData.length) break
    const s = stData.subarray(off, off + slen).toString('utf8')
    strings.push(s)
    off += slen + 1 // +null
  }

  // Pair them: (actionName, paaPath). Records alternate name/path.
  const pairs: Array<[string, string]> = []
  for (let i = 0; i + 1 < strings.length; i += 2) {
    const name = strings[i]
    const path = strings[i + 1]
    if (path && (path.endsWith('.paa') || path.endsWith('.paac'))) {
      pairs.push([name, path])
    }
  }
  return pairs
}

function isSkillAction(name: string): boolean {
  const n = name.toLowerCase()
  return n.includes('skill') || n.includes('att_') || n.includes('_att_')
}

async function main() {
  const paacDir = values['paac-dir']
  const paacFile = values['paac-file']
  const out = values.out ?? './data/action-index.json'

  const files: string[] = []
  if (paacFile) {
    files.push(paacFile)
  } else if (paacDir) {
    const all = await readdir(paacDir, { recursive: true })
    for (const f of all) files.push(join(paacDir, f.toString()))
  } else {
    console.error('Provide --paac-file <path> or --paac-dir <dir>')
    process.exit(1)
  }

  const paacFiles = files.filter(f => f.toLowerCase().endsWith('.paac') && !f.endsWith('pc_actionchartpackagepcraw.paac'))
  console.log(`Found ${paacFiles.length} .paac index files (excluding the master package)`)

  const allEntries: ActionEntry[] = []
  let skillCount = 0
  for (const file of paacFiles) {
    try {
      const buf = await readFile(file)
      const pairs = parsePaacIndex(buf)
      const classPrefix = classPrefixFromPath(file)
      const className = classNameFromPrefix(classPrefix)
      const classFile = basename(file)
      for (const [actionName, paaPath] of pairs) {
        const isSkill = isSkillAction(actionName)
        if (isSkill) skillCount++
        allEntries.push({ classPrefix, classFile, actionName, paaPath, isSkill })
      }
      console.log(`  ${classFile} (${className}): ${pairs.length} actions, ${pairs.filter(p => isSkillAction(p[0])).length} skill`)
    } catch (e) {
      console.error(`  failed: ${file}: ${(e as Error).message}`)
    }
  }

  console.log(`\nTotal: ${allEntries.length} action entries, ${skillCount} skill-tagged`)

  // Sample output
  console.log('\n=== first 8 skill entries ===')
  for (const e of allEntries.filter(e => e.isSkill).slice(0, 8)) {
    console.log(`  [${e.classPrefix}] ${e.actionName} → ${e.paaPath}`)
  }

  if (out) {
    await writeFile(out, JSON.stringify(allEntries, null, 2))
    console.log(`\nWrote ${out}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
