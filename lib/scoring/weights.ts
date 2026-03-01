export const TIER_WEIGHTS: Record<number, number> = {
  1: 100,  // T1
  2: 75,   // T2
  3: 45,   // T3
  4: 20,   // T4
  5: 5,    // T5+
  0: 10,   // Unknown/crafted
}

export const GRADE_THRESHOLDS = {
  S: 800,
  A: 600,
  B: 400,
  C: 250,
  D: 100,
  F: 0,
} as const

export const GRADE_COLORS: Record<string, string> = {
  S: 'text-amber-400',
  A: 'text-purple-400',
  B: 'text-blue-400',
  C: 'text-green-400',
  D: 'text-slate-400',
  F: 'text-red-400',
  'N/A': 'text-slate-500',
}
