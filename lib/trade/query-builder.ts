import type { TradeQuery } from './types'

export interface SearchFilters {
  name?: string
  type?: string
  category?: string
  rarity?: string
  minPrice?: number
  maxPrice?: number
  priceCurrency?: string
  minIlvl?: number
  maxIlvl?: number
  minLinks?: number
  corrupted?: boolean | null
  indexed?: string
  stats?: Array<{
    id: string
    min?: number
    max?: number
  }>
  influences?: string[]
}

export function buildTradeQuery(filters: SearchFilters): TradeQuery {
  const query: TradeQuery = {
    query: {
      status: { option: 'online' },
      stats: [{ type: 'and', filters: [] }],
      filters: {},
    },
    sort: { price: 'asc' },
  }

  if (filters.name) query.query.name = filters.name
  if (filters.type) query.query.type = filters.type

  // Type filters
  if (filters.category || filters.rarity) {
    query.query.filters!.type_filters = {
      filters: {
        ...(filters.category && { category: { option: filters.category } }),
        ...(filters.rarity && { rarity: { option: filters.rarity } }),
      },
    }
  }

  // Trade filters (price, indexed)
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined || filters.indexed) {
    query.query.filters!.trade_filters = {
      filters: {
        ...(filters.minPrice !== undefined || filters.maxPrice !== undefined
          ? {
              price: {
                ...(filters.minPrice !== undefined && { min: filters.minPrice }),
                ...(filters.maxPrice !== undefined && { max: filters.maxPrice }),
                ...(filters.priceCurrency && { option: filters.priceCurrency }),
              },
            }
          : {}),
        ...(filters.indexed && { indexed: { option: filters.indexed } }),
      },
    }
  }

  // Socket filters
  if (filters.minLinks) {
    query.query.filters!.socket_filters = {
      filters: { links: { min: filters.minLinks } },
    }
  }

  // Misc filters
  if (filters.minIlvl !== undefined || filters.maxIlvl !== undefined || filters.corrupted !== undefined) {
    query.query.filters!.misc_filters = {
      filters: {
        ...(filters.minIlvl !== undefined || filters.maxIlvl !== undefined
          ? {
              ilvl: {
                ...(filters.minIlvl !== undefined && { min: filters.minIlvl }),
                ...(filters.maxIlvl !== undefined && { max: filters.maxIlvl }),
              },
            }
          : {}),
        ...(filters.corrupted !== null && filters.corrupted !== undefined
          ? { corrupted: { option: filters.corrupted ? 'true' : 'false' } }
          : {}),
      },
    }
  }

  // Stat filters
  if (filters.stats && filters.stats.length > 0) {
    query.query.stats = [
      {
        type: 'and',
        filters: filters.stats.map((s) => ({
          id: s.id,
          value: {
            ...(s.min !== undefined && { min: s.min }),
            ...(s.max !== undefined && { max: s.max }),
          },
          disabled: false,
        })),
      },
    ]
  }

  return query
}
