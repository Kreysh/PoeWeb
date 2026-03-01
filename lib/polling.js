const cron = require('node-cron')

let tasks = []

function getEconomyInterval() {
  try {
    const Database = require('better-sqlite3')
    const path = require('path')
    const fs = require('fs')
    const dbPath = path.join(process.cwd(), 'data', 'poe-trade.db')
    if (fs.existsSync(dbPath)) {
      const db = new Database(dbPath, { readonly: true })
      const row = db.prepare('SELECT polling_interval_min FROM economy_settings WHERE id = 1').get()
      db.close()
      if (row && row.polling_interval_min) return row.polling_interval_min
    }
  } catch { /* use default */ }
  return 30
}

function startPolling(port) {
  console.log('[Polling] Starting cron jobs...')

  const economyInterval = getEconomyInterval()

  // Check saved searches every 15 minutes
  tasks.push(
    cron.schedule('*/15 * * * *', async () => {
      try {
        await fetch(`http://127.0.0.1:${port}/api/polling/trigger`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job: 'saved-searches' }),
          signal: AbortSignal.timeout(120000),
        })
      } catch (err) {
        console.error('[Polling] Saved searches error:', err.message)
      }
    })
  )

  // Update economy at configured interval
  tasks.push(
    cron.schedule(`*/${economyInterval} * * * *`, async () => {
      try {
        await fetch(`http://127.0.0.1:${port}/api/polling/trigger`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job: 'economy' }),
          signal: AbortSignal.timeout(300000),
        })
      } catch (err) {
        console.error('[Polling] Economy update error:', err.message)
      }
    })
  )

  // Refresh leagues every 6 hours
  tasks.push(
    cron.schedule('0 */6 * * *', async () => {
      try {
        await fetch(`http://127.0.0.1:${port}/api/polling/trigger`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job: 'leagues' }),
          signal: AbortSignal.timeout(30000),
        })
      } catch (err) {
        console.error('[Polling] League refresh error:', err.message)
      }
    })
  )

  // Daily aggregation at midnight
  tasks.push(
    cron.schedule('0 0 * * *', async () => {
      try {
        await fetch(`http://127.0.0.1:${port}/api/polling/trigger`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job: 'aggregate-daily' }),
          signal: AbortSignal.timeout(60000),
        })
      } catch (err) {
        console.error('[Polling] Aggregation error:', err.message)
      }
    })
  )

  // Weekly purge on Sunday 1AM
  tasks.push(
    cron.schedule('0 1 * * 0', async () => {
      try {
        await fetch(`http://127.0.0.1:${port}/api/polling/trigger`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job: 'purge' }),
          signal: AbortSignal.timeout(60000),
        })
      } catch (err) {
        console.error('[Polling] Purge error:', err.message)
      }
    })
  )

  console.log(`[Polling] Cron jobs started: saved-searches (15m), economy (${economyInterval}m), leagues (6h), aggregation (midnight), purge (Sunday 1AM)`)
}

function stopPolling() {
  console.log('[Polling] Stopping cron jobs...')
  tasks.forEach(t => t.stop())
  tasks = []
}

module.exports = { startPolling, stopPolling }
