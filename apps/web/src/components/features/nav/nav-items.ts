import {
  Bell,
  CalendarDays,
  Clock,
  Inbox,
  LayoutDashboard,
  Settings,
  Timer,
  type LucideIcon,
} from 'lucide-react'

export type BadgeKind = 'notifications-unread'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  /** Optional dynamic badge source. Renders count to the right of the label. */
  badge?: BadgeKind
}

export const PRIMARY_NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/schedules', label: 'Escalas', icon: CalendarDays },
  { href: '/shifts', label: 'Turnos', icon: Clock },
  { href: '/requests', label: 'Solicitações', icon: Inbox },
  {
    href: '/notifications',
    label: 'Notificações',
    icon: Bell,
    badge: 'notifications-unread',
  },
  { href: '/time-tracking', label: 'Ponto', icon: Timer },
  { href: '/settings', label: 'Configurações', icon: Settings },
]

/** Bottom-tab subset (mobile); Settings/Requests live behind "Mais". */
export const MOBILE_TAB_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/schedules', label: 'Escalas', icon: CalendarDays },
  { href: '/shifts', label: 'Turnos', icon: Clock },
  { href: '/time-tracking', label: 'Ponto', icon: Timer },
]
