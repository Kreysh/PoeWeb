import { getDb } from '@/lib/db'

// Aggregate item_price_history → item_price_daily
// Aggregate currency_rates → currency_rate_daily
export function aggregateDaily(): { itemRows: number; currencyRows: number } {
  const db = getDb()
  let itemRows = 0
  let currencyRows = 0

  const txn = db.transaction(() => {
    // Aggregate items: take today's history rows and compute avg/min/max
    const itemResult = db.prepare(`
      INSERT INTO item_price_daily (game, league, item_type, item_id, item_name, avg_chaos, min_chaos, max_chaos, avg_divine, avg_listing_count, sample_count, date)
      SELECT
        game, league, item_type, item_id, item_name,
        AVG(chaos_value), MIN(chaos_value), MAX(chaos_value),
        AVG(divine_value), AVG(listing_count),
        COUNT(*),
        date(captured_at)
      FROM item_price_history
      WHERE date(captured_at) = date('now', '-1 day')
      GROUP BY game, league, item_type, item_id, date(captured_at)
      ON CONFLICT(game, league, item_type, item_id, date) DO UPDATE SET
        avg_chaos = excluded.avg_chaos,
        min_chaos = excluded.min_chaos,
        max_chaos = excluded.max_chaos,
        avg_divine = excluded.avg_divine,
        avg_listing_count = excluded.avg_listing_count,
        sample_count = excluded.sample_count
    `).run()
    itemRows = itemResult.changes

    // Aggregate currency
    const currencyResult = db.prepare(`
      INSERT INTO currency_rate_daily (game, league, currency_id, currency_label, avg_chaos, min_chaos, max_chaos, sample_count, date)
      SELECT
        game, league, currency_id, currency_label,
        AVG(chaos_equivalent), MIN(chaos_equivalent), MAX(chaos_equivalent),
        COUNT(*),
        date(captured_at)
      FROM currency_rates
      WHERE date(captured_at) = date('now', '-1 day')
      GROUP BY game, league, currency_id, date(captured_at)
      ON CONFLICT(game, league, currency_id, date) DO UPDATE SET
        avg_chaos = excluded.avg_chaos,
        min_chaos = excluded.min_chaos,
        max_chaos = excluded.max_chaos,
        sample_count = excluded.sample_count
    `).run()
    currencyRows = currencyResult.changes
  })

  txn()
  console.log(`[Aggregation] Daily: ${itemRows} item rows, ${currencyRows} currency rows`)
  return { itemRows, currencyRows }
}

// Purge old data: history > 7 days, daily > 90 days
export function purgeOldData(): { historyDeleted: number; dailyDeleted: number; currencyHistoryDeleted: number; currencyDailyDeleted: number } {
  const db = getDb()

  const txn = db.transaction(() => {
    const h1 = db.prepare("DELETE FROM item_price_history WHERE captured_at < datetime('now', '-7 days')").run()
    const h2 = db.prepare("DELETE FROM currency_rates WHERE captured_at < datetime('now', '-7 days')").run()
    const d1 = db.prepare("DELETE FROM item_price_daily WHERE date < date('now', '-90 days')").run()
    const d2 = db.prepare("DELETE FROM currency_rate_daily WHERE date < date('now', '-90 days')").run()
    return { historyDeleted: h1.changes, currencyHistoryDeleted: h2.changes, dailyDeleted: d1.changes, currencyDailyDeleted: d2.changes }
  })

  const result = txn()
  console.log(`[Purge] Deleted: ${result.historyDeleted} item history, ${result.currencyHistoryDeleted} currency history, ${result.dailyDeleted} item daily, ${result.currencyDailyDeleted} currency daily`)
  return result
}
