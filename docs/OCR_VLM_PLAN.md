# OCR / Image Parsing — Lean App Approach

> The app is lean. No internal LLM. Image parsing uses external free AI services via a paste-JSON flow.

## Architecture

```
User uploads screenshot → App saves it + returns URL + prompt
→ User opens external AI (ChatGPT/Gemini/Claude/Copilot), uploads screenshot + pastes prompt
→ User copies JSON response from AI
→ User pastes JSON back into the app → App parses + saves session
```

## Why lean
- Zero LLM dependency in app code
- Zero compute cost
- User picks the AI
- No vendor lock-in

## `/api/sessions/parse-screenshot` (POST)
1. Saves screenshot to `/public/screenshots/session-{timestamp}.png`
2. Returns `{ screenshotUrl, parsePrompt, suggestedServices }`

## Suggested free AI services
| Service | URL | Notes |
|---------|-----|-------|
| ChatGPT | chat.openai.com | GPT-4o mini, free with login |
| Google Gemini | gemini.google.com | Gemini 1.5 Flash, free with Google account |
| Claude | claude.ai | Claude 3.5 Sonnet, free with login |
| Microsoft Copilot | copilot.microsoft.com | GPT-4 Vision, free with Microsoft account |

## Future use cases (same lean pattern)
- Patch note image parsing
- Skill tooltip re-ingestion
