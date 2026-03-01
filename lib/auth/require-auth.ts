import { NextResponse } from 'next/server'
import { getSessionToken } from './session'
import { validateSession } from './store'

export async function requireAuth() {
  const token = await getSessionToken()
  if (!token) {
    return { error: NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 }) }
  }
  const session = validateSession(token)
  if (!session) {
    return { error: NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 }) }
  }
  return { session }
}
