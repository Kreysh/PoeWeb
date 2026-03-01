import { getDb } from '@/lib/db'
import type { ParsedItem } from '@/lib/trade/types'

export async function evaluateAlerts(game: string, league: string): Promise<number> {
  const db = getDb()
  let triggered = 0

  const rules = db.prepare(
    'SELECT * FROM alert_rules WHERE game = ? AND league = ? AND is_active = 1'
  ).all(game, league) as any[]

  for (const rule of rules) {
    try {
      const conditions = JSON.parse(rule.conditions_json)

      // Check cooldown
      if (rule.last_triggered_at) {
        const cooldownMs = (rule.cooldown_min || 5) * 60 * 1000
        const lastTriggered = new Date(rule.last_triggered_at).getTime()
        if (Date.now() - lastTriggered < cooldownMs) continue
      }

      let shouldTrigger = false
      let message = ''
      let tradeUrl: string | null = null

      switch (rule.rule_type) {
        case 'price_below': {
          if (!rule.search_id) break
          const results = db.prepare(
            'SELECT * FROM search_results WHERE search_id = ? AND is_new = 1 AND price_amount IS NOT NULL AND price_amount <= ? ORDER BY price_amount ASC LIMIT 1'
          ).get(rule.search_id, conditions.maxPrice) as any
          if (results) {
            shouldTrigger = true
            message = `Item found below ${conditions.maxPrice} ${conditions.currency || 'chaos'} in "${rule.name}"`
            tradeUrl = null
          }
          break
        }
        case 'new_listing': {
          if (!rule.search_id) break
          const newCount = db.prepare(
            'SELECT COUNT(*) as count FROM search_results WHERE search_id = ? AND is_new = 1'
          ).get(rule.search_id) as { count: number }
          if (newCount.count > 0) {
            shouldTrigger = true
            message = `${newCount.count} new listing(s) found for "${rule.name}"`
          }
          break
        }
        case 'currency_change': {
          const rate = db.prepare(
            'SELECT change_24h FROM currency_rates_latest WHERE game = ? AND league = ? AND currency_id = ?'
          ).get(game, league, conditions.currencyId) as { change_24h: number } | undefined
          if (rate && Math.abs(rate.change_24h || 0) >= (conditions.changeThreshold || 10)) {
            shouldTrigger = true
            message = `${conditions.currencyLabel || conditions.currencyId} changed ${rate.change_24h?.toFixed(1)}% in 24h`
          }
          break
        }
      }

      if (shouldTrigger) {
        db.prepare(
          "INSERT INTO triggered_alerts (rule_id, game, message, details_json, trade_url, triggered_at) VALUES (?, ?, ?, ?, ?, datetime('now'))"
        ).run(rule.id, game, message, JSON.stringify(conditions), tradeUrl)
        db.prepare("UPDATE alert_rules SET last_triggered_at = datetime('now') WHERE id = ?").run(rule.id)
        triggered++
      }
    } catch (err) {
      console.error(`[Alerts] Rule ${rule.id} error:`, err)
    }
  }

  // Mark processed new items as not new
  db.prepare("UPDATE search_results SET is_new = 0 WHERE is_new = 1").run()

  return triggered
}

// Evaluate alerts immediately for a specific search (called from live search manager)
export async function evaluateAlertsForSearch(searchId: number, items: ParsedItem[]): Promise<number> {
  const db = getDb()
  let triggered = 0

  const search = db.prepare('SELECT game, league FROM saved_searches WHERE id = ?').get(searchId) as any
  if (!search) return 0

  const rules = db.prepare(
    'SELECT * FROM alert_rules WHERE search_id = ? AND is_active = 1'
  ).all(searchId) as any[]

  for (const rule of rules) {
    try {
      const conditions = JSON.parse(rule.conditions_json)

      // Check cooldown
      if (rule.last_triggered_at) {
        const cooldownMs = (rule.cooldown_min || 5) * 60 * 1000
        const lastTriggered = new Date(rule.last_triggered_at).getTime()
        if (Date.now() - lastTriggered < cooldownMs) continue
      }

      let shouldTrigger = false
      let message = ''

      switch (rule.rule_type) {
        case 'price_below': {
          const match = items.find(i => i.price && i.price.amount <= conditions.maxPrice)
          if (match) {
            shouldTrigger = true
            message = `Live: Item found below ${conditions.maxPrice} ${conditions.currency || 'chaos'} - ${match.name || match.typeLine}`
          }
          break
        }
        case 'new_listing': {
          if (items.length > 0) {
            shouldTrigger = true
            message = `Live: ${items.length} new listing(s) found for "${rule.name}"`
          }
          break
        }
      }

      if (shouldTrigger) {
        db.prepare(
          "INSERT INTO triggered_alerts (rule_id, game, message, details_json, trade_url, triggered_at) VALUES (?, ?, ?, ?, NULL, datetime('now'))"
        ).run(rule.id, search.game, message, JSON.stringify(conditions))
        db.prepare("UPDATE alert_rules SET last_triggered_at = datetime('now') WHERE id = ?").run(rule.id)
        triggered++
      }
    } catch (err) {
      console.error(`[Alerts] Live rule ${rule.id} error:`, err)
    }
  }

  return triggered
}
