import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import path from 'path'
import { AuthStore, Session, UserProfile } from './types'
import { hashPassword, verifyPassword, hashToken, generateSecureToken } from './password'

const AUTH_FILE = path.join(process.cwd(), 'data', 'auth.json')
const SESSION_DURATION_HOURS = 24

async function getDefaultStore(): Promise<AuthStore> {
  return {
    credentials: {
      username: 'admin',
      passwordHash: await hashPassword('admin'),
    },
    profile: {
      displayName: 'Admin',
    },
    sessions: {},
  }
}

export function loadStore(): AuthStore {
  try {
    if (existsSync(AUTH_FILE)) {
      return JSON.parse(readFileSync(AUTH_FILE, 'utf-8')) as AuthStore
    }
  } catch { /* corrupted file */ }
  return {
    credentials: { username: 'admin', passwordHash: '' },
    profile: { displayName: 'Admin' },
    sessions: {},
  }
}

export async function loadStoreAsync(): Promise<AuthStore> {
  try {
    if (existsSync(AUTH_FILE)) {
      return JSON.parse(readFileSync(AUTH_FILE, 'utf-8')) as AuthStore
    }
  } catch { /* corrupted */ }
  const store = await getDefaultStore()
  saveStore(store)
  return store
}

export function saveStore(store: AuthStore): void {
  const dataDir = path.dirname(AUTH_FILE)
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  writeFileSync(AUTH_FILE, JSON.stringify(store, null, 2), 'utf-8')
}

function cleanExpiredSessions(store: AuthStore): void {
  const now = new Date().toISOString()
  for (const [token, session] of Object.entries(store.sessions)) {
    if (session.expiresAt < now) delete store.sessions[token]
  }
}

export function createSession(ip: string): string {
  const store = loadStore()
  cleanExpiredSessions(store)
  const token = generateSecureToken(32)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_HOURS * 60 * 60 * 1000)
  const tokenHash = hashToken(token)
  store.sessions[tokenHash] = {
    tokenHash,
    ip,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  }
  saveStore(store)
  return token
}

export function validateSession(token: string): Session | null {
  if (!token) return null
  const store = loadStore()
  const tokenHash = hashToken(token)
  const session = store.sessions[tokenHash]
  if (!session) return null
  if (session.expiresAt < new Date().toISOString()) {
    delete store.sessions[tokenHash]
    saveStore(store)
    return null
  }
  return session
}

export function deleteSession(token: string): boolean {
  if (!token) return false
  const store = loadStore()
  const tokenHash = hashToken(token)
  if (store.sessions[tokenHash]) {
    delete store.sessions[tokenHash]
    saveStore(store)
    return true
  }
  return false
}

export async function validateCredentials(username: string, password: string): Promise<boolean> {
  const store = await loadStoreAsync()
  if (username !== store.credentials.username) return false
  return verifyPassword(password, store.credentials.passwordHash)
}

export function getProfile(): UserProfile {
  const store = loadStore()
  return store.profile
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  const store = await loadStoreAsync()
  const isValid = await verifyPassword(currentPassword, store.credentials.passwordHash)
  if (!isValid) return { success: false, error: 'Current password is incorrect' }
  if (newPassword.length < 6) return { success: false, error: 'New password must be at least 6 characters' }
  store.credentials.passwordHash = await hashPassword(newPassword)
  saveStore(store)
  return { success: true }
}
