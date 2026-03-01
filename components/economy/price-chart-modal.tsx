'use client'

import { useState } from 'react'
import { useApi } from '@/lib/hooks/use-api'
import { useGame } from '@/lib/contexts/game-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface PriceChartModalProps {
  item: {
    item_id: string
    item_name: string
    item_type: string
    chaos_value?: number | null
    divine_value?: number | null
    change_24h?: number | null
    icon_url?: string | null
  }
  onClose: () => void
}

export function PriceChartModal({ item, onClose }: PriceChartModalProps) {
  const { game, league } = useGame()
  const [days, setDays] = useState(7)
  const resolution = days <= 7 ? 'raw' : 'daily'

  const { data: history, loading } = useApi<any[]>(
    '/api/economy/history',
    { game, league, itemId: item.item_id, itemType: item.item_type, days, resolution }
  )

  const chartData = (history || []).map((h: any) => ({
    time: new Date(h.captured_at || h.date).toLocaleDateString('es', { month: 'short', day: 'numeric' }),
    chaos: h.chaos_value ?? h.avg_chaos ?? 0,
    divine: h.divine_value ?? h.avg_divine ?? null,
  }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <Card className="w-full max-w-2xl mx-4 max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {item.icon_url && <img src={item.icon_url} alt="" className="h-8 w-8 object-contain" />}
              <div>
                <CardTitle className="text-base">{item.item_name}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px]">{item.item_type}</Badge>
                  {item.chaos_value != null && <span className="text-sm font-mono text-poe-gold">{item.chaos_value.toFixed(1)}c</span>}
                  {item.change_24h != null && (
                    <span className={`text-xs ${item.change_24h > 0 ? 'text-green-500' : item.change_24h < 0 ? 'text-red-500' : ''}`}>
                      {item.change_24h > 0 ? '+' : ''}{item.change_24h.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Time range buttons */}
          <div className="flex gap-1.5 mb-4">
            {[
              { label: '7d', value: 7 },
              { label: '30d', value: 30 },
              { label: '90d', value: 90 },
            ].map(opt => (
              <Button
                key={opt.value}
                size="sm"
                variant={days === opt.value ? 'default' : 'outline'}
                className="h-7 text-xs"
                onClick={() => setDays(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>

          {/* Chart */}
          {loading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">Cargando datos del gráfico...</div>
          ) : chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">Sin datos históricos disponibles aún</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <defs>
                    <linearGradient id="chaosGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d4a933" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#d4a933" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#64748b" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#64748b" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="chaos"
                    stroke="#d4a933"
                    fill="url(#chaosGrad)"
                    strokeWidth={2}
                    name="Valor Chaos"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
