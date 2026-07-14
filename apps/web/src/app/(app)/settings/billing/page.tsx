import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { getServerPrincipal } from '~/lib/get-server-principal'
import { workspaceRepository } from '~/server/repositories'
import { WORKSPACE_COOKIE } from '~/server/http/cookie'

import { BillingShell } from './_components/billing-shell'

export default async function BillingPage() {
  const principal = await getServerPrincipal()
  if (!principal) redirect('/login')

  const cookieStore = await cookies()
  const cookieWs = cookieStore.get(WORKSPACE_COOKIE)?.value ?? null

  const workspaces = await workspaceRepository.listForUser(
    principal.userId,
    null,
    100,
  )
  if (workspaces.data.length === 0) redirect('/onboarding')

  const current =
    workspaces.data.find((w) => w.id === cookieWs) ?? workspaces.data[0]

  // BillingShell consumes React Query cache hydrated by the (app)/layout.tsx
  // prefetch for the tenant; workspace plan-limits is fetched client-side.
  return <BillingShell tenantId={current.tenantId} workspaceId={current.id} />
}
