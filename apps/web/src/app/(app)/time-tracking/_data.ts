import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { getServerPrincipal } from '~/lib/get-server-principal'
import {
  workspaceMembershipRepository,
  workspaceRepository,
} from '~/server/repositories'
import { WORKSPACE_COOKIE } from '~/server/http/cookie'

export type WorkspaceRole = 'ADMIN' | 'COORDENADOR' | 'COLABORADOR'

export interface TimeTrackingContext {
  principal: { userId: string; role: string }
  workspaceId: string
  workspaceTimezone: string
  myMembershipRole: WorkspaceRole
}

export async function resolveTimeTrackingContext(
  searchParams: Promise<{ ws?: string }> | undefined,
): Promise<TimeTrackingContext> {
  const principal = await getServerPrincipal()
  if (!principal) redirect('/login')

  const wsPage = await workspaceRepository.listForUser(
    principal.userId,
    null,
    100,
  )
  if (wsPage.data.length === 0) redirect('/onboarding')

  const cookieStore = await cookies()
  const cookieWs = cookieStore.get(WORKSPACE_COOKIE)?.value ?? null
  const sp = (await searchParams) ?? {}
  const requestedId = sp.ws ?? cookieWs

  const current =
    wsPage.data.find((w) => w.id === requestedId) ?? wsPage.data[0]

  const membership = await workspaceMembershipRepository.findActive({
    workspaceId: current.id,
    userId: principal.userId,
  })
  if (!membership) redirect('/dashboard')

  return {
    principal: { userId: principal.userId, role: principal.role },
    workspaceId: current.id,
    workspaceTimezone: current.timezone,
    myMembershipRole: membership.role as WorkspaceRole,
  }
}
