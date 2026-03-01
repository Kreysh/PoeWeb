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

    const currencies = db.prepare(
      'SELECT currency_id, currency_label, chaos_equivalent, divine_equivalent, icon_url, change_24h, updated_at FROM currency_rates_latest WHERE game = ? AND league = ? ORDER BY chaos_equivalent DESC'
    ).all(game, league)

    return NextResponse.json({ success: true, data: currencies })
  } catch (err) {
    console.error('Currency API error:', err)
    return NextResponse.json({ success: false, error: 'Failed to fetch currencies' }, { status: 500 })
  }
}
