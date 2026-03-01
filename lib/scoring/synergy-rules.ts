import type { ParsedMod } from '@/lib/trade/types'

export interface SynergyRule {
  name: string
  multiplier: number
  requiredPatterns: RegExp[]
  minMatches: number
}

const SYNERGY_RULES: SynergyRule[] = [
  {
    name: 'Physical DPS Weapon',
    multiplier: 2.0,
    requiredPatterns: [
      /adds \d+ to \d+ physical damage/i,
      /increased physical damage/i,
      /increased attack speed/i,
    ],
    minMatches: 3,
  },
  {
    name: 'Triple Resistance',
    multiplier: 1.8,
    requiredPatterns: [
      /to fire resistance/i,
      /to cold resistance/i,
      /to lightning resistance/i,
    ],
    minMatches: 3,
  },
  {
    name: 'Life + Triple Res',
    multiplier: 2.5,
    requiredPatterns: [
      /to maximum life/i,
      /to fire resistance/i,
      /to cold resistance/i,
      /to lightning resistance/i,
    ],
    minMatches: 4,
  },
  {
    name: 'Caster Stack',
    multiplier: 2.0,
    requiredPatterns: [
      /increased spell damage|to spell damage/i,
      /increased cast speed/i,
      /to spell critical strike chance|increased critical strike chance for spells/i,
    ],
    minMatches: 3,
  },
  {
    name: 'Gem Level + Spell Damage',
    multiplier: 2.0,
    requiredPatterns: [
      /to level of (all )?.*gems/i,
      /increased spell damage|to spell damage/i,
    ],
    minMatches: 2,
  },
  {
    name: 'ES Stacking',
    multiplier: 1.8,
    requiredPatterns: [
      /to maximum energy shield/i,
      /increased energy shield/i,
      /faster start of energy shield recharge/i,
    ],
    minMatches: 2,
  },
  {
    name: 'Evasion + Suppression',
    multiplier: 1.6,
    requiredPatterns: [
      /to evasion rating|increased evasion/i,
      /chance to suppress spell damage/i,
    ],
    minMatches: 2,
  },
]

export function evaluateSynergies(mods: ParsedMod[]): Array<{ name: string; multiplier: number; mods: string[] }> {
  const results: Array<{ name: string; multiplier: number; mods: string[] }> = []

  for (const rule of SYNERGY_RULES) {
    const matchedMods: string[] = []
    let matches = 0

    for (const pattern of rule.requiredPatterns) {
      const matchingMod = mods.find(m => pattern.test(m.text))
      if (matchingMod) {
        matches++
        matchedMods.push(matchingMod.text)
      }
    }

    if (matches >= rule.minMatches) {
      results.push({ name: rule.name, multiplier: rule.multiplier, mods: matchedMods })
    }
  }

  return results
}
