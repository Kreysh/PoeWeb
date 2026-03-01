import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'

const USER_AGENT = 'POETradeAnalyzer/1.0 (contact: poe-trade@comercialcmc.cc)'
const VALIDATE_TIMEOUT_MS = 10_000

export async function POST(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  try {
    const rawPoesessid = (await request.json()).poesessid
    const poesessid = typeof rawPoesessid === 'string' ? rawPoesessid.trim() : rawPoesessid

    if (!poesessid || typeof poesessid !== 'string' || poesessid.length < 26 || poesessid.length > 128 || !/^[a-zA-Z0-9]+$/.test(poesessid)) {
      return NextResponse.json({ success: true, data: { valid: false, reason: 'POESESSID inválido. Debe ser entre 26 y 128 caracteres alfanuméricos.' } })
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), VALIDATE_TIMEOUT_MS)

    try {
      const res = await fetch('https://www.pathofexile.com/api/profile', {
        headers: {
          'User-Agent': USER_AGENT,
          'Cookie': `POESESSID=${poesessid}`,
          'Accept': 'application/json',
        },
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (res.ok) {
        let profile: any
        try {
          profile = await res.json()
        } catch {
          return NextResponse.json({
            success: true,
            data: { valid: false, reason: 'GGG retornó una respuesta inesperada. Intenta de nuevo más tarde.' },
          })
        }
        return NextResponse.json({
          success: true,
          data: {
            valid: true,
            accountName: profile.name || profile.accountName || 'Desconocido',
          },
        })
      }

      if (res.status === 401 || res.status === 403) {
        return NextResponse.json({
          success: true,
          data: { valid: false, reason: 'POESESSID expirado o inválido' },
        })
      }

      return NextResponse.json({
        success: true,
        data: { valid: false, reason: `Error de GGG (${res.status})` },
      })
    } catch (err: any) {
      clearTimeout(timeout)
      if (err.name === 'AbortError') {
        return NextResponse.json({
          success: true,
          data: { valid: false, reason: 'Timeout al contactar GGG (10s)' },
        })
      }
      const reason = err instanceof SyntaxError
        ? 'GGG retornó una respuesta inesperada. Intenta de nuevo más tarde.'
        : 'No se pudo conectar con GGG. Verifica tu conexión.'
      return NextResponse.json({
        success: true,
        data: { valid: false, reason },
      })
    }
  } catch (err) {
    console.error('Validate session error:', err)
    return NextResponse.json({ success: false, error: 'Error al validar sesión' }, { status: 500 })
  }
}
