import { getDb } from '@/lib/db'
import { tradeSearch, tradeFetch } from '@/lib/trade/client'
import { parseSearchResults } from '@/lib/trade/item-parser'
import { createHash } from 'crypto'
import type { GameId } from '@/lib/constants/games'

export interface CheckResult {
  searchId: number
  totalFound: number
  newItems: number
  errors: string | null
}

export async function checkSavedSearch(searchId: number): Promise<CheckResult> {
  const db = getDb()
  const search = db.prepare('SELECT * FROM saved_searches WHERE id = ?').get(searchId) as any
  if (!search) throw new Error(`Search ${searchId} not found`)

  // URL-imported searches only support live mode, skip polling
  if (search.query_id && search.query_json === '{}') {
    return { searchId, totalFound: 0, newItems: 0, errors: null }
  }

  const startTime = Date.now()
  let totalFound = 0
  let newItems = 0
  let errors: string | null = null

  try {
    const query = JSON.parse(search.query_json)
    const game = search.game as GameId

    const searchResult = await tradeSearch(game, search.league, query)
    totalFound = searchResult.total

    if (searchResult.result.length > 0) {
      const idsToFetch = searchResult.result.slice(0, 10)
      const fetchResult = await tradeFetch(game, idsToFetch, searchResult.id)
      const parsed = parseSearchResults(fetchResult.result)

      const insertStmt = db.prepare(`
        INSERT OR IGNORE INTO search_results (search_id, item_hash, item_json, price_amount, price_currency, seller_account, seller_character, whisper_token, is_new, source, found_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'polling', datetime('now'))
      `)

      for (const item of parsed) {
        const hash = createHash('md5').update(`${item.name}|${item.typeLine}|${item.seller.account}|${item.price?.amount}`).digest('hex')
        const result = insertStmt.run(
          searchId, hash, JSON.stringify(item),
          item.price?.amount || null, item.price?.currency || null,
          item.seller.account, item.seller.character,
          item.whisperToken
        )
        if (result.changes > 0) newItems++
      }
    }

    db.prepare(
      "UPDATE saved_searches SET last_checked_at = datetime('now'), last_result_count = ?, new_since_last = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(totalFound, newItems, searchId)

  } catch (err) {
    errors = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[Checker] Search ${searchId} error:`, errors)
  }

  // Log polling job
  db.prepare(
    "INSERT INTO polling_jobs (job_type, game, league, status, items_found, items_new, errors, duration_ms, finished_at) VALUES ('saved_search', ?, ?, ?, ?, ?, ?, ?, datetime('now'))"
  ).run(search.game, search.league, errors ? 'error' : 'success', totalFound, newItems, errors, Date.now() - startTime)

  return { searchId, totalFound, newItems, errors }
}

export async function checkAllActiveSearches(): Promise<CheckResult[]> {
  const db = getDb()
  // Skip searches that are in live mode - they use WebSocket instead of polling
  const searches = db.prepare(
    "SELECT id FROM saved_searches WHERE is_active = 1 AND (live_mode IS NULL OR live_mode != 'live')"
  ).all() as Array<{ id: number }>
  const results: CheckResult[] = []
  for (const search of searches) {
    try {
      const result = await checkSavedSearch(search.id)
      results.push(result)
    } catch (err) {
      console.error(`[Checker] Failed to check search ${search.id}:`, err)
    }
    // Small delay between searches to respect rate limits
    await new Promise(r => setTimeout(r, 2000))
  }
  return results
}
