import type { ParsedItem, ParsedMod } from './types'
import { scoreItem, type ScoreResult } from '@/lib/scoring/engine'

// --- Types ---

export interface PriceSummary {
  avg: number
  median: number
  min: number
  max: number
  stdDev: number
  currency: string
  totalPriced: number
}

export interface PriceBucket {
  label: string
  min: number
  max: number
  count: number
}

export interface ModFrequency {
  modText: string
  count: number
  percentage: number
  avgTierNum: number | null
  avgPriceOfItems: number | null
  types: string[]
}

export interface ModCombo {
  mods: string[]
  count: number
  avgPrice: number | null
  minPrice: number | null
  maxPrice: number | null
  items: Array<{ name: string; price: number | null; currency: string | null }>
}

export interface MultiModComboGroup {
  size: number
  combos: ModCombo[]
}

export interface RarityBreakdown {
  rarity: string
  count: number
  percentage: number
  avgPrice: number | null
}

export interface BaseTypeBreakdown {
  baseType: string
  count: number
  avgPrice: number | null
  avgIlvl: number
}

export interface TopItem {
  id: string
  name: string
  typeLine: string
  baseType: string
  rarity: string
  ilvl: number
  icon: string
  price: { amount: number; currency: string }
  mods: ParsedMod[]
  corrupted: boolean
  influences: string[]
  totalDPS: number | null
  pDPS: number | null
  eDPS: number | null
  armour: number | null
  evasionRating: number | null
  energyShield: number | null
  totalScore: number
  grade: string
  openPrefixes: number
  openSuffixes: number
  indexedAt: string
  whisper: string
  whisperToken: string
}

export interface DPSSummary {
  avgPDPS: number
  avgEDPS: number
  avgTotalDPS: number
  maxTotalDPS: number
  dpsDistribution: Array<{ range: string; count: number }>
  topDPSItems: Array<{
    name: string; typeLine: string; baseType: string
    pDPS: number; eDPS: number; totalDPS: number
    price: number | null; currency: string | null
    icon: string
  }>
}

export interface DefenseSummary {
  avgArmour: number | null
  avgEvasion: number | null
  avgES: number | null
  maxArmour: number | null
  maxEvasion: number | null
  maxES: number | null
  avgTotalDefense: number
}

export interface OpportunityItem {
  id: string; name: string; typeLine: string; baseType: string
  rarity: string; ilvl: number; icon: string
  price: { amount: number; currency: string }
  mods: ParsedMod[]
  corrupted: boolean; influences: string[]
  totalScore: number; grade: string
  totalDPS: number | null; pDPS: number | null; eDPS: number | null
  armour: number | null; evasionRating: number | null; energyShield: number | null
  openPrefixes: number; openSuffixes: number
  valueRatio: number
  pricePercentile: number
  scorePercentile: number
  reasons: string[]
  indexedAt: string
  whisper: string
  whisperToken: string
  estimatedValue: number | null
  freshness: 'fresh' | 'recent' | 'stale'
  scoreBreakdown: { modTierScore: number; rollQualityScore: number; synergyScore: number }
}

export interface AnalysisResult {
  priceSummary: PriceSummary
  priceDistribution: PriceBucket[]
  modFrequency: ModFrequency[]
  mostValuableMods: ModFrequency[]
  multiModCombos: MultiModComboGroup[]
  rarityBreakdown: RarityBreakdown[]
  baseTypeBreakdown: BaseTypeBreakdown[]
  topItems: TopItem[]
  dpsStats: DPSSummary | null
  defenseStats: DefenseSummary | null
  opportunities: OpportunityItem[]
  totalItems: number
  totalInSearch: number
}

// --- Helpers ---

function medianOf(arr: number[]): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function stdDev(arr: number[], mean: number): number {
  if (arr.length < 2) return 0
  const squaredDiffs = arr.map(v => (v - mean) ** 2)
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / (arr.length - 1))
}

function normalizeMod(text: string): string {
  return text.replace(/[+-]?\d+(\.\d+)?/g, '#').trim()
}

function percentileOf(value: number, sortedArr: number[]): number {
  if (sortedArr.length === 0) return 50
  let count = 0
  for (const v of sortedArr) {
    if (v < value) count++
    else break
  }
  return Math.round((count / sortedArr.length) * 100)
}

function generateCombinations(arr: string[], k: number): string[][] {
  if (k > arr.length || k <= 0) return []
  if (k === arr.length) return [arr]
  if (k === 1) return arr.map(x => [x])

  const result: string[][] = []
  const indices = Array.from({ length: k }, (_, i) => i)

  while (true) {
    result.push(indices.map(i => arr[i]))
    let i = k - 1
    while (i >= 0 && indices[i] === arr.length - k + i) i--
    if (i < 0) break
    indices[i]++
    for (let j = i + 1; j < k; j++) indices[j] = indices[j - 1] + 1
  }

  return result
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function computeFreshness(indexedAt: string): 'fresh' | 'recent' | 'stale' {
  const hours = (Date.now() - new Date(indexedAt).getTime()) / 3600000
  if (hours < 6) return 'fresh'
  if (hours < 72) return 'recent'
  return 'stale'
}

// --- Analyzer ---

export function analyzeItems(items: ParsedItem[], totalInSearch: number): AnalysisResult {
  // Determine dominant currency
  const currencyCounts: Record<string, number> = {}
  items.forEach(item => {
    if (item.price) {
      currencyCounts[item.price.currency] = (currencyCounts[item.price.currency] || 0) + 1
    }
  })
  const dominantCurrency = Object.entries(currencyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'chaos'

  // Filter to items with price in dominant currency for price stats
  const pricedItems = items.filter(i => i.price && i.price.currency === dominantCurrency)
  const prices = pricedItems.map(i => i.price!.amount)

  // --- Price Summary ---
  const avg = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0
  const priceSummary: PriceSummary = {
    avg: round2(avg),
    median: round2(medianOf(prices)),
    min: prices.length > 0 ? Math.min(...prices) : 0,
    max: prices.length > 0 ? Math.max(...prices) : 0,
    stdDev: round2(stdDev(prices, avg)),
    currency: dominantCurrency,
    totalPriced: pricedItems.length,
  }

  // --- Price Distribution ---
  const priceDistribution = buildPriceDistribution(prices)

  // --- Mod Frequency ---
  const modMap = new Map<string, { count: number; tierNums: number[]; prices: number[]; types: Set<string> }>()

  items.forEach(item => {
    const itemPrice = item.price?.currency === dominantCurrency ? item.price.amount : null
    const seenMods = new Set<string>()

    item.mods.forEach(mod => {
      if (mod.type === 'enchant') return
      const normalized = normalizeMod(mod.text)
      if (seenMods.has(normalized)) return
      seenMods.add(normalized)

      if (!modMap.has(normalized)) {
        modMap.set(normalized, { count: 0, tierNums: [], prices: [], types: new Set() })
      }
      const entry = modMap.get(normalized)!
      entry.count++
      if (mod.tierNum !== null) entry.tierNums.push(mod.tierNum)
      if (itemPrice !== null) entry.prices.push(itemPrice)
      entry.types.add(mod.type)
    })
  })

  const modFrequency: ModFrequency[] = Array.from(modMap.entries())
    .map(([modText, data]) => ({
      modText,
      count: data.count,
      percentage: round2((data.count / items.length) * 100),
      avgTierNum: data.tierNums.length > 0
        ? Math.round((data.tierNums.reduce((a, b) => a + b, 0) / data.tierNums.length) * 10) / 10
        : null,
      avgPriceOfItems: data.prices.length > 0
        ? round2(data.prices.reduce((a, b) => a + b, 0) / data.prices.length)
        : null,
      types: Array.from(data.types),
    }))
    .sort((a, b) => b.count - a.count)

  // --- Multi-Mod Combos (sizes 2-6, item-centric two-pass) ---
  const itemModsCache: string[][] = items.map(item =>
    Array.from(new Set(
      item.mods
        .filter(m => m.type !== 'enchant')
        .map(m => normalizeMod(m.text))
    )).sort()
  )

  const multiModCombos: MultiModComboGroup[] = []

  for (let k = 2; k <= 6; k++) {
    // Pass 1: count frequencies
    const countMap = new Map<string, number>()

    for (const itemMods of itemModsCache) {
      if (itemMods.length < k) continue
      const combos = generateCombinations(itemMods, k)
      for (const combo of combos) {
        const key = combo.join('|||')
        countMap.set(key, (countMap.get(key) || 0) + 1)
      }
    }

    // Filter to combos appearing >= 2 times
    const frequentKeys = new Set<string>()
    for (const [key, count] of countMap) {
      if (count >= 2) frequentKeys.add(key)
    }

    if (frequentKeys.size === 0) {
      multiModCombos.push({ size: k, combos: [] })
      continue
    }

    // Pass 2: collect data for frequent combos only
    const comboData = new Map<string, { mods: string[]; count: number; prices: number[]; items: Array<{ name: string; price: number | null; currency: string | null }> }>()

    items.forEach((item, idx) => {
      const itemMods = itemModsCache[idx]
      if (itemMods.length < k) return
      const itemPrice = item.price?.currency === dominantCurrency ? item.price.amount : null
      const itemLabel = (item.name || item.typeLine).slice(0, 50)

      const combos = generateCombinations(itemMods, k)
      for (const combo of combos) {
        const key = combo.join('|||')
        if (!frequentKeys.has(key)) continue

        if (!comboData.has(key)) {
          comboData.set(key, { mods: combo, count: 0, prices: [], items: [] })
        }
        const entry = comboData.get(key)!
        entry.count++
        if (itemPrice !== null) entry.prices.push(itemPrice)
        if (entry.items.length < 3) {
          entry.items.push({ name: itemLabel, price: item.price?.amount ?? null, currency: item.price?.currency ?? null })
        }
      }
    })

    const combos: ModCombo[] = Array.from(comboData.values())
      .map(c => ({
        mods: c.mods,
        count: c.count,
        avgPrice: c.prices.length > 0 ? round2(c.prices.reduce((a, b) => a + b, 0) / c.prices.length) : null,
        minPrice: c.prices.length > 0 ? Math.min(...c.prices) : null,
        maxPrice: c.prices.length > 0 ? Math.max(...c.prices) : null,
        items: c.items,
      }))
      .sort((a, b) => (b.avgPrice || 0) - (a.avgPrice || 0))
      .slice(0, 10)

    multiModCombos.push({ size: k, combos })
  }

  // --- Rarity Breakdown ---
  const rarityMap = new Map<string, { count: number; prices: number[] }>()
  items.forEach(item => {
    const r = item.rarity || 'unknown'
    if (!rarityMap.has(r)) rarityMap.set(r, { count: 0, prices: [] })
    const entry = rarityMap.get(r)!
    entry.count++
    if (item.price?.currency === dominantCurrency) entry.prices.push(item.price.amount)
  })

  const rarityBreakdown: RarityBreakdown[] = Array.from(rarityMap.entries())
    .map(([rarity, data]) => ({
      rarity,
      count: data.count,
      percentage: round2((data.count / items.length) * 100),
      avgPrice: data.prices.length > 0
        ? round2(data.prices.reduce((a, b) => a + b, 0) / data.prices.length)
        : null,
    }))
    .sort((a, b) => b.count - a.count)

  // --- Base Type Breakdown ---
  const baseMap = new Map<string, { count: number; prices: number[]; ilvls: number[] }>()
  items.forEach(item => {
    const bt = item.baseType || item.typeLine || 'Unknown'
    if (!baseMap.has(bt)) baseMap.set(bt, { count: 0, prices: [], ilvls: [] })
    const entry = baseMap.get(bt)!
    entry.count++
    if (item.price?.currency === dominantCurrency) entry.prices.push(item.price.amount)
    if (item.ilvl) entry.ilvls.push(item.ilvl)
  })

  const baseTypeBreakdown: BaseTypeBreakdown[] = Array.from(baseMap.entries())
    .map(([baseType, data]) => ({
      baseType,
      count: data.count,
      avgPrice: data.prices.length > 0
        ? round2(data.prices.reduce((a, b) => a + b, 0) / data.prices.length)
        : null,
      avgIlvl: data.ilvls.length > 0
        ? Math.round(data.ilvls.reduce((a, b) => a + b, 0) / data.ilvls.length)
        : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)

  // --- Score all items ---
  const itemScores = new Map<string, ScoreResult>()
  for (const item of items) {
    itemScores.set(item.id, scoreItem(item))
  }

  // --- Top Items (most expensive, enhanced) ---
  const topItems: TopItem[] = items
    .filter(i => i.price)
    .sort((a, b) => (b.price?.amount || 0) - (a.price?.amount || 0))
    .slice(0, 5)
    .map(i => {
      const score = itemScores.get(i.id)!
      return {
        id: i.id,
        name: i.name,
        typeLine: i.typeLine,
        baseType: i.baseType,
        rarity: i.rarity,
        ilvl: i.ilvl,
        icon: i.icon,
        price: i.price!,
        mods: i.mods,
        corrupted: i.corrupted,
        influences: i.influences,
        totalDPS: i.stats.totalDPS,
        pDPS: i.stats.pDPS,
        eDPS: i.stats.eDPS,
        armour: i.stats.armour,
        evasionRating: i.stats.evasionRating,
        energyShield: i.stats.energyShield,
        totalScore: score.totalScore,
        grade: score.grade,
        openPrefixes: i.stats.openPrefixes,
        openSuffixes: i.stats.openSuffixes,
        indexedAt: i.indexedAt,
        whisper: i.whisper,
        whisperToken: i.whisperToken,
      }
    })

  // --- DPS Stats ---
  const dpsItems = items.filter(i => i.stats.pDPS !== null || i.stats.eDPS !== null)
  let dpsStats: DPSSummary | null = null
  if (dpsItems.length >= 3) {
    const pDPSValues = dpsItems.map(i => i.stats.pDPS ?? 0)
    const eDPSValues = dpsItems.map(i => i.stats.eDPS ?? 0)
    const totalDPSValues = dpsItems.map(i => i.stats.totalDPS ?? 0)

    const avgPDPS = round2(pDPSValues.reduce((a, b) => a + b, 0) / pDPSValues.length)
    const avgEDPS = round2(eDPSValues.reduce((a, b) => a + b, 0) / eDPSValues.length)
    const avgTotalDPS = round2(totalDPSValues.reduce((a, b) => a + b, 0) / totalDPSValues.length)
    const maxTotalDPS = Math.max(...totalDPSValues)

    // DPS distribution buckets
    const dpsDistribution = buildDPSDistribution(totalDPSValues)

    // Top 5 DPS items
    const topDPSItems = [...dpsItems]
      .sort((a, b) => (b.stats.totalDPS ?? 0) - (a.stats.totalDPS ?? 0))
      .slice(0, 5)
      .map(i => ({
        name: i.name || i.typeLine,
        typeLine: i.typeLine,
        baseType: i.baseType,
        pDPS: i.stats.pDPS ?? 0,
        eDPS: i.stats.eDPS ?? 0,
        totalDPS: i.stats.totalDPS ?? 0,
        price: i.price?.amount ?? null,
        currency: i.price?.currency ?? null,
        icon: i.icon,
      }))

    dpsStats = { avgPDPS, avgEDPS, avgTotalDPS, maxTotalDPS, dpsDistribution, topDPSItems }
  }

  // --- Defense Stats ---
  const defItems = items.filter(i => i.stats.armour !== null || i.stats.evasionRating !== null || i.stats.energyShield !== null)
  let defenseStats: DefenseSummary | null = null
  if (defItems.length >= 3) {
    const armourVals = defItems.filter(i => i.stats.armour !== null).map(i => i.stats.armour!)
    const evasionVals = defItems.filter(i => i.stats.evasionRating !== null).map(i => i.stats.evasionRating!)
    const esVals = defItems.filter(i => i.stats.energyShield !== null).map(i => i.stats.energyShield!)
    const totalDefVals = defItems.map(i => i.stats.totalDefense ?? 0)

    defenseStats = {
      avgArmour: armourVals.length > 0 ? Math.round(armourVals.reduce((a, b) => a + b, 0) / armourVals.length) : null,
      avgEvasion: evasionVals.length > 0 ? Math.round(evasionVals.reduce((a, b) => a + b, 0) / evasionVals.length) : null,
      avgES: esVals.length > 0 ? Math.round(esVals.reduce((a, b) => a + b, 0) / esVals.length) : null,
      maxArmour: armourVals.length > 0 ? Math.max(...armourVals) : null,
      maxEvasion: evasionVals.length > 0 ? Math.max(...evasionVals) : null,
      maxES: esVals.length > 0 ? Math.max(...esVals) : null,
      avgTotalDefense: totalDefVals.length > 0 ? Math.round(totalDefVals.reduce((a, b) => a + b, 0) / totalDefVals.length) : 0,
    }
  }

  // --- Most Valuable Mods ---
  const mostValuableMods: ModFrequency[] = modFrequency
    .filter(m => m.count >= 2 && m.avgPriceOfItems !== null)
    .sort((a, b) => (b.avgPriceOfItems || 0) - (a.avgPriceOfItems || 0))
    .slice(0, 15)

  // --- Opportunities ---
  const opportunities = detectOpportunities(items, pricedItems, dominantCurrency, itemScores, prices, modFrequency)

  return {
    priceSummary,
    priceDistribution,
    modFrequency: modFrequency.slice(0, 30),
    mostValuableMods,
    multiModCombos,
    rarityBreakdown,
    baseTypeBreakdown,
    topItems,
    dpsStats,
    defenseStats,
    opportunities,
    totalItems: items.length,
    totalInSearch: totalInSearch,
  }
}

// --- Opportunity Detection ---

function estimateItemValue(
  item: ParsedItem,
  allItems: ParsedItem[],
  dominantCurrency: string,
  modFrequencyData: ModFrequency[],
): { estimatedValue: number | null; similarCount: number } {
  // Get normalized mods for this item
  const itemNormMods = new Set(
    item.mods.filter(m => m.type !== 'enchant').map(m => normalizeMod(m.text))
  )
  if (itemNormMods.size === 0) return { estimatedValue: null, similarCount: 0 }

  // Find items sharing >= 50% of the same mods
  const threshold = Math.ceil(itemNormMods.size * 0.5)
  const similarPrices: number[] = []

  for (const other of allItems) {
    if (other.id === item.id) continue
    if (!other.price || other.price.currency !== dominantCurrency) continue
    const otherMods = new Set(
      other.mods.filter(m => m.type !== 'enchant').map(m => normalizeMod(m.text))
    )
    let shared = 0
    for (const mod of itemNormMods) {
      if (otherMods.has(mod)) shared++
    }
    if (shared >= threshold) {
      similarPrices.push(other.price.amount)
    }
  }

  if (similarPrices.length >= 3) {
    return { estimatedValue: round2(medianOf(similarPrices)), similarCount: similarPrices.length }
  }

  // Fallback: average of avgPriceOfItems for individual mods
  const modPrices: number[] = []
  for (const mod of itemNormMods) {
    const mf = modFrequencyData.find(m => m.modText === mod)
    if (mf && mf.avgPriceOfItems !== null) modPrices.push(mf.avgPriceOfItems)
  }
  if (modPrices.length > 0) {
    return {
      estimatedValue: round2(modPrices.reduce((a, b) => a + b, 0) / modPrices.length),
      similarCount: 0,
    }
  }

  return { estimatedValue: null, similarCount: 0 }
}

function detectOpportunities(
  items: ParsedItem[],
  pricedItems: ParsedItem[],
  dominantCurrency: string,
  itemScores: Map<string, ScoreResult>,
  prices: number[],
  modFrequencyData: ModFrequency[],
): OpportunityItem[] {
  if (pricedItems.length < 5) return []

  const sortedPrices = [...prices].sort((a, b) => a - b)
  const medianPrice = medianOf(sortedPrices)

  const scores = pricedItems.map(i => itemScores.get(i.id)!.totalScore)
  const sortedScores = [...scores].sort((a, b) => a - b)

  // DPS values for weapon opportunity detection
  const dpsValues = pricedItems
    .filter(i => i.stats.totalDPS !== null)
    .map(i => i.stats.totalDPS!)
  const sortedDPS = [...dpsValues].sort((a, b) => a - b)

  // Value ratios
  const valueRatios: Array<{ item: ParsedItem; ratio: number }> = []
  for (const item of pricedItems) {
    const score = itemScores.get(item.id)!
    if (item.price!.amount > 0) {
      valueRatios.push({ item, ratio: score.totalScore / item.price!.amount })
    }
  }
  const medianValueRatio = medianOf(valueRatios.map(v => v.ratio))

  const opportunities: OpportunityItem[] = []

  for (const item of pricedItems) {
    if (item.price!.currency !== dominantCurrency) continue
    const price = item.price!.amount
    if (price <= 0) continue

    const score = itemScores.get(item.id)!
    const pricePercentile = percentileOf(price, sortedPrices)
    const scorePercentile = percentileOf(score.totalScore, sortedScores)
    const valueRatio = score.totalScore / price
    const freshness = computeFreshness(item.indexedAt)

    const reasons: string[] = []

    // 1. High score, low price
    if (scorePercentile >= 70 && pricePercentile <= 30) {
      reasons.push(`Score ${score.totalScore}: ${score.modTierScore} tier + ${score.rollQualityScore} rolls + ${score.synergyScore} sinergias = Grade ${score.grade}`)
    }

    // 2. Multiple T1/T2 mods below median price
    const highTierMods = item.mods.filter(m =>
      (m.type === 'explicit' || m.type === 'fractured') && m.tierNum !== null && m.tierNum <= 2
    )
    if (highTierMods.length >= 2 && price < medianPrice) {
      reasons.push(`${highTierMods.length} mods T1/T2`)
    }

    // 3. High DPS, low price (weapons)
    if (item.stats.totalDPS !== null && sortedDPS.length >= 4) {
      const dpsPercentile = percentileOf(item.stats.totalDPS, sortedDPS)
      if (dpsPercentile >= 75 && pricePercentile <= 25) {
        reasons.push(`DPS top ${100 - dpsPercentile}% (${item.stats.pDPS ?? 0} pDPS)`)
      }
    }

    // 4. Open affixes + good score
    const totalOpen = item.stats.openPrefixes + item.stats.openSuffixes
    if (totalOpen >= 2 && scorePercentile >= 60 && pricePercentile <= 40) {
      reasons.push(`${item.stats.openPrefixes}P/${item.stats.openSuffixes}S abiertos — potencial de craft`)
    }

    // 5. Value ratio outlier
    if (medianValueRatio > 0 && valueRatio >= medianValueRatio * 2 && reasons.length === 0) {
      reasons.push(`Value ratio ${round2(valueRatio)} (${round2(medianValueRatio * 2)}x mediana)`)
    }

    if (reasons.length > 0) {
      // Compute estimated value
      const { estimatedValue, similarCount } = estimateItemValue(item, items, dominantCurrency, modFrequencyData)

      // Add price vs estimated value reason
      if (estimatedValue !== null && estimatedValue > price * 1.2) {
        const pctOfMedian = Math.round((price / estimatedValue) * 100)
        if (similarCount >= 3) {
          reasons.push(`Valor estimado: ${estimatedValue} basado en ${similarCount} items similares — listado a ${price}`)
        }
        reasons.push(`Precio ${price} vs estimado ${estimatedValue} (${pctOfMedian}% del estimado)`)
      }

      // Add freshness reason
      if (freshness === 'fresh') {
        reasons.push(`Oportunidad fresca (listado recientemente)`)
      } else if (freshness === 'stale') {
        reasons.push(`Listado hace varios días — posiblemente vendido o con problemas no evidentes`)
      }

      opportunities.push({
        id: item.id,
        name: item.name,
        typeLine: item.typeLine,
        baseType: item.baseType,
        rarity: item.rarity,
        ilvl: item.ilvl,
        icon: item.icon,
        price: item.price!,
        mods: item.mods,
        corrupted: item.corrupted,
        influences: item.influences,
        totalScore: score.totalScore,
        grade: score.grade,
        totalDPS: item.stats.totalDPS,
        pDPS: item.stats.pDPS,
        eDPS: item.stats.eDPS,
        armour: item.stats.armour,
        evasionRating: item.stats.evasionRating,
        energyShield: item.stats.energyShield,
        openPrefixes: item.stats.openPrefixes,
        openSuffixes: item.stats.openSuffixes,
        valueRatio: round2(valueRatio),
        pricePercentile,
        scorePercentile,
        reasons,
        indexedAt: item.indexedAt,
        whisper: item.whisper,
        whisperToken: item.whisperToken,
        estimatedValue,
        freshness,
        scoreBreakdown: {
          modTierScore: score.modTierScore,
          rollQualityScore: score.rollQualityScore,
          synergyScore: score.synergyScore,
        },
      })
    }
  }

  // Sort: fresh items with high value ratio first, stale items deprioritized
  return opportunities
    .sort((a, b) => {
      // Stale + cheap items go to the bottom
      const aStaleBonus = a.freshness === 'stale' ? -0.5 : 0
      const bStaleBonus = b.freshness === 'stale' ? -0.5 : 0
      return (b.valueRatio + bStaleBonus) - (a.valueRatio + aStaleBonus)
    })
    .slice(0, 15)
}

// --- Distribution Helpers ---

function buildPriceDistribution(prices: number[]): PriceBucket[] {
  if (prices.length === 0) return []

  const sorted = [...prices].sort((a, b) => a - b)
  const min = sorted[0]
  const max = sorted[sorted.length - 1]

  if (min === max) {
    return [{ label: `${min}`, min, max, count: prices.length }]
  }

  const range = max - min
  let bucketSize: number

  if (range <= 10) bucketSize = 1
  else if (range <= 50) bucketSize = 5
  else if (range <= 200) bucketSize = 20
  else if (range <= 1000) bucketSize = 100
  else if (range <= 5000) bucketSize = 500
  else bucketSize = Math.ceil(range / 10 / 100) * 100

  const buckets: PriceBucket[] = []
  let start = Math.floor(min / bucketSize) * bucketSize

  while (start <= max) {
    const end = start + bucketSize
    const count = prices.filter(p => p >= start && p < end).length
    if (count > 0) {
      buckets.push({
        label: bucketSize === 1 ? `${start}` : `${start}-${end - 1}`,
        min: start,
        max: end,
        count,
      })
    }
    start = end
  }

  return buckets
}

function buildDPSDistribution(dpsValues: number[]): Array<{ range: string; count: number }> {
  if (dpsValues.length === 0) return []

  const sorted = [...dpsValues].sort((a, b) => a - b)
  const min = sorted[0]
  const max = sorted[sorted.length - 1]

  if (min === max) return [{ range: `${Math.round(min)}`, count: dpsValues.length }]

  const range = max - min
  let bucketSize: number
  if (range <= 50) bucketSize = 10
  else if (range <= 200) bucketSize = 25
  else if (range <= 500) bucketSize = 50
  else if (range <= 2000) bucketSize = 100
  else bucketSize = Math.ceil(range / 10 / 50) * 50

  const buckets: Array<{ range: string; count: number }> = []
  let start = Math.floor(min / bucketSize) * bucketSize

  while (start <= max) {
    const end = start + bucketSize
    const count = dpsValues.filter(v => v >= start && v < end).length
    if (count > 0) {
      buckets.push({ range: `${start}-${end - 1}`, count })
    }
    start = end
  }

  return buckets
}
