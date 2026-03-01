import type { GameId } from '@/lib/constants/games'

// ── poe.ninja categories ──
export const POE_NINJA_CURRENCY_TYPES = ['Currency', 'Fragment'] as const
export const POE_NINJA_ITEM_TYPES = [
  'Oil', 'Incubator', 'Scarab', 'Fossil', 'Resonator',
  'Essence', 'DivinationCard', 'SkillGem', 'BaseType',
  'UniqueMap', 'Map', 'UniqueJewel', 'UniqueFlask',
  'UniqueWeapon', 'UniqueArmour', 'UniqueAccessory',
  'Beast', 'ClusterJewel', 'DeliriumOrb', 'Omen',
  'Memory', 'Tattoo', 'Vial',
] as const

export type PoeNinjaCurrencyType = (typeof POE_NINJA_CURRENCY_TYPES)[number]
export type PoeNinjaItemType = (typeof POE_NINJA_ITEM_TYPES)[number]
export type PoeNinjaType = PoeNinjaCurrencyType | PoeNinjaItemType

// ── poe2scout categories ──
export const POE2SCOUT_CATEGORIES = [
  'currency', 'unique-weapon', 'unique-armour', 'unique-accessory',
  'unique-jewel', 'unique-flask', 'skill-gem', 'rune',
] as const
export type Poe2ScoutCategory = (typeof POE2SCOUT_CATEGORIES)[number]

// ── UI category groups ──
export interface CategoryGroup {
  id: string
  label: string
  poe1Types: PoeNinjaType[]
  poe2Types: Poe2ScoutCategory[]
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: 'currency',
    label: 'Monedas y Fragmentos',
    poe1Types: ['Currency', 'Fragment'],
    poe2Types: ['currency'],
  },
  {
    id: 'crafting',
    label: 'Crafteo',
    poe1Types: ['Essence', 'Fossil', 'Resonator', 'Oil', 'Scarab', 'Incubator', 'DeliriumOrb', 'Vial', 'Tattoo'],
    poe2Types: ['rune'],
  },
  {
    id: 'uniques',
    label: 'Únicos',
    poe1Types: ['UniqueWeapon', 'UniqueArmour', 'UniqueAccessory', 'UniqueFlask', 'UniqueJewel', 'UniqueMap'],
    poe2Types: ['unique-weapon', 'unique-armour', 'unique-accessory', 'unique-jewel', 'unique-flask'],
  },
  {
    id: 'other',
    label: 'Otros',
    poe1Types: ['DivinationCard', 'SkillGem', 'Map', 'BaseType', 'Beast', 'ClusterJewel', 'Omen', 'Memory'],
    poe2Types: ['skill-gem'],
  },
]

// Get all types for a game
export function getAllTypesForGame(game: GameId): string[] {
  if (game === 'poe1') {
    return [...POE_NINJA_CURRENCY_TYPES, ...POE_NINJA_ITEM_TYPES]
  }
  return [...POE2SCOUT_CATEGORIES]
}

// Check if a poe.ninja type uses /currencyoverview (vs /itemoverview)
export function isCurrencyOverviewType(type: string): boolean {
  return (POE_NINJA_CURRENCY_TYPES as readonly string[]).includes(type)
}

// Map internal type names to display labels
export const TYPE_LABELS: Record<string, string> = {
  Currency: 'Monedas',
  Fragment: 'Fragmentos',
  Oil: 'Aceites',
  Incubator: 'Incubadoras',
  Scarab: 'Escarabajos',
  Fossil: 'Fósiles',
  Resonator: 'Resonadores',
  Essence: 'Esencias',
  DivinationCard: 'Cartas de Adivinación',
  SkillGem: 'Gemas de Habilidad',
  BaseType: 'Tipos Base',
  UniqueMap: 'Mapas Únicos',
  Map: 'Mapas',
  UniqueJewel: 'Joyas Únicas',
  UniqueFlask: 'Frascos Únicos',
  UniqueWeapon: 'Armas Únicas',
  UniqueArmour: 'Armaduras Únicas',
  UniqueAccessory: 'Accesorios Únicos',
  Beast: 'Bestias',
  ClusterJewel: 'Joyas de Clúster',
  DeliriumOrb: 'Orbes de Delirium',
  Omen: 'Presagios',
  Memory: 'Memorias',
  Tattoo: 'Tatuajes',
  Vial: 'Viales',
  // poe2scout
  currency: 'Monedas',
  'unique-weapon': 'Armas Únicas',
  'unique-armour': 'Armaduras Únicas',
  'unique-accessory': 'Accesorios Únicos',
  'unique-jewel': 'Joyas Únicas',
  'unique-flask': 'Frascos Únicos',
  'skill-gem': 'Gemas de Habilidad',
  rune: 'Runas',
}
