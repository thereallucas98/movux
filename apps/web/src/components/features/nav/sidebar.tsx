'use client'

import { LogOut } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Avatar, AvatarFallback } from '~/components/ui/avatar'
import { IconButton } from '~/components/ui/icon-button'
import { Logo } from '~/components/ui/logo'
import { api } from '~/lib/api-client'
import { cn } from '~/lib/utils'

import { NAV_ITEMS_BY_ROLE } from './nav-items'

export interface SidebarMe {
  id: string
  fullName: string
  role: string
}

interface SidebarProps {
  me: SidebarMe
  className?: string
}

const ROLE_LABELS: Record<string, string> = {
  CUSTOMER: 'Cliente',
  CARRIER: 'Transportador',
  ADMIN: 'Admin',
}

function initialsFor(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Sidebar({ me, className }: SidebarProps) {
  const pathname = usePathname()
  const navItems = NAV_ITEMS_BY_ROLE[me.role] ?? []

  async function handleLogout(): Promise<void> {
    await api.post('/api/auth/logout')
    window.location.href = '/login'
  }

  return (
    <aside
      className={cn(
        'border-border bg-background flex min-h-dvh w-64 flex-col border-r p-4',
        className,
      )}
      data-slot="sidebar"
    >
      <Logo className="text-foreground mb-6" />

      <nav aria-label="Navegação principal" className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-colors',
                'hover:bg-accent focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                isActive ? 'bg-accent text-foreground' : 'text-muted-foreground',
              )}
            >
              <Icon className="size-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="border-border mt-4 flex items-center gap-3 border-t pt-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar size="sm">
            <AvatarFallback>{initialsFor(me.fullName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-foreground truncate text-sm font-semibold">
              {me.fullName}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {ROLE_LABELS[me.role] ?? me.role}
            </p>
          </div>
        </div>
        <IconButton
          variant="outline"
          size="sm"
          aria-label="Sair"
          onClick={handleLogout}
        >
          <LogOut />
        </IconButton>
      </div>
    </aside>
  )
}
