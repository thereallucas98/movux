import { prisma } from '~/lib/db'
import { assertSuperAdminOfTenant } from '~/server/authorization/assert-super-admin-of-tenant'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type {
  MembershipRow,
  TenantMembershipRepository,
} from '~/server/repositories/tenant-membership.repository'
import type { UserRepository } from '~/server/repositories/user.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface AddMemberInput {
  tenantId: string
  userId: string
  role: 'SUPER_ADMIN'
}

export type AddMemberResult =
  | { success: true; data: MembershipRow }
  | {
      success: false
      code:
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'TARGET_USER_NOT_FOUND'
        | 'ALREADY_MEMBER'
    }

function isPrismaUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'P2002'
  )
}

export async function addTenantMember(
  membershipRepo: TenantMembershipRepository,
  userRepo: UserRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: AddMemberInput,
): Promise<AddMemberResult> {
  const auth = await assertSuperAdminOfTenant(
    membershipRepo,
    principal,
    input.tenantId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  const targetUser = await userRepo.findByIdWithRole(input.userId)
  if (!targetUser) {
    return { success: false, code: 'TARGET_USER_NOT_FOUND' }
  }

  try {
    const membership = await prisma.$transaction(async (tx) => {
      const created = await membershipRepo.create(
        {
          tenantId: input.tenantId,
          userId: input.userId,
          role: input.role,
        },
        tx,
      )
      await auditRepo.log(
        {
          actorUserId: principal!.userId,
          action: 'TENANT_MEMBER_ADDED',
          entityType: 'TENANT_MEMBERSHIP',
          entityId: created.id,
          metadata: {
            tenantId: input.tenantId,
            userId: input.userId,
            role: input.role,
          },
        },
        tx,
      )
      return created
    })
    return { success: true, data: membership }
  } catch (error) {
    if (isPrismaUniqueViolation(error)) {
      return { success: false, code: 'ALREADY_MEMBER' }
    }
    throw error
  }
}
