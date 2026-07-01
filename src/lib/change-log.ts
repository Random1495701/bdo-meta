// Skill change log helper — tracks every modification to skill data.
// Used by the lurker, patch applier, and manual edits to create an audit trail.
import { db } from './db'

export interface ChangeLogEntry {
  skillId: number
  skillName: string
  className?: string | null
  field: string
  changeType: 'create' | 'update' | 'delete' | 'patch_apply'
  oldValue?: string | null
  newValue?: string | null
  source: 'lurker' | 'patch_apply' | 'manual' | 'import' | 'garmoth'
  patchDate?: string | null
}

// Log a single field change. Compares old vs new — only logs if actually different.
export async function logSkillFieldChange(
  skillId: number,
  skillName: string,
  field: string,
  oldValue: unknown,
  newValue: unknown,
  className?: string | null,
  source: ChangeLogEntry['source'] = 'lurker',
  patchDate?: string | null,
): Promise<boolean> {
  const oldStr = oldValue == null ? null : typeof oldValue === 'string' ? oldValue : JSON.stringify(oldValue)
  const newStr = newValue == null ? null : typeof newValue === 'string' ? newValue : JSON.stringify(newValue)

  // Skip if no actual change
  if (oldStr === newStr) return false

  await db.skillChangeLog.create({
    data: {
      skillId,
      skillName,
      className: className || null,
      field,
      changeType: oldStr == null ? 'create' : 'update',
      oldValue: oldStr,
      newValue: newStr,
      source,
      patchDate: patchDate || null,
    },
  })
  return true
}

// Log multiple field changes at once (e.g. when upserting a skill).
// Compares each field and only logs the ones that changed.
export async function logSkillChanges(
  skillId: number,
  skillName: string,
  oldSkill: Record<string, unknown> | null,
  newSkill: Record<string, unknown>,
  className?: string | null,
  source: ChangeLogEntry['source'] = 'lurker',
  patchDate?: string | null,
): Promise<number> {
  if (!oldSkill) {
    // New skill — log as create for each non-null field
    let count = 0
    for (const [field, value] of Object.entries(newSkill)) {
      if (value == null) continue
      const changed = await logSkillFieldChange(skillId, skillName, field, null, value, className, source, patchDate)
      if (changed) count++
    }
    return count
  }

  let count = 0
  // Check tracked fields
  const trackedFields = [
    'name', 'krName', 'className', 'classId', 'description', 'command',
    'cooldown', 'cooldownSec', 'requiredLevel', 'maxLevel', 'skillPoints',
    'pvpDamagePercent', 'iconPath', 'videoUrl', 'animationDurationMs',
    'isQuickSlot', 'isAbsolute', 'isAwakening', 'isSuccession', 'isBlackSpirit', 'isPassive',
    'ccTypes', 'protectionTypes', 'damageRowsJson', 'groupId', 'prerequisiteIds',
  ]

  for (const field of trackedFields) {
    const oldVal = oldSkill[field]
    const newVal = newSkill[field]
    const changed = await logSkillFieldChange(skillId, skillName, field, oldVal, newVal, className, source, patchDate)
    if (changed) count++
  }
  return count
}

// Mark a skill change as coming from a patch application
export async function logPatchApplication(
  skillId: number,
  skillName: string,
  field: string,
  oldValue: unknown,
  newValue: unknown,
  className?: string | null,
  patchDate?: string | null,
): Promise<boolean> {
  return logSkillFieldChange(skillId, skillName, field, oldValue, newValue, className, 'patch_apply', patchDate)
}
