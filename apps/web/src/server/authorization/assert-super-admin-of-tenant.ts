/**
 * Authorization helper: caller must be an active SUPER_ADMIN of the given tenant.
 *
 * Usage in a use case:
 *   const auth = await assertSuperAdminOfTenant(membershipRepo, principal, tenantId)
 *   if (!auth.authorized) return { success: false, code: auth.code }
 *
 * This file is part of the `authorization/` module. Each authorization axis
 * (user-global, tenant-scoped, workspace-scoped) gets its own assert function
 * to keep the three axes clearly separated — see CLAUDE-INSTRUCTIONS § Guardrails.
 */

export interface Principal {
  userId: string
  role: string
}

/** Minimal shape required from the membership repository. */
export interface MembershipLookup {
  findActive(input: { tenantId: string; userId: string }): Promise<{
    role: string
    isActive: boolean
  } | null>
}

export type AuthorizationResult =
  | { authorized: true }
  | { authorized: false; code: 'UNAUTHENTICATED' | 'FORBIDDEN' }

export async function assertSuperAdminOfTenant(
  membershipRepo: MembershipLookup,
  principal: Principal | null,
  tenantId: string,
): Promise<AuthorizationResult> {
  if (!principal) {
    return { authorized: false, code: 'UNAUTHENTICATED' }
  }

  const membership = await membershipRepo.findActive({
    tenantId,
    userId: principal.userId,
  })

  if (
    !membership ||
    !membership.isActive ||
    membership.role !== 'SUPER_ADMIN'
  ) {
    return { authorized: false, code: 'FORBIDDEN' }
  }

  return { authorized: true }
}
