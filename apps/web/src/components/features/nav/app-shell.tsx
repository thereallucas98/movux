'use client'

import type { ReactNode } from 'react'

import { AuthObserver } from '~/components/features/auth/auth-observer'
import { GracePeriodBanner } from '~/components/features/plan-limits/grace-period-banner'

import { BottomTabs } from './bottom-tabs'
import { MobileHeader } from './mobile-header'
import { Sidebar, type SidebarMe, type SidebarWorkspace } from './sidebar'

interface AppShellProps {
  me: SidebarMe
  workspaces: SidebarWorkspace[]
  currentWorkspace: SidebarWorkspace
  children: ReactNode
}

export function AppShell({
  me,
  workspaces,
  currentWorkspace,
  children,
}: AppShellProps) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar
        me={me}
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        className="hidden md:flex"
      />
      <div className="flex min-h-dvh flex-1 flex-col">
        <MobileHeader
          me={me}
          workspaces={workspaces}
          currentWorkspace={currentWorkspace}
          className="md:hidden"
        />
        <GracePeriodBanner tenantId={currentWorkspace.tenantId} />
        <main className="flex-1 px-4 py-6 pb-20 md:px-8 md:pb-6 lg:px-10">
          {children}
        </main>
      </div>
      <BottomTabs
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        className="md:hidden"
      />
      <AuthObserver />
    </div>
  )
}
