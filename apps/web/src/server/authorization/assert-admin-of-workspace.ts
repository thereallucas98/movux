import type {
  AuthorizationResult,
  Principal,
} from './assert-super-admin-of-tenant'

/** Minimal shape required from the workspace-membership repository. */
export interface WorkspaceMembershipLookup {
  findActive(input: { workspaceId: string; userId: string }): Promise<{
    role: string
    isActive: boolean
  } | null>
}

/**
 * Caller must be an active ADMIN of the given workspace.
 *
 * Sibling of `assertSuperAdminOfTenant` — the 3-axis role model
 * (user / tenant / workspace) is enforced by 3 assert functions.
 */
export async function assertAdminOfWorkspace(
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

  if (!membership || !membership.isActive || membership.role !== 'ADMIN') {
    return { authorized: false, code: 'FORBIDDEN' }
  }

  return { authorized: true }
}
