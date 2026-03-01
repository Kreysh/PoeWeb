import type { ModMatch } from './types'

const TIER_PATTERNS: Array<{ regex: RegExp; tier: number; label: string }> = [
  { regex: /^S\d+$/i, tier: 1, label: 'T1' },
  { regex: /^P1$/i, tier: 1, label: 'T1' },
  { regex: /^P2$/i, tier: 2, label: 'T2' },
  { regex: /^P3$/i, tier: 3, label: 'T3' },
  { regex: /^P4$/i, tier: 4, label: 'T4' },
  { regex: /^P[5-9]$/i, tier: 5, label: 'T5+' },
  { regex: /^P\d{2,}$/i, tier: 5, label: 'T5+' },
]

export function parseTierFromString(tierStr: string | null): { tier: number; label: string } {
  if (!tierStr) return { tier: 0, label: 'Unknown' }

  // Handle "S1" (suffix T1), "P1" (prefix T1), etc.
  for (const p of TIER_PATTERNS) {
    if (p.regex.test(tierStr)) {
      return { tier: p.tier, label: p.label }
    }
  }

  // Try extracting number directly
  const num = parseInt(tierStr.replace(/\D/g, ''), 10)
  if (!isNaN(num)) {
    if (num <= 1) return { tier: 1, label: 'T1' }
    if (num === 2) return { tier: 2, label: 'T2' }
    if (num === 3) return { tier: 3, label: 'T3' }
    if (num === 4) return { tier: 4, label: 'T4' }
    return { tier: 5, label: 'T5+' }
  }

  if (tierStr.toLowerCase() === 'crafted') return { tier: 0, label: 'Crafted' }
  if (tierStr.toLowerCase() === 'fractured') return { tier: 0, label: 'Fractured' }

  return { tier: 0, label: tierStr }
}

export function calculateRollQuality(current: number, min: number, max: number): number {
  if (max === min) return 100
  const range = max - min
  if (range === 0) return 100
  return Math.round(((current - min) / range) * 100)
}

export function classifyMod(tierStr: string | null, modType: string): ModMatch {
  const { tier, label } = parseTierFromString(tierStr)
  return {
    modTier: null,
    tier,
    tierLabel: modType === 'crafted' ? 'Crafted' : modType === 'fractured' ? 'Fractured' : label,
    rollQuality: 0,
    isTop: tier === 1,
  }
}
