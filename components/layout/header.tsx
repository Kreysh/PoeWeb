'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Menu, Sun, Moon, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GameToggle } from '@/components/ui/game-toggle'
import { LeagueSelector } from '@/components/ui/league-selector'
import { useEffect, useState } from 'react'

interface HeaderProps {
  onMenuClick?: () => void
}

const pageNames: Record<string, string> = {
  '/dashboard': 'Panel',
  '/search': 'Búsqueda de Trade',
  '/saved-searches': 'Búsquedas Guardadas',
  '/alerts': 'Alertas',
  '/economy': 'Economía',
  '/settings': 'Configuración',
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const pageName = pageNames[pathname] || (pathname.startsWith('/item/') ? 'Detalle del Item' : 'POE Trade')
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="flex h-14 items-center justify-between px-3 sm:px-6">
        <div className="flex items-center gap-4">
          {onMenuClick && (
            <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">{pageName}</h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <GameToggle />
          <div className="hidden sm:block">
            <LeagueSelector />
          </div>
          {mounted && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-9 w-9"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={handleLogout} className="h-9 w-9 text-slate-500 hover:text-red-500">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
