import type { CurrencyPrice, ItemPrice } from './types'

const POE2SCOUT_API = 'https://poe2scout.com/api'

export async function fetchPoe2Currency(league: string): Promise<CurrencyPrice[]> {
  try {
    const url = `${POE2SCOUT_API}/items?league=${encodeURIComponent(league)}&category=currency`

    const res = await fetch(url, {
      headers: { 'User-Agent': 'POETradeAnalyzer/1.0' },
    })

    if (!res.ok) throw new Error(`poe2scout currency fetch failed: ${res.status}`)

    const data = await res.json()
    const items = Array.isArray(data) ? data : data.items || data.data || []

    return items.map((item: any) => ({
      id: item.id || item.name?.toLowerCase().replace(/\s+/g, '-') || '',
      label: item.name || '',
      chaosEquivalent: item.price?.amount || item.chaosValue || item.value || 0,
      divineEquivalent: null,
      iconUrl: item.icon || item.iconUrl || null,
      change24h: item.change?.day || item.change24h || null,
    }))
  } catch (err) {
    console.error('poe2scout currency error:', err)
    return []
  }
}

export async function fetchPoe2Items(league: string, category: string): Promise<ItemPrice[]> {
  try {
    const url = `${POE2SCOUT_API}/items?league=${encodeURIComponent(league)}&category=${encodeURIComponent(category)}`

    const res = await fetch(url, {
      headers: { 'User-Agent': 'POETradeAnalyzer/1.0' },
    })

    if (!res.ok) throw new Error(`poe2scout item fetch failed: ${res.status}`)

    const data = await res.json()
    const items = Array.isArray(data) ? data : data.items || data.data || []

    return items.map((item: any) => ({
      id: item.id || String(Math.random()),
      name: item.name || '',
      type: category,
      chaosValue: item.price?.amount || item.chaosValue || item.value || 0,
      divineValue: null,
      listingCount: item.listings || item.listingCount || 0,
      iconUrl: item.icon || item.iconUrl || null,
      sparkline: item.sparkline || [],
      change24h: item.change?.day || item.change24h || null,
    }))
  } catch (err) {
    console.error('poe2scout items error:', err)
    return []
  }
}

// Fetch all poe2scout categories with delays
export async function fetchAllPoe2Categories(
  league: string,
  categories: string[]
): Promise<{ currencies: CurrencyPrice[]; items: Map<string, ItemPrice[]> }> {
  const currencies: CurrencyPrice[] = []
  const items = new Map<string, ItemPrice[]>()

  for (const cat of categories) {
    try {
      if (cat === 'currency') {
        const data = await fetchPoe2Currency(league)
        currencies.push(...data)
      } else {
        const data = await fetchPoe2Items(league, cat)
        items.set(cat, data)
      }
    } catch (err) {
      console.error(`[poe2scout] Failed to fetch ${cat}:`, err)
    }
    await new Promise(r => setTimeout(r, 1100))
  }

  return { currencies, items }
}
