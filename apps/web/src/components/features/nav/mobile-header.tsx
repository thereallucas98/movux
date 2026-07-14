'use client'

import { motion, type Variants } from 'framer-motion'
import { useState } from 'react'

import { NotificationBell } from '~/components/features/notifications/notification-bell'
import { Logo } from '~/components/ui/logo'
import { cn } from '~/lib/utils'

import { MobileMoreSheet } from './mobile-more-sheet'
import type { SidebarMe, SidebarWorkspace } from './sidebar'

interface MobileHeaderProps {
  me: SidebarMe
  workspaces: SidebarWorkspace[]
  currentWorkspace: SidebarWorkspace
  className?: string
}

const HAMBURGER_VARIANTS: Record<'top' | 'middle' | 'bottom', Variants> = {
  top: {
    open: { rotate: 45, top: '50%', y: '-50%', x: '-50%' },
    closed: { rotate: 0, top: '32%', y: '-50%', x: '-50%' },
  },
  middle: {
    open: { opacity: 0 },
    closed: { opacity: 1 },
  },
  bottom: {
    open: { rotate: -45, bottom: '50%', y: '50%', x: '-50%' },
    closed: { rotate: 0, bottom: '32%', y: '50%', x: '-50%' },
  },
}

function initialFor(name: string): string {
  return name.trim().charAt(0).toUpperCase() || 'W'
}

export function MobileHeader({
  me,
  workspaces,
  currentWorkspace,
  className,
}: MobileHeaderProps) {
  const [moreOpen, setMoreOpen] = useState<boolean>(false)

  return (
    <>
      <header
        data-slot="mobile-header"
        className={cn(
          'border-border bg-background sticky top-0 z-50 flex items-center justify-between border-b px-4 pt-[env(safe-area-inset-top)] pb-3',
          className,
        )}
      >
        <motion.button
          type="button"
          aria-label={moreOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((v) => !v)}
          initial={false}
          animate={moreOpen ? 'open' : 'closed'}
          className="relative flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-sm focus-visible:outline-none"
        >
          {/* Hamburger / X morph — three spans whose rotation+position
              variants animate in lockstep (top/middle/bottom). */}
          <motion.span
            variants={HAMBURGER_VARIANTS.top}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="absolute block h-[3px] w-6 rounded-full"
            style={{
              background: moreOpen ? '#fff' : 'var(--gray-800)',
              left: '50%',
            }}
          />
          <motion.span
            variants={HAMBURGER_VARIANTS.middle}
            transition={{ duration: 0.18 }}
            className="absolute top-1/2 left-1/2 block h-[3px] w-6 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: moreOpen ? '#fff' : 'var(--gray-800)' }}
          />
          <motion.span
            variants={HAMBURGER_VARIANTS.bottom}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="absolute block h-[3px] w-6 rounded-full"
            style={{
              background: moreOpen ? '#fff' : 'var(--gray-800)',
              left: '50%',
            }}
          />
        </motion.button>

        <Logo
          className={cn(
            'transition-colors',
            moreOpen ? 'text-white' : 'text-foreground',
          )}
        />

        <div className="flex items-center gap-2">
          {!moreOpen && <NotificationBell principalUserId={me.id} />}
          {!moreOpen && (
            <span
              aria-label={`Workspace atual: ${currentWorkspace.name}`}
              className="bg-accent text-foreground flex size-9 items-center justify-center rounded-sm text-sm font-bold"
            >
              {initialFor(currentWorkspace.name)}
            </span>
          )}
        </div>
      </header>

      <MobileMoreSheet
        open={moreOpen}
        onOpenChange={setMoreOpen}
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
      />
    </>
  )
}
