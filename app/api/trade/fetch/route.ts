import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { tradeFetch } from '@/lib/trade/client'
import { parseSearchResults } from '@/lib/trade/item-parser'
import type { GameId } from '@/lib/constants/games'

export async function GET(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  try {
    const url = new URL(request.url)
    const game = url.searchParams.get('game') as GameId
    const ids = url.searchParams.get('ids')?.split(',') || []
    const queryId = url.searchParams.get('queryId') || ''

    if (!game || !ids.length || !queryId) {
      return NextResponse.json({ success: false, error: 'Missing game, ids, or queryId' }, { status: 400 })
    }

    const result = await tradeFetch(game, ids, queryId)
    const parsed = parseSearchResults(result.result)
    return NextResponse.json({ success: true, data: parsed })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Trade fetch failed'
    console.error('Trade fetch error:', message)
    const status = message.includes('Rate limited') ? 429 : 500
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
