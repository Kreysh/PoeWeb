import { GameId } from '@/lib/constants/games'
import type { ItemStats } from './stats-parser'

export interface TradeQuery {
  query: {
    status?: { option: string }
    name?: string
    type?: string
    stats?: Array<{
      type: string
      filters: Array<{
        id: string
        value?: { min?: number; max?: number }
        disabled?: boolean
      }>
    }>
    filters?: {
      type_filters?: {
        filters: {
          category?: { option: string }
          rarity?: { option: string }
        }
      }
      trade_filters?: {
        filters: {
          price?: { min?: number; max?: number; option?: string }
          indexed?: { option?: string }
        }
      }
      socket_filters?: {
        filters: {
          links?: { min?: number; max?: number }
          sockets?: { min?: number; max?: number }
        }
      }
      req_filters?: {
        filters: {
          lvl?: { min?: number; max?: number }
        }
      }
      misc_filters?: {
        filters: {
          quality?: { min?: number; max?: number }
          ilvl?: { min?: number; max?: number }
          corrupted?: { option?: boolean | string }
          identified?: { option?: boolean | string }
          influenced?: { option?: string }
        }
      }
      map_filters?: {
        filters: {
          map_tier?: { min?: number; max?: number }
        }
      }
    }
  }
  sort?: { price: string }
}

export interface TradeSearchResponse {
  id: string
  complexity: number
  result: string[]
  total: number
}

export interface TradeItemListing {
  id: string
  listing: {
    method: string
    indexed: string
    stash?: { name: string; x: number; y: number }
    whisper: string
    whisper_token: string
    account: {
      name: string
      online?: { league: string; status?: string }
      lastCharacterName: string
      language: string
    }
    price?: {
      type: string
      amount: number
      currency: string
    }
  }
  item: {
    verified: boolean
    w: number
    h: number
    icon: string
    name: string
    typeLine: string
    baseType: string
    rarity: string
    ilvl: number
    category?: Record<string, string[]>
    identified: boolean
    corrupted?: boolean
    fractured?: boolean
    synthesised?: boolean
    influences?: Record<string, boolean>
    sockets?: Array<{ group: number; attr: string; sColour: string }>
    implicitMods?: string[]
    explicitMods?: string[]
    craftedMods?: string[]
    fracturedMods?: string[]
    enchantMods?: string[]
    properties?: Array<{ name: string; values: Array<[string, number]>; displayMode: number; type?: number }>
    requirements?: Array<{ name: string; values: Array<[string, number]>; displayMode: number }>
    extended?: {
      mods?: {
        explicit?: Array<{ name: string; tier: string; level: number; magnitudes: Array<{ hash: string; min: number; max: number }> }>
        implicit?: Array<{ name: string; tier: string; level: number; magnitudes: Array<{ hash: string; min: number; max: number }> }>
        crafted?: Array<{ name: string; tier: string; level: number; magnitudes: Array<{ hash: string; min: number; max: number }> }>
        fractured?: Array<{ name: string; tier: string; level: number; magnitudes: Array<{ hash: string; min: number; max: number }> }>
      }
      hashes?: {
        explicit?: Array<[string, string[]]>
        implicit?: Array<[string, string[]]>
        crafted?: Array<[string, string[]]>
      }
    }
  }
}

export interface TradeFetchResponse {
  result: TradeItemListing[]
}

export interface ParsedItem {
  id: string
  name: string
  typeLine: string
  baseType: string
  rarity: string
  ilvl: number
  icon: string
  corrupted: boolean
  fractured: boolean
  synthesised: boolean
  influences: string[]
  price: { amount: number; currency: string } | null
  seller: { account: string; character: string; online: boolean }
  whisper: string
  whisperToken: string
  indexedAt: string
  mods: ParsedMod[]
  properties: Array<{ name: string; values: string[] }>
  sockets: { total: number; links: number; colors: string }
  stats: ItemStats
}

export interface ParsedMod {
  text: string
  type: 'explicit' | 'implicit' | 'crafted' | 'fractured' | 'enchant'
  tier: string | null
  tierNum: number | null
  level: number | null
  magnitudes: Array<{ hash: string; min: number; max: number; current?: number }>
}

export interface SearchRequest {
  game: GameId
  league: string
  query: TradeQuery
}
