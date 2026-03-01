const cluster = require('cluster')
const os = require('os')

const NUM_WORKERS = Math.min(Math.max(2, Math.floor(os.cpus().length / 3)), 4)

if (cluster.isPrimary) {
  console.log(`> Primary process ${process.pid} starting ${NUM_WORKERS} workers...`)

  for (let i = 0; i < NUM_WORKERS; i++) {
    cluster.fork()
  }

  // IPC relay: forward live-search events from worker #1 to all workers
  for (const id in cluster.workers) {
    cluster.workers[id].on('message', (msg) => {
      if (msg && (msg.type === 'live-search-event' || msg.type === 'live-search-stop')) {
        for (const wid in cluster.workers) {
          if (wid !== id) {
            try { cluster.workers[wid].send(msg) } catch { /* ignore dead worker */ }
          }
        }
      }
    })
  }

  cluster.on('exit', (worker, code, signal) => {
    if (signal !== 'SIGTERM' && signal !== 'SIGINT') {
      console.log(`> Worker ${worker.process.pid} died (code: ${code}, signal: ${signal}), restarting...`)
      cluster.fork()
    }
  })

  function primaryShutdown(signal) {
    console.log(`> Primary received ${signal}, shutting down all workers...`)
    for (const id in cluster.workers) {
      cluster.workers[id].process.kill('SIGTERM')
    }
    setTimeout(() => process.exit(0), 12000).unref()
  }

  process.on('SIGTERM', () => primaryShutdown('SIGTERM'))
  process.on('SIGINT', () => primaryShutdown('SIGINT'))

} else {
  const { createServer } = require('http')
  const { parse } = require('url')
  const next = require('next')
  const compression = require('compression')
  const { startPolling, stopPolling } = require('./lib/polling.js')
  const { initLiveSearches } = require('./lib/live-search-init.js')

  const dev = false
  const hostname = '127.0.0.1'
  const port = parseInt(process.env.PORT || '3009', 10)

  const app = next({ dev, hostname, port })
  const handle = app.getRequestHandler()

  const isPrimaryWorker = cluster.worker.id === 1

  let httpServer = null

  function gracefulShutdown(signal) {
    console.log(`> Worker ${process.pid} received ${signal}, shutting down...`)
    if (isPrimaryWorker) stopPolling()
    if (httpServer) {
      httpServer.close(() => {
        console.log(`> Worker ${process.pid} HTTP server closed`)
        process.exit(0)
      })
      setTimeout(() => process.exit(1), 10000).unref()
    } else {
      process.exit(0)
    }
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
  process.on('SIGINT', () => gracefulShutdown('SIGINT'))

  // Listen for IPC messages from other workers (live search events relay)
  process.on('message', (msg) => {
    if (msg && msg.type === 'live-search-event') {
      // Store in a global queue that SSE endpoints can read
      if (!global.__liveSearchEvents) global.__liveSearchEvents = []
      global.__liveSearchEvents.push(msg.payload)
      // Keep only last 100 events
      if (global.__liveSearchEvents.length > 100) {
        global.__liveSearchEvents = global.__liveSearchEvents.slice(-100)
      }
    }
    if (msg && msg.type === 'live-search-stop') {
      // Another worker stopped a live search — close the WebSocket locally if we have it
      try {
        const { liveSearchManager } = require('./lib/trade/live-search-manager')
        liveSearchManager.stopLocal(msg.payload.searchId)
      } catch { /* ignore */ }
    }
  })

  const compress = compression()

  app.prepare().then(() => {
    httpServer = createServer((req, res) => {
      const parsedUrl = parse(req.url, true)

      // SSE endpoint: skip compression and disable request/socket timeout
      if (parsedUrl.pathname === '/api/live-search/stream') {
        req.setTimeout(0)
        res.setTimeout(0)
        if (req.socket) req.socket.setTimeout(0)
        handle(req, res, parsedUrl)
        return
      }

      compress(req, res, () => {
        const isStaticAsset = parsedUrl.pathname && (
          parsedUrl.pathname.startsWith('/_next/static') ||
          parsedUrl.pathname.startsWith('/_next/image') ||
          parsedUrl.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?)$/)
        )
        if (!isStaticAsset) {
          const originalWriteHead = res.writeHead.bind(res)
          res.writeHead = function (statusCode, ...args) {
            res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate')
            res.removeHeader('x-nextjs-cache')
            res.removeHeader('x-nextjs-stale-time')
            return originalWriteHead(statusCode, ...args)
          }
        } else {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        }

        handle(req, res, parsedUrl)
      })
    })

    httpServer.requestTimeout = 120_000

    httpServer.listen(port, hostname, () => {
      console.log(`> Worker ${process.pid} ready on http://${hostname}:${port}`)

      if (isPrimaryWorker) {
        startPolling(port)
        // Resume live searches after a brief delay
        initLiveSearches(port)
      }
    })
  })
}
