import type { ParsedItem } from '@/lib/trade/types'
import type { PriceEstimate, CurrencyPrice } from '@/lib/economy/types'
import { getDb } from '@/lib/db'

export function estimatePrice(item: ParsedItem, game: string, league: string): PriceEstimate | null {
  const db = getDb()

  // For uniques, try direct lookup
  if (item.rarity === 'unique' && item.name) {
    const priceRow = db.prepare(
      'SELECT chaos_value, divine_value, listing_count FROM item_price_history WHERE game = ? AND league = ? AND item_name = ? ORDER BY captured_at DESC LIMIT 1'
    ).get(game, league, item.name) as { chaos_value: number; divine_value: number | null; listing_count: number } | undefined

    if (priceRow) {
      return {
        chaosValue: priceRow.chaos_value,
        divineValue: priceRow.divine_value,
        confidence: priceRow.listing_count > 10 ? 'high' : priceRow.listing_count > 3 ? 'medium' : 'low',
        source: game === 'poe1' ? 'poe.ninja' : 'poe2scout.com',
        comparables: priceRow.listing_count,
      }
    }
  }

  // For rares, use the listed price as a baseline
  if (item.price) {
    const chaosValue = convertToChaos(item.price.amount, item.price.currency, game, league)
    if (chaosValue !== null) {
      return {
        chaosValue,
        divineValue: null,
        confidence: 'low',
        source: 'listed price',
        comparables: 1,
      }
    }
  }

  return null
}

export function convertToChaos(amount: number, currency: string, game: string, league: string): number | null {
  if (currency === 'chaos' || currency === 'Chaos Orb') return amount

  const db = getDb()
  const rate = db.prepare(
    'SELECT chaos_equivalent FROM currency_rates_latest WHERE game = ? AND league = ? AND (currency_id = ? OR currency_label = ?)'
  ).get(game, league, currency, currency) as { chaos_equivalent: number } | undefined

  if (rate) return amount * rate.chaos_equivalent

  // Common defaults
  if (currency === 'divine' || currency === 'Divine Orb') return amount * 245
  if (currency === 'exalted' || currency === 'Exalted Orb') return amount * (game === 'poe2' ? 1 : 12)

  return null
}

export function isUnderpriced(item: ParsedItem, estimate: PriceEstimate): boolean {
  if (!item.price) return false
  const listedChaos = convertToChaos(item.price.amount, item.price.currency, 'poe1', 'Standard')
  if (listedChaos === null) return false
  return estimate.chaosValue / listedChaos > 1.3
}
