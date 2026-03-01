import { NextResponse } from 'next/server'
import { getSessionToken } from '@/lib/auth/session'
import { validateSession, getProfile, loadStore } from '@/lib/auth/store'

export async function GET() {
  try {
    const token = await getSessionToken()
    if (!token) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    const session = validateSession(token)
    if (!session) return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 })
    const profile = getProfile()
    const store = loadStore()
    return NextResponse.json({
      success: true,
      user: { username: store.credentials.username, displayName: profile.displayName },
    })
  } catch (err) {
    console.error('Auth me error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
