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

    // Buy opportunities: current price < 85% of 7-day average
    const buyOpportunities = db.prepare(`
      SELECT i.item_name, i.item_type, i.item_id, i.icon_url, i.chaos_value as current_price,
        d.avg_chaos as avg_7d,
        ((i.chaos_value - d.avg_chaos) / d.avg_chaos * 100) as pct_diff
      FROM item_prices_latest i
      INNER JOIN (
        SELECT item_id, item_type, game, league, AVG(avg_chaos) as avg_chaos
        FROM item_price_daily
        WHERE game = ? AND league = ? AND date >= date('now', '-7 days')
        GROUP BY item_id, item_type
        HAVING avg_chaos > 0
      ) d ON d.item_id = i.item_id AND d.item_type = i.item_type AND d.game = i.game AND d.league = i.league
      WHERE i.game = ? AND i.league = ?
        AND i.chaos_value > 0
        AND i.chaos_value < d.avg_chaos * 0.85
      ORDER BY pct_diff ASC
      LIMIT 20
    `).all(game, league, game, league)

    // Sell signals: current price > 115% of 7-day average
    const sellSignals = db.prepare(`
      SELECT i.item_name, i.item_type, i.item_id, i.icon_url, i.chaos_value as current_price,
        d.avg_chaos as avg_7d,
        ((i.chaos_value - d.avg_chaos) / d.avg_chaos * 100) as pct_diff
      FROM item_prices_latest i
      INNER JOIN (
        SELECT item_id, item_type, game, league, AVG(avg_chaos) as avg_chaos
        FROM item_price_daily
        WHERE game = ? AND league = ? AND date >= date('now', '-7 days')
        GROUP BY item_id, item_type
        HAVING avg_chaos > 0
      ) d ON d.item_id = i.item_id AND d.item_type = i.item_type AND d.game = i.game AND d.league = i.league
      WHERE i.game = ? AND i.league = ?
        AND i.chaos_value > 0
        AND i.chaos_value > d.avg_chaos * 1.15
      ORDER BY pct_diff DESC
      LIMIT 20
    `).all(game, league, game, league)

    // Stable items: low volatility (small range between min and max daily)
    const stableItems = db.prepare(`
      SELECT item_name, item_type, item_id,
        AVG(avg_chaos) as avg_price,
        (MAX(max_chaos) - MIN(min_chaos)) / NULLIF(AVG(avg_chaos), 0) * 100 as volatility_pct
      FROM item_price_daily
      WHERE game = ? AND league = ? AND date >= date('now', '-7 days') AND avg_chaos > 1
      GROUP BY item_id, item_type
      HAVING COUNT(*) >= 3 AND volatility_pct < 5
      ORDER BY avg_price DESC
      LIMIT 20
    `).all(game, league)

    // Volatile items: high price swings
    const volatileItems = db.prepare(`
      SELECT item_name, item_type, item_id,
        AVG(avg_chaos) as avg_price,
        (MAX(max_chaos) - MIN(min_chaos)) / NULLIF(AVG(avg_chaos), 0) * 100 as volatility_pct
      FROM item_price_daily
      WHERE game = ? AND league = ? AND date >= date('now', '-7 days') AND avg_chaos > 1
      GROUP BY item_id, item_type
      HAVING COUNT(*) >= 3 AND volatility_pct > 30
      ORDER BY volatility_pct DESC
      LIMIT 20
    `).all(game, league)

    return NextResponse.json({
      success: true,
      data: {
        buyOpportunities: (buyOpportunities as any[]).map(r => ({ ...r, signal: 'buy' })),
        sellSignals: (sellSignals as any[]).map(r => ({ ...r, signal: 'sell' })),
        stableItems: (stableItems as any[]).map(r => ({ ...r, signal: 'stable' })),
        volatileItems: (volatileItems as any[]).map(r => ({ ...r, signal: 'volatile' })),
      },
    })
  } catch (err) {
    console.error('Analysis API error:', err)
    return NextResponse.json({ success: false, error: 'Failed to fetch analysis' }, { status: 500 })
  }
}
