'use client'

import { useGame } from '@/lib/contexts/game-context'
import { useApi } from '@/lib/hooks/use-api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Bookmark, Bell, BellRing, Clock, TrendingUp, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface DashboardStats {
  savedSearches: number
  activeAlerts: number
  unreadAlerts: number
  lastPollAt: string | null
  recentAlerts: Array<{
    id: number
    message: string
    game: string
    trade_url: string | null
    triggered_at: string
  }>
  topCurrencies: Array<{
    currency_label: string
    chaos_equivalent: number
    change_24h: number | null
    icon_url: string | null
  }>
}

export default function DashboardPage() {
  const { game, league } = useGame()
  const { data, loading } = useApi<DashboardStats>('/api/dashboard', { game, league }, { refreshInterval: 60000 })

  const kpis = [
    { label: 'Búsquedas Guardadas', value: data?.savedSearches ?? 0, icon: Bookmark, color: 'text-blue-500' },
    { label: 'Alertas Activas', value: data?.activeAlerts ?? 0, icon: Bell, color: 'text-green-500' },
    { label: 'Alertas Sin Leer', value: data?.unreadAlerts ?? 0, icon: BellRing, color: 'text-red-500' },
    { label: 'Último Sondeo', value: data?.lastPollAt ? new Date(data.lastPollAt).toLocaleTimeString() : 'Nunca', icon: Clock, color: 'text-amber-500' },
  ]

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              {loading ? (
                <Skeleton className="h-16" />
              ) : (
                <div className="flex items-center gap-3">
                  <kpi.icon className={`h-8 w-8 ${kpi.color}`} />
                  <div>
                    <p className="text-2xl font-bold">{kpi.value}</p>
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Alertas Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10" />)}</div>
            ) : data?.recentAlerts?.length ? (
              <div className="space-y-2">
                {data.recentAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between rounded-lg border p-2 text-sm">
                    <span className="truncate flex-1">{alert.message}</span>
                    <div className="flex items-center gap-2 ml-2">
                      <Badge variant="outline" className="text-[10px]">{alert.game.toUpperCase()}</Badge>
                      {alert.trade_url && (
                        <a href={alert.trade_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin alertas recientes</p>
            )}
            <Link href="/alerts" className="mt-3 block text-xs text-primary hover:underline">Ver todas las alertas</Link>
          </CardContent>
        </Card>

        {/* Currency Snapshot */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Tasas de Moneda
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-8" />)}</div>
            ) : data?.topCurrencies?.length ? (
              <div className="space-y-1">
                {data.topCurrencies.map((c) => (
                  <div key={c.currency_label} className="flex items-center justify-between py-1 text-sm">
                    <span>{c.currency_label}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.chaos_equivalent.toFixed(1)}c</span>
                      {c.change_24h !== null && (
                        <span className={c.change_24h >= 0 ? 'text-green-500 text-xs' : 'text-red-500 text-xs'}>
                          {c.change_24h >= 0 ? '+' : ''}{c.change_24h.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin datos de moneda. Los datos se llenarán después del primer sondeo.</p>
            )}
            <Link href="/economy" className="mt-3 block text-xs text-primary hover:underline">Ver economía completa</Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
