'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface AuthUser {
  username: string
  displayName: string
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/auth/me')
      if (!res.ok) { setUser(null); return }
      const data = await res.json()
      if (data.success) {
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUser() }, [fetchUser])

  return (
    <AuthContext.Provider value={{ user, loading, refresh: fetchUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
