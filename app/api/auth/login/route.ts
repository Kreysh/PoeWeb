import { NextResponse } from 'next/server'
import { validateCredentials, createSession } from '@/lib/auth/store'
import { createSessionCookie } from '@/lib/auth/session'

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()
    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Username and password required' }, { status: 400 })
    }
    const forwardedFor = request.headers.get('x-forwarded-for')
    const ip = forwardedFor?.split(',')[0]?.trim() || '127.0.0.1'
    const valid = await validateCredentials(username, password)
    if (!valid) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
    }
    const token = createSession(ip)
    await createSessionCookie(token)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
