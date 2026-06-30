// Simple in-memory cache for API responses that change rarely.
// Used by /api/classes, /api/ranges, /api/stats, /api/meta.

interface CacheEntry {
  data: any
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()
const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  return entry.data as T
}

export function setCached(key: string, data: any, ttl: number = DEFAULT_TTL) {
  cache.set(key, { data, expiresAt: Date.now() + ttl })
}

export function invalidateCache(key?: string) {
  if (key) {
    cache.delete(key)
  } else {
    cache.clear()
  }
}
