interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const cache = new Map<string, CacheEntry<any>>()
const DEFAULT_TTL = 30 * 60 * 1000 // 30 minutes

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  return entry.data
}

export function setCache<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
  cache.set(key, { data, expiresAt: Date.now() + ttl })
}

export function invalidateCache(pattern?: string): void {
  if (!pattern) {
    cache.clear()
    return
  }
  for (const key of cache.keys()) {
    if (key.includes(pattern)) cache.delete(key)
  }
}

export function getCacheStats(): { size: number; keys: string[] } {
  return { size: cache.size, keys: Array.from(cache.keys()) }
}
