import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { tradeSearch } from '@/lib/trade/client'
import type { GameId } from '@/lib/constants/games'

export async function POST(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const { game, league, query } = body as { game: GameId; league: string; query: any }

    if (!game || !league || !query) {
      return NextResponse.json({ success: false, error: 'Missing game, league, or query' }, { status: 400 })
    }

    const result = await tradeSearch(game, league, query)
    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Trade search failed'
    console.error('Trade search error:', message)
    const status = message.includes('Rate limited') ? 429 : 500
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
