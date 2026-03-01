'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface AlertRuleFormProps {
  game: string
  league: string
  onSaved: () => void
  onCancel: () => void
}

export function AlertRuleForm({ game, league, onSaved, onCancel }: AlertRuleFormProps) {
  const [name, setName] = useState('')
  const [ruleType, setRuleType] = useState('new_listing')
  const [searchId, setSearchId] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [currency, setCurrency] = useState('chaos')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!name) { toast.error('El nombre es requerido'); return }
    setLoading(true)
    try {
      const conditions: any = {}
      if (ruleType === 'price_below') {
        conditions.maxPrice = Number(maxPrice)
        conditions.currency = currency
      }

      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game, league, name, rule_type: ruleType,
          search_id: searchId ? Number(searchId) : null,
          conditions_json: conditions,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Regla de alerta creada')
        onSaved()
      } else {
        toast.error(data.error)
      }
    } catch {
      toast.error('Error al crear regla')
    }
    setLoading(false)
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre de Regla</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Mi alerta"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Tipo</label>
            <select
              value={ruleType}
              onChange={e => setRuleType(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="new_listing">Nuevo Listado</option>
              <option value="price_below">Precio Menor a</option>
              <option value="currency_change">Cambio de Moneda</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">ID de Búsqueda Guardada (opcional)</label>
          <input
            type="number"
            value={searchId}
            onChange={e => setSearchId(e.target.value)}
            placeholder="Vincular a una búsqueda guardada"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {ruleType === 'price_below' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Precio Máximo</label>
              <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="ej. 5" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Moneda</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="chaos">Chaos</option>
                <option value="divine">Divine</option>
                <option value="exalted">Exalted</option>
              </select>
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={loading} className="bg-poe-gold hover:bg-poe-gold/90">
            {loading ? 'Guardando...' : 'Crear Regla'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
