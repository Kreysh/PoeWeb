import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { getDb } from '@/lib/db'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { id } = await params
  const db = getDb()
  const search = db.prepare('SELECT * FROM saved_searches WHERE id = ?').get(id)
  if (!search) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

  const results = db.prepare(
    'SELECT * FROM search_results WHERE search_id = ? ORDER BY found_at DESC LIMIT 50'
  ).all(id)

  return NextResponse.json({ success: true, data: { search, results } })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { id } = await params
  const body = await request.json()
  const db = getDb()
  const fields: string[] = []
  const values: any[] = []

  if (body.name !== undefined) { fields.push('name = ?'); values.push(body.name) }
  if (body.description !== undefined) { fields.push('description = ?'); values.push(body.description) }
  if (body.is_active !== undefined) { fields.push('is_active = ?'); values.push(body.is_active ? 1 : 0) }
  if (body.poll_interval_min !== undefined) { fields.push('poll_interval_min = ?'); values.push(body.poll_interval_min) }

  if (fields.length === 0) return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 })
  fields.push("updated_at = datetime('now')")
  values.push(id)

  db.prepare(`UPDATE saved_searches SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const { id } = await params
  const db = getDb()
  db.prepare('DELETE FROM saved_searches WHERE id = ?').run(id)
  return NextResponse.json({ success: true })
}
