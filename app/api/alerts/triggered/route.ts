import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { getDb } from '@/lib/db'

export async function GET(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const url = new URL(request.url)
  const game = url.searchParams.get('game')
  const unread = url.searchParams.get('unread') === 'true'
  const limit = parseInt(url.searchParams.get('limit') || '50', 10)
  const db = getDb()

  let query = 'SELECT * FROM triggered_alerts'
  const conditions: string[] = []
  const params: any[] = []

  if (game) { conditions.push('game = ?'); params.push(game) }
  if (unread) { conditions.push('is_read = 0') }

  if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ')
  query += ' ORDER BY triggered_at DESC LIMIT ?'
  params.push(limit)

  const alerts = db.prepare(query).all(...params)
  const total = db.prepare(
    `SELECT COUNT(*) as count FROM triggered_alerts${conditions.length ? ' WHERE ' + conditions.join(' AND ') : ''}`
  ).get(...params.slice(0, -1)) as { count: number }

  return NextResponse.json({ success: true, data: { alerts, total: total.count } })
}

export async function PUT(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const { ids, markRead } = body
    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ success: false, error: 'Missing ids' }, { status: 400 })
    }
    const db = getDb()
    const placeholders = ids.map(() => '?').join(',')
    db.prepare(`UPDATE triggered_alerts SET is_read = ? WHERE id IN (${placeholders})`).run(markRead ? 1 : 0, ...ids)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Update alerts error:', err)
    return NextResponse.json({ success: false, error: 'Update failed' }, { status: 500 })
  }
}
