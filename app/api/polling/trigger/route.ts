import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { checkAllActiveSearches } from '@/lib/polling/saved-search-checker'
import { updateEconomy } from '@/lib/polling/economy-updater'
import { evaluateAlerts } from '@/lib/polling/alert-evaluator'
import { aggregateDaily, purgeOldData } from '@/lib/polling/aggregation'
import { getDb } from '@/lib/db'

export async function POST(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const { job, game = 'poe1', league = 'Standard' } = body

    switch (job) {
      case 'saved-searches': {
        const results = await checkAllActiveSearches()
        await evaluateAlerts(game, league)
        return NextResponse.json({ success: true, data: results })
      }
      case 'economy': {
        const db = getDb()
        const results: Record<string, any> = {}
        for (const g of ['poe1', 'poe2'] as const) {
          const currentLeagues = db.prepare(
            'SELECT league_id FROM leagues WHERE game = ? AND is_current = 1'
          ).all(g) as Array<{ league_id: string }>
          const leagueIds = currentLeagues.length > 0
            ? currentLeagues.map(l => l.league_id)
            : ['Standard']
          for (const lid of leagueIds) {
            results[`${g}/${lid}`] = await updateEconomy(g, lid)
          }
        }
        return NextResponse.json({ success: true, data: results })
      }
      case 'leagues': {
        const db = getDb()
        const upsert = db.prepare(`
          INSERT INTO leagues (game, league_id, label, is_current, updated_at)
          VALUES (?, ?, ?, ?, datetime('now'))
          ON CONFLICT(game, league_id) DO UPDATE SET label = excluded.label, is_current = excluded.is_current, updated_at = datetime('now')
        `)
        // POE1 leagues
        try {
          const res = await fetch('https://www.pathofexile.com/api/trade/data/leagues', {
            headers: { 'User-Agent': 'POETradeAnalyzer/1.0' },
          })
          if (res.ok) {
            const data = await res.json()
            for (const l of (data.result || [])) {
              const id = l.id as string
              const isCurrent = !id.includes('Standard') && !id.includes('SSF') ? 1 : 0
              upsert.run('poe1', id, l.text || id, isCurrent)
            }
          }
        } catch (err) {
          console.error('[Polling] POE1 league fetch error:', err)
        }
        // POE2 leagues
        try {
          const res2 = await fetch('https://www.pathofexile.com/api/trade2/data/leagues', {
            headers: { 'User-Agent': 'POETradeAnalyzer/1.0' },
          })
          if (res2.ok) {
            const data2 = await res2.json()
            for (const l of (data2.result || [])) {
              const id = l.id as string
              const isCurrent = !id.includes('Standard') && !id.includes('SSF') ? 1 : 0
              upsert.run('poe2', id, l.text || id, isCurrent)
            }
          }
        } catch (err) {
          console.error('[Polling] POE2 league fetch error:', err)
        }
        // Ensure Standard always exists for both games
        for (const g of ['poe1', 'poe2']) {
          const exists = db.prepare('SELECT 1 FROM leagues WHERE game = ? AND league_id = ?').get(g, 'Standard')
          if (!exists) {
            upsert.run(g, 'Standard', 'Standard', 0)
          }
        }
        return NextResponse.json({ success: true })
      }
      case 'aggregate-daily': {
        const result = aggregateDaily()
        return NextResponse.json({ success: true, data: result })
      }
      case 'purge': {
        const result = purgeOldData()
        return NextResponse.json({ success: true, data: result })
      }
      default:
        return NextResponse.json({ success: false, error: `Unknown job: ${job}` }, { status: 400 })
    }
  } catch (err) {
    console.error('Polling trigger error:', err)
    return NextResponse.json({ success: false, error: 'Polling failed' }, { status: 500 })
  }
}
