import { assertSuperAdminOfTenant } from '~/server/authorization/assert-super-admin-of-tenant'
import type { TenantMembershipRepository } from '~/server/repositories/tenant-membership.repository'
import type {
  TenantRepository,
  TenantWithMembers,
} from '~/server/repositories/tenant.repository'
import type { Principal } from './create-tenant.use-case'

export interface GetTenantByIdInput {
  tenantId: string
  membersCursor?: string | null
  membersLimit?: number
}

export type GetTenantByIdResult =
  | { success: true; data: TenantWithMembers }
  | {
      success: false
      code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND'
    }

export async function getTenantById(
  tenantRepo: TenantRepository,
  membershipRepo: TenantMembershipRepository,
  principal: Principal | null,
  input: GetTenantByIdInput,
): Promise<GetTenantByIdResult> {
  const auth = await assertSuperAdminOfTenant(
    membershipRepo,
    principal,
    input.tenantId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  const data = await tenantRepo.findByIdWithMembersPage(
    input.tenantId,
    input.membersCursor ?? null,
    input.membersLimit ?? 20,
  )
  if (!data) {
    return { success: false, code: 'NOT_FOUND' }
  }
  return { success: true, data }
}
