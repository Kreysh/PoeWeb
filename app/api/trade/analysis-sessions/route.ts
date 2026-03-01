import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { getDb } from '@/lib/db'
import { analyzeItems } from '@/lib/trade/search-analyzer'
import type { ParsedItem } from '@/lib/trade/types'

export async function GET() {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const db = getDb()
  const rows = db.prepare(
    `SELECT id, game, league, query_id, trade_url, total_items, total_in_search, created_at, updated_at
     FROM analysis_sessions ORDER BY updated_at DESC LIMIT 50`
  ).all()

  return NextResponse.json({ success: true, sessions: rows })
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const { game, league, queryId, tradeUrl, items, totalInSearch, mergeWithSessionId } = body

    if (!game || !league || !queryId || !items || !Array.isArray(items)) {
      return NextResponse.json({ success: false, error: 'Datos incompletos' }, { status: 400 })
    }

    const db = getDb()

    if (mergeWithSessionId) {
      // Merge with existing session
      const existing = db.prepare('SELECT * FROM analysis_sessions WHERE id = ?').get(mergeWithSessionId) as any
      if (!existing) {
        return NextResponse.json({ success: false, error: 'Sesión no encontrada' }, { status: 404 })
      }

      const existingItems: ParsedItem[] = JSON.parse(existing.items_json)
      const existingIds = new Set(existingItems.map((i: ParsedItem) => i.id))

      // Deduplicate
      const newItems = (items as ParsedItem[]).filter(i => !existingIds.has(i.id))
      const mergedItems = [...existingItems, ...newItems]
      const mergedTotal = Math.max(totalInSearch || 0, existing.total_in_search)

      // Re-analyze
      const analysis = analyzeItems(mergedItems, mergedTotal)

      db.prepare(
        `UPDATE analysis_sessions SET
          items_json = ?, analysis_json = ?, total_items = ?, total_in_search = ?,
          updated_at = datetime('now')
         WHERE id = ?`
      ).run(
        JSON.stringify(mergedItems),
        JSON.stringify({ game, league, queryId, ...analysis }),
        mergedItems.length,
        mergedTotal,
        mergeWithSessionId,
      )

      return NextResponse.json({
        success: true,
        session: { id: mergeWithSessionId, totalItems: mergedItems.length, newItems: newItems.length },
        data: { game, league, queryId, ...analysis },
      })
    }

    // Create new session
    const analysis = analyzeItems(items as ParsedItem[], totalInSearch || items.length)

    const result = db.prepare(
      `INSERT INTO analysis_sessions (game, league, query_id, trade_url, items_json, analysis_json, total_items, total_in_search)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      game, league, queryId, tradeUrl || null,
      JSON.stringify(items),
      JSON.stringify({ game, league, queryId, ...analysis }),
      items.length,
      totalInSearch || items.length,
    )

    return NextResponse.json({
      success: true,
      session: { id: result.lastInsertRowid, totalItems: items.length },
    })
  } catch (err: any) {
    console.error('Analysis session save error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
