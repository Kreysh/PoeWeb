export interface CurrencyPrice {
  id: string
  label: string
  chaosEquivalent: number
  divineEquivalent: number | null
  iconUrl: string | null
  change24h: number | null
}

export interface ItemPrice {
  id: string
  name: string
  type: string
  chaosValue: number
  divineValue: number | null
  listingCount: number
  iconUrl: string | null
  sparkline: number[]
  change24h?: number | null
}

export interface PriceEstimate {
  chaosValue: number
  divineValue: number | null
  confidence: 'high' | 'medium' | 'low'
  source: string
  comparables: number
}

export interface PriceHistoryPoint {
  date: string
  chaosValue: number
  divineValue: number | null
  listingCount: number
}

// Extended types for the expanded economy
export interface ItemPriceLatest {
  id: number
  game: string
  league: string
  item_type: string
  item_id: string
  item_name: string
  chaos_value: number | null
  divine_value: number | null
  listing_count: number | null
  icon_url: string | null
  change_24h: number | null
  sparkline_json: string | null
  updated_at: string
}

export interface ItemPriceDaily {
  id: number
  game: string
  league: string
  item_type: string
  item_id: string
  item_name: string
  avg_chaos: number | null
  min_chaos: number | null
  max_chaos: number | null
  avg_divine: number | null
  avg_listing_count: number | null
  sample_count: number
  date: string
}

export interface AnalysisOpportunity {
  item_name: string
  item_type: string
  item_id: string
  icon_url: string | null
  current_price: number
  avg_7d: number
  pct_diff: number
  signal: 'buy' | 'sell' | 'stable' | 'volatile'
}
