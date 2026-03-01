'use client'

import { cn } from '@/lib/utils'
import { CATEGORY_GROUPS, TYPE_LABELS } from '@/lib/economy/categories'
import type { GameId } from '@/lib/constants/games'

interface CategoryTabsProps {
  game: GameId
  activeGroup: string
  activeType: string
  onGroupChange: (group: string) => void
  onTypeChange: (type: string) => void
  categoryCounts?: Record<string, number>
}

export function CategoryTabs({ game, activeGroup, activeType, onGroupChange, onTypeChange, categoryCounts = {} }: CategoryTabsProps) {
  const activeGroupData = CATEGORY_GROUPS.find(g => g.id === activeGroup)
  const types = activeGroupData
    ? (game === 'poe1' ? activeGroupData.poe1Types : activeGroupData.poe2Types)
    : []

  return (
    <div className="space-y-2">
      {/* Group tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
        {CATEGORY_GROUPS.map(group => {
          const groupTypes = game === 'poe1' ? group.poe1Types : group.poe2Types
          if (groupTypes.length === 0) return null
          const totalCount = groupTypes.reduce((sum, t) => sum + (categoryCounts[t] || 0), 0)

          return (
            <button
              key={group.id}
              onClick={() => {
                onGroupChange(group.id)
                onTypeChange(groupTypes[0])
              }}
              className={cn(
                'shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                activeGroup === group.id
                  ? 'bg-poe-gold/20 text-poe-gold-light border border-poe-gold/30'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-transparent'
              )}
            >
              {group.label}
              {totalCount > 0 && (
                <span className="ml-1.5 text-[10px] opacity-60">{totalCount}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Sub-type tabs */}
      {types.length > 1 && (
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
          {types.map(type => {
            const count = categoryCounts[type] || 0
            return (
              <button
                key={type}
                onClick={() => onTypeChange(type)}
                className={cn(
                  'shrink-0 rounded px-2.5 py-1 text-[11px] font-medium transition-colors',
                  activeType === type
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                )}
              >
                {TYPE_LABELS[type] || type}
                {count > 0 && <span className="ml-1 text-[10px] opacity-50">{count}</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
