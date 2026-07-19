'use client'

import type { ReactNode } from 'react'

import { AuthObserver } from '~/components/features/auth/auth-observer'

import { BottomTabs } from './bottom-tabs'
import { MobileHeader } from './mobile-header'
import { Sidebar, type SidebarMe } from './sidebar'

interface AppShellProps {
  me: SidebarMe
  children: ReactNode
}

export function AppShell({ me, children }: AppShellProps) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar me={me} className="hidden md:flex" />
      <div className="flex min-h-dvh flex-1 flex-col">
        <MobileHeader className="md:hidden" />
        <main className="flex-1 px-4 py-6 pb-20 md:px-8 md:pb-6 lg:px-10">
          {children}
        </main>
      </div>
      <BottomTabs role={me.role} className="md:hidden" />
      <AuthObserver />
    </div>
  )
}
