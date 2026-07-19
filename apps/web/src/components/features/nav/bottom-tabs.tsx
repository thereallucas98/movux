'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '~/lib/utils'

import { NAV_ITEMS_BY_ROLE } from './nav-items'

interface BottomTabsProps {
  role: string
  className?: string
}

export function BottomTabs({ role, className }: BottomTabsProps) {
  const pathname = usePathname()
  const navItems = NAV_ITEMS_BY_ROLE[role] ?? []

  return (
    <nav
      aria-label="Navegação principal (mobile)"
      data-slot="bottom-tabs"
      className={cn(
        'border-border bg-background fixed inset-x-0 bottom-0 z-40 flex border-t pb-[env(safe-area-inset-bottom)]',
        className,
      )}
    >
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 py-2',
              'focus-visible:ring-ring min-h-14 focus-visible:ring-2 focus-visible:outline-none',
              isActive ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
            <span className="text-[11px] font-medium">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
