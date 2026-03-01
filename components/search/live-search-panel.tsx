'use client'

import { useLiveSearch } from '@/lib/hooks/use-live-search'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clipboard, Trash2, Radio, Wifi, WifiOff, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { ParsedItem } from '@/lib/trade/types'

interface LiveSearchPanelProps {
  searchId?: number
  searchName?: string
  onClose?: () => void
}

export function LiveSearchPanel({ searchId, searchName, onClose }: LiveSearchPanelProps) {
  const { events, connected, lastError, clearEvents } = useLiveSearch(searchId)

  const itemEvents = events.filter(e => e.type === 'new_items' || e.type === 'auto_whisper')
  const allItems: Array<{ item: ParsedItem; autoWhispered: boolean; time: string }> = []

  // Get latest status event for reconnection info
  const lastReconnecting = events.filter(e => e.type === 'reconnecting').pop()
  const isReconnecting = lastReconnecting && !events.some(e => e.type === 'connected' && e.timestamp > lastReconnecting.timestamp)

  for (const event of itemEvents) {
    if (event.type === 'new_items' && event.items) {
      for (const item of event.items) {
        allItems.push({ item, autoWhispered: false, time: event.timestamp })
      }
    }
    if (event.type === 'auto_whisper') {
      allItems.push({
        item: { name: event.itemName || '', typeLine: '', whisper: event.whisper || '' } as any,
        autoWhispered: true,
        time: event.timestamp,
      })
    }
  }

  const handleWhisper = (whisper: string) => {
    navigator.clipboard.writeText(whisper)
    toast.success('Whisper copiado')
  }

  return (
    <Card className="border-green-500/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <span className={cn('relative flex h-2.5 w-2.5', connected && !lastError && 'animate-pulse')}>
              <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-75', connected && !lastError ? 'bg-green-400 animate-ping' : lastError ? 'bg-red-400' : 'bg-red-400')} />
              <span className={cn('relative inline-flex rounded-full h-2.5 w-2.5', connected && !lastError ? 'bg-green-500' : lastError ? 'bg-red-500' : 'bg-red-500')} />
            </span>
            Feed en Vivo {searchName && <span className="text-muted-foreground font-normal">- {searchName}</span>}
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px]">
              {connected ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
              {isReconnecting ? 'Reconectando...' : connected ? 'Conectado' : 'Desconectado'}
            </Badge>
            <Badge variant="outline" className="text-[10px]">{allItems.length} items</Badge>
            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={clearEvents}>
              <Trash2 className="h-3 w-3" />
            </Button>
            {onClose && (
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={onClose}>
                Cerrar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Error/reconnection banner */}
        {lastError && (
          <div className={cn(
            'flex items-start gap-2 rounded-lg p-2.5 mb-3 text-xs',
            isReconnecting ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-300' : 'bg-red-500/10 border border-red-500/20 text-red-300'
          )}>
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{lastError}</span>
          </div>
        )}

        {allItems.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            {lastError ? (
              <>
                <WifiOff className="h-8 w-8 mx-auto mb-2 text-red-500/50" />
                <p className="text-xs text-red-400/70">Revisa el error arriba</p>
              </>
            ) : (
              <>
                <Radio className="h-8 w-8 mx-auto mb-2 text-green-500/50 animate-pulse" />
                Esperando nuevos listados...
              </>
            )}
          </div>
        ) : (
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {[...allItems].reverse().map((entry, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-center gap-2 rounded-lg p-2 text-xs transition-all',
                  entry.autoWhispered
                    ? 'bg-green-500/10 border border-green-500/20'
                    : 'bg-muted/50 hover:bg-muted',
                  i === 0 && 'animate-in slide-in-from-top-2 duration-300'
                )}
              >
                {entry.item.icon && (
                  <img src={entry.item.icon} alt="" className="h-8 w-8 object-contain shrink-0 rounded" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{entry.item.name || entry.item.typeLine}</p>
                  <div className="flex items-center gap-2">
                    {entry.item.price && (
                      <span className="text-poe-gold font-mono">{entry.item.price.amount} {entry.item.price.currency}</span>
                    )}
                    <span className="text-muted-foreground">{new Date(entry.time).toLocaleTimeString()}</span>
                    {entry.autoWhispered && (
                      <Badge className="text-[10px] bg-green-500/20 text-green-400 border-green-500/30">Auto-whispered</Badge>
                    )}
                  </div>
                </div>
                {entry.item.whisper && (
                  <Button size="sm" variant="ghost" className="h-7 shrink-0" onClick={() => handleWhisper(entry.item.whisper)}>
                    <Clipboard className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
