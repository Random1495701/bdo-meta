'use client'

import * as React from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { APP_VERSION } from '@/lib/version'

// Session reset auto-detection banner.
// Checks if the code version matches the latest git tag, and if the DB skill count
// matches the export file count. If mismatch → red banner alert.
export function SessionResetBanner() {
  const [show, setShow] = React.useState(false)
  const [message, setMessage] = React.useState('')

  React.useEffect(() => {
    async function check() {
      try {
        // Check 1: Compare code APP_VERSION vs latest git tag
        const codeVersion = APP_VERSION
        const res = await fetch('/api/stats', { cache: 'no-store' })
        if (!res.ok) return
        const stats = await res.json()

        // Check 2: DB skill count vs expected
        const dbCount = stats.total || stats.totalSkills || 0
        if (dbCount > 0 && dbCount < 5000) {
          // DB should have 7,189 skills. If <5,000, a reset likely happened
          // and the stale export was used to restore.
          setMessage(
            `⚠ Session reset detected: DB has only ${dbCount} skills (expected ~7,189). ` +
            `The stale export may have been used. Run: bun run scripts/restore-db.ts ` +
            `(now auto-runs PA Wiki import + compute-max-rank). ` +
            `Current version: ${codeVersion}.`
          )
          setShow(true)
          return
        }

        // Check 3: Compare code version vs latest tag via API
        const tagRes = await fetch('/api/version/switch', { cache: 'no-store' })
        if (tagRes.ok) {
          const tagData = await tagRes.json()
          const latestTag = tagData.latestTag || tagData.currentTag
          if (latestTag && codeVersion && latestTag !== codeVersion) {
            setMessage(
              `⚠ Version mismatch: code says ${codeVersion} but latest git tag is ${latestTag}. ` +
              `A session reset may have reverted code. Check git log to verify.`
            )
            setShow(true)
            return
          }
        }
      } catch {
        // Silent fail — don't spam the user with errors
      }
    }
    check()
  }, [])

  if (!show) return null

  return (
    <div className="relative z-50 border-b-2 border-red-600/60 bg-red-950/90 px-4 py-2 text-xs text-red-100">
      <div className="mx-auto flex max-w-7xl items-center gap-2">
        <AlertTriangle className="size-4 shrink-0 text-red-400" />
        <span className="flex-1">{message}</span>
        <button
          onClick={() => setShow(false)}
          className="shrink-0 rounded-sm p-1 hover:bg-red-800/50"
          aria-label="Dismiss"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  )
}
