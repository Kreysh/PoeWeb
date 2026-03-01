export type GameId = 'poe1' | 'poe2'

export interface GameConfig {
  id: GameId
  name: string
  shortName: string
  tradeBaseUrl: string
  tradeApiBase: string
  tradeSearchPath: string
  tradeFetchPath: string
  economySource: string
  economyUrl: string
  primaryCurrency: string
  secondaryCurrency: string
  currencyIcon: string
  defaultLeague: string
}

export const GAMES: Record<GameId, GameConfig> = {
  poe1: {
    id: 'poe1',
    name: 'Path of Exile',
    shortName: 'POE1',
    tradeBaseUrl: 'https://www.pathofexile.com/trade',
    tradeApiBase: 'https://www.pathofexile.com/api/trade',
    tradeSearchPath: '/search',
    tradeFetchPath: '/fetch',
    economySource: 'poe.ninja',
    economyUrl: 'https://poe.ninja',
    primaryCurrency: 'Divine Orb',
    secondaryCurrency: 'Chaos Orb',
    currencyIcon: '/images/divine.png',
    defaultLeague: 'Standard',
  },
  poe2: {
    id: 'poe2',
    name: 'Path of Exile 2',
    shortName: 'POE2',
    tradeBaseUrl: 'https://www.pathofexile.com/trade2',
    tradeApiBase: 'https://www.pathofexile.com/api/trade2',
    tradeSearchPath: '/search/poe2',
    tradeFetchPath: '/fetch',
    economySource: 'poe2scout.com',
    economyUrl: 'https://poe2scout.com',
    primaryCurrency: 'Exalted Orb',
    secondaryCurrency: 'Gold',
    currencyIcon: '/images/exalted.png',
    defaultLeague: 'Standard',
  },
}

export const ITEM_RARITIES = {
  normal: { label: 'Normal', color: '#c8c8c8' },
  magic: { label: 'Magic', color: '#8888ff' },
  rare: { label: 'Rare', color: '#ffff77' },
  unique: { label: 'Unique', color: '#af6025' },
  gem: { label: 'Gem', color: '#1ba29b' },
  currency: { label: 'Currency', color: '#aa9e82' },
  divination: { label: 'Divination Card', color: '#0ebaff' },
} as const

export const MOD_TIER_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  T1: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'T1' },
  T2: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'T2' },
  T3: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'T3' },
  T4: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'T4' },
  T5: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'T5+' },
  crafted: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', label: 'Crafted' },
  fractured: { bg: 'bg-yellow-500/20', text: 'text-yellow-300', label: 'Fractured' },
}

export const POE1_ITEM_CATEGORIES = [
  'weapon', 'weapon.one', 'weapon.two', 'weapon.bow', 'weapon.wand', 'weapon.sceptre',
  'armour', 'armour.helmet', 'armour.chest', 'armour.gloves', 'armour.boots', 'armour.shield',
  'accessory', 'accessory.ring', 'accessory.amulet', 'accessory.belt',
  'gem', 'gem.activegem', 'gem.supportgem',
  'jewel', 'flask', 'map', 'currency', 'card',
] as const

export const CURRENCY_ICONS: Record<string, string> = {
  chaos: 'https://web.poecdn.com/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvQ3VycmVuY3lSZXJvbGxSYXJlIiwidyI6MSwiaCI6MSwic2NhbGUiOjF9XQ/d119a0d734/CurrencyRerollRare.png',
  divine: 'https://web.poecdn.com/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvQ3VycmVuY3lNb2RWYWx1ZXMiLCJ3IjoxLCJoIjoxLCJzY2FsZSI6MX1d/e1a54ff97d/CurrencyModValues.png',
  exalted: 'https://web.poecdn.com/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvQ3VycmVuY3lBZGRNb2RUb1JhcmUiLCJ3IjoxLCJoIjoxLCJzY2FsZSI6MX1d/ba05c7ef1c/CurrencyAddModToRare.png',
  gold: 'https://web.poecdn.com/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvR29sZCIsInciOjEsImgiOjEsInNjYWxlIjoxfV0/2f515c57fd/Gold.png',
  mirror: 'https://web.poecdn.com/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvQ3VycmVuY3lEdXBsaWNhdGUiLCJ3IjoxLCJoIjoxLCJzY2FsZSI6MX1d/7111e35254/CurrencyDuplicate.png',
  alchemy: 'https://web.poecdn.com/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvQ3VycmVuY3lVcGdyYWRlVG9SYXJlIiwidyI6MSwiaCI6MSwic2NhbGUiOjF9XQ/3a5a5a3c8d/CurrencyUpgradeToRare.png',
  vaal: 'https://web.poecdn.com/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvQ3VycmVuY3lWYWFsT3JiIiwidyI6MSwiaCI6MSwic2NhbGUiOjF9XQ/227a37e8e5/CurrencyVaalOrb.png',
}

export const POE2_ITEM_CATEGORIES = [
  'weapon', 'weapon.one', 'weapon.two', 'weapon.bow', 'weapon.crossbow', 'weapon.staff',
  'armour', 'armour.helmet', 'armour.chest', 'armour.gloves', 'armour.boots', 'armour.shield',
  'accessory', 'accessory.ring', 'accessory.amulet', 'accessory.belt',
  'gem', 'jewel', 'flask', 'map', 'currency', 'rune',
] as const
