import { prisma } from '~/lib/db'
import { assertSuperAdminOfTenant } from '~/server/authorization/assert-super-admin-of-tenant'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type { TenantMembershipRepository } from '~/server/repositories/tenant-membership.repository'
import type {
  TenantRepository,
  TenantRow,
} from '~/server/repositories/tenant.repository'
import type { Principal } from './create-tenant.use-case'

export interface UpdateTenantInput {
  tenantId: string
  data: { name?: string; timezone?: string }
}

export type UpdateTenantResult =
  | { success: true; data: TenantRow }
  | { success: false; code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' }

export async function updateTenant(
  tenantRepo: TenantRepository,
  membershipRepo: TenantMembershipRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: UpdateTenantInput,
): Promise<UpdateTenantResult> {
  const auth = await assertSuperAdminOfTenant(
    membershipRepo,
    principal,
    input.tenantId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  const existing = await tenantRepo.findById(input.tenantId)
  if (!existing) {
    return { success: false, code: 'NOT_FOUND' }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tenantRepo.update(input.tenantId, input.data, tx)
    await auditRepo.log(
      {
        actorUserId: principal!.userId,
        action: 'TENANT_UPDATED',
        entityType: 'TENANT',
        entityId: input.tenantId,
        metadata: { changes: input.data },
      },
      tx,
    )
    return next
  })

  return { success: true, data: updated }
}
