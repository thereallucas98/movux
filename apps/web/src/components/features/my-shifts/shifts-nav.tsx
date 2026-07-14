'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '~/lib/utils'

const TABS = [
  { href: '/shifts', label: 'Meus Turnos', exact: true },
  { href: '/shifts/abertos', label: 'Abertos', exact: false },
] as const

export function ShiftsNav() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Meus turnos"
      className="border-border flex flex-row gap-1 overflow-x-auto border-b lg:flex-col lg:border-r lg:border-b-0 lg:pr-4"
    >
      {TABS.map(({ href, label, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'rounded-sm px-3 py-2 text-[14px] font-medium whitespace-nowrap transition-colors',
              'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
              active
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
