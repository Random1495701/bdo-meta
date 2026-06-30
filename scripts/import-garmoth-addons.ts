import { db } from '../src/lib/db'

const GARMOTH_API = 'https://api.garmoth.com/api/skill-addons'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

async function main() {
  console.log('Fetching garmoth skill-addons API...')
  const res = await fetch(GARMOTH_API, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  
  const skills = data.skills || []
  const addons = data.addons || {}
  console.log(`Got ${skills.length} skills with addon data, ${Object.keys(addons).length} addon effects`)
  
  let updated = 0
  let errors = 0
  
  for (const s of skills) {
    try {
      if (!s.id || typeof s.id !== 'number') continue
      
      // Build addons JSON from popularity data
      const addonData: any = {
        type: s.type,
        level: s.level,
        addonSlots: s.addon,
        classId: s.class_id,
        popularity: {
          slot0: s.addon_popularity_0,
          slot1: s.addon_popularity_1,
        },
      }
      
      // Look up addon effect names
      const effects: any = {}
      if (s.addon_popularity_0) {
        effects.slot0 = Object.entries(s.addon_popularity_0).map(([id, count]: [string, any]) => ({
          addonId: id,
          effect: addons[id]?.name || `Unknown (${id})`,
          popularity: count,
        })).sort((a, b) => b.popularity - a.popularity)
      }
      if (s.addon_popularity_1) {
        effects.slot1 = Object.entries(s.addon_popularity_1).map(([id, count]: [string, any]) => ({
          addonId: id,
          effect: addons[id]?.name || `Unknown (${id})`,
          popularity: count,
        })).sort((a, b) => b.popularity - a.popularity)
      }
      addonData.effects = effects
      
      await db.skill.update({
        where: { skillId: s.id },
        data: { 
          addonsJson: JSON.stringify(addonData),
          // Also update classId if it was null
          ...(s.class_id != null ? { classId: s.class_id } : {}),
        },
      })
      updated++
      if (updated % 100 === 0) console.log(`  updated ${updated}/${skills.length}`)
    } catch (err) {
      errors++
      if (errors <= 3) console.error(`  error on skill ${s.id}: ${(err as Error).message}`)
    }
  }
  
  console.log(`\nDone: ${updated} skills updated with addon data, ${errors} errors`)
  await db.$disconnect()
}
main().catch(console.error)
