import {
  LayoutDashboard,
  Search,
  Bookmark,
  Bell,
  TrendingUp,
  BarChart3,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  name: string
  href: string
  icon: LucideIcon
  pageId: string
}

export const navigation: NavItem[] = [
  { name: 'Panel', href: '/dashboard', icon: LayoutDashboard, pageId: 'dashboard' },
  { name: 'Búsqueda', href: '/search', icon: Search, pageId: 'search' },
  { name: 'Analizar', href: '/analyze', icon: BarChart3, pageId: 'analyze' },
  { name: 'Búsquedas Guardadas', href: '/saved-searches', icon: Bookmark, pageId: 'saved-searches' },
  { name: 'Alertas', href: '/alerts', icon: Bell, pageId: 'alerts' },
  { name: 'Economía', href: '/economy', icon: TrendingUp, pageId: 'economy' },
  { name: 'Configuración', href: '/settings', icon: Settings, pageId: 'settings' },
]
