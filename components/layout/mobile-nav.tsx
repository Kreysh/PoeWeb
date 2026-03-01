'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X, Swords } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { navigation } from '@/lib/constants/navigation'

interface MobileNavProps {
  open: boolean
  onClose: () => void
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname()

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[85vw] max-w-64 flex-col border-r border-slate-200 bg-slate-900 text-white transition-transform duration-300 lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
          <div className="flex items-center gap-2">
            <Swords className="h-7 w-7 text-poe-gold" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-poe-gold-light">POE Trade</span>
              <span className="text-xs text-slate-400">Analyzer</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-slate-800">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 p-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-poe-gold/20 text-poe-gold-light' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
                {isActive && <div className="ml-auto h-2 w-2 rounded-full bg-poe-gold" />}
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
