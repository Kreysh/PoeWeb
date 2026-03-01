'use client'

import { ExternalLink, Clipboard, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ModTierBadge } from './mod-tier-badge'
import { useGame } from '@/lib/contexts/game-context'
import { cn } from '@/lib/utils'
import type { ParsedItem } from '@/lib/trade/types'
import { toast } from 'sonner'

interface ItemCardProps {
  item: ParsedItem
  score?: { grade: string; totalScore: number } | null
  onViewDetail?: () => void
  isLive?: boolean
  isAutoWhispered?: boolean
}

const rarityColors: Record<string, string> = {
  unique: 'border-poe-unique/40 bg-poe-unique/5',
  rare: 'border-yellow-500/30 bg-yellow-500/5',
  magic: 'border-blue-400/30 bg-blue-400/5',
  normal: 'border-slate-400/30',
  gem: 'border-teal-500/30 bg-teal-500/5',
  currency: 'border-poe-currency/30 bg-poe-currency/5',
}

const rarityTextColors: Record<string, string> = {
  unique: 'text-poe-unique',
  rare: 'text-yellow-300',
  magic: 'text-blue-400',
  normal: 'text-slate-300',
  gem: 'text-teal-400',
  currency: 'text-poe-currency',
}

export function ItemCard({ item, score, onViewDetail, isLive, isAutoWhispered }: ItemCardProps) {
  const { config } = useGame()

  const handleWhisper = () => {
    navigator.clipboard.writeText(item.whisper)
    toast.success('Whisper copiado al portapapeles')
  }

  const handleQuickBuy = () => {
    const url = `${config.tradeBaseUrl}/search/${item.whisperToken || ''}`
    window.open(config.tradeBaseUrl, '_blank')
    navigator.clipboard.writeText(item.whisper)
    toast.success('Whisper copiado. Abriendo sitio de trade...')
  }

  return (
    <Card className={cn(
      'overflow-hidden transition-all hover:border-poe-gold/40',
      rarityColors[item.rarity] || '',
      isLive && 'animate-in slide-in-from-left-2 duration-300 ring-1 ring-green-500/20',
      isAutoWhispered && 'ring-1 ring-yellow-500/30',
    )}>
      <CardContent className="p-3">
        <div className="flex gap-3">
          {/* Item icon */}
          {item.icon && (
            <div className="shrink-0">
              <img src={item.icon} alt="" className="h-12 w-12 rounded object-contain" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            {/* Item name + price */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                {item.name && (
                  <p className={cn('text-sm font-bold truncate', rarityTextColors[item.rarity] || 'text-foreground')}>
                    {item.name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground truncate">{item.typeLine}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {score && (
                  <Badge variant="outline" className="text-xs font-bold">
                    {score.grade} ({score.totalScore})
                  </Badge>
                )}
                {item.price && (
                  <span className="text-sm font-bold text-poe-gold whitespace-nowrap">
                    {item.price.amount} {item.price.currency}
                  </span>
                )}
              </div>
            </div>

            {/* Properties */}
            {item.properties.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                {item.properties.slice(0, 4).map((p, i) => (
                  <span key={i}>{p.name}: {p.values.join(', ')}</span>
                ))}
              </div>
            )}

            {/* Tags */}
            <div className="mt-1 flex flex-wrap gap-1">
              {isLive && (
                <Badge className="text-[10px] px-1 py-0 bg-green-500/20 text-green-400 border-green-500/30">LIVE</Badge>
              )}
              {isAutoWhispered && (
                <Badge className="text-[10px] px-1 py-0 bg-yellow-500/20 text-yellow-300 border-yellow-500/30">Auto-whispered</Badge>
              )}
              {item.corrupted && <Badge variant="destructive" className="text-[10px] px-1 py-0">Corrupto</Badge>}
              {item.fractured && <Badge className="text-[10px] px-1 py-0 bg-yellow-500/20 text-yellow-300 border-yellow-500/30">Fractured</Badge>}
              {item.influences.map(inf => (
                <Badge key={inf} variant="outline" className="text-[10px] px-1 py-0">{inf}</Badge>
              ))}
              {item.sockets.links >= 5 && (
                <Badge variant="outline" className="text-[10px] px-1 py-0">{item.sockets.links}L</Badge>
              )}
              <Badge variant="outline" className="text-[10px] px-1 py-0">iLvl {item.ilvl}</Badge>
            </div>

            {/* Mods */}
            <div className="mt-2 space-y-0.5">
              {item.mods.map((mod, i) => (
                <div key={i} className="flex items-start gap-1.5 text-xs">
                  <ModTierBadge tier={mod.tier} tierNum={mod.tierNum} modType={mod.type} />
                  <span className={cn(
                    mod.type === 'crafted' ? 'text-cyan-400' :
                    mod.type === 'fractured' ? 'text-yellow-300' :
                    mod.type === 'implicit' ? 'text-blue-300' :
                    'text-slate-200'
                  )}>
                    {mod.text}
                  </span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="mt-2 flex items-center gap-1.5">
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleWhisper}>
                <Clipboard className="mr-1 h-3 w-3" /> Whisper
              </Button>
              <Button size="sm" className="h-7 text-xs bg-poe-gold hover:bg-poe-gold/90" onClick={handleQuickBuy}>
                <ExternalLink className="mr-1 h-3 w-3" /> Compra Rápida
              </Button>
              {onViewDetail && (
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onViewDetail}>
                  <Star className="mr-1 h-3 w-3" /> Detalles
                </Button>
              )}
              <span className="ml-auto text-[10px] text-muted-foreground">
                {item.seller.account} {item.seller.online && <span className="text-green-400">en línea</span>}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
