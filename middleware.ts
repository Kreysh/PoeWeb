import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/_next', '/api/auth', '/api/health', '/favicon.ico']

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(path => pathname.startsWith(path))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublicPath(pathname)) return NextResponse.next()
  if (pathname.includes('.') && !pathname.startsWith('/api')) return NextResponse.next()

  const sessionToken = request.cookies.get('poe_trade_session')?.value

  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  if (sessionToken && /^[a-f0-9]{64}$/i.test(sessionToken)) {
    const response = NextResponse.next()
    response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate')
    return response
  }

  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
  const baseUrl = forwardedHost ? `${forwardedProto}://${forwardedHost}` : request.url
  const loginUrl = new URL('/login', baseUrl)
  loginUrl.searchParams.set('redirect', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
