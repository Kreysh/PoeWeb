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

    const savedSearches = db.prepare('SELECT COUNT(*) as count FROM saved_searches WHERE game = ?').get(game) as { count: number }
    const activeAlerts = db.prepare('SELECT COUNT(*) as count FROM alert_rules WHERE game = ? AND is_active = 1').get(game) as { count: number }
    const unreadAlerts = db.prepare('SELECT COUNT(*) as count FROM triggered_alerts WHERE game = ? AND is_read = 0').get(game) as { count: number }
    const lastPoll = db.prepare('SELECT finished_at FROM polling_jobs WHERE game = ? ORDER BY finished_at DESC LIMIT 1').get(game) as { finished_at: string } | undefined
    const recentAlerts = db.prepare('SELECT id, message, game, trade_url, triggered_at FROM triggered_alerts WHERE game = ? ORDER BY triggered_at DESC LIMIT 5').all(game) as Array<{ id: number; message: string; game: string; trade_url: string | null; triggered_at: string }>
    const topCurrencies = db.prepare('SELECT currency_label, chaos_equivalent, change_24h, icon_url FROM currency_rates_latest WHERE game = ? AND league = ? ORDER BY chaos_equivalent DESC LIMIT 8').all(game, league) as Array<{ currency_label: string; chaos_equivalent: number; change_24h: number | null; icon_url: string | null }>

    return NextResponse.json({
      success: true,
      data: {
        savedSearches: savedSearches.count,
        activeAlerts: activeAlerts.count,
        unreadAlerts: unreadAlerts.count,
        lastPollAt: lastPoll?.finished_at || null,
        recentAlerts,
        topCurrencies,
      },
    })
  } catch (err) {
    console.error('Dashboard error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
