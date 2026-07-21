import {
  ClipboardList,
  LayoutDashboard,
  PackagePlus,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

export const CUSTOMER_NAV_ITEMS: NavItem[] = [
  { href: '/customer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customer/shipments', label: 'Meus fretes', icon: Truck },
  { href: '/customer/shipments/new', label: 'Novo frete', icon: PackagePlus },
]

export const CARRIER_NAV_ITEMS: NavItem[] = [
  { href: '/carrier/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/carrier/shipments', label: 'Fretes abertos', icon: Truck },
  {
    href: '/carrier/proposals',
    label: 'Minhas propostas',
    icon: ClipboardList,
  },
]

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    href: '/admin/verifications',
    label: 'Verificações',
    icon: ShieldCheck,
  },
]

export const NAV_ITEMS_BY_ROLE: Record<string, NavItem[]> = {
  CUSTOMER: CUSTOMER_NAV_ITEMS,
  CARRIER: CARRIER_NAV_ITEMS,
  ADMIN: ADMIN_NAV_ITEMS,
}

// Prefixos de nav item podem se sobrepor (ex.: "/customer/shipments" é
// prefixo de "/customer/shipments/new") — só o match mais específico
// (mais longo) deve ficar destacado, nunca os dois ao mesmo tempo.
export function getActiveNavHref(
  pathname: string,
  items: NavItem[],
): string | undefined {
  let best: NavItem | undefined
  for (const item of items) {
    const matches =
      pathname === item.href || pathname.startsWith(`${item.href}/`)
    if (matches && (!best || item.href.length > best.href.length)) {
      best = item
    }
  }
  return best?.href
}
