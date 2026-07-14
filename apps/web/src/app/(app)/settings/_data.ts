import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { getServerPrincipal } from '~/lib/get-server-principal'
import {
  workspaceMembershipRepository,
  workspaceRepository,
} from '~/server/repositories'
import { WORKSPACE_COOKIE } from '~/server/http/cookie'

export type WorkspaceVertical = 'HOSPITAL' | 'CLINIC' | 'GYM' | 'OTHER'
export type WorkspaceRole = 'ADMIN' | 'COORDENADOR' | 'COLABORADOR'

export interface SettingsContext {
  principal: { userId: string; role: string }
  workspaceId: string
  workspaceName: string
  workspaceTimezone: string
  workspaceVertical: WorkspaceVertical
  myMembershipRole: WorkspaceRole
}

/**
 * Resolves the active workspace for `/settings/*` pages and gates the user's
 * role within that workspace. Mirrors `(app)/layout.tsx` resolution order:
 * URL `?ws` → cookie `tn_ws` → first workspace.
 */
export async function resolveSettingsContext(
  searchParams: Promise<{ ws?: string }> | undefined,
): Promise<SettingsContext> {
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
    workspaceName: current.name,
    workspaceTimezone: current.timezone,
    workspaceVertical: current.vertical as WorkspaceVertical,
    myMembershipRole: membership.role as WorkspaceRole,
  }
}
