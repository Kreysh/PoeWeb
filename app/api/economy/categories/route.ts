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

    // Get item type counts from item_prices_latest
    const itemCounts = db.prepare(`
      SELECT item_type, COUNT(*) as count
      FROM item_prices_latest
      WHERE game = ? AND league = ?
      GROUP BY item_type
      ORDER BY count DESC
    `).all(game, league) as Array<{ item_type: string; count: number }>

    // Get currency count
    const currencyCount = db.prepare(
      'SELECT COUNT(*) as count FROM currency_rates_latest WHERE game = ? AND league = ?'
    ).get(game, league) as { count: number }

    const categories = [
      { type: 'Currency', count: currencyCount.count, source: 'currency_rates_latest' },
      ...itemCounts.map(r => ({ type: r.item_type, count: r.count, source: 'item_prices_latest' })),
    ]

    return NextResponse.json({ success: true, data: categories })
  } catch (err) {
    console.error('Categories API error:', err)
    return NextResponse.json({ success: false, error: 'Failed to fetch categories' }, { status: 500 })
  }
}
