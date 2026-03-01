'use client'

import { useGame } from '@/lib/contexts/game-context'
import { cn } from '@/lib/utils'

export function GameToggle() {
  const { game, setGame } = useGame()

  return (
    <div className="flex items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
      <button
        onClick={() => setGame('poe1')}
        className={cn(
          'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
          game === 'poe1'
            ? 'bg-poe-gold text-white shadow-sm'
            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
        )}
      >
        POE 1
      </button>
      <button
        onClick={() => setGame('poe2')}
        className={cn(
          'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
          game === 'poe2'
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
        )}
      >
        POE 2
      </button>
    </div>
  )
}
