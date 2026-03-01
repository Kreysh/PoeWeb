'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { GameId, GAMES, type GameConfig } from '@/lib/constants/games'

interface GameContextValue {
  game: GameId
  league: string
  leagues: string[]
  config: GameConfig
  setGame: (game: GameId) => void
  setLeague: (league: string) => void
  tradeBaseUrl: string
  economySource: string
  primaryCurrency: string
}

const GameContext = createContext<GameContextValue | undefined>(undefined)

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [game, setGameState] = useState<GameId>('poe1')
  const [league, setLeagueState] = useState<string>('Standard')
  const [leagues, setLeagues] = useState<string[]>(['Standard'])

  // Load saved preference
  useEffect(() => {
    try {
      const savedGame = localStorage.getItem('poe-trade-game') as GameId | null
      const savedLeague = localStorage.getItem('poe-trade-league')
      if (savedGame && GAMES[savedGame]) setGameState(savedGame)
      if (savedLeague) setLeagueState(savedLeague)
    } catch { /* SSR or no localStorage */ }
  }, [])

  // Fetch leagues when game changes
  useEffect(() => {
    const fetchLeagues = async () => {
      try {
        const res = await fetch(`/api/settings/leagues?game=${game}`)
        const data = await res.json()
        if (data.success && data.data?.length > 0) {
          setLeagues(data.data)
          // If current league is not in the new list, switch to first
          if (!data.data.includes(league)) {
            setLeagueState(data.data[0])
          }
        }
      } catch {
        setLeagues(['Standard'])
      }
    }
    fetchLeagues()
  }, [game]) // eslint-disable-line react-hooks/exhaustive-deps

  const setGame = useCallback((g: GameId) => {
    setGameState(g)
    try { localStorage.setItem('poe-trade-game', g) } catch { /* ignore */ }
  }, [])

  const setLeague = useCallback((l: string) => {
    setLeagueState(l)
    try { localStorage.setItem('poe-trade-league', l) } catch { /* ignore */ }
  }, [])

  const config = GAMES[game]

  const value = useMemo<GameContextValue>(() => ({
    game,
    league,
    leagues,
    config,
    setGame,
    setLeague,
    tradeBaseUrl: config.tradeBaseUrl,
    economySource: config.economySource,
    primaryCurrency: config.primaryCurrency,
  }), [game, league, leagues, config, setGame, setLeague])

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}
