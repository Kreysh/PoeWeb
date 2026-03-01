const { createServer } = require('https')
const { parse } = require('url')
const next = require('next')
const fs = require('fs')
const path = require('path')
const compression = require('compression')

const dev = false
const hostname = '127.0.0.1'
const port = parseInt(process.env.PORT || '8447', 10)

const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'server.key')),
  cert: fs.readFileSync(path.join(__dirname, 'server.crt')),
}

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

let httpServer = null

function gracefulShutdown(signal) {
  console.log(`> Received ${signal}, shutting down gracefully...`)
  if (httpServer) {
    httpServer.close(() => {
      console.log('> HTTPS server closed')
      process.exit(0)
    })
    setTimeout(() => process.exit(1), 10000).unref()
  } else {
    process.exit(0)
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

const compress = compression()

app.prepare().then(() => {
  httpServer = createServer(httpsOptions, (req, res) => {
    compress(req, res, () => {
      const parsedUrl = parse(req.url, true)

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

  httpServer.listen(port, hostname, () => {
    console.log(`> HTTPS server ready on https://${hostname}:${port}`)
  })
})
