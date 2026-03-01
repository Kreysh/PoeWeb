// Live Search Initializer - runs at boot in worker #1
// Uses HTTP API to resume live searches (avoids require() of .ts modules)

let initialized = false

async function initLiveSearches(port) {
  if (initialized) return
  initialized = true

  if (!port) {
    console.log('[LiveSearch Init] No port provided, skipping')
    return
  }

  // Wait for the server to be fully ready
  await new Promise(r => setTimeout(r, 5000))

  try {
    const Database = require('better-sqlite3')
    const path = require('path')
    const fs = require('fs')
    const dbPath = path.join(process.cwd(), 'data', 'poe-trade.db')

    if (!fs.existsSync(dbPath)) {
      console.log('[LiveSearch Init] No database yet, skipping')
      return
    }

    // Check POESESSID first - required for WebSocket
    const settingsPath = path.join(process.cwd(), 'data', 'settings.json')
    let poesessid = null
    if (fs.existsSync(settingsPath)) {
      try {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
        poesessid = settings.poesessid || null
      } catch { /* ignore */ }
    }

    if (!poesessid) {
      console.log('[LiveSearch Init] No POESESSID configured. Live searches require POESESSID. Skipping.')
      return
    }

    const db = new Database(dbPath, { readonly: true })

    // Check if live_mode column exists
    const tableInfo = db.pragma('table_info(saved_searches)')
    const hasLiveMode = tableInfo.some(col => col.name === 'live_mode')
    if (!hasLiveMode) {
      db.close()
      console.log('[LiveSearch Init] live_mode column not yet available, skipping')
      return
    }

    const searches = db.prepare(
      "SELECT id, name FROM saved_searches WHERE live_mode = 'live' AND is_active = 1"
    ).all()
    db.close()

    if (searches.length === 0) {
      console.log('[LiveSearch Init] No active live searches to resume')
      return
    }

    console.log(`[LiveSearch Init] Resuming ${searches.length} live search(es)...`)

    for (const search of searches) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 30000)

        const res = await fetch(`http://127.0.0.1:${port}/api/live-search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Boot': 'poe-trade-resume',
          },
          body: JSON.stringify({ searchId: search.id }),
          signal: controller.signal,
        })

        clearTimeout(timeout)

        const data = await res.json()
        if (data.success) {
          console.log(`[LiveSearch Init] Resumed search ${search.id}: ${search.name}`)
        } else {
          console.error(`[LiveSearch Init] Failed to resume search ${search.id}: ${data.error}`)
        }
      } catch (err) {
        console.error(`[LiveSearch Init] Failed to resume search ${search.id}:`, err.message)
      }
      // Small delay between starts
      await new Promise(r => setTimeout(r, 2000))
    }
  } catch (err) {
    console.error('[LiveSearch Init] Error:', err.message)
  }
}

module.exports = { initLiveSearches }
