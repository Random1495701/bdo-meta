import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/patches/changed
// Returns skill IDs that were changed in the most recent patch,
// along with the change type (for up/down arrow indicators in Data tab).

export async function GET() {
  // Get the most recent patch date from SkillChangeLog
  const latestChange = await db.skillChangeLog.findFirst({
    where: { source: 'patch_apply' },
    orderBy: { createdAt: 'desc' },
    select: { patchDate: true },
  })

  if (!latestChange?.patchDate) {
    return NextResponse.json({ changed: {}, patchDate: null })
  }

  // Get all changes from that patch
  const changes = await db.skillChangeLog.findMany({
    where: { source: 'patch_apply', patchDate: latestChange.patchDate },
    select: { skillId: true, field: true, oldValue: true, newValue: true },
  })

  // Build a map: skillId → array of changes
  const changed: Record<number, { field: string; direction: 'up' | 'down' | 'neutral'; oldVal?: string; newVal?: string }[]> = {}
  for (const c of changes) {
    if (!changed[c.skillId]) changed[c.skillId] = []
    let direction: 'up' | 'down' | 'neutral' = 'neutral'
    if (c.field === 'cooldownSec') {
      const oldVal = parseFloat(c.oldValue || '0')
      const newVal = parseFloat(c.newValue || '0')
      direction = newVal < oldVal ? 'up' : 'down' // Lower cooldown = buff = up
    } else if (c.field === 'pvpDamagePercent' || c.field === 'damageRowsJson') {
      direction = 'up' // Damage increase = buff
    } else if (c.field === 'protectionTypes' || c.field === 'ccTypes') {
      direction = 'up' // Added effect = buff
    }
    changed[c.skillId].push({ field: c.field, direction, oldVal: c.oldValue || undefined, newVal: c.newValue || undefined })
  }

  return NextResponse.json({ changed, patchDate: latestChange.patchDate })
}
