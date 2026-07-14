import type {
  AuthorizationResult,
  Principal,
} from './assert-super-admin-of-tenant'

export interface WorkspaceMembershipLookup {
  findActive(input: { workspaceId: string; userId: string }): Promise<{
    role: string
    isActive: boolean
  } | null>
}

/**
 * Caller must be an active ADMIN or COORDENADOR of the given workspace.
 * Task 06 use cases for specialty assignment use this broader guard.
 */
export async function assertAdminOrCoordenadorOfWorkspace(
  membershipRepo: WorkspaceMembershipLookup,
  principal: Principal | null,
  workspaceId: string,
): Promise<AuthorizationResult> {
  if (!principal) {
    return { authorized: false, code: 'UNAUTHENTICATED' }
  }

  const membership = await membershipRepo.findActive({
    workspaceId,
    userId: principal.userId,
  })

  if (
    !membership ||
    !membership.isActive ||
    (membership.role !== 'ADMIN' && membership.role !== 'COORDENADOR')
  ) {
    return { authorized: false, code: 'FORBIDDEN' }
  }

  return { authorized: true }
}
