import { cookies } from 'next/headers'

const SESSION_COOKIE_NAME = 'poe_trade_session'
const SESSION_MAX_AGE = 24 * 60 * 60 // 24 hours

export async function getSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get(SESSION_COOKIE_NAME)?.value
}

export async function createSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
}

export async function deleteSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}
