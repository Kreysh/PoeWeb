import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { liveSearchManager } from '@/lib/trade/live-search-manager'
import { getDb } from '@/lib/db'

// GET: status of all live searches
export async function GET() {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  try {
    const status = liveSearchManager.getStatus()
    const db = getDb()

    // Enrich with search names
    const enriched = status.map(s => {
      const search = db.prepare('SELECT name, auto_whisper, max_price_threshold, price_threshold_currency FROM saved_searches WHERE id = ?').get(s.searchId) as any
      return {
        ...s,
        name: search?.name || `Search #${s.searchId}`,
        autoWhisper: !!search?.auto_whisper,
        maxPriceThreshold: search?.max_price_threshold,
        priceThresholdCurrency: search?.price_threshold_currency,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        active: enriched,
        totalConnections: liveSearchManager.getActiveCount(),
        maxConnections: 10,
      },
    })
  } catch (err) {
    console.error('Live search status error:', err)
    return NextResponse.json({ success: false, error: 'Failed to get status' }, { status: 500 })
  }
}

// POST: start a live search
export async function POST(request: Request) {
  // Allow internal boot calls to bypass auth (server-proxy listens on 127.0.0.1 only)
  const isInternalBoot = request.headers.get('X-Internal-Boot') === 'poe-trade-resume'
  if (!isInternalBoot) {
    const auth = await requireAuth()
    if ('error' in auth) return auth.error
  } else {
    console.log('[LiveSearch] Internal boot bypass used')
  }

  try {
    const body = await request.json()
    const { searchId, autoWhisper, maxPriceThreshold, priceThresholdCurrency } = body

    if (!searchId) {
      return NextResponse.json({ success: false, error: 'Missing searchId' }, { status: 400 })
    }

    // Update auto-whisper config if provided
    if (autoWhisper !== undefined || maxPriceThreshold !== undefined) {
      const db = getDb()
      if (autoWhisper !== undefined) {
        db.prepare("UPDATE saved_searches SET auto_whisper = ?, updated_at = datetime('now') WHERE id = ?").run(autoWhisper ? 1 : 0, searchId)
      }
      if (maxPriceThreshold !== undefined) {
        db.prepare("UPDATE saved_searches SET max_price_threshold = ?, updated_at = datetime('now') WHERE id = ?").run(maxPriceThreshold, searchId)
      }
      if (priceThresholdCurrency !== undefined) {
        db.prepare("UPDATE saved_searches SET price_threshold_currency = ?, updated_at = datetime('now') WHERE id = ?").run(priceThresholdCurrency, searchId)
      }
    }

    await liveSearchManager.startLiveSearch(searchId)

    return NextResponse.json({ success: true, data: { searchId, status: 'started' } })
  } catch (err) {
    console.error('Live search start error:', err)
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Failed to start' }, { status: 500 })
  }
}

// DELETE: stop a live search
export async function DELETE(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  try {
    const url = new URL(request.url)
    const searchId = parseInt(url.searchParams.get('searchId') || '0', 10)

    if (!searchId) {
      return NextResponse.json({ success: false, error: 'Missing searchId' }, { status: 400 })
    }

    liveSearchManager.stopLiveSearch(searchId)

    return NextResponse.json({ success: true, data: { searchId, status: 'stopped' } })
  } catch (err) {
    console.error('Live search stop error:', err)
    return NextResponse.json({ success: false, error: 'Failed to stop' }, { status: 500 })
  }
}

// PUT: update live search config (pause/resume, auto-whisper settings)
export async function PUT(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const { searchId, action, autoWhisper, maxPriceThreshold, priceThresholdCurrency } = body

    if (!searchId) {
      return NextResponse.json({ success: false, error: 'Missing searchId' }, { status: 400 })
    }

    const db = getDb()

    if (action === 'pause') {
      liveSearchManager.stopLiveSearch(searchId)
      return NextResponse.json({ success: true, data: { status: 'paused' } })
    }

    if (action === 'resume') {
      await liveSearchManager.startLiveSearch(searchId)
      return NextResponse.json({ success: true, data: { status: 'resumed' } })
    }

    // Update config
    if (autoWhisper !== undefined) {
      db.prepare("UPDATE saved_searches SET auto_whisper = ?, updated_at = datetime('now') WHERE id = ?").run(autoWhisper ? 1 : 0, searchId)
    }
    if (maxPriceThreshold !== undefined) {
      db.prepare("UPDATE saved_searches SET max_price_threshold = ?, updated_at = datetime('now') WHERE id = ?").run(maxPriceThreshold, searchId)
    }
    if (priceThresholdCurrency !== undefined) {
      db.prepare("UPDATE saved_searches SET price_threshold_currency = ?, updated_at = datetime('now') WHERE id = ?").run(priceThresholdCurrency, searchId)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Live search update error:', err)
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 })
  }
}
