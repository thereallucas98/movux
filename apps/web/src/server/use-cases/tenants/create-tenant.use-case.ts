import { prisma } from '~/lib/db'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type {
  MembershipRow,
  TenantMembershipRepository,
} from '~/server/repositories/tenant-membership.repository'
import type {
  TenantRepository,
  TenantRow,
} from '~/server/repositories/tenant.repository'

export interface Principal {
  userId: string
  role: string
}

export interface CreateTenantInput {
  name: string
  timezone?: string
}

export type CreateTenantResult =
  | {
      success: true
      data: { tenant: TenantRow; membership: MembershipRow }
    }
  | { success: false; code: 'UNAUTHENTICATED' }

export async function createTenant(
  tenantRepo: TenantRepository,
  membershipRepo: TenantMembershipRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: CreateTenantInput,
): Promise<CreateTenantResult> {
  if (!principal) {
    return { success: false, code: 'UNAUTHENTICATED' }
  }

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tenantRepo.create(
      { name: input.name, timezone: input.timezone },
      tx,
    )
    const membership = await membershipRepo.create(
      { tenantId: tenant.id, userId: principal.userId, role: 'SUPER_ADMIN' },
      tx,
    )
    await auditRepo.log(
      {
        actorUserId: principal.userId,
        action: 'TENANT_CREATED',
        entityType: 'TENANT',
        entityId: tenant.id,
        metadata: { name: tenant.name, timezone: tenant.timezone },
      },
      tx,
    )
    return { tenant, membership }
  })

  return { success: true, data: result }
}
