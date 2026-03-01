import { getDb } from '@/lib/db'
import { fetchAllCategories } from '@/lib/economy/poe-ninja'
import { fetchAllPoe2Categories } from '@/lib/economy/poe2scout'
import { POE_NINJA_CURRENCY_TYPES, POE_NINJA_ITEM_TYPES, POE2SCOUT_CATEGORIES } from '@/lib/economy/categories'
import type { GameId } from '@/lib/constants/games'

function getEnabledCategories(game: GameId): string[] {
  const db = getDb()
  try {
    const row = db.prepare('SELECT enabled_categories_json FROM economy_settings WHERE id = 1').get() as any
    if (row) {
      const parsed = JSON.parse(row.enabled_categories_json)
      if (Array.isArray(parsed) && parsed.includes('all')) {
        if (game === 'poe1') return [...POE_NINJA_CURRENCY_TYPES, ...POE_NINJA_ITEM_TYPES]
        return [...POE2SCOUT_CATEGORIES]
      }
      return parsed
    }
  } catch { /* use defaults */ }
  if (game === 'poe1') return [...POE_NINJA_CURRENCY_TYPES, ...POE_NINJA_ITEM_TYPES]
  return [...POE2SCOUT_CATEGORIES]
}

export async function updateEconomy(game: GameId, league: string): Promise<{ currencies: number; items: number }> {
  const db = getDb()
  let currencyCount = 0
  let itemCount = 0

  try {
    const categories = getEnabledCategories(game)

    if (game === 'poe1') {
      const { currencies, items } = await fetchAllCategories(league, categories)

      const txn = db.transaction(() => {
        // Upsert currencies
        const upsertCurrency = db.prepare(`
          INSERT INTO currency_rates_latest (game, league, currency_id, currency_label, chaos_equivalent, divine_equivalent, icon_url, change_24h, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(game, league, currency_id) DO UPDATE SET
            chaos_equivalent = excluded.chaos_equivalent,
            change_24h = excluded.change_24h,
            icon_url = excluded.icon_url,
            updated_at = datetime('now')
        `)
        const insertCurrencyHistory = db.prepare(
          "INSERT INTO currency_rates (game, league, currency_id, currency_label, chaos_equivalent, divine_equivalent, icon_url, captured_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))"
        )

        for (const c of currencies) {
          upsertCurrency.run(game, league, c.id, c.label, c.chaosEquivalent, c.divineEquivalent, c.iconUrl, c.change24h)
          insertCurrencyHistory.run(game, league, c.id, c.label, c.chaosEquivalent, c.divineEquivalent, c.iconUrl)
          currencyCount++
        }

        // Upsert items
        const upsertItem = db.prepare(`
          INSERT INTO item_prices_latest (game, league, item_type, item_id, item_name, chaos_value, divine_value, listing_count, icon_url, change_24h, sparkline_json, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(game, league, item_type, item_id) DO UPDATE SET
            item_name = excluded.item_name,
            chaos_value = excluded.chaos_value,
            divine_value = excluded.divine_value,
            listing_count = excluded.listing_count,
            icon_url = excluded.icon_url,
            change_24h = excluded.change_24h,
            sparkline_json = excluded.sparkline_json,
            updated_at = datetime('now')
        `)
        const insertItemHistory = db.prepare(
          "INSERT INTO item_price_history (game, league, item_type, item_id, item_name, chaos_value, divine_value, listing_count, icon_url, captured_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))"
        )

        for (const [type, typeItems] of items) {
          for (const item of typeItems) {
            const sparkJson = item.sparkline.length > 0 ? JSON.stringify(item.sparkline) : null
            upsertItem.run(game, league, type, item.id, item.name, item.chaosValue, item.divineValue, item.listingCount, item.iconUrl, item.change24h ?? null, sparkJson)
            insertItemHistory.run(game, league, type, item.id, item.name, item.chaosValue, item.divineValue, item.listingCount, item.iconUrl)
            itemCount++
          }
        }
      })

      txn()
    } else {
      // POE2
      const { currencies, items } = await fetchAllPoe2Categories(league, categories)

      const txn = db.transaction(() => {
        const upsertCurrency = db.prepare(`
          INSERT INTO currency_rates_latest (game, league, currency_id, currency_label, chaos_equivalent, divine_equivalent, icon_url, change_24h, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(game, league, currency_id) DO UPDATE SET
            chaos_equivalent = excluded.chaos_equivalent,
            change_24h = excluded.change_24h,
            icon_url = excluded.icon_url,
            updated_at = datetime('now')
        `)
        const insertCurrencyHistory = db.prepare(
          "INSERT INTO currency_rates (game, league, currency_id, currency_label, chaos_equivalent, divine_equivalent, icon_url, captured_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))"
        )

        for (const c of currencies) {
          upsertCurrency.run(game, league, c.id, c.label, c.chaosEquivalent, c.divineEquivalent, c.iconUrl, c.change24h)
          insertCurrencyHistory.run(game, league, c.id, c.label, c.chaosEquivalent, c.divineEquivalent, c.iconUrl)
          currencyCount++
        }

        const upsertItem = db.prepare(`
          INSERT INTO item_prices_latest (game, league, item_type, item_id, item_name, chaos_value, divine_value, listing_count, icon_url, change_24h, sparkline_json, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(game, league, item_type, item_id) DO UPDATE SET
            item_name = excluded.item_name,
            chaos_value = excluded.chaos_value,
            divine_value = excluded.divine_value,
            listing_count = excluded.listing_count,
            icon_url = excluded.icon_url,
            change_24h = excluded.change_24h,
            sparkline_json = excluded.sparkline_json,
            updated_at = datetime('now')
        `)
        const insertItemHistory = db.prepare(
          "INSERT INTO item_price_history (game, league, item_type, item_id, item_name, chaos_value, divine_value, listing_count, icon_url, captured_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))"
        )

        for (const [type, typeItems] of items) {
          for (const item of typeItems) {
            const sparkJson = item.sparkline.length > 0 ? JSON.stringify(item.sparkline) : null
            upsertItem.run(game, league, type, item.id, item.name, item.chaosValue, item.divineValue, item.listingCount, item.iconUrl, item.change24h ?? null, sparkJson)
            insertItemHistory.run(game, league, type, item.id, item.name, item.chaosValue, item.divineValue, item.listingCount, item.iconUrl)
            itemCount++
          }
        }
      })

      txn()
    }
  } catch (err) {
    console.error('[Economy] Update error:', err)
  }

  return { currencies: currencyCount, items: itemCount }
}
