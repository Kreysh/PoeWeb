'use client'

import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ModTierBadge } from '@/components/search/mod-tier-badge'
import { useGame } from '@/lib/contexts/game-context'
import { scoreItem } from '@/lib/scoring/engine'
import { matchArchetypes } from '@/lib/archetypes/matcher'
import { GRADE_COLORS } from '@/lib/scoring/weights'
import { cn } from '@/lib/utils'
import type { ParsedItem } from '@/lib/trade/types'
import type { GameId } from '@/lib/constants/games'

export default function ItemDetailPage() {
  const searchParams = useSearchParams()
  const { game } = useGame()

  let item: ParsedItem | null = null
  try {
    const data = searchParams.get('data')
    if (data) item = JSON.parse(decodeURIComponent(data))
  } catch { /* invalid data */ }

  if (!item) {
    return (
      <Card><CardContent className="p-8 text-center text-muted-foreground">
        Sin datos del item. Navega aquí desde los resultados de búsqueda.
      </CardContent></Card>
    )
  }

  const score = scoreItem(item)
  const archetypes = matchArchetypes(item, game as GameId)

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Item Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            {item.icon && <img src={item.icon} alt="" className="h-16 w-16 rounded object-contain" />}
            <div>
              {item.name && <h2 className="text-lg font-bold text-poe-unique">{item.name}</h2>}
              <p className="text-sm text-muted-foreground">{item.typeLine}</p>
              <div className="mt-1 flex gap-2">
                <Badge variant="outline">iLvl {item.ilvl}</Badge>
                {item.corrupted && <Badge variant="destructive">Corrupto</Badge>}
                {item.price && <Badge className="bg-poe-gold/20 text-poe-gold border-poe-gold/30">{item.price.amount} {item.price.currency}</Badge>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-3">
            Puntuación del Item
            <span className={cn('text-3xl font-black', GRADE_COLORS[score.grade] || 'text-slate-400')}>
              {score.grade}
            </span>
            <span className="text-lg text-muted-foreground">{score.totalScore} pts</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Tiers de Mods</p>
              <p className="text-lg font-bold">{score.modTierScore}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Calidad de Roll</p>
              <p className="text-lg font-bold">{score.rollQualityScore}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Sinergia</p>
              <p className="text-lg font-bold">{score.synergyScore}</p>
            </div>
          </div>

          {score.synergies.length > 0 && (
            <div className="mt-3 border-t pt-3">
              <p className="text-xs text-muted-foreground mb-1">Sinergias Detectadas:</p>
              {score.synergies.map((syn, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px]">x{syn.multiplier}</Badge>
                  <span>{syn.name}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mod Analysis */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Análisis de Mods</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {score.modDetails.map((mod, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg border p-2">
                <ModTierBadge tier={mod.tierLabel} tierNum={mod.tier} modType={mod.type} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{mod.text}</p>
                  <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span>Score: {mod.tierScore + mod.rollScore}</span>
                    {mod.rollQuality > 0 && (
                      <>
                        <span>Roll: {mod.rollQuality}%</span>
                        <div className="h-1.5 w-20 rounded-full bg-slate-700">
                          <div
                            className={cn('h-1.5 rounded-full', mod.rollQuality >= 80 ? 'bg-green-500' : mod.rollQuality >= 50 ? 'bg-yellow-500' : 'bg-red-500')}
                            style={{ width: `${mod.rollQuality}%` }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Build Archetypes */}
      {archetypes.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Apto para Builds</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {archetypes.map((match, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border p-2">
                  <div className="text-right w-12">
                    <span className="text-sm font-bold text-poe-gold">{match.matchPercent}%</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{match.archetype.name}</p>
                    <p className="text-[10px] text-muted-foreground">{match.matchedMods.length} mods coincidentes</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
