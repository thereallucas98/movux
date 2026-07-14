import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { getServerPrincipal } from '~/lib/get-server-principal'
import { workspaceRepository } from '~/server/repositories'
import { WORKSPACE_COOKIE } from '~/server/http/cookie'

export interface DashboardContext {
  principal: { userId: string; role: string }
  workspaceId: string
  timezone: string
}

/**
 * Mirrors the resolution order used by `app/(app)/layout.tsx` (URL ?ws=… →
 * cookie tn_ws → first workspace). Re-running here is cheap because Next.js
 * dedupes server fetches at request scope. Returns `null` only when the user
 * has no workspaces — the parent layout already redirects in that case, but
 * we guard for type safety.
 */
export async function resolveDashboardContext(
  searchParams: Promise<{ ws?: string }> | undefined,
): Promise<DashboardContext | null> {
  const principal = await getServerPrincipal()
  if (!principal) redirect('/login')

  const workspacesPage = await workspaceRepository.listForUser(
    principal.userId,
    null,
    100,
  )
  if (workspacesPage.data.length === 0) return null

  const cookieStore = await cookies()
  const cookieWs = cookieStore.get(WORKSPACE_COOKIE)?.value ?? null
  const sp = (await searchParams) ?? {}
  const requestedId = sp.ws ?? cookieWs

  const current =
    workspacesPage.data.find((w) => w.id === requestedId) ??
    workspacesPage.data[0]

  return {
    principal: { userId: principal.userId, role: principal.role },
    workspaceId: current.id,
    timezone: current.timezone,
  }
}
