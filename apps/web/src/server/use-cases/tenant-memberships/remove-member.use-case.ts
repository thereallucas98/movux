import { prisma } from '~/lib/db'
import { assertSuperAdminOfTenant } from '~/server/authorization/assert-super-admin-of-tenant'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type { TenantMembershipRepository } from '~/server/repositories/tenant-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface RemoveMemberInput {
  tenantId: string
  memberId: string
}

export type RemoveMemberResult =
  | { success: true }
  | {
      success: false
      code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' | 'LAST_SUPER_ADMIN'
    }

export async function removeTenantMember(
  membershipRepo: TenantMembershipRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: RemoveMemberInput,
): Promise<RemoveMemberResult> {
  const auth = await assertSuperAdminOfTenant(
    membershipRepo,
    principal,
    input.tenantId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  return prisma.$transaction(async (tx) => {
    const membership = await membershipRepo.findById(input.memberId, tx)
    if (
      !membership ||
      membership.tenantId !== input.tenantId ||
      !membership.isActive
    ) {
      return { success: false, code: 'NOT_FOUND' as const }
    }

    if (membership.role === 'SUPER_ADMIN') {
      const activeSuperAdmins = await membershipRepo.countActiveSuperAdmins(
        input.tenantId,
        tx,
      )
      if (activeSuperAdmins <= 1) {
        return { success: false, code: 'LAST_SUPER_ADMIN' as const }
      }
    }

    await membershipRepo.softDelete(input.memberId, tx)
    await auditRepo.log(
      {
        actorUserId: principal!.userId,
        action: 'TENANT_MEMBER_REMOVED',
        entityType: 'TENANT_MEMBERSHIP',
        entityId: input.memberId,
        metadata: {
          tenantId: input.tenantId,
          userId: membership.userId,
          role: membership.role,
        },
      },
      tx,
    )
    return { success: true as const }
  })
}
