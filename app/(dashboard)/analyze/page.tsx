'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BarChart, DonutChart } from '@tremor/react'
import {
  Search, Loader2, TrendingUp, TrendingDown,
  DollarSign, BarChart3, Hash, Crown, Layers, Package,
  AlertTriangle, ExternalLink, Swords, Shield, Target, Sparkles,
  Copy, ShoppingCart, Clock, Gem,
} from 'lucide-react'
import { toast } from 'sonner'
import { ITEM_RARITIES, CURRENCY_ICONS } from '@/lib/constants/games'

// --- Interfaces ---

interface PriceSummary {
  avg: number; median: number; min: number; max: number; stdDev: number; currency: string; totalPriced: number
}
interface PriceBucket { label: string; count: number }
interface ModFrequency { modText: string; count: number; percentage: number; avgTierNum: number | null; avgPriceOfItems: number | null; types: string[] }
interface ModCombo { mods: string[]; count: number; avgPrice: number | null; minPrice: number | null; maxPrice: number | null; items: Array<{ name: string; price: number | null; currency: string | null }> }
interface MultiModComboGroup { size: number; combos: ModCombo[] }
interface RarityBreakdown { rarity: string; count: number; percentage: number; avgPrice: number | null }
interface BaseTypeBreakdown { baseType: string; count: number; avgPrice: number | null; avgIlvl: number }
interface ParsedMod { text: string; type: string; tier: string | null; tierNum: number | null }

interface TopItem {
  id: string; name: string; typeLine: string; baseType: string; rarity: string; ilvl: number
  icon: string; price: { amount: number; currency: string }; mods: ParsedMod[]
  corrupted: boolean; influences: string[]
  totalDPS: number | null; pDPS: number | null; eDPS: number | null
  armour: number | null; evasionRating: number | null; energyShield: number | null
  totalScore: number; grade: string; openPrefixes: number; openSuffixes: number
  indexedAt: string; whisper: string; whisperToken: string
}

interface DPSSummary {
  avgPDPS: number; avgEDPS: number; avgTotalDPS: number; maxTotalDPS: number
  dpsDistribution: Array<{ range: string; count: number }>
  topDPSItems: Array<{ name: string; typeLine: string; baseType: string; pDPS: number; eDPS: number; totalDPS: number; price: number | null; currency: string | null; icon: string }>
}

interface DefenseSummary {
  avgArmour: number | null; avgEvasion: number | null; avgES: number | null
  maxArmour: number | null; maxEvasion: number | null; maxES: number | null
  avgTotalDefense: number
}

interface OpportunityItem {
  id: string; name: string; typeLine: string; baseType: string; rarity: string
  ilvl: number; icon: string; price: { amount: number; currency: string }
  mods: ParsedMod[]; corrupted: boolean; influences: string[]
  totalScore: number; grade: string
  totalDPS: number | null; pDPS: number | null; eDPS: number | null
  armour: number | null; evasionRating: number | null; energyShield: number | null
  openPrefixes: number; openSuffixes: number
  valueRatio: number; pricePercentile: number; scorePercentile: number
  reasons: string[]
  indexedAt: string; whisper: string; whisperToken: string
  estimatedValue: number | null
  freshness: 'fresh' | 'recent' | 'stale'
  scoreBreakdown: { modTierScore: number; rollQualityScore: number; synergyScore: number }
}

interface AnalysisData {
  game: string; league: string; queryId: string; totalItems: number; totalInSearch: number
  priceSummary: PriceSummary; priceDistribution: PriceBucket[]; modFrequency: ModFrequency[]
  mostValuableMods: ModFrequency[]
  multiModCombos: MultiModComboGroup[]
  rarityBreakdown: RarityBreakdown[]; baseTypeBreakdown: BaseTypeBreakdown[]
  topItems: TopItem[]; dpsStats: DPSSummary | null; defenseStats: DefenseSummary | null
  opportunities: OpportunityItem[]
  message?: string; warning?: string
}

type TabId = 'summary' | 'opportunities' | 'combos' | 'items'

const MAX_ITEMS_OPTIONS = [50, 100, 200, 500, 1000]

// --- Helpers ---

function currencyLabel(c: string): string {
  const map: Record<string, string> = { chaos: 'Chaos', divine: 'Divine', exalted: 'Exalted', gold: 'Gold' }
  return map[c] || c
}

function rarityColor(r: string): string {
  const entry = ITEM_RARITIES[r as keyof typeof ITEM_RARITIES]
  return entry?.color || '#c8c8c8'
}

function gradeColor(grade: string): string {
  switch (grade) {
    case 'S': return 'text-yellow-300 border-yellow-500/50 bg-yellow-500/10'
    case 'A': return 'text-green-400 border-green-500/50 bg-green-500/10'
    case 'B': return 'text-blue-400 border-blue-500/50 bg-blue-500/10'
    case 'C': return 'text-gray-300 border-gray-500/50 bg-gray-500/10'
    case 'D': return 'text-orange-400 border-orange-500/50 bg-orange-500/10'
    default: return 'text-red-400 border-red-500/50 bg-red-500/10'
  }
}

function gradeBorderClass(grade: string): string {
  switch (grade) {
    case 'S': return 'border-2 border-yellow-500 bg-yellow-500/5 shadow-lg shadow-yellow-500/10'
    case 'A': return 'border-2 border-green-500 bg-green-500/5'
    case 'B': return 'border-2 border-blue-500 bg-blue-500/5'
    case 'C': return 'border border-gray-500 bg-gray-500/5'
    default: return 'border border-orange-500/50 bg-orange-500/5'
  }
}

function freshnessConfig(f: 'fresh' | 'recent' | 'stale'): { label: string; color: string; dot: string } {
  switch (f) {
    case 'fresh': return { label: 'Nuevo', color: 'text-green-400', dot: 'bg-green-400' }
    case 'recent': return { label: 'Reciente', color: 'text-yellow-400', dot: 'bg-yellow-400' }
    case 'stale': return { label: 'Antiguo', color: 'text-red-400', dot: 'bg-red-400' }
  }
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 60) return `hace ${min}m`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h}h`
  const d = Math.floor(h / 24)
  return `hace ${d}d`
}

function CurrencyIcon({ currency, size = 14 }: { currency: string; size?: number }) {
  const url = CURRENCY_ICONS[currency]
  if (!url) return <span className="text-[10px]">{currency}</span>
  return <img src={url} alt={currency} width={size} height={size} className="inline-block align-text-bottom" />
}

function PriceDisplay({ amount, currency, size = 14 }: { amount: number; currency: string; size?: number }) {
  return (
    <span className="inline-flex items-center gap-1 font-mono font-bold text-poe-gold">
      {amount} <CurrencyIcon currency={currency} size={size} />
    </span>
  )
}

// --- Main Component ---

export default function AnalyzePage() {
  const [tradeUrl, setTradeUrl] = useState('')
  const [maxItems, setMaxItems] = useState(100)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<AnalysisData | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('summary')
  const [showAllMods, setShowAllMods] = useState(false)
  const [showAllValuableMods, setShowAllValuableMods] = useState(false)
  const [activeComboTab, setActiveComboTab] = useState(3)
  const [progress, setProgress] = useState<{ fetched: number; total: number } | null>(null)
  const [savingSession, setSavingSession] = useState(false)
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [existingSession, setExistingSession] = useState<{ id: number; totalItems: number } | null>(null)

  const handleAnalyze = async () => {
    if (!tradeUrl.trim()) {
      toast.error('Ingresa una URL de trade')
      return
    }

    setLoading(true)
    setData(null)
    setProgress(null)
    setSessionId(null)
    setExistingSession(null)

    try {
      const res = await fetch('/api/trade/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradeUrl: tradeUrl.trim(), maxItems }),
      })

      // Check if SSE stream
      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('text/event-stream')) {
        const reader = res.body?.getReader()
        if (!reader) throw new Error('No readable stream')
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() || ''

          for (const block of lines) {
            const dataLine = block.split('\n').find(l => l.startsWith('data: '))
            if (!dataLine) continue
            const parsed = JSON.parse(dataLine.slice(6))
            if (parsed.type === 'progress') {
              setProgress({ fetched: parsed.fetched, total: parsed.total })
            } else if (parsed.type === 'complete') {
              setData(parsed.data)
              if (parsed.data.totalItems > 0) {
                toast.success(`${parsed.data.totalItems} items analizados`)
                if (parsed.data.warning) toast.warning(parsed.data.warning)
                checkExistingSession(parsed.data.queryId)
              }
            } else if (parsed.type === 'error') {
              toast.error(parsed.error)
            }
          }
        }
      } else {
        const result = await res.json()
        if (result.success) {
          setData(result.data)
          if (result.data.totalItems === 0) {
            toast.info(result.data.message || 'No se encontraron items')
          } else {
            toast.success(`${result.data.totalItems} items analizados`)
            if (result.data.warning) toast.warning(result.data.warning)
            checkExistingSession(result.data.queryId)
          }
        } else {
          toast.error(result.error || 'Error en el análisis')
        }
      }
    } catch {
      toast.error('Error de conexión')
    }

    setLoading(false)
    setProgress(null)
  }

  const checkExistingSession = async (queryId: string) => {
    try {
      const res = await fetch('/api/trade/analysis-sessions')
      const result = await res.json()
      if (result.success && result.sessions) {
        const match = result.sessions.find((s: any) => s.query_id === queryId)
        if (match) {
          setExistingSession({ id: match.id, totalItems: match.total_items })
        }
      }
    } catch { /* ignore */ }
  }

  const handleSaveSession = async () => {
    if (!data) return
    setSavingSession(true)
    try {
      const res = await fetch('/api/trade/analysis-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game: data.game, league: data.league, queryId: data.queryId,
          tradeUrl: tradeUrl.trim(),
          items: [], // Items not available client-side; we save analysis only
          totalInSearch: data.totalInSearch,
        }),
      })
      const result = await res.json()
      if (result.success) {
        setSessionId(result.session.id)
        toast.success(`Sesión guardada (${data.totalItems} items)`)
      } else {
        toast.error(result.error || 'Error al guardar')
      }
    } catch {
      toast.error('Error de conexión')
    }
    setSavingSession(false)
  }

  const activeComboGroup = data?.multiModCombos?.find(g => g.size === activeComboTab)

  const tradeBaseUrl = data
    ? `https://www.pathofexile.com/${data.game === 'poe2' ? 'trade2/search/poe2' : 'trade/search'}/${encodeURIComponent(data.league)}/${data.queryId}`
    : ''

  const handleWhisper = (whisper: string) => {
    navigator.clipboard.writeText(whisper)
    toast.success('Whisper copiado al portapapeles')
  }

  const handleQuickBuy = (whisper: string) => {
    navigator.clipboard.writeText(whisper)
    window.open(tradeBaseUrl, '_blank')
    toast.success('Whisper copiado — abriendo trade')
  }

  return (
    <div className="space-y-4">
      {/* Input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Analizador de Trade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Pega una URL de búsqueda de pathofexile.com/trade para analizar precios, mods frecuentes y combinaciones valiosas.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={tradeUrl}
              onChange={e => setTradeUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !loading) handleAnalyze() }}
              placeholder="https://www.pathofexile.com/trade/search/Standard/XXXXX"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <select
              value={maxItems}
              onChange={e => setMaxItems(parseInt(e.target.value, 10))}
              className="rounded-md border border-input bg-background px-2 py-2 text-sm"
            >
              {MAX_ITEMS_OPTIONS.map(n => (
                <option key={n} value={n}>{n} items</option>
              ))}
            </select>
            <Button onClick={handleAnalyze} disabled={loading} className="bg-poe-gold hover:bg-poe-gold/90">
              {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Search className="mr-1.5 h-4 w-4" />}
              {loading ? 'Analizando...' : 'Analizar'}
            </Button>
          </div>
          {loading && !progress && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Obteniendo items de la API de GGG...
            </div>
          )}
          {progress && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Obteniendo items...</span>
                <span>{progress.fetched} / {progress.total}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-poe-gold rounded-full transition-all duration-300"
                  style={{ width: `${Math.round((progress.fetched / progress.total) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {data && data.totalItems > 0 && (
        <>
          {/* Warning banner */}
          {data.warning && (
            <div className="flex items-start gap-2 rounded-lg p-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{data.warning}</span>
            </div>
          )}

          {/* Session Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {existingSession && !sessionId && (
              <div className="flex items-center gap-2 rounded-lg p-2 bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs flex-1">
                <span>Sesión anterior con {existingSession.totalItems} items encontrada</span>
              </div>
            )}
            {!sessionId && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={handleSaveSession}
                disabled={savingSession}
              >
                {savingSession ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Guardar Análisis ({data.totalItems} items)
              </Button>
            )}
            {sessionId && (
              <Badge variant="outline" className="text-xs border-green-500/50 text-green-400">
                Sesión #{sessionId} guardada
              </Badge>
            )}
          </div>

          {/* Tab Bar */}
          <div className="flex gap-1 border-b border-border pb-0">
            {([
              { id: 'summary' as TabId, label: 'Resumen', icon: <BarChart3 className="h-3.5 w-3.5" /> },
              { id: 'opportunities' as TabId, label: 'Oportunidades', icon: <Target className="h-3.5 w-3.5" />, badge: data.opportunities?.length },
              { id: 'combos' as TabId, label: 'Combos & Mods', icon: <Crown className="h-3.5 w-3.5" /> },
              { id: 'items' as TabId, label: 'Items', icon: <Package className="h-3.5 w-3.5" /> },
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-card text-poe-gold border border-b-0 border-border'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 ml-1 border-green-500/50 text-green-400">
                    {tab.badge}
                  </Badge>
                )}
              </button>
            ))}
          </div>

          {/* ==================== TAB: SUMMARY ==================== */}
          {activeTab === 'summary' && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryCard
                  icon={<Hash className="h-4 w-4" />}
                  label="Items Analizados"
                  value={`${data.totalItems} / ${data.totalInSearch}`}
                />
                <SummaryCard
                  icon={<DollarSign className="h-4 w-4" />}
                  label="Precio Promedio"
                  value={data.priceSummary.avg}
                  currency={data.priceSummary.currency}
                />
                <SummaryCard
                  icon={<TrendingUp className="h-4 w-4" />}
                  label="Mediana"
                  value={data.priceSummary.median}
                  currency={data.priceSummary.currency}
                />
                <SummaryCard
                  icon={<TrendingDown className="h-4 w-4" />}
                  label="Rango"
                  value={`${data.priceSummary.min} - ${data.priceSummary.max}`}
                  subtitle={`σ ${data.priceSummary.stdDev}`}
                />
              </div>

              {/* DPS Stats Cards */}
              {data.dpsStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <SummaryCard icon={<Swords className="h-4 w-4 text-red-400" />} label="pDPS Promedio" value={data.dpsStats.avgPDPS} />
                  <SummaryCard icon={<Sparkles className="h-4 w-4 text-blue-400" />} label="eDPS Promedio" value={data.dpsStats.avgEDPS} />
                  <SummaryCard icon={<Swords className="h-4 w-4 text-poe-gold" />} label="Total DPS Promedio" value={data.dpsStats.avgTotalDPS} />
                  <SummaryCard icon={<Crown className="h-4 w-4 text-poe-gold" />} label="Max Total DPS" value={data.dpsStats.maxTotalDPS} />
                </div>
              )}

              {/* Defense Stats Cards */}
              {data.defenseStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {data.defenseStats.avgArmour !== null && (
                    <SummaryCard icon={<Shield className="h-4 w-4 text-orange-400" />} label="Armour Promedio" value={data.defenseStats.avgArmour} subtitle={`Max: ${data.defenseStats.maxArmour}`} />
                  )}
                  {data.defenseStats.avgEvasion !== null && (
                    <SummaryCard icon={<Shield className="h-4 w-4 text-green-400" />} label="Evasion Promedio" value={data.defenseStats.avgEvasion} subtitle={`Max: ${data.defenseStats.maxEvasion}`} />
                  )}
                  {data.defenseStats.avgES !== null && (
                    <SummaryCard icon={<Shield className="h-4 w-4 text-blue-400" />} label="ES Promedio" value={data.defenseStats.avgES} subtitle={`Max: ${data.defenseStats.maxES}`} />
                  )}
                  <SummaryCard icon={<Shield className="h-4 w-4" />} label="Defensa Total Promedio" value={data.defenseStats.avgTotalDefense} />
                </div>
              )}

              {/* Price Distribution */}
              {data.priceDistribution.length > 1 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" /> Distribución de Precios
                      <CurrencyIcon currency={data.priceSummary.currency} size={16} />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BarChart
                      data={data.priceDistribution}
                      index="label"
                      categories={['count']}
                      colors={['amber']}
                      yAxisWidth={40}
                      showLegend={false}
                      className="h-52"
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ==================== TAB: OPPORTUNITIES ==================== */}
          {activeTab === 'opportunities' && (
            <div className="space-y-3">
              {data.opportunities && data.opportunities.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {data.opportunities.map((opp) => (
                    <OpportunityCard
                      key={opp.id}
                      opp={opp}
                      onWhisper={handleWhisper}
                      onQuickBuy={handleQuickBuy}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Target className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No se detectaron oportunidades claras en esta muestra</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ==================== TAB: COMBOS & MODS ==================== */}
          {activeTab === 'combos' && (
            <div className="space-y-4">
              {/* Multi-Mod Combos */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Crown className="h-4 w-4" /> Combos de Mods
                    </CardTitle>
                    <div className="flex gap-1">
                      {[2, 3, 4, 5, 6].map(size => (
                        <button
                          key={size}
                          onClick={() => setActiveComboTab(size)}
                          className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                            activeComboTab === size
                              ? 'bg-poe-gold text-black font-bold'
                              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {!activeComboGroup || activeComboGroup.combos.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No hay suficientes datos para combos de {activeComboTab} mods
                      </p>
                    ) : (
                      activeComboGroup.combos.map((combo, i) => (
                        <div key={i} className="p-2 rounded-lg bg-muted/30 border border-border/50 space-y-1">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-[10px]">{combo.count} items</Badge>
                            <span className="text-sm font-mono font-bold text-poe-gold inline-flex items-center gap-1">
                              {combo.avgPrice !== null ? (
                                <>∅ {combo.avgPrice} <CurrencyIcon currency={data.priceSummary.currency} size={12} /></>
                              ) : '—'}
                            </span>
                          </div>
                          {combo.mods.map((mod, j) => (
                            <p key={j} className="text-xs text-muted-foreground truncate" title={mod}>
                              &bull; {mod}
                            </p>
                          ))}
                          {combo.minPrice !== null && combo.maxPrice !== null && combo.minPrice !== combo.maxPrice && (
                            <p className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                              Rango: {combo.minPrice} — {combo.maxPrice} <CurrencyIcon currency={data.priceSummary.currency} size={10} />
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Mod Frequency */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Layers className="h-4 w-4" /> Mods Más Frecuentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ModTable
                    mods={data.modFrequency}
                    showAll={showAllMods}
                    onToggle={() => setShowAllMods(!showAllMods)}
                    currency={data.priceSummary.currency}
                    sortBy="count"
                  />
                </CardContent>
              </Card>

              {/* Most Valuable Mods */}
              {data.mostValuableMods && data.mostValuableMods.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Gem className="h-4 w-4 text-poe-gold" /> Mods Más Valiosos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ModTable
                      mods={data.mostValuableMods}
                      showAll={showAllValuableMods}
                      onToggle={() => setShowAllValuableMods(!showAllValuableMods)}
                      currency={data.priceSummary.currency}
                      sortBy="price"
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ==================== TAB: ITEMS ==================== */}
          {activeTab === 'items' && (
            <div className="space-y-4">
              {/* Top Items */}
              {data.topItems.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Crown className="h-4 w-4 text-poe-gold" /> Top {data.topItems.length} Items Más Caros
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {data.topItems.map((item, i) => (
                        <div key={item.id} className="p-3 rounded-lg border bg-muted/20 space-y-2">
                          <div className="flex items-start gap-2">
                            {item.icon && (
                              <img src={item.icon} alt="" className="w-10 h-10 object-contain" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-poe-gold">#{i + 1}</span>
                                <Badge variant="outline" className={`text-[10px] px-1 font-bold ${gradeColor(item.grade)}`}>
                                  {item.grade}
                                </Badge>
                                <p className="text-sm font-medium truncate" style={{ color: rarityColor(item.rarity) }}>
                                  {item.name || item.typeLine}
                                </p>
                              </div>
                              {item.name && (
                                <p className="text-xs text-muted-foreground truncate">{item.typeLine}</p>
                              )}
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="text-sm">
                                  <PriceDisplay amount={item.price.amount} currency={item.price.currency} />
                                </span>
                                {item.totalDPS !== null && (
                                  <Badge variant="outline" className="text-[9px] px-1 border-red-500/30 text-red-400">
                                    {item.totalDPS} DPS
                                  </Badge>
                                )}
                                {(item.armour !== null || item.evasionRating !== null || item.energyShield !== null) && (
                                  <Badge variant="outline" className="text-[9px] px-1 border-blue-500/30 text-blue-400">
                                    {[item.armour && `${item.armour} AR`, item.evasionRating && `${item.evasionRating} EV`, item.energyShield && `${item.energyShield} ES`].filter(Boolean).join(' / ')}
                                  </Badge>
                                )}
                                {(item.openPrefixes > 0 || item.openSuffixes > 0) && (
                                  <Badge variant="outline" className="text-[9px] px-1 border-cyan-500/30 text-cyan-400">
                                    {item.openPrefixes}P/{item.openSuffixes}S
                                  </Badge>
                                )}
                                {item.corrupted && <Badge variant="outline" className="text-[9px] px-1 border-red-500/30 text-red-400">Corrupted</Badge>}
                                {item.influences.map(inf => (
                                  <Badge key={inf} variant="outline" className="text-[9px] px-1">{inf}</Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="space-y-0.5">
                            {item.mods.filter(m => m.type !== 'enchant').slice(0, 6).map((mod, j) => (
                              <p key={j} className="text-[11px] text-muted-foreground truncate" title={mod.text}>
                                {mod.type === 'fractured' && <span className="text-yellow-300 mr-1">◆</span>}
                                {mod.type === 'crafted' && <span className="text-cyan-400 mr-1">✦</span>}
                                {mod.tier && <span className="text-[9px] text-muted-foreground mr-1">[{mod.tier}]</span>}
                                {mod.text}
                              </p>
                            ))}
                            {item.mods.filter(m => m.type !== 'enchant').length > 6 && (
                              <p className="text-[10px] text-muted-foreground">+{item.mods.filter(m => m.type !== 'enchant').length - 6} más</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Rarity + Base Type */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Rarity */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Package className="h-4 w-4" /> Distribución por Rareza
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DonutChart
                      data={data.rarityBreakdown.map(r => ({
                        name: r.rarity.charAt(0).toUpperCase() + r.rarity.slice(1),
                        count: r.count,
                      }))}
                      index="name"
                      category="count"
                      colors={data.rarityBreakdown.map(r => {
                        const colorMap: Record<string, string> = { rare: 'yellow', unique: 'orange', magic: 'blue', normal: 'gray', gem: 'teal', currency: 'amber' }
                        return colorMap[r.rarity] || 'gray'
                      })}
                      className="h-40"
                      showLabel={false}
                    />
                    <div className="mt-3 space-y-1">
                      {data.rarityBreakdown.map((r, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: rarityColor(r.rarity) }} />
                            <span className="capitalize">{r.rarity}</span>
                          </div>
                          <div className="flex gap-3 text-muted-foreground">
                            <span>{r.count} ({r.percentage}%)</span>
                            {r.avgPrice !== null && (
                              <span className="inline-flex items-center gap-1 font-mono text-poe-gold">
                                ∅ {r.avgPrice} <CurrencyIcon currency={data.priceSummary.currency} size={10} />
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Base Types */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Package className="h-4 w-4" /> Base Types
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 max-h-[300px] overflow-y-auto">
                      <div className="grid grid-cols-[1fr_50px_70px_50px] gap-1 text-[10px] text-muted-foreground font-medium px-1 pb-1 border-b sticky top-0 bg-card">
                        <span>Base</span>
                        <span className="text-right">Items</span>
                        <span className="text-right">Precio ∅</span>
                        <span className="text-right">iLvl ∅</span>
                      </div>
                      {data.baseTypeBreakdown.map((bt, i) => (
                        <div key={i} className="grid grid-cols-[1fr_50px_70px_50px] gap-1 items-center text-xs px-1 py-0.5 hover:bg-muted/50 rounded">
                          <span className="truncate" title={bt.baseType}>{bt.baseType}</span>
                          <span className="text-right text-muted-foreground">{bt.count}</span>
                          <span className="text-right font-mono text-poe-gold inline-flex items-center justify-end gap-0.5">
                            {bt.avgPrice !== null ? (<>{bt.avgPrice} <CurrencyIcon currency={data.priceSummary.currency} size={10} /></>) : '—'}
                          </span>
                          <span className="text-right text-muted-foreground">{bt.avgIlvl || '—'}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Link back to search */}
          {data.queryId && (
            <div className="flex justify-center">
              <a
                href={tradeBaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-poe-gold flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" /> Ver búsqueda en pathofexile.com
              </a>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {data && data.totalItems === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{data.message || 'No se encontraron items'}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// --- Sub-Components ---

function SummaryCard({ icon, label, value, subtitle, currency }: {
  icon: React.ReactNode; label: string; value: string | number; subtitle?: string; currency?: string
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-[11px]">{label}</span>
        </div>
        <p className="text-lg font-bold font-mono inline-flex items-center gap-1">
          {value}
          {currency && <CurrencyIcon currency={currency} size={16} />}
        </p>
        {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}

function OpportunityCard({ opp, onWhisper, onQuickBuy }: {
  opp: OpportunityItem
  onWhisper: (w: string) => void
  onQuickBuy: (w: string) => void
}) {
  const fresh = freshnessConfig(opp.freshness)
  const scorePct = Math.min(100, Math.round((opp.totalScore / 800) * 100))

  return (
    <div className={`p-3 rounded-lg space-y-2.5 ${gradeBorderClass(opp.grade)}`}>
      {/* Header */}
      <div className="flex items-start gap-2">
        {opp.icon && <img src={opp.icon} alt="" className="w-10 h-10 object-contain" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className={`text-[10px] px-1.5 font-bold ${gradeColor(opp.grade)}`}>
              {opp.grade}
            </Badge>
            <p className="text-sm font-medium truncate" style={{ color: rarityColor(opp.rarity) }}>
              {opp.name || opp.typeLine}
            </p>
          </div>
          {opp.name && <p className="text-xs text-muted-foreground truncate">{opp.typeLine}</p>}
          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
            <span>iLvl {opp.ilvl}</span>
            <span>&middot;</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeAgo(opp.indexedAt)}
            </span>
            <span>&middot;</span>
            <span className={`inline-flex items-center gap-1 ${fresh.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${fresh.dot}`} />
              {fresh.label}
            </span>
          </div>
        </div>
      </div>

      {/* Price */}
      <div className="flex items-center gap-2 flex-wrap">
        <PriceDisplay amount={opp.price.amount} currency={opp.price.currency} />
        {opp.estimatedValue !== null && (
          <>
            <span className="text-muted-foreground text-xs">&rarr;</span>
            <span className="text-xs text-muted-foreground">
              Valor est: <PriceDisplay amount={opp.estimatedValue} currency={opp.price.currency} size={12} />
            </span>
          </>
        )}
        {opp.totalDPS !== null && (
          <Badge variant="outline" className="text-[9px] px-1 border-red-500/30 text-red-400">{opp.totalDPS} DPS</Badge>
        )}
        {(opp.armour !== null || opp.evasionRating !== null || opp.energyShield !== null) && (
          <Badge variant="outline" className="text-[9px] px-1 border-blue-500/30 text-blue-400">
            {[opp.armour && `${opp.armour} AR`, opp.evasionRating && `${opp.evasionRating} EV`, opp.energyShield && `${opp.energyShield} ES`].filter(Boolean).join(' / ')}
          </Badge>
        )}
        {opp.corrupted && <Badge variant="outline" className="text-[9px] px-1 border-red-500/30 text-red-400">Corrupted</Badge>}
      </div>

      {/* Mods */}
      <div className="space-y-0.5">
        {opp.mods.filter(m => m.type !== 'enchant').slice(0, 7).map((mod, j) => (
          <p key={j} className="text-[11px] text-muted-foreground truncate" title={mod.text}>
            {mod.type === 'fractured' && <span className="text-yellow-300 mr-1">◆</span>}
            {mod.type === 'crafted' && <span className="text-cyan-400 mr-1">✦</span>}
            {mod.tier && (
              <span className={`text-[9px] mr-1 ${
                mod.tierNum !== null && mod.tierNum <= 1 ? 'text-amber-400' :
                mod.tierNum !== null && mod.tierNum <= 2 ? 'text-purple-400' :
                'text-muted-foreground'
              }`}>[{mod.tier}]</span>
            )}
            {mod.text}
          </p>
        ))}
        {(opp.openPrefixes > 0 || opp.openSuffixes > 0) && (
          <p className="text-[10px] text-cyan-400">{opp.openPrefixes}P/{opp.openSuffixes}S abiertos</p>
        )}
      </div>

      {/* Score Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">Score</span>
          <span className="font-mono">
            {opp.totalScore} ({opp.scoreBreakdown.modTierScore} tier + {opp.scoreBreakdown.rollQualityScore} rolls + {opp.scoreBreakdown.synergyScore} syn)
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-poe-gold rounded-full transition-all" style={{ width: `${scorePct}%` }} />
        </div>
      </div>

      {/* Reasons */}
      <div className="space-y-0.5">
        {opp.reasons.map((reason, j) => (
          <p key={j} className="text-[11px] text-green-400/80">+ {reason}</p>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => onWhisper(opp.whisper)}
        >
          <Copy className="h-3 w-3" /> Whisper
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1 border-poe-gold/30 text-poe-gold hover:bg-poe-gold/10"
          onClick={() => onQuickBuy(opp.whisper)}
        >
          <ShoppingCart className="h-3 w-3" /> Compra Rápida
        </Button>
      </div>
    </div>
  )
}

function ModTable({ mods, showAll, onToggle, currency, sortBy }: {
  mods: ModFrequency[]; showAll: boolean; onToggle: () => void; currency: string; sortBy: 'count' | 'price'
}) {
  const displayed = showAll ? mods : mods.slice(0, 15)
  return (
    <>
      <div className="space-y-1 max-h-[500px] overflow-y-auto">
        <div className="grid grid-cols-[1fr_60px_60px_70px] gap-1 text-[10px] text-muted-foreground font-medium px-1 pb-1 border-b sticky top-0 bg-card">
          <span>Mod</span>
          <span className="text-right">Items</span>
          <span className="text-right">Tier ∅</span>
          <span className="text-right">Precio ∅</span>
        </div>
        {displayed.map((m, i) => (
          <div key={i} className="grid grid-cols-[1fr_60px_60px_70px] gap-1 items-center text-xs px-1 py-1 hover:bg-muted/50 rounded">
            <span className="truncate" title={m.modText}>
              {m.types.includes('fractured') && <span className="text-yellow-300 mr-1">◆</span>}
              {m.modText}
            </span>
            <span className="text-right text-muted-foreground">
              {m.count} <span className="text-[10px]">({m.percentage}%)</span>
            </span>
            <span className="text-right">
              {m.avgTierNum !== null ? (
                <Badge variant="outline" className="text-[10px] px-1">T{m.avgTierNum}</Badge>
              ) : '—'}
            </span>
            <span className="text-right font-mono text-poe-gold inline-flex items-center justify-end gap-0.5">
              {m.avgPriceOfItems !== null ? (<>{m.avgPriceOfItems} <CurrencyIcon currency={currency} size={10} /></>) : '—'}
            </span>
          </div>
        ))}
      </div>
      {mods.length > 15 && (
        <button onClick={onToggle} className="text-xs text-poe-gold hover:underline mt-2">
          {showAll ? 'Mostrar menos' : `Mostrar todos (${mods.length})`}
        </button>
      )}
    </>
  )
}
