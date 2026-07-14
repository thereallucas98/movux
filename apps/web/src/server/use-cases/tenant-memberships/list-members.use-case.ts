import { assertSuperAdminOfTenant } from '~/server/authorization/assert-super-admin-of-tenant'
import type {
  MembershipWithUser,
  TenantMembershipRepository,
} from '~/server/repositories/tenant-membership.repository'
import type { ListPage } from '~/server/repositories/tenant.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface ListMembersInput {
  tenantId: string
  cursor?: string | null
  limit?: number
}

export type ListMembersResult =
  | { success: true; data: ListPage<MembershipWithUser> }
  | { success: false; code: 'UNAUTHENTICATED' | 'FORBIDDEN' }

export async function listTenantMembers(
  membershipRepo: TenantMembershipRepository,
  principal: Principal | null,
  input: ListMembersInput,
): Promise<ListMembersResult> {
  const auth = await assertSuperAdminOfTenant(
    membershipRepo,
    principal,
    input.tenantId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  const data = await membershipRepo.listActiveByTenant(
    input.tenantId,
    input.cursor ?? null,
    input.limit ?? 20,
  )
  return { success: true, data }
}
