'use client'

import { useState, useCallback } from 'react'
import { useGame } from '@/lib/contexts/game-context'
import { useApi } from '@/lib/hooks/use-api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { CategoryTabs } from '@/components/economy/category-tabs'
import { ItemTable } from '@/components/economy/item-table'
import { PriceChartModal } from '@/components/economy/price-chart-modal'
import { AnalysisCards } from '@/components/economy/analysis-cards'
import { CATEGORY_GROUPS } from '@/lib/economy/categories'
import { TrendingUp, TrendingDown, Package, Clock } from 'lucide-react'

interface CurrencyRate {
  currency_id: string
  currency_label: string
  chaos_equivalent: number
  divine_equivalent: number | null
  icon_url: string | null
  change_24h: number | null
  updated_at: string
}

interface CategoryCount {
  type: string
  count: number
}

export default function EconomyPage() {
  const { game, league, config } = useGame()
  const [activeGroup, setActiveGroup] = useState('currency')
  const [activeType, setActiveType] = useState(game === 'poe1' ? 'Currency' : 'currency')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('chaos_value')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [tab, setTab] = useState<'browse' | 'analysis'>('browse')

  const isCurrencyType = activeType === 'Currency' || activeType === 'currency'

  // Fetch category counts
  const { data: categories } = useApi<CategoryCount[]>('/api/economy/categories', { game, league })
  const categoryCounts: Record<string, number> = {}
  if (categories) {
    for (const cat of categories) {
      categoryCounts[cat.type] = cat.count
    }
  }

  // Fetch currency data (when on currency tab)
  const { data: currencies, loading: currLoading } = useApi<CurrencyRate[]>(
    '/api/economy/currency',
    { game, league },
    { refreshInterval: 300000 }
  )

  // Fetch items data (when on item tab)
  const { data: itemsData, loading: itemsLoading } = useApi<{
    items: any[]
    total: number
    page: number
    totalPages: number
  }>(
    isCurrencyType ? null : '/api/economy/items',
    { game, league, type: activeType, search, sort, order, page, limit: 50 }
  )

  // KPIs
  const totalTracked = Object.values(categoryCounts).reduce((a, b) => a + b, 0)
  const topGainer = currencies?.reduce((best, c) => (c.change_24h || 0) > (best?.change_24h || 0) ? c : best, currencies[0])
  const topLoser = currencies?.reduce((best, c) => (c.change_24h || -Infinity) < (best?.change_24h || 0) ? c : best, currencies[0])

  const handleSortChange = useCallback((col: string) => {
    if (col === sort) {
      setOrder(o => o === 'asc' ? 'desc' : 'asc')
    } else {
      setSort(col)
      setOrder('desc')
    }
    setPage(1)
  }, [sort])

  const handleGroupChange = (group: string) => {
    setActiveGroup(group)
    setPage(1)
    setSearch('')
  }

  const handleTypeChange = (type: string) => {
    setActiveType(type)
    setPage(1)
    setSearch('')
  }

  return (
    <div className="space-y-4">
      {/* KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-poe-gold" />
              <div>
                <p className="text-[10px] text-muted-foreground">Items Rastreados</p>
                <p className="text-lg font-bold">{totalTracked.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <div>
                <p className="text-[10px] text-muted-foreground">Mayor Ganador 24h</p>
                <p className="text-sm font-bold truncate">{topGainer?.currency_label || '-'}</p>
                {topGainer?.change_24h != null && (
                  <p className="text-[10px] text-green-400">+{topGainer.change_24h.toFixed(1)}%</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-400" />
              <div>
                <p className="text-[10px] text-muted-foreground">Mayor Perdedor 24h</p>
                <p className="text-sm font-bold truncate">{topLoser?.currency_label || '-'}</p>
                {topLoser?.change_24h != null && (
                  <p className="text-[10px] text-red-400">{topLoser.change_24h.toFixed(1)}%</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-400" />
              <div>
                <p className="text-[10px] text-muted-foreground">Última Actualización</p>
                <p className="text-sm font-bold">
                  {currencies?.[0]?.updated_at ? new Date(currencies[0].updated_at).toLocaleTimeString() : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Browse | Analysis */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={tab === 'browse' ? 'default' : 'outline'}
          className="h-8 text-xs"
          onClick={() => setTab('browse')}
        >
          Explorar Items
        </Button>
        <Button
          size="sm"
          variant={tab === 'analysis' ? 'default' : 'outline'}
          className="h-8 text-xs"
          onClick={() => setTab('analysis')}
        >
          Análisis
        </Button>
        <Badge variant="outline" className="text-[10px] ml-auto">{config.economySource}</Badge>
      </div>

      {tab === 'analysis' ? (
        <AnalysisCards />
      ) : (
        <>
          {/* Category Tabs */}
          <CategoryTabs
            game={game}
            activeGroup={activeGroup}
            activeType={activeType}
            onGroupChange={handleGroupChange}
            onTypeChange={handleTypeChange}
            categoryCounts={categoryCounts}
          />

          {/* Content */}
          <Card>
            <CardContent className="p-4">
              {isCurrencyType ? (
                /* Currency Table */
                currLoading ? (
                  <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10" />)}</div>
                ) : !currencies?.length ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Sin datos de moneda. Ejecuta un sondeo de economía desde Configuración.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs text-muted-foreground">
                          <th className="pb-2 font-medium">Moneda</th>
                          <th className="pb-2 font-medium text-right">Valor Chaos</th>
                          <th className="pb-2 font-medium text-right">Cambio 24h</th>
                          <th className="pb-2 font-medium text-right">Actualizado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currencies.map(c => (
                          <tr key={c.currency_id} className="border-b border-border/50 hover:bg-muted/50">
                            <td className="py-2 flex items-center gap-2">
                              {c.icon_url && <img src={c.icon_url} alt="" className="h-6 w-6 object-contain" />}
                              <span className="font-medium">{c.currency_label}</span>
                            </td>
                            <td className="py-2 text-right font-mono">{c.chaos_equivalent.toFixed(1)}</td>
                            <td className="py-2 text-right">
                              {c.change_24h !== null ? (
                                <span className={`flex items-center justify-end gap-0.5 ${c.change_24h > 0 ? 'text-green-500' : c.change_24h < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                  {c.change_24h > 0 ? <TrendingUp className="h-3 w-3" /> : c.change_24h < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                                  {c.change_24h > 0 ? '+' : ''}{c.change_24h.toFixed(1)}%
                                </span>
                              ) : <span className="text-muted-foreground">-</span>}
                            </td>
                            <td className="py-2 text-right text-xs text-muted-foreground">{c.updated_at ? new Date(c.updated_at).toLocaleTimeString() : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                /* Item Table */
                <>
                  <ItemTable
                    items={itemsData?.items || []}
                    loading={itemsLoading}
                    onItemClick={(item) => setSelectedItem(item)}
                    searchValue={search}
                    onSearchChange={(v) => { setSearch(v); setPage(1) }}
                    sort={sort}
                    order={order}
                    onSortChange={handleSortChange}
                  />
                  {/* Pagination */}
                  {itemsData && itemsData.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-xs text-muted-foreground">
                        Pág {itemsData.page} de {itemsData.totalPages} ({itemsData.total} items)
                      </span>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={page <= 1}
                          onClick={() => setPage(p => p - 1)}
                        >
                          Ant
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={page >= itemsData.totalPages}
                          onClick={() => setPage(p => p + 1)}
                        >
                          Sig
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Price Chart Modal */}
      {selectedItem && (
        <PriceChartModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  )
}
