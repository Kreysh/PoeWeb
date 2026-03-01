'use client'

import { useState, useEffect, useRef } from 'react'

interface UseApiOptions {
  refreshInterval?: number
  enabled?: boolean
}

interface UseApiResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useApi<T>(
  endpoint: string | null,
  params?: Record<string, string | number | undefined>,
  options: UseApiOptions = {}
): UseApiResult<T> {
  const { refreshInterval, enabled = true } = options
  const effectiveEnabled = enabled && endpoint !== null
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const fetchCountRef = useRef(0)

  const paramsKey = JSON.stringify(params ?? {})
  const fetchKey = `${endpoint || '__null__'}|${paramsKey}`
  const prevKeyRef = useRef(fetchKey)

  useEffect(() => {
    if (!effectiveEnabled) {
      setLoading(false)
      return
    }

    if (prevKeyRef.current !== fetchKey) {
      prevKeyRef.current = fetchKey
      setLoading(true)
    }

    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const currentFetch = ++fetchCountRef.current

    const doFetch = async () => {
      try {
        const searchParams = new URLSearchParams()
        if (params) {
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined) searchParams.set(key, String(value))
          })
        }
        const url = `${endpoint}${searchParams.toString() ? '?' + searchParams.toString() : ''}`
        const res = await fetch(url, { signal: controller.signal })
        const json = await res.json()
        if (currentFetch !== fetchCountRef.current) return
        if (json.success && json.data !== undefined) {
          setData(json.data)
          setError(null)
        } else {
          setError(json.error || 'Unknown error')
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        if (currentFetch !== fetchCountRef.current) return
        setError(err instanceof Error ? err.message : 'Connection error')
      } finally {
        if (currentFetch === fetchCountRef.current) setLoading(false)
      }
    }

    doFetch()

    let interval: NodeJS.Timeout | null = null
    if (refreshInterval && refreshInterval > 0) {
      interval = setInterval(doFetch, refreshInterval)
    }

    return () => {
      controller.abort()
      if (interval) clearInterval(interval)
    }
  }, [fetchKey, effectiveEnabled, refreshInterval]) // eslint-disable-line react-hooks/exhaustive-deps

  const refetch = async () => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    const currentFetch = ++fetchCountRef.current
    try {
      const searchParams = new URLSearchParams()
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) searchParams.set(key, String(value))
        })
      }
      const url = `${endpoint}${searchParams.toString() ? '?' + searchParams.toString() : ''}`
      const res = await fetch(url, { signal: controller.signal })
      const json = await res.json()
      if (currentFetch !== fetchCountRef.current) return
      if (json.success && json.data !== undefined) {
        setData(json.data)
        setError(null)
      } else {
        setError(json.error || 'Unknown error')
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      if (currentFetch !== fetchCountRef.current) return
      setError(err instanceof Error ? err.message : 'Connection error')
    } finally {
      if (currentFetch === fetchCountRef.current) setLoading(false)
    }
  }

  return { data, loading, error, refetch }
}
