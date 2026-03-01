import type { CurrencyPrice, ItemPrice } from './types'
import { isCurrencyOverviewType } from './categories'

const POE_NINJA_API = 'https://poe.ninja/api/data'

export async function fetchCurrencyOverview(league: string, type: string = 'Currency'): Promise<CurrencyPrice[]> {
  const url = `${POE_NINJA_API}/currencyoverview?league=${encodeURIComponent(league)}&type=${encodeURIComponent(type)}`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'POETradeAnalyzer/1.0' },
  })

  if (!res.ok) throw new Error(`poe.ninja currency fetch failed: ${res.status}`)

  const data = await res.json()
  const lines = data.lines || []

  return lines.map((line: any) => ({
    id: line.currencyTypeName?.toLowerCase().replace(/\s+/g, '-') || '',
    label: line.currencyTypeName || '',
    chaosEquivalent: line.chaosEquivalent || 0,
    divineEquivalent: null,
    iconUrl: line.currencyIcon || data.currencyDetails?.find((d: any) => d.name === line.currencyTypeName)?.icon || null,
    change24h: line.receiveSparkLine?.totalChange || null,
  }))
}

export async function fetchItemOverview(league: string, type: string): Promise<ItemPrice[]> {
  const url = `${POE_NINJA_API}/itemoverview?league=${encodeURIComponent(league)}&type=${encodeURIComponent(type)}`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'POETradeAnalyzer/1.0' },
  })

  if (!res.ok) throw new Error(`poe.ninja item fetch failed: ${res.status}`)

  const data = await res.json()
  const lines = data.lines || []

  return lines.map((line: any) => ({
    id: String(line.id || ''),
    name: line.name || '',
    type: type,
    chaosValue: line.chaosValue || 0,
    divineValue: line.divineValue || null,
    listingCount: line.listingCount || 0,
    iconUrl: line.icon || null,
    sparkline: line.sparkline?.data || [],
    change24h: line.sparkline?.totalChange || null,
  }))
}

// Fetch all categories with rate-limit-safe delays
export async function fetchAllCategories(
  league: string,
  categories: string[]
): Promise<{ currencies: CurrencyPrice[]; items: Map<string, ItemPrice[]> }> {
  const currencies: CurrencyPrice[] = []
  const items = new Map<string, ItemPrice[]>()

  for (const cat of categories) {
    try {
      if (isCurrencyOverviewType(cat)) {
        const data = await fetchCurrencyOverview(league, cat)
        currencies.push(...data)
      } else {
        const data = await fetchItemOverview(league, cat)
        items.set(cat, data)
      }
    } catch (err) {
      console.error(`[poe.ninja] Failed to fetch ${cat}:`, err)
    }
    // 1.1s delay between requests to be nice to poe.ninja
    await new Promise(r => setTimeout(r, 1100))
  }

  return { currencies, items }
}
