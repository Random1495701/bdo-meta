import { NextResponse } from 'next/server'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

export const dynamic = 'force-dynamic'

// POST /api/sessions/parse-screenshot
// Accepts a multipart/form-data with a screenshot image, saves it to
// /public/screenshots, and returns a copyable JSON-extraction prompt plus
// links to external LLM services (ChatGPT, Gemini, Claude, Copilot). The
// actual vision parsing happens client-side — the user pastes the returned
// prompt + uploaded screenshot into any of those services, then pastes the
// returned JSON back into the UI to create the session.

const AOS_PROMPT = `You are parsing a Black Desert Online Arena of Solare (AoS) scoreboard screenshot.
AoS scoreboards show: player names, classes, K/D/A, CC count, damage dealt, damage taken, healing, match result (Victory/Defeat), practice/ranked, duration, date.

Extract ALL visible data as JSON. Format:
{
  "sessionType": "aos",
  "result": "victory" | "defeat" | "draw" | "unknown",
  "isPractice": true | false,
  "duration": "MM:SS" or null,
  "sessionDate": "M/D/YY" or null,
  "playerStats": { "name": "", "kills": 0, "deaths": 0, "assists": 0, "ccCount": 0, "damageDealt": 0, "damageTaken": 0, "healing": 0 },
  "teamData": [{ "name": "", "class": "", "kills": 0, "deaths": 0, "cc": 0, "dealt": 0, "taken": 0, "healed": 0 }],
  "enemyData": [{ "name": "", "class": "", "kills": 0, "deaths": 0, "cc": 0, "dealt": 0, "taken": 0, "healed": 0 }]
}
Return ONLY the JSON, no other text. If you can't determine a field, use null or 0.`

const NW_PROMPT = `You are parsing a Black Desert Online Node War scoreboard screenshot.
Node War scoreboards show: player name, kills, deaths, class, damage dealt, damage taken, healing.

Extract ALL visible data as JSON. Format:
{
  "sessionType": "nodewar",
  "result": "victory" | "defeat" | "draw" | "unknown",
  "isPractice": false,
  "duration": null,
  "sessionDate": "M/D/YY" or null,
  "playerStats": { "name": "", "kills": 0, "deaths": 0, "assists": 0, "ccCount": 0, "damageDealt": 0, "damageTaken": 0, "healing": 0 },
  "teamData": [{ "name": "", "class": "", "kills": 0, "deaths": 0, "cc": 0, "dealt": 0, "taken": 0, "healed": 0 }],
  "enemyData": []
}
Return ONLY the JSON, no other text. If you can't determine a field, use null or 0.`

const WOTR_PROMPT = `You are parsing a Black Desert Online War of the Roses (WotR) scoreboard screenshot.
WotR scoreboards show: player names, classes, K/D, damage, healing, match result.

Extract ALL visible data as JSON. Format:
{
  "sessionType": "wotr",
  "result": "victory" | "defeat" | "draw" | "unknown",
  "isPractice": false,
  "duration": "MM:SS" or null,
  "sessionDate": "M/D/YY" or null,
  "playerStats": { "name": "", "kills": 0, "deaths": 0, "assists": 0, "ccCount": 0, "damageDealt": 0, "damageTaken": 0, "healing": 0 },
  "teamData": [{ "name": "", "class": "", "kills": 0, "deaths": 0, "cc": 0, "dealt": 0, "taken": 0, "healed": 0 }],
  "enemyData": []
}
Return ONLY the JSON, no other text. If you can't determine a field, use null or 0.`

const PARSE_PROMPTS: Record<string, string> = {
  aos: AOS_PROMPT,
  nodewar: NW_PROMPT,
  wotr: WOTR_PROMPT,
}

const SUGGESTED_SERVICES = [
  { name: 'ChatGPT', url: 'https://chat.openai.com/' },
  { name: 'Gemini', url: 'https://gemini.google.com/' },
  { name: 'Claude', url: 'https://claude.ai/' },
  { name: 'Copilot', url: 'https://copilot.microsoft.com/' },
]

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('screenshot') as File
    if (!file) {
      return NextResponse.json({ ok: false, error: 'No screenshot provided' }, { status: 400 })
    }

    // Save screenshot
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filename = `session-${Date.now()}.png`
    const uploadDir = join(process.cwd(), 'public', 'screenshots')
    mkdirSync(uploadDir, { recursive: true })
    const filepath = join(uploadDir, filename)
    writeFileSync(filepath, buffer)

    const screenshotUrl = `/screenshots/${filename}`

    return NextResponse.json({
      ok: true,
      screenshotUrl,
      parsePrompt: PARSE_PROMPTS.aos, // Default — user can pick session type in UI
      parsePrompts: PARSE_PROMPTS, // All 3 session-type-specific prompts
      suggestedServices: SUGGESTED_SERVICES,
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
