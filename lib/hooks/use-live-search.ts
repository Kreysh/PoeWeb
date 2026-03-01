'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { ParsedItem } from '@/lib/trade/types'

interface LiveSearchEvent {
  type: 'new_items' | 'auto_whisper' | 'connected' | 'disconnected' | 'error' | 'reconnecting' | 'status'
  searchId?: number
  searchName?: string
  items?: ParsedItem[]
  whisper?: string
  itemName?: string
  price?: { amount: number; currency: string }
  error?: string
  active?: Array<{ searchId: number; game: string; league: string; authenticated?: boolean }>
  timestamp: string
}

interface UseLiveSearchReturn {
  events: LiveSearchEvent[]
  activeSearches: Array<{ searchId: number; game: string; league: string; authenticated?: boolean }>
  connected: boolean
  lastError: string | null
  clearEvents: () => void
}

export function useLiveSearch(searchId?: number): UseLiveSearchReturn {
  const [events, setEvents] = useState<LiveSearchEvent[]>([])
  const [activeSearches, setActiveSearches] = useState<Array<{ searchId: number; game: string; league: string; authenticated?: boolean }>>([])
  const [connected, setConnected] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Create audio element for notifications
    try {
      audioRef.current = new Audio('/sounds/notification.mp3')
      audioRef.current.volume = 0.5
    } catch { /* ignore */ }

    const es = new EventSource('/api/live-search/stream')
    eventSourceRef.current = es

    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)

    es.onmessage = (e) => {
      try {
        const event: LiveSearchEvent = JSON.parse(e.data)

        // Filter by searchId if specified
        if (searchId && event.searchId && event.searchId !== searchId) return

        if (event.type === 'status' && event.active) {
          setActiveSearches(event.active)
          return
        }

        if (event.type === 'connected' && !event.searchId) {
          return // SSE connection event, skip
        }

        // Track errors
        if (event.type === 'error' && event.error) {
          setLastError(event.error)
        }

        // Clear error on successful connection
        if (event.type === 'connected' && event.searchId) {
          setLastError(null)
        }

        setEvents(prev => [...prev.slice(-99), event])

        // Play sound for new items and auto-whisper
        if (event.type === 'new_items' || event.type === 'auto_whisper') {
          const soundEnabled = localStorage.getItem('poe-trade-sound') !== 'false'
          if (soundEnabled && audioRef.current) {
            audioRef.current.play().catch(() => {})
          }
        }

        // Auto-whisper: don't auto-copy to clipboard from SSE callback
        // Browsers block clipboard.writeText without direct user activation
        // The whisper is shown in the live feed with a manual copy button

        // Update active searches on connect/disconnect
        if (event.type === 'connected' && event.searchId) {
          setActiveSearches(prev => {
            if (prev.some(s => s.searchId === event.searchId)) return prev
            return [...prev, { searchId: event.searchId!, game: '', league: '' }]
          })
        }
        if (event.type === 'disconnected' && event.searchId) {
          setActiveSearches(prev => prev.filter(s => s.searchId !== event.searchId))
        }
      } catch { /* ignore parse errors */ }
    }

    return () => {
      es.close()
      eventSourceRef.current = null
    }
  }, [searchId])

  const clearEvents = useCallback(() => {
    setEvents([])
    setLastError(null)
  }, [])

  return { events, activeSearches, connected, lastError, clearEvents }
}
