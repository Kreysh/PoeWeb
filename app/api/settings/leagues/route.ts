import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const game = url.searchParams.get('game') || 'poe1'
    const db = getDb()
    const rows = db.prepare('SELECT label FROM leagues WHERE game = ? ORDER BY is_current DESC, label ASC').all(game) as Array<{ label: string }>

    if (rows.length > 0) {
      return NextResponse.json({ success: true, data: rows.map(r => r.label) })
    }

    // Default leagues if none in DB
    return NextResponse.json({ success: true, data: ['Standard'] })
  } catch {
    return NextResponse.json({ success: true, data: ['Standard'] })
  }
}
