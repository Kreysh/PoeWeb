'use client'

import { useState } from 'react'
import { Search, Plus, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useGame } from '@/lib/contexts/game-context'

interface StatFilter {
  id: string
  statId: string
  min?: number
  max?: number
}

interface SearchFormProps {
  onSearch: (filters: any) => void
  loading: boolean
}

export function SearchForm({ onSearch, loading }: SearchFormProps) {
  const { game } = useGame()
  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [category, setCategory] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [minIlvl, setMinIlvl] = useState('')
  const [maxIlvl, setMaxIlvl] = useState('')
  const [corrupted, setCorrupted] = useState<string>('any')
  const [stats, setStats] = useState<StatFilter[]>([])

  const addStat = () => {
    setStats([...stats, { id: crypto.randomUUID(), statId: '', min: undefined, max: undefined }])
  }

  const removeStat = (id: string) => {
    setStats(stats.filter(s => s.id !== id))
  }

  const updateStat = (id: string, field: string, value: string) => {
    setStats(stats.map(s => s.id === id ? { ...s, [field]: field === 'statId' ? value : (value === '' ? undefined : Number(value)) } : s))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch({
      name: name || undefined,
      type: type || undefined,
      category: category || undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      minIlvl: minIlvl ? Number(minIlvl) : undefined,
      maxIlvl: maxIlvl ? Number(maxIlvl) : undefined,
      corrupted: corrupted === 'any' ? null : corrupted === 'yes',
      stats: stats.filter(s => s.statId).map(s => ({ id: s.statId, min: s.min, max: s.max })),
    })
  }

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre del Item</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Headhunter"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Tipo Base</label>
              <input
                type="text"
                value={type}
                onChange={e => setType(e.target.value)}
                placeholder="e.g. Vaal Regalia"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Categoría</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Cualquiera</option>
                <option value="weapon">Arma</option>
                <option value="armour">Armadura</option>
                <option value="armour.helmet">Casco</option>
                <option value="armour.chest">Armadura de Cuerpo</option>
                <option value="armour.gloves">Guantes</option>
                <option value="armour.boots">Botas</option>
                <option value="accessory">Accesorio</option>
                <option value="accessory.ring">Anillo</option>
                <option value="accessory.amulet">Amuleto</option>
                <option value="accessory.belt">Cinturón</option>
                <option value="gem">Gema</option>
                <option value="jewel">Joya</option>
                <option value="flask">Frasco</option>
                <option value="currency">Moneda</option>
                <option value="map">Mapa</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Corrupto</label>
              <select
                value={corrupted}
                onChange={e => setCorrupted(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="any">Cualquiera</option>
                <option value="yes">Sí</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Precio Mín</label>
              <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="0" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Precio Máx</label>
              <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="Sin límite" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Min iLvl</label>
              <input type="number" value={minIlvl} onChange={e => setMinIlvl(e.target.value)} placeholder="0" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Max iLvl</label>
              <input type="number" value={maxIlvl} onChange={e => setMaxIlvl(e.target.value)} placeholder="100" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>

          {/* Stat filters */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Filtros de Stats</label>
              <Button type="button" variant="ghost" size="sm" onClick={addStat} className="h-7 text-xs">
                <Plus className="mr-1 h-3 w-3" /> Agregar Stat
              </Button>
            </div>
            {stats.map(stat => (
              <div key={stat.id} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={stat.statId}
                  onChange={e => updateStat(stat.id, 'statId', e.target.value)}
                  placeholder="Stat ID (e.g. explicit.stat_3299347043)"
                  className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  type="number"
                  value={stat.min ?? ''}
                  onChange={e => updateStat(stat.id, 'min', e.target.value)}
                  placeholder="Min"
                  className="w-20 rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  type="number"
                  value={stat.max ?? ''}
                  onChange={e => updateStat(stat.id, 'max', e.target.value)}
                  placeholder="Max"
                  className="w-20 rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeStat(stat.id)} className="h-8 w-8 shrink-0">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-poe-gold hover:bg-poe-gold/90">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            {loading ? 'Buscando...' : 'Buscar en Trade'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
