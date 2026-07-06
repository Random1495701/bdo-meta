// Central version tracking for BDO Meta.
// APP_VERSION is set at build time from git tags to prevent drift.
// The header displays this so users can track when z.ai session resets revert the code.

// These values are injected at build time via next.config.ts or fallback to hardcoded.
// To update: run `bun run scripts/sync-version.ts` or re-deploy.

export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || 'v5.9.10'
export const APP_VERSION_DATE = process.env.NEXT_PUBLIC_APP_VERSION_DATE || '2026-07-06'

// All available git tags (for the version dropdown).
// Hardcoded fallback — update via `bun run scripts/sync-version.ts`.
export const GIT_TAGS = [
  'v1.0.0', 'v1.1.0', 'v1.2.0', 'v1.3.0', 'v1.4.0', 'v1.5.0',
  'v1.6.0', 'v1.7.0', 'v1.8.0', 'v1.9.0', 'v2.0.0', 'v2.1.0',
  'v2.2.0', 'v2.3.0', 'v2.4.0', 'v2.5.0', 'v2.6.0', 'v2.7.0',
  'v2.8.0', 'v2.9.0', 'v3.0.0', 'v3.1.0', 'v3.2.0', 'v3.3.0',
  'v3.4.0', 'v3.5.0', 'v3.6.0', 'v3.7.0', 'v3.8.0', 'v3.9.0',
  'v4.0.0', 'v4.1.0', 'v4.2.0', 'v4.3.0', 'v4.3.1', 'v5.1.0',
  'v5.2.0', 'v5.2.1', 'v5.3.0', 'v5.4.0', 'v5.4.1', 'v5.5.0',
  'v5.5.1', 'v5.5.2', 'v5.5.3', 'v5.5.4', 'v5.5.5', 'v5.5.6',
  'v5.5.7', 'v5.5.8', 'v5.5.9', 'v5.6.0', 'v5.6.1', 'v5.6.2',
  'v5.6.3', 'v5.6.4', 'v5.6.5', 'v5.6.6', 'v5.6.7', 'v5.7.0',
  'v5.7.1', 'v5.7.2', 'v5.7.3', 'v5.7.4', 'v5.8.0', 'v5.8.1',
  'v5.8.2', 'v5.8.3', 'v5.8.4', 'v5.8.5', 'v5.8.6', 'v5.8.7',
  'v5.9.0', 'v5.9.1', 'v5.9.2', 'v5.9.3', 'v5.9.4', 'v5.9.5',
  'v5.9.6', 'v5.9.7', 'v5.9.8', 'v5.9.9', 'v5.9.10'
]
