'use client'

import { useState } from 'react'
import { useGame } from '@/lib/contexts/game-context'
import { useApi } from '@/lib/hooks/use-api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { LiveSearchPanel } from '@/components/search/live-search-panel'
import { RefreshCw, Trash2, Clock, Eye, Radio, Square, Wifi, Link, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface SavedSearch {
  id: number
  game: string
  league: string
  name: string
  description: string | null
  query_id: string | null
  is_active: number
  poll_interval_min: number
  last_checked_at: string | null
  last_result_count: number
  new_since_last: number
  live_mode: string
  auto_whisper: number
  max_price_threshold: number | null
  price_threshold_currency: string | null
  created_at: string
}

export default function SavedSearchesPage() {
  const { game } = useGame()
  const { data: searches, loading, refetch } = useApi<SavedSearch[]>('/api/saved-searches', { game })
  const [checking, setChecking] = useState<number | null>(null)
  const [togglingLive, setTogglingLive] = useState<number | null>(null)
  const [liveFeedId, setLiveFeedId] = useState<number | null>(null)
  const [configuring, setConfiguring] = useState<number | null>(null)
  const [importUrl, setImportUrl] = useState('')
  const [importName, setImportName] = useState('')
  const [importing, setImporting] = useState(false)

  const handleToggle = async (id: number, active: boolean) => {
    await fetch(`/api/saved-searches/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: active }),
    })
    refetch()
  }

  const handleCheck = async (id: number) => {
    setChecking(id)
    try {
      const res = await fetch(`/api/saved-searches/${id}/check`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        toast.success(`Se encontraron ${data.data.totalFound} items (${data.data.newItems} nuevos)`)
      } else {
        toast.error(data.error)
      }
    } catch {
      toast.error('Error al verificar')
    }
    setChecking(null)
    refetch()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta búsqueda guardada?')) return
    await fetch(`/api/live-search?searchId=${id}`, { method: 'DELETE' }).catch(() => {})
    await fetch(`/api/saved-searches/${id}`, { method: 'DELETE' })
    toast.success('Búsqueda eliminada')
    refetch()
  }

  const handleToggleLive = async (id: number, goLive: boolean) => {
    setTogglingLive(id)
    try {
      if (goLive) {
        const res = await fetch('/api/live-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ searchId: id }),
        })
        const data = await res.json()
        if (data.success) {
          toast.success('Búsqueda en vivo iniciada')
        } else {
          toast.error(data.error)
        }
      } else {
        await fetch(`/api/live-search?searchId=${id}`, { method: 'DELETE' })
        toast.success('Búsqueda en vivo detenida')
      }
    } catch {
      toast.error('Error al cambiar modo en vivo')
    }
    refetch().finally(() => setTogglingLive(null))
  }

  const handleAutoWhisperConfig = async (id: number, autoWhisper: boolean, maxPrice?: number, currency?: string) => {
    try {
      await fetch('/api/live-search', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchId: id, autoWhisper, maxPriceThreshold: maxPrice, priceThresholdCurrency: currency }),
      })
      toast.success('Config de auto-whisper actualizada')
      refetch()
    } catch {
      toast.error('Error al actualizar config')
    }
  }

  const handleImportUrl = async () => {
    if (!importUrl.trim()) { toast.error('Ingresa una URL'); return }
    setImporting(true)
    try {
      // Parse URL client-side
      let parsed: URL
      try { parsed = new URL(importUrl.trim()) } catch { toast.error('URL inválida'); setImporting(false); return }
      if (!parsed.hostname.includes('pathofexile.com')) { toast.error('La URL debe ser de pathofexile.com'); setImporting(false); return }

      const path = parsed.pathname
      let urlGame: string, league: string, queryId: string

      const poe2Match = path.match(/^\/trade2\/search\/poe2\/([^/]+)\/([a-zA-Z0-9]+)$/)
      const poe1Match = path.match(/^\/trade\/search\/([^/]+)\/([a-zA-Z0-9]+)$/)

      if (poe2Match) {
        urlGame = 'poe2'; league = decodeURIComponent(poe2Match[1]); queryId = poe2Match[2]
      } else if (poe1Match) {
        urlGame = 'poe1'; league = decodeURIComponent(poe1Match[1]); queryId = poe1Match[2]
      } else {
        toast.error('Formato de URL no reconocido')
        setImporting(false)
        return
      }

      const name = importName.trim() || `Importada ${queryId.substring(0, 8)}`
      const res = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: urlGame, league, name, query_id: queryId, trade_url: importUrl.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Búsqueda importada correctamente')
        setImportUrl('')
        setImportName('')
        refetch()
      } else {
        toast.error(data.error)
      }
    } catch {
      toast.error('Error al importar')
    }
    setImporting(false)
  }

  return (
    <div className="space-y-4">
      {/* Import from URL */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
            <Link className="h-4 w-4 text-poe-gold" /> Importar desde URL
          </h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={importName}
              onChange={e => setImportName(e.target.value)}
              placeholder="Nombre (opcional)"
              className="sm:w-48 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="text"
              value={importUrl}
              onChange={e => setImportUrl(e.target.value)}
              placeholder="https://www.pathofexile.com/trade/search/..."
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              onKeyDown={e => e.key === 'Enter' && handleImportUrl()}
            />
            <Button
              size="sm"
              className="h-9 bg-poe-gold hover:bg-poe-gold/90"
              onClick={handleImportUrl}
              disabled={importing}
            >
              <ExternalLink className="mr-1 h-3.5 w-3.5" />
              {importing ? 'Importando...' : 'Importar'}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Pega una URL de búsqueda de pathofexile.com/trade. Solo soporta modo En Vivo (WebSocket).
          </p>
        </CardContent>
      </Card>

      {/* Live Feed Panel */}
      {liveFeedId && (
        <LiveSearchPanel
          searchId={liveFeedId}
          searchName={searches?.find(s => s.id === liveFeedId)?.name}
          onClose={() => setLiveFeedId(null)}
        />
      )}

      {loading && !searches?.length ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>
      ) : !searches?.length ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Sin búsquedas guardadas. Usa la página de Búsqueda para crear una, o importa una URL arriba.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {searches.map(search => {
            const isLive = search.live_mode === 'live'
            const isUrlImported = !!search.query_id
            return (
              <Card key={search.id} className={cn('overflow-hidden', isLive && 'border-green-500/30')}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-medium text-sm flex items-center gap-1.5">
                        {search.name}
                        {isLive && (
                          <Badge className="text-[10px] bg-green-500/20 text-green-400 border-green-500/30 animate-pulse">
                            <Wifi className="h-2.5 w-2.5 mr-0.5" /> EN VIVO
                          </Badge>
                        )}
                        {isUrlImported && (
                          <Badge variant="outline" className="text-[10px]">
                            <Link className="h-2.5 w-2.5 mr-0.5" /> URL
                          </Badge>
                        )}
                      </h3>
                      {search.description && <p className="text-xs text-muted-foreground mt-0.5">{search.description}</p>}
                    </div>
                    <Switch checked={!!search.is_active} onCheckedChange={(v) => handleToggle(search.id, v)} />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-[10px]">{search.league}</Badge>
                    <Badge variant="outline" className="text-[10px]">{search.last_result_count} resultados</Badge>
                    {search.new_since_last > 0 && (
                      <Badge className="text-[10px] bg-green-500/20 text-green-400 border-green-500/30">{search.new_since_last} nuevos</Badge>
                    )}
                    {search.auto_whisper ? (
                      <Badge className="text-[10px] bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Auto-whisper</Badge>
                    ) : null}
                  </div>

                  <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {search.last_checked_at ? `Verificado ${new Date(search.last_checked_at).toLocaleString()}` : 'Nunca verificado'}
                    <span className="ml-auto">{isLive ? 'En Vivo' : `Cada ${search.poll_interval_min}m`}</span>
                  </div>

                  {/* Auto-whisper config */}
                  {configuring === search.id && (
                    <div className="mt-2 p-2 rounded bg-muted/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Auto-whisper</span>
                        <Switch
                          checked={!!search.auto_whisper}
                          onCheckedChange={(v) => handleAutoWhisperConfig(search.id, v, search.max_price_threshold || undefined, search.price_threshold_currency || undefined)}
                        />
                      </div>
                      {search.auto_whisper ? (
                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder="Precio máx"
                            defaultValue={search.max_price_threshold || ''}
                            className="flex-1 rounded border border-input bg-background px-2 py-1 text-xs"
                            onBlur={(e) => handleAutoWhisperConfig(search.id, true, parseFloat(e.target.value) || undefined, search.price_threshold_currency || undefined)}
                          />
                          <select
                            defaultValue={search.price_threshold_currency || 'chaos'}
                            className="rounded border border-input bg-background px-2 py-1 text-xs"
                            onChange={(e) => handleAutoWhisperConfig(search.id, true, search.max_price_threshold || undefined, e.target.value)}
                          >
                            <option value="chaos">Chaos</option>
                            <option value="divine">Divine</option>
                            <option value="exalted">Exalted</option>
                          </select>
                        </div>
                      ) : null}
                    </div>
                  )}

                  <div className="mt-3 flex gap-1.5 flex-wrap">
                    {/* Live toggle */}
                    {isLive ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-red-500/30 text-red-400"
                        onClick={() => handleToggleLive(search.id, false)}
                        disabled={togglingLive === search.id}
                      >
                        <Square className="mr-1 h-3 w-3" /> Detener
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-green-500/30 text-green-400"
                        onClick={() => handleToggleLive(search.id, true)}
                        disabled={togglingLive === search.id}
                      >
                        <Radio className={cn('mr-1 h-3 w-3', togglingLive === search.id && 'animate-pulse')} /> En Vivo
                      </Button>
                    )}

                    {!isUrlImported && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => handleCheck(search.id)}
                        disabled={checking === search.id}
                      >
                        <RefreshCw className={`mr-1 h-3 w-3 ${checking === search.id ? 'animate-spin' : ''}`} />
                        Verificar
                      </Button>
                    )}

                    {isLive && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setLiveFeedId(liveFeedId === search.id ? null : search.id)}>
                        <Eye className="h-3 w-3 mr-1" /> Feed
                      </Button>
                    )}

                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setConfiguring(configuring === search.id ? null : search.id)}>
                      Config
                    </Button>

                    <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500 hover:text-red-400 ml-auto" onClick={() => handleDelete(search.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
