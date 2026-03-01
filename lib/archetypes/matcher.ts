import type { ParsedItem } from '@/lib/trade/types'
import { ARCHETYPES, type BuildArchetype } from './presets'
import type { GameId } from '@/lib/constants/games'

export interface ArchetypeMatch {
  archetype: BuildArchetype
  matchedMods: string[]
  matchScore: number
  matchPercent: number
}

export function matchArchetypes(item: ParsedItem, game: GameId): ArchetypeMatch[] {
  const applicableArchetypes = ARCHETYPES.filter(
    a => a.game === 'both' || a.game === game
  )

  const results: ArchetypeMatch[] = []

  for (const archetype of applicableArchetypes) {
    const matchedMods: string[] = []
    let matchedCount = 0

    for (const pattern of archetype.desiredMods) {
      const match = item.mods.find(m => pattern.test(m.text))
      if (match) {
        matchedMods.push(match.text)
        matchedCount++
      }
    }

    if (matchedCount >= 2) {
      const matchPercent = Math.round((matchedCount / archetype.desiredMods.length) * 100)
      results.push({
        archetype,
        matchedMods,
        matchScore: matchedCount,
        matchPercent,
      })
    }
  }

  return results.sort((a, b) => b.matchScore - a.matchScore)
}
