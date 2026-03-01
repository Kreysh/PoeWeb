'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { MobileNav } from '@/components/layout/mobile-nav'
import { AuthProvider } from '@/lib/contexts/auth-context'
import { GameProvider } from '@/lib/contexts/game-context'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <AuthProvider>
      <GameProvider>
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
          <div className="hidden lg:flex lg:flex-col">
            <Sidebar collapsed={sidebarCollapsed} onCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
          </div>
          <MobileNav open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header onMenuClick={() => setMobileMenuOpen(true)} />
            <main className="flex-1 overflow-y-auto p-3 sm:p-6">{children}</main>
          </div>
        </div>
      </GameProvider>
    </AuthProvider>
  )
}
