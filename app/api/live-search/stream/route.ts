import { requireAuth } from '@/lib/auth/require-auth'
import { liveSearchManager } from '@/lib/trade/live-search-manager'
import type { LiveSearchEvent } from '@/lib/trade/live-search-manager'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const encoder = new TextEncoder()
  let closed = false
  let listener: ((event: LiveSearchEvent) => void) | null = null
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null
  let ipcInterval: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`))

      // Send current active searches
      const status = liveSearchManager.getStatus()
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', active: status, timestamp: new Date().toISOString() })}\n\n`))

      // Listen for live search events
      listener = (event: LiveSearchEvent) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch {
          closed = true
        }
      }

      liveSearchManager.on('live-event', listener)

      // Also check global IPC events from other workers
      ipcInterval = setInterval(() => {
        if (closed) {
          return
        }
        const events = (global as any).__liveSearchEvents as LiveSearchEvent[] | undefined
        if (events && events.length > 0) {
          for (const event of events) {
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
            } catch {
              closed = true
              break
            }
          }
          ;(global as any).__liveSearchEvents = []
        }
      }, 1000)

      // Heartbeat every 30s
      heartbeatInterval = setInterval(() => {
        if (closed) {
          return
        }
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`))
        } catch {
          closed = true
        }
      }, 30000)
    },
    cancel() {
      closed = true
      if (listener) {
        liveSearchManager.removeListener('live-event', listener)
        listener = null
      }
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval)
        heartbeatInterval = null
      }
      if (ipcInterval) {
        clearInterval(ipcInterval)
        ipcInterval = null
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
