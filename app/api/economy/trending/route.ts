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
    const db = getDb()

    // Real trending: items with biggest positive 24h change
    const gainers = db.prepare(`
      SELECT item_name, item_type, item_id, chaos_value, divine_value, listing_count, icon_url, change_24h, updated_at
      FROM item_prices_latest
      WHERE game = ? AND league = ? AND change_24h IS NOT NULL AND change_24h > 0 AND chaos_value > 0
      ORDER BY change_24h DESC
      LIMIT 15
    `).all(game, league)

    // Biggest losers
    const losers = db.prepare(`
      SELECT item_name, item_type, item_id, chaos_value, divine_value, listing_count, icon_url, change_24h, updated_at
      FROM item_prices_latest
      WHERE game = ? AND league = ? AND change_24h IS NOT NULL AND change_24h < 0 AND chaos_value > 0
      ORDER BY change_24h ASC
      LIMIT 15
    `).all(game, league)

    // Most valuable
    const mostValuable = db.prepare(`
      SELECT item_name, item_type, item_id, chaos_value, divine_value, listing_count, icon_url, change_24h, updated_at
      FROM item_prices_latest
      WHERE game = ? AND league = ? AND chaos_value > 0
      ORDER BY chaos_value DESC
      LIMIT 15
    `).all(game, league)

    return NextResponse.json({
      success: true,
      data: { gainers, losers, mostValuable },
    })
  } catch (err) {
    console.error('Trending API error:', err)
    return NextResponse.json({ success: false, error: 'Failed to fetch trending' }, { status: 500 })
  }
}
