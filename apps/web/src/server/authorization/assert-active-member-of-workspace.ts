import type { Principal } from './assert-super-admin-of-tenant'

/** Minimal shape required from the workspace-membership repository. */
export interface WorkspaceMembershipLookup {
  findActive(input: { workspaceId: string; userId: string }): Promise<{
    role: string
    isActive: boolean
  } | null>
}

export type ActiveMemberAuthorization =
  | {
      authorized: true
      membership: { role: string; isActive: boolean }
    }
  | { authorized: false; code: 'UNAUTHENTICATED' | 'FORBIDDEN' }

/**
 * Caller must be an active member of the given workspace (any role).
 * Returns the membership so callers can role-filter the response payload
 * (ADMIN sees memberships list, others don't — see Research §2.2).
 */
export async function assertActiveMemberOfWorkspace(
  membershipRepo: WorkspaceMembershipLookup,
  principal: Principal | null,
  workspaceId: string,
): Promise<ActiveMemberAuthorization> {
  if (!principal) {
    return { authorized: false, code: 'UNAUTHENTICATED' }
  }

  const membership = await membershipRepo.findActive({
    workspaceId,
    userId: principal.userId,
  })

  if (!membership || !membership.isActive) {
    return { authorized: false, code: 'FORBIDDEN' }
  }

  return { authorized: true, membership }
}
