import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { AppShell } from '~/components/features/nav/app-shell'
import { prisma } from '~/lib/db'
import { getServerPrincipal } from '~/lib/get-server-principal'
import {
  tenantMembershipRepository,
  tenantRepository,
  workspaceRepository,
} from '~/server/repositories'
import { WORKSPACE_COOKIE } from '~/server/http/cookie'
import { getTenantPlanLimits } from '~/server/use-cases'

interface AppLayoutProps {
  children: ReactNode
  searchParams?: Promise<{ ws?: string }>
}

export default async function AppLayout({
  children,
  searchParams,
}: AppLayoutProps) {
  const principal = await getServerPrincipal()
  if (!principal) redirect('/login')

  const me = await prisma.user.findUnique({
    where: { id: principal.userId },
    select: { id: true, fullName: true, role: true },
  })
  if (!me) redirect('/login')

  const workspacesPage = await workspaceRepository.listForUser(
    principal.userId,
    null,
    100,
  )
  const workspaces = workspacesPage.data.map((w) => ({
    id: w.id,
    name: w.name,
    tenantId: w.tenantId,
  }))

  if (workspaces.length === 0) {
    redirect('/onboarding')
  }

  const cookieStore = await cookies()
  const cookieWs = cookieStore.get(WORKSPACE_COOKIE)?.value ?? null
  const sp = (await searchParams) ?? {}
  const requestedId = sp.ws ?? cookieWs

  const currentWorkspace =
    workspaces.find((w) => w.id === requestedId) ?? workspaces[0]

  // Prefetch tenant plan-limits so <GracePeriodBanner> hydrates without a
  // client-side waterfall (research §4 — F13 plan-limits-banners).
  const queryClient = new QueryClient()
  try {
    await queryClient.prefetchQuery({
      queryKey: ['plan-limits', 'tenant', currentWorkspace.tenantId] as const,
      queryFn: async () => {
        const result = await getTenantPlanLimits(
          tenantRepository,
          tenantMembershipRepository,
          { userId: principal.userId, role: principal.role },
          { tenantId: currentWorkspace.tenantId },
        )
        if (!result.success) throw new Error('plan-limits prefetch failed')
        return result.data
      },
    })
  } catch {
    // Prefetch is best-effort; client-side fetch will recover on mount.
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AppShell
        me={{ id: me.id, fullName: me.fullName, role: me.role }}
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
      >
        {children}
      </AppShell>
    </HydrationBoundary>
  )
}
