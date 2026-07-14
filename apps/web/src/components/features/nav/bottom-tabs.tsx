'use client'

import { MoreHorizontal } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

import { cn } from '~/lib/utils'

import { MobileMoreSheet } from './mobile-more-sheet'
import { MOBILE_TAB_ITEMS } from './nav-items'
import type { SidebarWorkspace } from './sidebar'

interface BottomTabsProps {
  workspaces: SidebarWorkspace[]
  currentWorkspace: SidebarWorkspace
  className?: string
}

export function BottomTabs({
  workspaces,
  currentWorkspace,
  className,
}: BottomTabsProps) {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <>
      <nav
        aria-label="Navegação principal (mobile)"
        data-slot="bottom-tabs"
        className={cn(
          'border-border bg-background fixed inset-x-0 bottom-0 z-40 flex border-t pb-[env(safe-area-inset-bottom)]',
          className,
        )}
      >
        {MOBILE_TAB_ITEMS.map(({ href, label, icon: Icon }) => {
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
        <button
          type="button"
          aria-label="Mais opções"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen(true)}
          className={cn(
            'text-muted-foreground flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 py-2',
            'focus-visible:ring-ring min-h-14 focus-visible:ring-2 focus-visible:outline-none',
          )}
        >
          <MoreHorizontal className="size-5" aria-hidden="true" />
          <span className="text-[11px] font-medium">Mais</span>
        </button>
      </nav>

      <MobileMoreSheet
        open={moreOpen}
        onOpenChange={setMoreOpen}
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
      />
    </>
  )
}
