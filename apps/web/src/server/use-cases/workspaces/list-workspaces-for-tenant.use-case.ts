import { assertSuperAdminOfTenant } from '~/server/authorization/assert-super-admin-of-tenant'
import type { TenantMembershipRepository } from '~/server/repositories/tenant-membership.repository'
import type { ListPage } from '~/server/repositories/tenant.repository'
import type {
  WorkspaceRepository,
  WorkspaceRow,
} from '~/server/repositories/workspace.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface ListWorkspacesForTenantInput {
  tenantId: string
  cursor?: string | null
  limit?: number
}

export type ListWorkspacesForTenantResult =
  | { success: true; data: ListPage<WorkspaceRow> }
  | { success: false; code: 'UNAUTHENTICATED' | 'FORBIDDEN' }

export async function listWorkspacesForTenant(
  workspaceRepo: WorkspaceRepository,
  tenantMembershipRepo: TenantMembershipRepository,
  principal: Principal | null,
  input: ListWorkspacesForTenantInput,
): Promise<ListWorkspacesForTenantResult> {
  const auth = await assertSuperAdminOfTenant(
    tenantMembershipRepo,
    principal,
    input.tenantId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  const data = await workspaceRepo.listForTenant(
    input.tenantId,
    input.cursor ?? null,
    input.limit ?? 20,
  )
  return { success: true, data }
}
