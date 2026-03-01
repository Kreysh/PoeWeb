'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Swords, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (data.success) {
        router.push(redirect)
      } else {
        setError(data.error || 'Credenciales inválidas')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-slate-300">Usuario</label>
        <input
          id="username"
          type="text"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mt-1 block w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-poe-gold focus:outline-none focus:ring-1 focus:ring-poe-gold"
          placeholder="admin"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-300">Contraseña</label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-poe-gold focus:outline-none focus:ring-1 focus:ring-poe-gold"
          placeholder="password"
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-poe-gold hover:bg-poe-gold/90 text-white">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
      </Button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <Swords className="mx-auto h-12 w-12 text-poe-gold" />
          <h1 className="mt-4 text-2xl font-bold text-poe-gold-light">POE Trade Analyzer</h1>
          <p className="mt-1 text-sm text-slate-400">Path of Exile 1 & 2</p>
        </div>
        <Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-slate-800" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
