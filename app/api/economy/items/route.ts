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
    const itemType = url.searchParams.get('type') || ''
    const search = url.searchParams.get('search') || ''
    const sort = url.searchParams.get('sort') || 'chaos_value'
    const order = url.searchParams.get('order') === 'asc' ? 'ASC' : 'DESC'
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(10, parseInt(url.searchParams.get('limit') || '50', 10)))
    const offset = (page - 1) * limit

    const db = getDb()

    // Validate sort column
    const validSorts = ['chaos_value', 'divine_value', 'listing_count', 'change_24h', 'item_name', 'updated_at']
    const sortCol = validSorts.includes(sort) ? sort : 'chaos_value'

    let whereClause = 'WHERE i.game = ? AND i.league = ?'
    const params: any[] = [game, league]

    if (itemType) {
      whereClause += ' AND i.item_type = ?'
      params.push(itemType)
    }

    if (search) {
      whereClause += ' AND i.item_name LIKE ?'
      params.push(`%${search}%`)
    }

    // Get total count
    const countRow = db.prepare(
      `SELECT COUNT(*) as total FROM item_prices_latest i ${whereClause}`
    ).get(...params) as { total: number }

    // Get items with optional 7d change from daily table
    const items = db.prepare(`
      SELECT i.*,
        d7.avg_chaos as avg_7d,
        CASE WHEN d7.avg_chaos > 0 THEN ((i.chaos_value - d7.avg_chaos) / d7.avg_chaos * 100) ELSE NULL END as change_7d
      FROM item_prices_latest i
      LEFT JOIN (
        SELECT item_id, item_type, game, league, AVG(avg_chaos) as avg_chaos
        FROM item_price_daily
        WHERE game = ? AND league = ? AND date >= date('now', '-7 days')
        GROUP BY item_id, item_type
      ) d7 ON d7.item_id = i.item_id AND d7.item_type = i.item_type AND d7.game = i.game AND d7.league = i.league
      ${whereClause}
      ORDER BY i.${sortCol} ${order}
      LIMIT ? OFFSET ?
    `).all(game, league, ...params, limit, offset)

    return NextResponse.json({
      success: true,
      data: {
        items,
        total: countRow.total,
        page,
        limit,
        totalPages: Math.ceil(countRow.total / limit),
      },
    })
  } catch (err) {
    console.error('Items API error:', err)
    return NextResponse.json({ success: false, error: 'Failed to fetch items' }, { status: 500 })
  }
}
