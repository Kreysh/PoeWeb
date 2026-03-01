import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { getDb } from '@/lib/db'

export async function GET(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const url = new URL(request.url)
  const game = url.searchParams.get('game') || 'poe1'
  const db = getDb()
  const rules = db.prepare('SELECT * FROM alert_rules WHERE game = ? ORDER BY created_at DESC').all(game)
  return NextResponse.json({ success: true, data: rules })
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const { game, league, name, rule_type, search_id, conditions_json, cooldown_min } = body
    if (!game || !league || !name || !rule_type || !conditions_json) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }
    const db = getDb()
    const result = db.prepare(
      'INSERT INTO alert_rules (game, league, name, rule_type, search_id, conditions_json, cooldown_min) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(game, league, name, rule_type, search_id || null, JSON.stringify(conditions_json), cooldown_min || 5)
    return NextResponse.json({ success: true, data: { id: result.lastInsertRowid } })
  } catch (err) {
    console.error('Create alert error:', err)
    return NextResponse.json({ success: false, error: 'Failed to create alert' }, { status: 500 })
  }
}
