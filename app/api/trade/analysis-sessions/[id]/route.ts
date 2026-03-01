import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { getDb } from '@/lib/db'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { id } = await params
  const db = getDb()
  const row = db.prepare('SELECT * FROM analysis_sessions WHERE id = ?').get(id) as any

  if (!row) {
    return NextResponse.json({ success: false, error: 'Sesión no encontrada' }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    session: {
      id: row.id,
      game: row.game,
      league: row.league,
      queryId: row.query_id,
      tradeUrl: row.trade_url,
      totalItems: row.total_items,
      totalInSearch: row.total_in_search,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
    data: row.analysis_json ? JSON.parse(row.analysis_json) : null,
  })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { id } = await params
  const db = getDb()
  const result = db.prepare('DELETE FROM analysis_sessions WHERE id = ?').run(id)

  if (result.changes === 0) {
    return NextResponse.json({ success: false, error: 'Sesión no encontrada' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
