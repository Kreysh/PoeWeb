import { NextResponse } from 'next/server'
import { deleteSession } from '@/lib/auth/store'
import { getSessionToken, deleteSessionCookie } from '@/lib/auth/session'

export async function POST() {
  try {
    const token = await getSessionToken()
    if (token) deleteSession(token)
    await deleteSessionCookie()
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Logout error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
