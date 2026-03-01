'use client'

import { useState } from 'react'
import { TrendingUp, TrendingDown, Minus, ChevronUp, ChevronDown, Search } from 'lucide-react'
import { SparklineCell } from './sparkline-cell'
import { cn } from '@/lib/utils'

interface ItemRow {
  item_id: string
  item_name: string
  item_type: string
  chaos_value: number | null
  divine_value: number | null
  listing_count: number | null
  icon_url: string | null
  change_24h: number | null
  change_7d?: number | null
  sparkline_json: string | null
  updated_at: string
}

interface ItemTableProps {
  items: ItemRow[]
  loading?: boolean
  onItemClick?: (item: ItemRow) => void
  searchValue: string
  onSearchChange: (v: string) => void
  sort: string
  order: 'asc' | 'desc'
  onSortChange: (col: string) => void
}

export function ItemTable({ items, loading, onItemClick, searchValue, onSearchChange, sort, order, onSortChange }: ItemTableProps) {
  const SortIcon = ({ col }: { col: string }) => {
    if (sort !== col) return null
    return order === 'asc' ? <ChevronUp className="h-3 w-3 inline" /> : <ChevronDown className="h-3 w-3 inline" />
  }

  const headerClick = (col: string) => {
    onSortChange(col)
  }

  return (
    <div>
      {/* Search */}
      <div className="mb-3 relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          value={searchValue}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Buscar items..."
          className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="pb-2 font-medium cursor-pointer hover:text-foreground" onClick={() => headerClick('item_name')}>
                Item <SortIcon col="item_name" />
              </th>
              <th className="pb-2 font-medium text-right cursor-pointer hover:text-foreground" onClick={() => headerClick('chaos_value')}>
                Chaos <SortIcon col="chaos_value" />
              </th>
              <th className="pb-2 font-medium text-right cursor-pointer hover:text-foreground" onClick={() => headerClick('divine_value')}>
                Divine <SortIcon col="divine_value" />
              </th>
              <th className="pb-2 font-medium text-right cursor-pointer hover:text-foreground" onClick={() => headerClick('change_24h')}>
                24h <SortIcon col="change_24h" />
              </th>
              <th className="pb-2 font-medium text-center">7d</th>
              <th className="pb-2 font-medium text-right cursor-pointer hover:text-foreground" onClick={() => headerClick('listing_count')}>
                Listados <SortIcon col="listing_count" />
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td colSpan={6} className="py-2.5"><div className="h-5 bg-slate-800 rounded animate-pulse" /></td>
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">No se encontraron items</td>
              </tr>
            ) : (
              items.map(item => {
                const sparkline = item.sparkline_json ? (() => { try { return JSON.parse(item.sparkline_json) } catch { return [] } })() : []
                return (
                  <tr
                    key={`${item.item_type}-${item.item_id}`}
                    className="border-b border-border/50 hover:bg-muted/50 cursor-pointer"
                    onClick={() => onItemClick?.(item)}
                  >
                    <td className="py-2 flex items-center gap-2">
                      {item.icon_url && <img src={item.icon_url} alt="" className="h-6 w-6 object-contain shrink-0" loading="lazy" />}
                      <span className="font-medium truncate max-w-[200px]">{item.item_name}</span>
                    </td>
                    <td className="py-2 text-right font-mono">{item.chaos_value?.toFixed(item.chaos_value >= 100 ? 0 : 1) ?? '-'}</td>
                    <td className="py-2 text-right font-mono">{item.divine_value?.toFixed(1) ?? '-'}</td>
                    <td className="py-2 text-right">
                      <ChangeCell value={item.change_24h} />
                    </td>
                    <td className="py-2 text-center">
                      <SparklineCell data={sparkline} positive={item.change_24h != null ? item.change_24h >= 0 : undefined} />
                    </td>
                    <td className="py-2 text-right text-muted-foreground">{item.listing_count ?? '-'}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ChangeCell({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return <span className="text-muted-foreground">-</span>
  const color = value > 0 ? 'text-green-500' : value < 0 ? 'text-red-500' : 'text-muted-foreground'
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus
  return (
    <span className={cn('flex items-center justify-end gap-0.5', color)}>
      <Icon className="h-3 w-3" />
      {value > 0 ? '+' : ''}{value.toFixed(1)}%
    </span>
  )
}
