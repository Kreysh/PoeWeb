import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { getDb } from '@/lib/db'

export async function GET(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  try {
    const url = new URL(request.url)
    const game = url.searchParams.get('game') || 'poe1'
    const league = url.searchParams.get('league') || 'Standard'
    const itemId = url.searchParams.get('itemId')
    const itemType = url.searchParams.get('itemType') || ''
    const days = parseInt(url.searchParams.get('days') || '7', 10)
    const resolution = url.searchParams.get('resolution') || (days <= 7 ? 'raw' : 'daily')

    if (!itemId) {
      return NextResponse.json({ success: false, error: 'Missing itemId' }, { status: 400 })
    }

    const db = getDb()

    if (resolution === 'daily') {
      // Use daily aggregated data (up to 90 days)
      const safeDays = Math.min(90, days)
      const history = db.prepare(`
        SELECT avg_chaos as chaos_value, avg_divine as divine_value, avg_listing_count as listing_count, date as captured_at,
          min_chaos, max_chaos, sample_count
        FROM item_price_daily
        WHERE game = ? AND league = ? AND item_id = ? AND item_type = ?
          AND date >= date('now', '-' || ? || ' days')
        ORDER BY date ASC
      `).all(game, league, itemId, itemType, safeDays)

      return NextResponse.json({ success: true, data: history, resolution: 'daily' })
    } else {
      // Raw history data (last 7 days max)
      const safeDays = Math.min(7, days)
      const history = db.prepare(`
        SELECT chaos_value, divine_value, listing_count, captured_at
        FROM item_price_history
        WHERE game = ? AND league = ? AND item_id = ? AND item_type = ?
          AND captured_at >= datetime('now', '-' || ? || ' days')
        ORDER BY captured_at ASC
      `).all(game, league, itemId, itemType, safeDays)

      return NextResponse.json({ success: true, data: history, resolution: 'raw' })
    }
  } catch (err) {
    console.error('History API error:', err)
    return NextResponse.json({ success: false, error: 'Failed to fetch history' }, { status: 500 })
  }
}
