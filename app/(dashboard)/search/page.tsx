'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useGame } from '@/lib/contexts/game-context'
import { SearchForm } from '@/components/search/search-form'
import { ItemCard } from '@/components/search/item-card'
import { LiveSearchPanel } from '@/components/search/live-search-panel'
import { buildTradeQuery } from '@/lib/trade/query-builder'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bookmark, Radio, Square } from 'lucide-react'
import { toast } from 'sonner'
import type { ParsedItem } from '@/lib/trade/types'

export default function SearchPage() {
  const { game, league } = useGame()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<ParsedItem[]>([])
  const [totalResults, setTotalResults] = useState(0)
  const [lastQuery, setLastQuery] = useState<any>(null)
  const [queryId, setQueryId] = useState<string>('')
  const [liveSearchId, setLiveSearchId] = useState<number | null>(null)
  const [liveSearchName, setLiveSearchName] = useState('')
  const [goingLive, setGoingLive] = useState(false)

  const handleSearch = async (filters: any) => {
    setLoading(true)
    setResults([])
    try {
      const query = buildTradeQuery(filters)
      setLastQuery(filters)

      const searchRes = await fetch('/api/trade/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game, league, query }),
      })
      const searchData = await searchRes.json()
      if (!searchData.success) throw new Error(searchData.error)

      setTotalResults(searchData.data.total)
      setQueryId(searchData.data.id)

      if (searchData.data.result.length === 0) {
        toast.info('No se encontraron items')
        return
      }

      const ids = searchData.data.result.slice(0, 10).join(',')
      const fetchRes = await fetch(`/api/trade/fetch?game=${game}&ids=${ids}&queryId=${searchData.data.id}`)
      const fetchData = await fetchRes.json()
      if (!fetchData.success) throw new Error(fetchData.error)

      setResults(fetchData.data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error en la búsqueda')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSearch = async () => {
    if (!lastQuery) return
    const name = prompt('Nombre para esta búsqueda:')
    if (!name) return

    try {
      const query = buildTradeQuery(lastQuery)
      const res = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game, league, name, query_json: query }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Búsqueda guardada')
        return data.data?.id
      } else {
        toast.error(data.error)
      }
    } catch {
      toast.error('Error al guardar búsqueda')
    }
    return null
  }

  const handleGoLive = async () => {
    if (!lastQuery) {
      toast.error('Ejecuta una búsqueda primero')
      return
    }

    setGoingLive(true)
    try {
      // Save search first if not saved
      let searchId = liveSearchId
      if (!searchId) {
        const name = prompt('Nombre para esta búsqueda en vivo:')
        if (!name) {
          setGoingLive(false)
          return
        }
        const query = buildTradeQuery(lastQuery)
        const saveRes = await fetch('/api/saved-searches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ game, league, name, query_json: query }),
        })
        const saveData = await saveRes.json()
        if (!saveData.success) throw new Error(saveData.error)
        searchId = saveData.data.id
        setLiveSearchName(name)
      }

      // Start live search
      const res = await fetch('/api/live-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchId }),
      })
      const data = await res.json()
      if (data.success) {
        setLiveSearchId(searchId)
        toast.success('Búsqueda en vivo iniciada')
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al iniciar búsqueda en vivo')
    }
    setGoingLive(false)
  }

  const handleStopLive = async () => {
    if (!liveSearchId) return
    try {
      await fetch(`/api/live-search?searchId=${liveSearchId}`, { method: 'DELETE' })
      setLiveSearchId(null)
      toast.success('Búsqueda en vivo detenida')
    } catch {
      toast.error('Error al detener búsqueda en vivo')
    }
  }

  return (
    <div className="space-y-4">
      <SearchForm onSearch={handleSearch} loading={loading} />

      {totalResults > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{totalResults} resultados</Badge>
            <span className="text-xs text-muted-foreground">Mostrando {results.length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {liveSearchId ? (
              <Button size="sm" variant="outline" onClick={handleStopLive} className="h-8 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10">
                <Square className="mr-1 h-3.5 w-3.5" /> Detener
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={handleGoLive}
                disabled={goingLive}
                className="h-8 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10"
              >
                <Radio className={`mr-1 h-3.5 w-3.5 ${goingLive ? 'animate-pulse' : ''}`} /> En Vivo
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleSaveSearch} className="h-8 text-xs">
              <Bookmark className="mr-1 h-3.5 w-3.5" /> Guardar Búsqueda
            </Button>
          </div>
        </div>
      )}

      {/* Live Search Panel */}
      {liveSearchId && (
        <LiveSearchPanel
          searchId={liveSearchId}
          searchName={liveSearchName}
          onClose={handleStopLive}
        />
      )}

      <div className="space-y-2">
        {results.map(item => (
          <ItemCard
            key={item.id}
            item={item}
            onViewDetail={() => router.push(`/item/${item.id}?data=${encodeURIComponent(JSON.stringify(item))}`)}
          />
        ))}
      </div>
    </div>
  )
}
