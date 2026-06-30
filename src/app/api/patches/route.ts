import { NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'node:fs'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/patches
// Returns the LATEST patch with structured, DB-linked skill changes.
// All patches are archived in data/patch-archive.json for future use.

interface SkillChange {
  skillName: string
  matchedSkillId: number | null
  matchedSkillClassName: string | null
  changeType: 'damage_up' | 'damage_down' | 'cooldown_up' | 'cooldown_down' | 'added_effect' | 'removed_effect' | 'cc_change' | 'combo_change' | 'animation_change' | 'note' | 'other'
  before?: string
  after?: string
  description: string
}

interface ClassChangeBlock {
  className: string
  spec: string | null
  intro: string
  changes: SkillChange[]
}

interface PatchNote {
  date: string
  url: string
  classChanges: ClassChangeBlock[]
}

export async function GET() {
  const filePath = 'data/patch-notes.json'
  if (!existsSync(filePath)) {
    return NextResponse.json({ patches: [], hasData: false })
  }

  try {
    const data: PatchNote[] = JSON.parse(readFileSync(filePath, 'utf-8'))
    if (data.length === 0) {
      return NextResponse.json({ patches: [], hasData: false })
    }

    // Only return the LATEST patch (first in array — scraper saves newest first)
    const latest = data[0]

    // Link skill names to DB skills
    const allSkills = await db.skill.findMany({
      where: { className: { not: { startsWith: 'NEW_CLASS' } } },
      select: { skillId: true, name: true, className: true },
    })

    // Build lookup maps
    const exactNameMap = new Map<string, { skillId: number; className: string | null }>()
    const baseNameMap = new Map<string, { skillId: number; className: string | null }>()
    for (const s of allSkills) {
      const lower = s.name.toLowerCase()
      exactNameMap.set(lower, { skillId: s.skillId, className: s.className })
      const base = s.name
        .replace(/^(Prime:\s*|Succession:\s*|Absolute:\s*|Core:\s*|Flow:\s*)/i, '')
        .replace(/\s+(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)$/i, '')
        .trim()
        .toLowerCase()
      if (base && !baseNameMap.has(base)) {
        baseNameMap.set(base, { skillId: s.skillId, className: s.className })
      }
    }

    // Enrich changes with matched skill IDs
    for (const cc of latest.classChanges) {
      for (const change of cc.changes) {
        const cleanName = change.skillName
          .replace(/^(Prime:\s*|Succession:\s*|Absolute:\s*|Core:\s*|Flow:\s*)/i, '')
          .replace(/\s+(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)$/i, '')
          .trim()
          .toLowerCase()
        const fullLower = change.skillName.toLowerCase()

        const exact = exactNameMap.get(fullLower)
        const base = baseNameMap.get(cleanName)
        let match = exact || base || null

        // Fuzzy fallback
        if (!match && cleanName.length > 3) {
          for (const [name, info] of exactNameMap) {
            const strippedName = name
              .replace(/^(prime:|succession:|absolute:|core:|flow:)\s*/i, '')
              .replace(/\s+(i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii|xiii|xiv|xv|xvi|xvii|xviii|xix|xx)$/i, '')
              .trim()
            if (strippedName === cleanName || (strippedName.length > 3 && cleanName.includes(strippedName))) {
              match = info
              break
            }
          }
        }

        change.matchedSkillId = match?.skillId ?? null
        change.matchedSkillClassName = match?.className ?? null
      }
    }

    // Archive metadata
    let archiveInfo: { totalPatches: number; dates: string[] } | null = null
    if (existsSync('data/patch-archive.json')) {
      try {
        const archive: any[] = JSON.parse(readFileSync('data/patch-archive.json', 'utf-8'))
        archiveInfo = {
          totalPatches: archive.length,
          dates: archive.map(p => p.date).filter(Boolean),
        }
      } catch {}
    }

    return NextResponse.json({
      patches: [latest],
      hasData: true,
      archiveInfo,
    })
  } catch (e) {
    return NextResponse.json({ patches: [], hasData: false, error: String(e) })
  }
}
