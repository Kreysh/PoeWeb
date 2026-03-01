import { GAMES, type GameId } from '@/lib/constants/games'
import { TradeQuery, TradeSearchResponse, TradeFetchResponse } from './types'
import { acquireToken, updateFromHeaders } from './rate-limiter'

const USER_AGENT = 'POETradeAnalyzer/1.0 (contact: poe-trade@comercialcmc.cc)'

export function getPoesessid(): string | null {
  try {
    const fs = require('fs')
    const path = require('path')
    const settingsPath = path.join(process.cwd(), 'data', 'settings.json')
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
      return settings.poesessid || null
    }
  } catch { /* ignore */ }
  return null
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': USER_AGENT,
    'Accept': 'application/json',
  }
  const poesessid = getPoesessid()
  if (poesessid) {
    headers['Cookie'] = `POESESSID=${poesessid}`
  }
  return headers
}

export async function tradeSearch(game: GameId, league: string, query: TradeQuery, signal?: AbortSignal): Promise<TradeSearchResponse> {
  const config = GAMES[game]
  const url = `${config.tradeApiBase}${config.tradeSearchPath}/${encodeURIComponent(league)}`

  await acquireToken(`search:${game}`, signal)

  const res = await fetch(url, {
    method: 'POST',
    headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
    signal,
  })

  updateFromHeaders(`search:${game}`, res.headers)

  if (res.status === 429) {
    const retryAfter = res.headers.get('retry-after')
    throw new Error(`Rate limited. Retry after ${retryAfter || '60'} seconds.`)
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Trade search failed (${res.status}): ${text.slice(0, 200)}`)
  }

  try {
    return await res.json()
  } catch {
    throw new Error(`Invalid JSON response from GGG API (${res.status})`)
  }
}

export async function tradeFetch(game: GameId, ids: string[], queryId: string, signal?: AbortSignal): Promise<TradeFetchResponse> {
  const config = GAMES[game]
  const batchIds = ids.slice(0, 10)
  const url = `${config.tradeApiBase}${config.tradeFetchPath}/${batchIds.join(',')}?query=${queryId}`

  await acquireToken(`fetch:${game}`, signal)

  const res = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(),
    signal,
  })

  updateFromHeaders(`fetch:${game}`, res.headers)

  if (res.status === 429) {
    const retryAfter = res.headers.get('retry-after')
    throw new Error(`Rate limited. Retry after ${retryAfter || '60'} seconds.`)
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Trade fetch failed (${res.status}): ${text.slice(0, 200)}`)
  }

  try {
    return await res.json()
  } catch {
    throw new Error(`Invalid JSON response from GGG API (${res.status})`)
  }
}
