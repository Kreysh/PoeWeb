import { GAMES, type GameId } from '@/lib/constants/games'
import { tradeSearch, tradeFetch, getPoesessid } from './client'
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

  // Step 1: GET the saved query definition from GGG
  // GET /api/trade/search/{league}/{queryId} returns { id, query: {...}, sort: {...} }
  // NOT result IDs — we must POST the query back to get fresh IDs.
  const getUrl = `${config.tradeApiBase}${config.tradeSearchPath}/${encodeURIComponent(league)}/${queryId}`
  console.log(`[Analyzer] GET query definition: ${getUrl}`)

  const getHeaders: Record<string, string> = {
    'User-Agent': 'POETradeAnalyzer/1.0 (contact: poe-trade@comercialcmc.cc)',
    'Accept': 'application/json',
  }
  const poesessid = getPoesessid()
  if (poesessid) {
    getHeaders['Cookie'] = `POESESSID=${poesessid}`
  }

  const rateLimitKey = `search:${game}`
  await acquireToken(rateLimitKey, signal)
  const getRes = await fetch(getUrl, { headers: getHeaders, signal })
  updateFromHeaders(rateLimitKey, getRes.headers)

  if (getRes.status === 429) {
    throw new Error('Rate limited por GGG. Intenta de nuevo en unos segundos.')
  }

  // Read body as text first — avoids the stream-already-consumed bug
  const getBodyText = await getRes.text()

  if (!getRes.ok) {
    const hint = getRes.status === 401
      ? ' Para POE2, necesitas configurar tu POESESSID en Ajustes.'
      : ' Los IDs de búsqueda de GGG expiran en pocos minutos.'
    console.error(`[Analyzer] GET definition failed. status: ${getRes.status}, body: ${getBodyText.slice(0, 300)}`)
    throw new Error(
      `La búsqueda no existe o expiró (${getRes.status}).${hint} ` +
      `Crea una nueva búsqueda en pathofexile.com y pega la URL inmediatamente.`
    )
  }

  let queryDefinition: any
  try {
    queryDefinition = JSON.parse(getBodyText)
  } catch {
    console.error(`[Analyzer] GET returned non-JSON. body: ${getBodyText.slice(0, 300)}`)
    throw new Error('GGG devolvió una respuesta inesperada. Intenta de nuevo.')
  }

  if (!queryDefinition.query) {
    console.error(`[Analyzer] GET response missing query field. body: ${getBodyText.slice(0, 300)}`)
    throw new Error('No se pudo obtener la definición de búsqueda de GGG.')
  }

  // Step 2: POST the query to get fresh result IDs
  console.log(`[Analyzer] POST re-search for league: ${league}`)
  const searchPayload: any = { query: queryDefinition.query }
  if (queryDefinition.sort) {
    searchPayload.sort = queryDefinition.sort
  }

  let searchData: { id: string; result: string[]; total: number }
  try {
    searchData = await tradeSearch(game, league, searchPayload, signal)
  } catch (err: any) {
    console.error(`[Analyzer] POST re-search failed:`, err.message)
    throw new Error(`Error al re-ejecutar la búsqueda: ${err.message}`)
  }

  const allIds: string[] = searchData.result || []
  const total = searchData.total || allIds.length
  // Use the fresh query ID from POST — tradeFetch needs matching ID
  const activeQueryId = searchData.id

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
