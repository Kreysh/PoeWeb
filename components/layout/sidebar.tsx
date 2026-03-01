'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronLeft, Swords, Wifi } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { navigation } from '@/lib/constants/navigation'

interface SidebarProps {
  collapsed?: boolean
  onCollapse?: () => void
}

export function Sidebar({ collapsed = false, onCollapse }: SidebarProps) {
  const pathname = usePathname()
  const [alertCount, setAlertCount] = useState(0)
  const [liveCount, setLiveCount] = useState(0)

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch('/api/alerts/triggered?unread=true&limit=1')
        const data = await res.json()
        if (data.success) setAlertCount(data.data?.total ?? 0)
      } catch { /* ignore */ }
    }

    const fetchLiveStatus = async () => {
      try {
        const res = await fetch('/api/live-search')
        const data = await res.json()
        if (data.success) setLiveCount(data.data?.totalConnections ?? 0)
      } catch { /* ignore */ }
    }

    fetchAlerts()
    fetchLiveStatus()
    const alertInterval = setInterval(fetchAlerts, 60 * 1000)
    const liveInterval = setInterval(fetchLiveStatus, 10 * 1000)
    return () => {
      clearInterval(alertInterval)
      clearInterval(liveInterval)
    }
  }, [])

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-slate-200 bg-slate-900 text-white transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Swords className="h-7 w-7 text-poe-gold" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-poe-gold-light">POE Trade</span>
              <span className="text-xs text-slate-400">Analyzer</span>
            </div>
          </div>
        )}
        {collapsed && <Swords className="mx-auto h-7 w-7 text-poe-gold" />}
        {onCollapse && !collapsed && (
          <Button variant="ghost" size="icon" onClick={onCollapse} className="text-white hover:bg-slate-800">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const showAlertBadge = item.pageId === 'alerts' && alertCount > 0
          const showLiveBadge = item.pageId === 'saved-searches' && liveCount > 0

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors relative',
                isActive
                  ? 'bg-poe-gold/20 text-poe-gold-light'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                collapsed && 'justify-center'
              )}
            >
              <item.icon className={cn('h-5 w-5', collapsed && 'h-6 w-6')} />
              {!collapsed && <span>{item.name}</span>}
              {isActive && !collapsed && !showAlertBadge && !showLiveBadge && (
                <div className="ml-auto h-2 w-2 rounded-full bg-poe-gold" />
              )}
              {showAlertBadge && !collapsed && (
                <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold leading-none">
                  {alertCount}
                </span>
              )}
              {showAlertBadge && collapsed && (
                <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1 text-[10px] font-bold leading-tight">
                  {alertCount}
                </span>
              )}
              {showLiveBadge && !collapsed && (
                <span className="ml-auto flex items-center gap-1 text-green-400">
                  <Wifi className="h-3 w-3 animate-pulse" />
                  <span className="text-[10px]">{liveCount}</span>
                </span>
              )}
              {showLiveBadge && collapsed && (
                <span className="absolute -right-1 -top-1 rounded-full bg-green-500 px-1 text-[10px] font-bold leading-tight animate-pulse">
                  {liveCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle when collapsed */}
      {collapsed && onCollapse && (
        <div className="border-t border-slate-800 p-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onCollapse}
            className="mx-auto text-white hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4 rotate-180" />
          </Button>
        </div>
      )}
    </aside>
  )
}
