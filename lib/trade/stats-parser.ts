import type { ParsedMod } from './types'

export interface ItemStats {
  category: string | null
  subcategory: string | null

  // Offensive (weapons)
  physicalDamage: { min: number; max: number } | null
  elementalDamage: Array<{ min: number; max: number }>
  chaosDamage: { min: number; max: number } | null
  attacksPerSecond: number | null
  criticalStrikeChance: number | null

  // Defensive (armour)
  armour: number | null
  evasionRating: number | null
  energyShield: number | null
  ward: number | null
  blockChance: number | null

  // Computed
  pDPS: number | null
  eDPS: number | null
  totalDPS: number | null
  totalDefense: number | null

  quality: number | null

  // Affix counts
  prefixCount: number
  suffixCount: number
  openPrefixes: number
  openSuffixes: number
  totalExplicitMods: number
}

function parseDamageRange(value: string): { min: number; max: number } | null {
  const match = value.match(/(\d+)-(\d+)/)
  if (!match) return null
  return { min: parseInt(match[1], 10), max: parseInt(match[2], 10) }
}

function parseNumeric(value: string): number | null {
  const cleaned = value.replace(/[,%+]/g, '').replace(/\s/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

function parseCategory(category: Record<string, string[]> | null | undefined): { category: string | null; subcategory: string | null } {
  if (!category || typeof category !== 'object') return { category: null, subcategory: null }

  const keys = Object.keys(category)
  if (keys.length === 0) return { category: null, subcategory: null }

  const key = keys[0]
  const values = category[key]
  const subcategory = Array.isArray(values) && values.length > 0 ? values[0] : null

  // Normalize category name
  let cat: string
  if (key === 'weapons') cat = 'weapon'
  else if (key === 'armour') cat = 'armour'
  else if (key === 'accessories') cat = 'accessory'
  else if (key === 'jewels') cat = 'jewel'
  else if (key === 'gems') cat = 'gem'
  else if (key === 'flasks') cat = 'flask'
  else if (key === 'maps') cat = 'map'
  else if (key === 'currency') cat = 'currency'
  else cat = key

  return { category: cat, subcategory }
}

export function parseItemStats(
  properties: Array<{ name: string; values: string[] }>,
  categoryObj: Record<string, string[]> | null | undefined,
  mods: ParsedMod[],
  rarity: string,
): ItemStats {
  const { category, subcategory } = parseCategory(categoryObj)

  let physicalDamage: { min: number; max: number } | null = null
  const elementalDamage: Array<{ min: number; max: number }> = []
  let chaosDamage: { min: number; max: number } | null = null
  let attacksPerSecond: number | null = null
  let criticalStrikeChance: number | null = null
  let armour: number | null = null
  let evasionRating: number | null = null
  let energyShield: number | null = null
  let ward: number | null = null
  let blockChance: number | null = null
  let quality: number | null = null

  for (const prop of properties) {
    const val = prop.values[0] || ''

    switch (prop.name) {
      case 'Physical Damage':
        physicalDamage = parseDamageRange(val)
        break
      case 'Elemental Damage': {
        // Can have multiple damage ranges separated by commas or in separate values
        const allVals = prop.values.join(', ')
        const matches = allVals.matchAll(/(\d+)-(\d+)/g)
        for (const m of matches) {
          elementalDamage.push({ min: parseInt(m[1], 10), max: parseInt(m[2], 10) })
        }
        break
      }
      case 'Chaos Damage':
        chaosDamage = parseDamageRange(val)
        break
      case 'Attacks per Second':
        attacksPerSecond = parseNumeric(val)
        break
      case 'Critical Strike Chance':
        criticalStrikeChance = parseNumeric(val)
        break
      case 'Armour':
        armour = parseNumeric(val)
        break
      case 'Evasion Rating':
        evasionRating = parseNumeric(val)
        break
      case 'Energy Shield':
        energyShield = parseNumeric(val)
        break
      case 'Ward':
        ward = parseNumeric(val)
        break
      case 'Chance to Block':
        blockChance = parseNumeric(val)
        break
      case 'Quality':
        quality = parseNumeric(val)
        break
    }
  }

  // Calculate DPS
  const aps = attacksPerSecond ?? 1
  let pDPS: number | null = null
  let eDPS: number | null = null
  let chaosDPS: number | null = null

  if (physicalDamage) {
    pDPS = Math.round(((physicalDamage.min + physicalDamage.max) / 2) * aps * 10) / 10
  }
  if (elementalDamage.length > 0) {
    const eleAvg = elementalDamage.reduce((sum, d) => sum + (d.min + d.max) / 2, 0)
    eDPS = Math.round(eleAvg * aps * 10) / 10
  }
  if (chaosDamage) {
    chaosDPS = Math.round(((chaosDamage.min + chaosDamage.max) / 2) * aps * 10) / 10
  }

  let totalDPS: number | null = null
  if (pDPS !== null || eDPS !== null || chaosDPS !== null) {
    totalDPS = (pDPS ?? 0) + (eDPS ?? 0) + (chaosDPS ?? 0)
    totalDPS = Math.round(totalDPS * 10) / 10
  }

  // Total defense
  let totalDefense: number | null = null
  if (armour !== null || evasionRating !== null || energyShield !== null) {
    totalDefense = (armour ?? 0) + (evasionRating ?? 0) + (energyShield ?? 0)
  }

  // Count affixes
  let prefixCount = 0
  let suffixCount = 0
  let totalExplicitMods = 0

  for (const mod of mods) {
    if (mod.type === 'explicit' || mod.type === 'crafted' || mod.type === 'fractured') {
      totalExplicitMods++
      if (mod.tier) {
        if (mod.tier.startsWith('P')) prefixCount++
        else if (mod.tier.startsWith('S')) suffixCount++
      }
    }
  }

  const isRare = rarity === 'rare'
  const openPrefixes = isRare ? Math.max(0, 3 - prefixCount) : 0
  const openSuffixes = isRare ? Math.max(0, 3 - suffixCount) : 0

  return {
    category, subcategory,
    physicalDamage, elementalDamage, chaosDamage,
    attacksPerSecond, criticalStrikeChance,
    armour, evasionRating, energyShield, ward, blockChance,
    pDPS, eDPS, totalDPS, totalDefense,
    quality,
    prefixCount, suffixCount, openPrefixes, openSuffixes, totalExplicitMods,
  }
}
