import { EventEmitter } from 'events'
import { getDb } from '@/lib/db'
import { tradeSearch, tradeFetch, getPoesessid } from './client'
import { parseSearchResults } from './item-parser'
import { createHash } from 'crypto'
import { GAMES, type GameId } from '@/lib/constants/games'
import type { ParsedItem } from './types'

// Use dynamic import for ws to avoid issues in Next.js client
let WebSocketClass: any = null
function getWS() {
  if (!WebSocketClass) {
    WebSocketClass = require('ws')
  }
  return WebSocketClass
}

const USER_AGENT = 'POETradeAnalyzer/1.0 (contact: poe-trade@comercialcmc.cc)'
const PING_TIMEOUT_MS = 35000 // 30s GGG ping interval + 5s grace

interface LiveConnection {
  searchId: number
  ws: any
  game: GameId
  league: string
  queryId: string
  reconnectAttempts: number
  reconnectTimer: ReturnType<typeof setTimeout> | null
  pingTimer: ReturnType<typeof setTimeout> | null
  authenticated: boolean
  queryJson: string
  active: boolean
}

export interface LiveSearchEvent {
  type: 'new_items' | 'auto_whisper' | 'connected' | 'disconnected' | 'error' | 'reconnecting'
  searchId: number
  searchName?: string
  items?: ParsedItem[]
  whisper?: string
  itemName?: string
  price?: { amount: number; currency: string }
  error?: string
  timestamp: string
}

const MAX_CONNECTIONS = 10
const MAX_RECONNECT_ATTEMPTS = 10

class LiveSearchManager extends EventEmitter {
  private connections = new Map<number, LiveConnection>()
  private static instance: LiveSearchManager | null = null

  static getInstance(): LiveSearchManager {
    if (!LiveSearchManager.instance) {
      LiveSearchManager.instance = new LiveSearchManager()
    }
    return LiveSearchManager.instance
  }

  getActiveCount(): number {
    return this.connections.size
  }

  getActiveSearchIds(): number[] {
    return Array.from(this.connections.keys())
  }

  isActive(searchId: number): boolean {
    return this.connections.has(searchId)
  }

  async startLiveSearch(searchId: number): Promise<void> {
    if (this.connections.has(searchId)) {
      console.log(`[LiveSearch] Search ${searchId} already active`)
      return
    }

    if (this.connections.size >= MAX_CONNECTIONS) {
      throw new Error(`Maximum ${MAX_CONNECTIONS} live connections reached`)
    }

    const db = getDb()
    const search = db.prepare('SELECT * FROM saved_searches WHERE id = ?').get(searchId) as any
    if (!search) throw new Error(`Search ${searchId} not found`)

    const game = search.game as GameId
    let queryId: string

    if (search.query_id) {
      // URL-imported search: use queryId directly (skip POST to GGG)
      queryId = search.query_id
    } else {
      const query = JSON.parse(search.query_json)
      const searchResult = await tradeSearch(game, search.league, query)
      queryId = searchResult.id
    }

    // Check POESESSID - required for WebSocket auth
    const poesessid = getPoesessid()
    if (!poesessid) {
      console.error(`[LiveSearch] No POESESSID configured. Cannot start live search.`)
      this.emitEvent({
        type: 'error',
        searchId,
        searchName: search.name,
        error: 'No POESESSID configurado. Ve a Settings para configurarlo. GGG requiere autenticación para Live Search.',
        timestamp: new Date().toISOString(),
      })
      throw new Error('POESESSID es requerido para Live Search. Configúralo en Settings.')
    }

    const conn: LiveConnection = {
      searchId,
      ws: null,
      game,
      league: search.league,
      queryId,
      reconnectAttempts: 0,
      reconnectTimer: null,
      pingTimer: null,
      authenticated: false,
      queryJson: search.query_json || '{}',
      active: true,
    }

    this.connections.set(searchId, conn)

    // Update DB
    db.prepare("UPDATE saved_searches SET live_mode = 'live', updated_at = datetime('now') WHERE id = ?").run(searchId)

    this.connectWebSocket(conn, search.name)
  }

  private connectWebSocket(conn: LiveConnection, searchName: string): void {
    const WS = getWS()
    const config = GAMES[conn.game]

    const wsUrl = conn.game === 'poe1'
      ? `wss://www.pathofexile.com/api/trade/live/${encodeURIComponent(conn.league)}/${conn.queryId}`
      : `wss://www.pathofexile.com/api/trade2/live/poe2/${encodeURIComponent(conn.league)}/${conn.queryId}`

    // Build complete headers matching working implementations
    const headers: Record<string, string> = {
      'User-Agent': USER_AGENT,
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': 'https://www.pathofexile.com',
      'Referer': `${config.tradeBaseUrl}/search/${encodeURIComponent(conn.league)}/${conn.queryId}`,
    }

    const poesessid = getPoesessid()
    if (poesessid) {
      headers['Cookie'] = `POESESSID=${poesessid}`
    }

    try {
      conn.ws = new WS(wsUrl, { headers })
    } catch (err) {
      console.error(`[LiveSearch] Failed to create WebSocket for ${conn.searchId}:`, err)
      this.emitEvent({ type: 'error', searchId: conn.searchId, searchName, error: 'Failed to connect', timestamp: new Date().toISOString() })
      return
    }

    // Handle HTTP-level errors during WebSocket upgrade (e.g. 401, 403, 429)
    // When this handler exists, ws does NOT fire the generic 'error' event for upgrade failures
    conn.ws.on('upgrade', (res: any) => {
      // Store response for potential debugging
      console.log(`[LiveSearch] Upgrade response for search ${conn.searchId}: ${res.statusCode}`)
    })

    conn.ws.on('unexpected-response', (req: any, res: any) => {
      const statusCode = res.statusCode
      console.error(`[LiveSearch] HTTP ${statusCode} during WebSocket upgrade for search ${conn.searchId}`)

      // Consume response to free resources
      res.resume()

      if (statusCode === 401 || statusCode === 403) {
        // Auth failure at HTTP level - stop and don't reconnect
        this.emitEvent({
          type: 'error',
          searchId: conn.searchId,
          searchName,
          error: `HTTP ${statusCode}: POESESSID no válido o ausente. Configúralo en Settings para usar Live Search.`,
          timestamp: new Date().toISOString(),
        })
        conn.active = false
        this.connections.delete(conn.searchId)
        try {
          const db = getDb()
          db.prepare("UPDATE saved_searches SET live_mode = 'polling', updated_at = datetime('now') WHERE id = ?").run(conn.searchId)
          db.prepare("INSERT INTO live_search_events (search_id, event_type, created_at) VALUES (?, 'auth_failed', datetime('now'))").run(conn.searchId)
        } catch { /* ignore */ }
        return
      }

      if (statusCode === 429) {
        // Rate limited at HTTP level
        this.emitEvent({
          type: 'error',
          searchId: conn.searchId,
          searchName,
          error: 'Rate limited por GGG (HTTP 429). Reconectando con delay...',
          timestamp: new Date().toISOString(),
        })
        conn.reconnectAttempts = Math.max(conn.reconnectAttempts, 6)
        this.scheduleReconnect(conn, searchName)
        return
      }

      // Other HTTP errors - try reconnecting
      this.emitEvent({
        type: 'error',
        searchId: conn.searchId,
        searchName,
        error: `Error HTTP ${statusCode} al conectar WebSocket. Reconectando...`,
        timestamp: new Date().toISOString(),
      })
      this.scheduleReconnect(conn, searchName)
    })

    conn.ws.on('open', () => {
      console.log(`[LiveSearch] Connected: search ${conn.searchId}`)
      conn.reconnectAttempts = 0
      this.resetPingTimer(conn, searchName)
      this.emitEvent({ type: 'connected', searchId: conn.searchId, searchName, timestamp: new Date().toISOString() })

      // Log event
      const db = getDb()
      db.prepare("INSERT INTO live_search_events (search_id, event_type, created_at) VALUES (?, 'connected', datetime('now'))").run(conn.searchId)
    })

    conn.ws.on('message', async (data: any) => {
      try {
        const msg = JSON.parse(data.toString())

        // Handle auth response - GGG sends {"auth": true/false} as first message
        if ('auth' in msg) {
          conn.authenticated = msg.auth === true
          if (conn.authenticated) {
            console.log(`[LiveSearch] Authenticated: search ${conn.searchId}`)
          } else {
            console.error(`[LiveSearch] Authentication failed: search ${conn.searchId}`)
            this.emitEvent({
              type: 'error',
              searchId: conn.searchId,
              searchName,
              error: 'Autenticación fallida. Verifica tu POESESSID en Settings.',
              timestamp: new Date().toISOString(),
            })
          }
          return
        }

        // Handle error messages from GGG
        if (msg.error) {
          const errorMsg = typeof msg.error === 'string' ? msg.error : JSON.stringify(msg.error)
          console.error(`[LiveSearch] GGG error for search ${conn.searchId}: ${errorMsg}`)
          this.emitEvent({
            type: 'error',
            searchId: conn.searchId,
            searchName,
            error: `Error de GGG: ${errorMsg}`,
            timestamp: new Date().toISOString(),
          })
          return
        }

        // Handle new item notifications
        if (msg.new && Array.isArray(msg.new) && msg.new.length > 0) {
          this.resetPingTimer(conn, searchName)
          await this.handleNewItems(conn, msg.new, searchName)
        }
      } catch (err) {
        console.error(`[LiveSearch] Message parse error for ${conn.searchId}:`, err)
      }
    })

    // ws library responds with PONG automatically; reset our timeout on each ping
    conn.ws.on('ping', () => {
      this.resetPingTimer(conn, searchName)
    })

    conn.ws.on('close', (code: number) => {
      console.log(`[LiveSearch] Disconnected: search ${conn.searchId} (code: ${code})`)

      // Clean up ping timer
      if (conn.pingTimer) {
        clearTimeout(conn.pingTimer)
        conn.pingTimer = null
      }

      this.emitEvent({ type: 'disconnected', searchId: conn.searchId, searchName, timestamp: new Date().toISOString() })

      if (!conn.active) return

      // Handle specific close codes
      switch (code) {
        case 4001: // Auth failure
          console.error(`[LiveSearch] Auth failure for search ${conn.searchId}, stopping`)
          this.emitEvent({
            type: 'error',
            searchId: conn.searchId,
            searchName,
            error: 'Autenticación rechazada por GGG. Actualiza tu POESESSID en Settings.',
            timestamp: new Date().toISOString(),
          })
          // Fall back to polling mode
          conn.active = false
          this.connections.delete(conn.searchId)
          try {
            const db = getDb()
            db.prepare("UPDATE saved_searches SET live_mode = 'polling', updated_at = datetime('now') WHERE id = ?").run(conn.searchId)
          } catch { /* ignore */ }
          return

        case 4004: // Query expired
        case 1008: // Policy violation (also used for expired queries)
          console.log(`[LiveSearch] Query expired for search ${conn.searchId}, attempting refresh`)
          this.refreshAndReconnect(conn, searchName)
          return

        case 4029: // Rate limited
        case 429:
          console.warn(`[LiveSearch] Rate limited for search ${conn.searchId}`)
          this.emitEvent({
            type: 'error',
            searchId: conn.searchId,
            searchName,
            error: 'Rate limited por GGG. Reconectando con delay...',
            timestamp: new Date().toISOString(),
          })
          // Force longer backoff: at least 60s
          conn.reconnectAttempts = Math.max(conn.reconnectAttempts, 6) // 2^6 * 1000 = 64s
          this.scheduleReconnect(conn, searchName)
          return

        default:
          // Normal reconnect with backoff
          this.scheduleReconnect(conn, searchName)
          return
      }
    })

    conn.ws.on('error', (err: any) => {
      console.error(`[LiveSearch] WS error for ${conn.searchId}:`, err.message)
      this.emitEvent({ type: 'error', searchId: conn.searchId, searchName, error: err.message, timestamp: new Date().toISOString() })
    })
  }

  private resetPingTimer(conn: LiveConnection, searchName: string): void {
    if (conn.pingTimer) {
      clearTimeout(conn.pingTimer)
    }
    conn.pingTimer = setTimeout(() => {
      if (!conn.active) return
      console.warn(`[LiveSearch] Ping timeout for search ${conn.searchId}`)
      this.emitEvent({
        type: 'error',
        searchId: conn.searchId,
        searchName,
        error: 'Conexión perdida (ping timeout). Reconectando...',
        timestamp: new Date().toISOString(),
      })
      // Force close to trigger reconnect
      if (conn.ws) {
        try { conn.ws.close() } catch { /* ignore */ }
      }
    }, PING_TIMEOUT_MS)
  }

  private async refreshAndReconnect(conn: LiveConnection, searchName: string): Promise<void> {
    try {
      const queryJson = conn.queryJson
      if (!queryJson || queryJson === '{}') {
        // URL-imported search - can't refresh query
        console.error(`[LiveSearch] Cannot refresh URL-imported search ${conn.searchId}`)
        this.emitEvent({
          type: 'error',
          searchId: conn.searchId,
          searchName,
          error: 'Query expirado. Esta búsqueda fue importada por URL y no puede renovarse automáticamente. Re-importa la URL.',
          timestamp: new Date().toISOString(),
        })
        conn.active = false
        this.connections.delete(conn.searchId)
        try {
          const db = getDb()
          db.prepare("UPDATE saved_searches SET live_mode = 'polling', updated_at = datetime('now') WHERE id = ?").run(conn.searchId)
        } catch { /* ignore */ }
        return
      }

      // Re-POST query to get fresh queryId
      const query = JSON.parse(queryJson)
      const searchResult = await tradeSearch(conn.game, conn.league, query)
      const newQueryId = searchResult.id

      console.log(`[LiveSearch] Refreshed queryId for search ${conn.searchId}: ${conn.queryId} -> ${newQueryId}`)

      // Update DB with new query_id
      try {
        const db = getDb()
        db.prepare("UPDATE saved_searches SET query_id = ?, updated_at = datetime('now') WHERE id = ?").run(newQueryId, conn.searchId)
      } catch { /* ignore */ }

      conn.queryId = newQueryId
      conn.reconnectAttempts = 0

      // Reconnect with new queryId
      this.connectWebSocket(conn, searchName)
    } catch (err: any) {
      console.error(`[LiveSearch] Failed to refresh query for search ${conn.searchId}:`, err)
      this.emitEvent({
        type: 'error',
        searchId: conn.searchId,
        searchName,
        error: `Error al renovar query: ${err.message}`,
        timestamp: new Date().toISOString(),
      })
      // Try normal reconnect with old queryId
      this.scheduleReconnect(conn, searchName)
    }
  }

  private async handleNewItems(conn: LiveConnection, itemIds: string[], searchName: string): Promise<void> {
    try {
      // Fetch items in batches of 10
      const allParsed: ParsedItem[] = []
      for (let i = 0; i < itemIds.length; i += 10) {
        const batch = itemIds.slice(i, i + 10)
        const fetchResult = await tradeFetch(conn.game, batch, conn.queryId)
        const parsed = parseSearchResults(fetchResult.result)
        allParsed.push(...parsed)
        if (i + 10 < itemIds.length) {
          await new Promise(r => setTimeout(r, 500))
        }
      }

      if (allParsed.length === 0) return

      // Save to DB
      const db = getDb()
      const insertStmt = db.prepare(`
        INSERT OR IGNORE INTO search_results (search_id, item_hash, item_json, price_amount, price_currency, seller_account, seller_character, whisper_token, is_new, source, found_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'live', datetime('now'))
      `)

      let newCount = 0
      for (const item of allParsed) {
        const hash = createHash('md5').update(`${item.name}|${item.typeLine}|${item.seller.account}|${item.price?.amount}`).digest('hex')
        const result = insertStmt.run(
          conn.searchId, hash, JSON.stringify(item),
          item.price?.amount || null, item.price?.currency || null,
          item.seller.account, item.seller.character,
          item.whisperToken
        )
        if (result.changes > 0) newCount++
      }

      // Update saved search
      db.prepare(
        "UPDATE saved_searches SET last_checked_at = datetime('now'), new_since_last = new_since_last + ?, updated_at = datetime('now') WHERE id = ?"
      ).run(newCount, conn.searchId)

      // Log event
      db.prepare(
        "INSERT INTO live_search_events (search_id, event_type, item_count, created_at) VALUES (?, 'new_items', ?, datetime('now'))"
      ).run(conn.searchId, allParsed.length)

      // Emit new items event
      this.emitEvent({
        type: 'new_items',
        searchId: conn.searchId,
        searchName,
        items: allParsed,
        timestamp: new Date().toISOString(),
      })

      // Check auto-whisper threshold
      const search = db.prepare('SELECT auto_whisper, max_price_threshold, price_threshold_currency FROM saved_searches WHERE id = ?').get(conn.searchId) as any
      if (search?.auto_whisper && search.max_price_threshold) {
        for (const item of allParsed) {
          if (
            item.price &&
            item.price.amount <= search.max_price_threshold &&
            (!search.price_threshold_currency || item.price.currency === search.price_threshold_currency)
          ) {
            this.emitEvent({
              type: 'auto_whisper',
              searchId: conn.searchId,
              searchName,
              whisper: item.whisper,
              itemName: item.name || item.typeLine,
              price: item.price,
              timestamp: new Date().toISOString(),
            })
          }
        }
      }
    } catch (err) {
      console.error(`[LiveSearch] Error handling items for ${conn.searchId}:`, err)
    }
  }

  private scheduleReconnect(conn: LiveConnection, searchName: string): void {
    if (conn.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.log(`[LiveSearch] Max reconnect attempts for ${conn.searchId}, stopping`)
      this.emitEvent({
        type: 'error',
        searchId: conn.searchId,
        searchName,
        error: 'Máximo de intentos de reconexión alcanzado. Búsqueda detenida.',
        timestamp: new Date().toISOString(),
      })
      this.connections.delete(conn.searchId)
      return
    }

    const delay = Math.min(1000 * Math.pow(2, conn.reconnectAttempts), 60000)
    conn.reconnectAttempts++

    console.log(`[LiveSearch] Reconnecting ${conn.searchId} in ${delay}ms (attempt ${conn.reconnectAttempts})`)
    this.emitEvent({ type: 'reconnecting', searchId: conn.searchId, searchName, timestamp: new Date().toISOString() })

    conn.reconnectTimer = setTimeout(() => {
      if (conn.active) {
        this.connectWebSocket(conn, searchName)
      }
    }, delay)
  }

  // Clean up local WebSocket connection only (called via IPC from other workers)
  stopLocal(searchId: number): void {
    const conn = this.connections.get(searchId)
    if (!conn) return
    conn.active = false
    if (conn.reconnectTimer) clearTimeout(conn.reconnectTimer)
    if (conn.pingTimer) clearTimeout(conn.pingTimer)
    if (conn.ws) {
      try { conn.ws.close() } catch { /* ignore */ }
    }
    this.connections.delete(searchId)
  }

  stopLiveSearch(searchId: number): void {
    // 1. Clean up local connection if it exists in this worker
    this.stopLocal(searchId)

    // 2. ALWAYS update DB (independent of which worker receives the request)
    const db = getDb()
    db.prepare("UPDATE saved_searches SET live_mode = 'polling', updated_at = datetime('now') WHERE id = ?").run(searchId)
    db.prepare("INSERT INTO live_search_events (search_id, event_type, created_at) VALUES (?, 'stopped', datetime('now'))").run(searchId)

    // 3. Broadcast IPC so other workers close their WebSocket connection
    try {
      if (typeof process.send === 'function') {
        process.send({ type: 'live-search-stop', payload: { searchId } })
      }
    } catch { /* ignore */ }

    console.log(`[LiveSearch] Stopped: search ${searchId}`)
  }

  stopAll(): void {
    for (const id of this.connections.keys()) {
      this.stopLiveSearch(id)
    }
  }

  private emitEvent(event: LiveSearchEvent): void {
    this.emit('live-event', event)
    // Relay to other workers via IPC
    try {
      if (typeof process.send === 'function') {
        process.send({ type: 'live-search-event', payload: event })
      }
    } catch { /* ignore if IPC channel closed */ }
  }

  getStatus(): Array<{ searchId: number; game: string; league: string; reconnectAttempts: number; authenticated: boolean }> {
    const result: Array<{ searchId: number; game: string; league: string; reconnectAttempts: number; authenticated: boolean }> = []
    for (const [id, conn] of this.connections) {
      result.push({
        searchId: id,
        game: conn.game,
        league: conn.league,
        reconnectAttempts: conn.reconnectAttempts,
        authenticated: conn.authenticated,
      })
    }
    return result
  }
}

export const liveSearchManager = LiveSearchManager.getInstance()
