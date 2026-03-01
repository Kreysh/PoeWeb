'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useGame } from '@/lib/contexts/game-context'
import { useApi } from '@/lib/hooks/use-api'
import { toast } from 'sonner'
import { RefreshCw, Database, Key, Volume2, Timer, Radio, Wifi, AlertTriangle, CheckCircle, XCircle, Loader2, HelpCircle } from 'lucide-react'

export default function SettingsPage() {
  const { game, league } = useGame()
  const [poesessid, setPoesessid] = useState('')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<{ valid: boolean; accountName?: string; reason?: string } | null>(null)
  const [savingPoesessid, setSavingPoesessid] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [pollingEconomy, setPollingEconomy] = useState(false)
  const [pollingSearches, setPollingSearches] = useState(false)
  const [pollingLeagues, setPollingLeagues] = useState(false)
  const [pollingAggregate, setPollingAggregate] = useState(false)
  const [economyInterval, setEconomyInterval] = useState(30)
  const [savingInterval, setSavingInterval] = useState(false)

  // Fetch current settings
  const { data: settings } = useApi<any>('/api/settings')
  // Fetch live search status
  const { data: liveStatus } = useApi<any>('/api/live-search', undefined, { refreshInterval: 10000 })

  useEffect(() => {
    try {
      const saved = localStorage.getItem('poe-trade-sound')
      if (saved === 'false') setSoundEnabled(false)
    } catch {}
  }, [])

  useEffect(() => {
    if (settings?.economy_polling_interval) {
      setEconomyInterval(settings.economy_polling_interval)
    }
  }, [settings])

  const handleSavePoesessid = async () => {
    setSavingPoesessid(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poesessid }),
      })
      if (!res.ok) {
        toast.error(`Error al guardar (${res.status})`)
        return
      }
      const data = await res.json()
      if (data.success) toast.success('POESESSID guardado')
      else toast.error(data.error)
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSavingPoesessid(false)
    }
  }

  const handleValidatePoesessid = async () => {
    const value = poesessid || settings?.poesessid
    if (!value) {
      toast.error('Ingresa un POESESSID primero')
      return
    }
    setValidating(true)
    setValidationResult(null)
    try {
      const res = await fetch('/api/settings/validate-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poesessid: value }),
      })
      const data = await res.json()
      if (data.success) {
        setValidationResult(data.data)
        if (data.data.valid) toast.success(`Sesión válida: ${data.data.accountName}`)
        else toast.error(data.data.reason || 'Sesión inválida')
      } else {
        toast.error(data.error)
      }
    } catch {
      toast.error('Error al validar')
    }
    setValidating(false)
  }

  const toggleSound = (enabled: boolean) => {
    setSoundEnabled(enabled)
    localStorage.setItem('poe-trade-sound', String(enabled))
  }

  const triggerPoll = async (job: string, setter: (v: boolean) => void) => {
    setter(true)
    try {
      const res = await fetch('/api/polling/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job, game, league }),
      })
      const data = await res.json()
      if (data.success) toast.success(`${job} completed`)
      else toast.error(data.error)
    } catch {
      toast.error('Error al ejecutar sondeo')
    }
    setter(false)
  }

  const handleSaveEconomyInterval = async () => {
    setSavingInterval(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ economy_polling_interval: economyInterval }),
      })
      const data = await res.json()
      if (data.success) toast.success(`Intervalo de economía establecido en ${economyInterval}m (reiniciar sondeo para aplicar)`)
      else toast.error(data.error)
    } catch {
      toast.error('Error al guardar')
    }
    setSavingInterval(false)
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {/* POESESSID */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Key className="h-4 w-4" /> POESESSID</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {settings && !settings.poesessid && !poesessid && (
            <div className="flex items-start gap-2 rounded-lg p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">POESESSID no configurado</p>
                <p className="text-xs mt-1 text-red-300/80">Requerido para Live Search (WebSocket). Sin él, las búsquedas en vivo no funcionarán. También mejora los rate limits de la API.</p>
              </div>
            </div>
          )}
          <input
            type="password"
            value={poesessid}
            onChange={e => { setPoesessid(e.target.value); setValidationResult(null) }}
            placeholder={settings?.poesessid ? '••••••••••••••••••••' : 'Valor de tu cookie POESESSID'}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSavePoesessid} disabled={savingPoesessid} className="bg-poe-gold hover:bg-poe-gold/90">
              {savingPoesessid ? <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Guardando...</> : 'Guardar'}
            </Button>
            <Button size="sm" variant="outline" onClick={handleValidatePoesessid} disabled={validating}>
              {validating ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="mr-1 h-3.5 w-3.5" />}
              {validating ? 'Validando...' : 'Validar'}
            </Button>
          </div>
          {validationResult && (
            <div className={`flex items-center gap-2 rounded-lg p-2.5 text-xs ${
              validationResult.valid
                ? 'bg-green-500/10 border border-green-500/30 text-green-300'
                : 'bg-red-500/10 border border-red-500/30 text-red-300'
            }`}>
              {validationResult.valid ? (
                <>
                  <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>Sesión válida — Cuenta: <strong>{validationResult.accountName}</strong></span>
                </>
              ) : (
                <>
                  <XCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{validationResult.reason}</span>
                </>
              )}
            </div>
          )}
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            {showInstructions ? 'Ocultar instrucciones' : 'Cómo obtener tu POESESSID'}
          </button>
          {showInstructions && (
            <div className="rounded-lg p-3 bg-muted/50 border text-xs space-y-2">
              <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
                <li>Abre <strong className="text-foreground">pathofexile.com</strong> e inicia sesión en tu cuenta</li>
                <li>Abre DevTools con <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">F12</kbd></li>
                <li>Ve a <strong className="text-foreground">Application</strong> → <strong className="text-foreground">Cookies</strong> → <code>pathofexile.com</code></li>
                <li>Copia el valor de la cookie <strong className="text-foreground">POESESSID</strong></li>
              </ol>
              <p className="text-muted-foreground/70">La sesión expira si cierras sesión en el sitio de GGG. Puedes validarla aquí en cualquier momento.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Volume2 className="h-4 w-4" /> Notificaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Sonido de Alerta</p>
              <p className="text-xs text-muted-foreground">Reproducir sonido para alertas y coincidencias de búsqueda en vivo</p>
            </div>
            <Switch checked={soundEnabled} onCheckedChange={toggleSound} />
          </div>
        </CardContent>
      </Card>

      {/* Economy Polling Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Timer className="h-4 w-4" /> Sondeo de Economía</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Intervalo de Sondeo</p>
              <span className="text-xs font-mono text-poe-gold">{economyInterval} min</span>
            </div>
            <input
              type="range"
              min={5}
              max={360}
              step={5}
              value={economyInterval}
              onChange={e => setEconomyInterval(parseInt(e.target.value, 10))}
              className="w-full accent-poe-gold"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>5 min</span>
              <span>6 horas</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mt-2 h-7 text-xs"
              onClick={handleSaveEconomyInterval}
              disabled={savingInterval}
            >
              {savingInterval ? 'Guardando...' : 'Guardar Intervalo'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live Search Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Radio className="h-4 w-4" /> Búsqueda en Vivo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Conexiones Activas</p>
              <p className="text-xs text-muted-foreground">Conexiones WebSocket a la API de trade de GGG</p>
            </div>
            <Badge variant="outline" className="text-sm">
              <Wifi className="h-3 w-3 mr-1" />
              {liveStatus?.data?.totalConnections || 0} / {liveStatus?.data?.maxConnections || 10}
            </Badge>
          </div>
          {liveStatus?.data?.active?.length > 0 && (
            <div className="space-y-1.5">
              {liveStatus.data.active.map((s: any) => (
                <div key={s.searchId} className="flex items-center gap-2 text-xs p-2 bg-muted/50 rounded">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="flex-1">{s.name}</span>
                  {s.authenticated ? (
                    <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-400">
                      <CheckCircle className="h-3 w-3 mr-1" /> Auth OK
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] border-yellow-500/30 text-yellow-400">
                      <AlertTriangle className="h-3 w-3 mr-1" /> No auth
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[10px]">{s.game} / {s.league}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Polling */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4" /> Gestión de Datos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Actualizar Datos de Economía</p>
              <p className="text-xs text-muted-foreground">Obtener últimas tasas de moneda y TODOS los precios de items</p>
            </div>
            <Button size="sm" variant="outline" disabled={pollingEconomy} onClick={() => triggerPoll('economy', setPollingEconomy)}>
              <RefreshCw className={`mr-1 h-3.5 w-3.5 ${pollingEconomy ? 'animate-spin' : ''}`} />
              {pollingEconomy ? 'Actualizando...' : 'Actualizar'}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Verificar Búsquedas Guardadas</p>
              <p className="text-xs text-muted-foreground">Ejecutar todas las búsquedas guardadas activas ahora</p>
            </div>
            <Button size="sm" variant="outline" disabled={pollingSearches} onClick={() => triggerPoll('saved-searches', setPollingSearches)}>
              <RefreshCw className={`mr-1 h-3.5 w-3.5 ${pollingSearches ? 'animate-spin' : ''}`} />
              {pollingSearches ? 'Verificando...' : 'Verificar'}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Refrescar Ligas</p>
              <p className="text-xs text-muted-foreground">Obtener ligas activas de la API de GGG</p>
            </div>
            <Button size="sm" variant="outline" disabled={pollingLeagues} onClick={() => triggerPoll('leagues', setPollingLeagues)}>
              <RefreshCw className={`mr-1 h-3.5 w-3.5 ${pollingLeagues ? 'animate-spin' : ''}`} />
              {pollingLeagues ? 'Refrescando...' : 'Refrescar'}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Agregar Datos Diarios</p>
              <p className="text-xs text-muted-foreground">Comprimir datos históricos en promedios diarios</p>
            </div>
            <Button size="sm" variant="outline" disabled={pollingAggregate} onClick={() => triggerPoll('aggregate-daily', setPollingAggregate)}>
              <RefreshCw className={`mr-1 h-3.5 w-3.5 ${pollingAggregate ? 'animate-spin' : ''}`} />
              {pollingAggregate ? 'Agregando...' : 'Agregar'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
