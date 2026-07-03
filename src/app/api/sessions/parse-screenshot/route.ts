import { NextResponse } from 'next/server'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

export const dynamic = 'force-dynamic'

// POST /api/sessions/parse-screenshot
// Accepts a multipart/form-data with a screenshot image
// Uses VLM (z-ai-web-dev-sdk) to parse AoS/NW/WotR scoreboard data
// Returns structured session data

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

    // Convert to base64 for VLM
    const base64 = buffer.toString('base64')
    const mimeType = file.type || 'image/png'
    const dataUrl = `data:${mimeType};base64,${base64}`

    // Use VLM to parse the screenshot
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    const prompt = `You are parsing a Black Desert Online PvP scoreboard screenshot. This could be:
1. Arena of Solare (AoS) - shows player names, classes, K/D, CC count, damage dealt, damage taken, healing, match result (Victory/Defeat), practice/ranked, duration, date
2. Node War scoreboard - shows player stats
3. War of the Roses scoreboard - shows player stats

Extract ALL visible data as JSON. Format:
{
  "sessionType": "aos" | "nodewar" | "wotr",
  "result": "victory" | "defeat" | "draw" | "unknown",
  "isPractice": true | false,
  "duration": "MM:SS" or null,
  "sessionDate": "M/D/YY" or null,
  "playerStats": {
    "name": "player name",
    "kills": 0,
    "deaths": 0,
    "assists": 0,
    "ccCount": 0,
    "damageDealt": 0,
    "damageTaken": 0,
    "healing": 0
  },
  "teamData": [
    { "name": "", "class": "", "kills": 0, "deaths": 0, "cc": 0, "dealt": 0, "taken": 0, "healed": 0 }
  ],
  "enemyData": [
    { "name": "", "class": "", "kills": 0, "deaths": 0, "cc": 0, "dealt": 0, "taken": 0, "healed": 0 }
  ]
}

Return ONLY the JSON, no other text. If you can't determine a field, use null or 0.`

    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
      thinking: { type: 'disabled' },
    })

    const content = response.choices[0]?.message?.content || '{}'

    // Try to parse the JSON from the response
    let parsed
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content)
    } catch {
      parsed = { rawContent: content, parseError: true }
    }

    return NextResponse.json({
      ok: true,
      screenshotUrl: `/screenshots/${filename}`,
      parsed,
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
