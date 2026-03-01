/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['better-sqlite3'],

  images: {
    formats: ['image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'web.poecdn.com' },
      { protocol: 'https', hostname: 'poe2scout.com' },
    ],
  },

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  experimental: {
    optimizePackageImports: ['@tremor/react', 'lucide-react'],
  },

  async headers() {
    return [
      {
        source: '/:path((?!_next/static|_next/image).*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
