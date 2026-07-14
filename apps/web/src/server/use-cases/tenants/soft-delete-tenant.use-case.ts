import { prisma } from '~/lib/db'
import { assertSuperAdminOfTenant } from '~/server/authorization/assert-super-admin-of-tenant'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type { TenantMembershipRepository } from '~/server/repositories/tenant-membership.repository'
import type { TenantRepository } from '~/server/repositories/tenant.repository'
import type { Principal } from './create-tenant.use-case'

export interface SoftDeleteTenantInput {
  tenantId: string
}

export type SoftDeleteTenantResult =
  | { success: true }
  | { success: false; code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' }

export async function softDeleteTenant(
  tenantRepo: TenantRepository,
  membershipRepo: TenantMembershipRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: SoftDeleteTenantInput,
): Promise<SoftDeleteTenantResult> {
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

  await prisma.$transaction(async (tx) => {
    await tenantRepo.softDelete(input.tenantId, tx)
    await membershipRepo.softDeleteAllByTenant(input.tenantId, tx)
    await auditRepo.log(
      {
        actorUserId: principal!.userId,
        action: 'TENANT_SOFT_DELETED',
        entityType: 'TENANT',
        entityId: input.tenantId,
        metadata: { cascadeMemberships: true },
      },
      tx,
    )
  })

  return { success: true }
}
