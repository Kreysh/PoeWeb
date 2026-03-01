import { GAMES, type GameId } from '@/lib/constants/games'
import { tradeFetch, getPoesessid } from './client'
import type { ParsedItem } from './types'
import { acquireToken, updateFromHeaders, abortableDelay } from './rate-limiter'
import { parseSearchResults } from './item-parser'

interface ParsedTradeUrl {
  game: GameId
  league: string
  queryId: string
}

/** Safely decode a URI component — returns original string if malformed */
function safeDecodeURI(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/**
 * Parse a POE trade URL and extract game, league, and query ID.
 * Supports:
 *   POE1: https://www.pathofexile.com/trade/search/Standard/XXXXX
 *   POE2: https://www.pathofexile.com/trade2/search/poe2/Standard/XXXXX
 */
export function parseTradeUrl(url: string): ParsedTradeUrl {
  const trimmed = url.trim()

  // POE2: /trade2/search/poe2/{league}/{queryId}
  const poe2Match = trimmed.match(/pathofexile\.com\/trade2\/search\/poe2\/([^/]+)\/([a-zA-Z0-9]+)/)
  if (poe2Match) {
    return { game: 'poe2', league: safeDecodeURI(poe2Match[1]), queryId: poe2Match[2] }
  }

  // POE1: /trade/search/{league}/{queryId}
  const poe1Match = trimmed.match(/pathofexile\.com\/trade\/search\/([^/]+)\/([a-zA-Z0-9]+)/)
  if (poe1Match) {
    return { game: 'poe1', league: safeDecodeURI(poe1Match[1]), queryId: poe1Match[2] }
  }

  throw new Error('URL no válida. Usa una URL de pathofexile.com/trade/search/... o /trade2/search/...')
}

/**
 * Fetch all search result items for a given query, paginated in batches of 10.
 * Respects rate limits with delays between batches.
 */
export async function fetchAllSearchItems(
  game: GameId,
  league: string,
  queryId: string,
  maxItems: number = 100,
  onProgress?: (fetched: number, total: number) => void,
  signal?: AbortSignal,
): Promise<{ items: ParsedItem[]; total: number; failedBatches: number }> {
  const config = GAMES[game]

  // GET search results directly using the query ID from the URL
  const searchUrl = `${config.tradeApiBase}${config.tradeSearchPath}/${encodeURIComponent(league)}/${queryId}`
  console.log(`[Analyzer] GET search results: ${searchUrl}`)

  const headers: Record<string, string> = {
    'User-Agent': 'POETradeAnalyzer/1.0 (contact: poe-trade@comercialcmc.cc)',
    'Accept': 'application/json',
  }

  const poesessid = getPoesessid()
  if (poesessid) {
    headers['Cookie'] = `POESESSID=${poesessid}`
  }

  const rateLimitKey = `search:${game}`
  await acquireToken(rateLimitKey, signal)

  const searchRes = await fetch(searchUrl, { headers, signal })
  updateFromHeaders(rateLimitKey, searchRes.headers)

  if (searchRes.status === 429) {
    throw new Error('Rate limited por GGG. Intenta de nuevo en unos segundos.')
  }

  let searchData: any = null

  if (searchRes.ok) {
    try {
      searchData = await searchRes.json()
    } catch { /* parse failed */ }
  }

  if (!searchData || !Array.isArray(searchData.result)) {
    let bodySnippet = ''
    try { bodySnippet = await searchRes.text() } catch { /* already consumed */ }
    console.error(`[Analyzer] GET failed. URL: ${searchUrl}, status: ${searchRes.status}, body: ${bodySnippet.slice(0, 300)}`)

    throw new Error(
      `La búsqueda no existe o expiró (${searchRes.status}). ` +
      `Los IDs de búsqueda de GGG expiran en pocos minutos. ` +
      `Crea una nueva búsqueda en pathofexile.com y pega la URL inmediatamente.`
    )
  }

  const allIds: string[] = searchData.result || []
  const total = searchData.total || allIds.length
  const activeQueryId = queryId

  if (allIds.length === 0) {
    return { items: [], total: 0, failedBatches: 0 }
  }

  // Fetch items in batches of 10 (GGG limit)
  const idsToFetch = allIds.slice(0, Math.min(maxItems, allIds.length))
  const items: ParsedItem[] = []
  let failedBatches = 0

  for (let i = 0; i < idsToFetch.length; i += 10) {
    // Check abort signal at the start of each batch iteration
    if (signal?.aborted) {
      const remaining = Math.ceil((idsToFetch.length - i) / 10)
      failedBatches += remaining
      break
    }

    const batch = idsToFetch.slice(i, i + 10)

    try {
      const result = await tradeFetch(game, batch, activeQueryId, signal)
      const parsed = parseSearchResults(result.result || [])
      items.push(...parsed)
    } catch (err: any) {
      if (err.name === 'AbortError') {
        break
      }
      // If rate limited, wait and retry once
      if (err.message?.includes('Rate limited')) {
        await abortableDelay(5000, signal).catch(() => null)
        if (signal?.aborted) break
        try {
          const result = await tradeFetch(game, batch, activeQueryId, signal)
          const parsed = parseSearchResults(result.result || [])
          items.push(...parsed)
        } catch (retryErr: any) {
          if (retryErr.name === 'AbortError') break
          console.error(`[Analyzer] Failed batch at offset ${i} after retry`)
          failedBatches++
        }
      } else {
        console.error(`[Analyzer] Failed batch at offset ${i}:`, err.message)
        failedBatches++
      }
    }

    if (onProgress) onProgress(items.length, Math.min(maxItems, total))

    // Delay between batches to respect rate limits (~1.2s)
    if (i + 10 < idsToFetch.length) {
      await abortableDelay(1200, signal).catch(() => null)
      if (signal?.aborted) break
    }
  }

  return { items, total, failedBatches }
}
