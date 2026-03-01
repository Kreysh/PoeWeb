export interface AuthCredentials {
  username: string
  passwordHash: string
}

export interface UserProfile {
  displayName: string
}

export interface Session {
  tokenHash: string
  ip: string
  createdAt: string
  expiresAt: string
}

export interface AuthStore {
  credentials: AuthCredentials
  profile: UserProfile
  sessions: Record<string, Session>
}
