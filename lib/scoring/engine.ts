import type { ParsedItem, ParsedMod } from '@/lib/trade/types'
import { parseTierFromString, calculateRollQuality } from '@/lib/mods/pattern-index'
import { TIER_WEIGHTS } from './weights'
import { evaluateSynergies } from './synergy-rules'

export interface ScoreResult {
  totalScore: number
  grade: string
  modTierScore: number
  rollQualityScore: number
  synergyScore: number
  modDetails: ModScoreDetail[]
  synergies: SynergyMatch[]
}

export interface ModScoreDetail {
  text: string
  type: string
  tier: number
  tierLabel: string
  rollQuality: number
  tierScore: number
  rollScore: number
}

export interface SynergyMatch {
  name: string
  multiplier: number
  mods: string[]
}

export function scoreItem(item: ParsedItem): ScoreResult {
  const modDetails: ModScoreDetail[] = []
  let modTierScore = 0
  let rollQualityScore = 0

  for (const mod of item.mods) {
    const { tier, label } = parseTierFromString(mod.tier)
    const tierScore = TIER_WEIGHTS[tier] || 0

    let rollQuality = 0
    if (mod.magnitudes.length > 0) {
      const qualities = mod.magnitudes.map(m => {
        const current = m.current ?? m.min
        return calculateRollQuality(current, m.min, m.max)
      })
      rollQuality = Math.round(qualities.reduce((a, b) => a + b, 0) / qualities.length)
    }

    const rollScore = Math.round((rollQuality / 100) * tierScore * 0.3)
    modTierScore += tierScore
    rollQualityScore += rollScore

    modDetails.push({
      text: mod.text,
      type: mod.type,
      tier,
      tierLabel: mod.type === 'crafted' ? 'Crafted' : mod.type === 'fractured' ? 'Fractured' : label,
      rollQuality,
      tierScore,
      rollScore,
    })
  }

  const synergies = evaluateSynergies(item.mods)
  let synergyScore = 0
  for (const syn of synergies) {
    synergyScore += Math.round(modTierScore * (syn.multiplier - 1) * 0.3)
  }

  const totalScore = modTierScore + rollQualityScore + synergyScore
  const grade = getGrade(totalScore)

  return { totalScore, grade, modTierScore, rollQualityScore, synergyScore, modDetails, synergies }
}

function getGrade(score: number): string {
  if (score >= 800) return 'S'
  if (score >= 600) return 'A'
  if (score >= 400) return 'B'
  if (score >= 250) return 'C'
  if (score >= 100) return 'D'
  return 'F'
}
