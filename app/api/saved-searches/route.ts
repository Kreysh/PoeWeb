import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { getDb } from '@/lib/db'

export async function GET(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const url = new URL(request.url)
  const game = url.searchParams.get('game') || 'poe1'
  const db = getDb()
  const searches = db.prepare(
    'SELECT * FROM saved_searches WHERE game = ? ORDER BY updated_at DESC'
  ).all(game)
  return NextResponse.json({ success: true, data: searches })
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const { game, league, name, description, query_json, trade_url, poll_interval_min, query_id } = body
    if (!game || !league || !name || (!query_json && !query_id)) {
      return NextResponse.json({ success: false, error: 'Faltan campos requeridos' }, { status: 400 })
    }
    const db = getDb()
    const result = db.prepare(
      'INSERT INTO saved_searches (game, league, name, description, query_json, trade_url, poll_interval_min, query_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      game, league, name, description || null,
      query_id ? '{}' : JSON.stringify(query_json),
      trade_url || null, poll_interval_min || 15,
      query_id || null
    )
    return NextResponse.json({ success: true, data: { id: result.lastInsertRowid } })
  } catch (err) {
    console.error('Save search error:', err)
    return NextResponse.json({ success: false, error: 'Error al guardar búsqueda' }, { status: 500 })
  }
}
