'use client'

import { useGame } from '@/lib/contexts/game-context'
import { useApi } from '@/lib/hooks/use-api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingDown, TrendingUp, Shield, Zap } from 'lucide-react'

interface AnalysisItem {
  item_name: string
  item_type: string
  item_id: string
  icon_url?: string | null
  current_price?: number
  avg_7d?: number
  avg_price?: number
  pct_diff?: number
  volatility_pct?: number
  signal: string
}

export function AnalysisCards() {
  const { game, league } = useGame()
  const { data, loading } = useApi<{
    buyOpportunities: AnalysisItem[]
    sellSignals: AnalysisItem[]
    stableItems: AnalysisItem[]
    volatileItems: AnalysisItem[]
  }>('/api/economy/analysis', { game, league })

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-48" />)}
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <AnalysisCard
        title="Oportunidades de Compra"
        icon={<TrendingDown className="h-4 w-4 text-green-400" />}
        items={data.buyOpportunities}
        badgeColor="bg-green-500/20 text-green-400"
        emptyText="Sin señales de compra"
        renderExtra={(item) => (
          <span className="text-[10px] text-green-400">
            {item.pct_diff?.toFixed(1)}% bajo promedio
          </span>
        )}
      />
      <AnalysisCard
        title="Señales de Venta"
        icon={<TrendingUp className="h-4 w-4 text-red-400" />}
        items={data.sellSignals}
        badgeColor="bg-red-500/20 text-red-400"
        emptyText="Sin señales de venta"
        renderExtra={(item) => (
          <span className="text-[10px] text-red-400">
            +{item.pct_diff?.toFixed(1)}% sobre promedio
          </span>
        )}
      />
      <AnalysisCard
        title="Items Estables"
        icon={<Shield className="h-4 w-4 text-blue-400" />}
        items={data.stableItems}
        badgeColor="bg-blue-500/20 text-blue-400"
        emptyText="Necesita 3+ días de datos"
        renderExtra={(item) => (
          <span className="text-[10px] text-blue-400">
            {item.volatility_pct?.toFixed(1)}% volatilidad
          </span>
        )}
      />
      <AnalysisCard
        title="Items Volátiles"
        icon={<Zap className="h-4 w-4 text-yellow-400" />}
        items={data.volatileItems}
        badgeColor="bg-yellow-500/20 text-yellow-400"
        emptyText="Necesita 3+ días de datos"
        renderExtra={(item) => (
          <span className="text-[10px] text-yellow-400">
            {item.volatility_pct?.toFixed(1)}% volatilidad
          </span>
        )}
      />
    </div>
  )
}

function AnalysisCard({
  title, icon, items, badgeColor, emptyText, renderExtra,
}: {
  title: string
  icon: React.ReactNode
  items: AnalysisItem[]
  badgeColor: string
  emptyText: string
  renderExtra: (item: AnalysisItem) => React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          {icon} {title}
          <Badge variant="outline" className="text-[10px] ml-auto">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 text-center">{emptyText}</p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {items.slice(0, 8).map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                {item.icon_url && <img src={item.icon_url} alt="" className="h-5 w-5 object-contain shrink-0" loading="lazy" />}
                <span className="truncate flex-1">{item.item_name}</span>
                <span className="font-mono shrink-0">{(item.current_price ?? item.avg_price)?.toFixed(0)}c</span>
                {renderExtra(item)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
