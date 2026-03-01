'use client'

import { useGame } from '@/lib/contexts/game-context'

export function LeagueSelector() {
  const { league, leagues, setLeague } = useGame()

  return (
    <select
      value={league}
      onChange={(e) => setLeague(e.target.value)}
      className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {leagues.map((l) => (
        <option key={l} value={l}>{l}</option>
      ))}
    </select>
  )
}
