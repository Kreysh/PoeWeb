import { cn } from '@/lib/utils'
import { MOD_TIER_COLORS } from '@/lib/constants/games'

interface ModTierBadgeProps {
  tier: string | null
  tierNum: number | null
  modType: string
}

export function ModTierBadge({ tier, tierNum, modType }: ModTierBadgeProps) {
  let key = 'T5'
  if (modType === 'crafted') key = 'crafted'
  else if (modType === 'fractured') key = 'fractured'
  else if (tierNum !== null) {
    if (tierNum <= 1) key = 'T1'
    else if (tierNum === 2) key = 'T2'
    else if (tierNum === 3) key = 'T3'
    else if (tierNum === 4) key = 'T4'
    else key = 'T5'
  }

  const colors = MOD_TIER_COLORS[key] || MOD_TIER_COLORS['T5']

  return (
    <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold', colors.bg, colors.text)}>
      {modType === 'crafted' ? 'Crafted' : modType === 'fractured' ? 'Fractured' : tier || '?'}
    </span>
  )
}
