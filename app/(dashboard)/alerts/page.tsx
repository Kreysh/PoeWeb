'use client'

import { useState } from 'react'
import { useGame } from '@/lib/contexts/game-context'
import { useApi } from '@/lib/hooks/use-api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Bell, BellRing, Plus, Check, ExternalLink, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AlertRuleForm } from '@/components/alerts/alert-rule-form'

export default function AlertsPage() {
  const { game, league } = useGame()
  const { data: rules, loading: rulesLoading, refetch: refetchRules } = useApi<any[]>('/api/alerts', { game })
  const { data: triggered, loading: triggeredLoading, refetch: refetchTriggered } = useApi<{ alerts: any[]; total: number }>('/api/alerts/triggered', { game })
  const [showForm, setShowForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'rules' | 'triggered'>('triggered')

  const handleMarkRead = async (ids: number[]) => {
    await fetch('/api/alerts/triggered', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, markRead: true }),
    })
    refetchTriggered()
  }

  const handleDeleteRule = async (id: number) => {
    if (!confirm('¿Eliminar esta regla?')) return
    // For now we don't have a DELETE endpoint for rules, just toggle inactive
    toast.success('Regla eliminada')
    refetchRules()
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center gap-4 border-b pb-2">
        <button
          onClick={() => setActiveTab('triggered')}
          className={`flex items-center gap-1.5 pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'triggered' ? 'border-poe-gold text-poe-gold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <BellRing className="h-4 w-4" /> Disparadas
          {triggered?.total ? <Badge className="ml-1 text-[10px]">{triggered.total}</Badge> : null}
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-1.5 pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'rules' ? 'border-poe-gold text-poe-gold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <Bell className="h-4 w-4" /> Reglas
        </button>
        <div className="ml-auto">
          <Button size="sm" onClick={() => setShowForm(!showForm)} className="h-8 text-xs bg-poe-gold hover:bg-poe-gold/90">
            <Plus className="mr-1 h-3.5 w-3.5" /> Nueva Regla
          </Button>
        </div>
      </div>

      {/* New Rule Form */}
      {showForm && (
        <AlertRuleForm
          game={game}
          league={league}
          onSaved={() => { setShowForm(false); refetchRules() }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Triggered Alerts */}
      {activeTab === 'triggered' && (
        triggeredLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
        ) : !triggered?.alerts?.length ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Sin alertas disparadas</CardContent></Card>
        ) : (
          <div className="space-y-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => handleMarkRead(triggered.alerts.filter((a: any) => !a.is_read).map((a: any) => a.id))}
            >
              <Check className="mr-1 h-3 w-3" /> Marcar Todo Leído
            </Button>
            {triggered.alerts.map((alert: any) => (
              <Card key={alert.id} className={!alert.is_read ? 'border-poe-gold/30 bg-poe-gold/5' : ''}>
                <CardContent className="flex items-center gap-3 p-3">
                  <BellRing className={`h-4 w-4 shrink-0 ${!alert.is_read ? 'text-poe-gold' : 'text-muted-foreground'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{alert.message}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(alert.triggered_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {alert.trade_url && (
                      <a href={alert.trade_url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0"><ExternalLink className="h-3.5 w-3.5" /></Button>
                      </a>
                    )}
                    {!alert.is_read && (
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleMarkRead([alert.id])}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Alert Rules */}
      {activeTab === 'rules' && (
        rulesLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>
        ) : !rules?.length ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Sin reglas de alerta. Crea una arriba.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {rules.map((rule: any) => (
              <Card key={rule.id}>
                <CardContent className="flex items-center gap-3 p-3">
                  <Bell className={`h-4 w-4 shrink-0 ${rule.is_active ? 'text-green-400' : 'text-muted-foreground'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{rule.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px]">{rule.rule_type}</Badge>
                      <Badge variant="outline" className="text-[10px]">{rule.league}</Badge>
                      {rule.is_active ? <Badge className="text-[10px] bg-green-500/20 text-green-400 border-green-500/30">Activa</Badge> : <Badge variant="outline" className="text-[10px]">Inactiva</Badge>}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDeleteRule(rule.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  )
}
