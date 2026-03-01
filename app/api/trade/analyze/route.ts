import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { parseTradeUrl, fetchAllSearchItems } from '@/lib/trade/url-analyzer'
import { analyzeItems } from '@/lib/trade/search-analyzer'

const TIMEOUT_MAP: Record<number, number> = {
  50: 30000,
  100: 60000,
  200: 60000,
  500: 150000,
  1000: 300000,
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const { tradeUrl, maxItems } = body

    if (!tradeUrl || typeof tradeUrl !== 'string') {
      return NextResponse.json({ success: false, error: 'URL de trade requerida' }, { status: 400 })
    }

    const rawMax = typeof maxItems === 'number' && !isNaN(maxItems) ? maxItems : 100
    const clampedMax = Math.min(Math.max(10, rawMax), 1000)
    const timeout = TIMEOUT_MAP[clampedMax] || 60000

    // Parse the trade URL
    let parsed
    try {
      parsed = parseTradeUrl(tradeUrl)
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 400 })
    }

    // For >200 items, use SSE streaming
    if (clampedMax > 200) {
      return streamAnalysis(parsed, clampedMax, timeout)
    }

    // Standard JSON response for <= 200 items
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)

    try {
      const { items, total, failedBatches } = await fetchAllSearchItems(
        parsed.game, parsed.league, parsed.queryId, clampedMax,
        undefined, controller.signal,
      )

      if (items.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            game: parsed.game, league: parsed.league, queryId: parsed.queryId,
            totalItems: 0, totalInSearch: total,
            message: 'No se encontraron items para esta búsqueda',
          },
        })
      }

      const analysis = analyzeItems(items, total)
      const warning = failedBatches > 0
        ? `${failedBatches} batch(es) fallaron. Los resultados pueden estar incompletos.`
        : undefined

      return NextResponse.json({
        success: true,
        data: {
          game: parsed.game, league: parsed.league, queryId: parsed.queryId,
          ...analysis, ...(warning ? { warning } : {}),
        },
      })
    } finally {
      clearTimeout(timer)
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return NextResponse.json(
        { success: false, error: 'Análisis excedió el tiempo límite' },
        { status: 504 },
      )
    }
    console.error('Analyze error:', err)
    return NextResponse.json({ success: false, error: err.message || 'Error en el análisis' }, { status: 500 })
  }
}

function streamAnalysis(
  parsed: { game: 'poe1' | 'poe2'; league: string; queryId: string },
  maxItems: number,
  timeout: number,
) {
  const encoder = new TextEncoder()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  const stream = new ReadableStream({
    async start(streamController) {
      const send = (data: Record<string, unknown>) => {
        streamController.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const { items, total, failedBatches } = await fetchAllSearchItems(
          parsed.game, parsed.league, parsed.queryId, maxItems,
          (fetched, totalExpected) => {
            send({ type: 'progress', fetched, total: totalExpected })
          },
          controller.signal,
        )

        if (items.length === 0) {
          send({
            type: 'complete',
            data: {
              game: parsed.game, league: parsed.league, queryId: parsed.queryId,
              totalItems: 0, totalInSearch: total,
              message: 'No se encontraron items para esta búsqueda',
            },
          })
        } else {
          const analysis = analyzeItems(items, total)
          const warning = failedBatches > 0
            ? `${failedBatches} batch(es) fallaron. Los resultados pueden estar incompletos.`
            : undefined

          send({
            type: 'complete',
            data: {
              game: parsed.game, league: parsed.league, queryId: parsed.queryId,
              ...analysis, ...(warning ? { warning } : {}),
            },
          })
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          send({ type: 'error', error: 'Análisis excedió el tiempo límite' })
        } else {
          send({ type: 'error', error: err.message || 'Error en el análisis' })
        }
      } finally {
        clearTimeout(timer)
        streamController.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
