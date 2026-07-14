import { prisma } from '~/lib/db'
import { assertSuperAdminOfTenant } from '~/server/authorization/assert-super-admin-of-tenant'
import {
  loadTenantContext,
  tryEnforce,
  type PlanLimitFailure,
} from '~/server/plan-limits/try-enforce'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type {
  CategoryRepository,
  CategoryRow,
} from '~/server/repositories/category.repository'
import type { TenantMembershipRepository } from '~/server/repositories/tenant-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface CreateTenantCategoryInput {
  tenantId: string
  slug: string
  name: string
  description?: string | null
}

export type CreateTenantCategoryResult =
  | { success: true; data: CategoryRow }
  | {
      success: false
      code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' | 'ALREADY_EXISTS'
    }
  | PlanLimitFailure

function isPrismaUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'P2002'
  )
}

export async function createTenantCategory(
  tenantMembershipRepo: TenantMembershipRepository,
  categoryRepo: CategoryRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: CreateTenantCategoryInput,
): Promise<CreateTenantCategoryResult> {
  const auth = await assertSuperAdminOfTenant(
    tenantMembershipRepo,
    principal,
    input.tenantId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  const tenant = await loadTenantContext(input.tenantId)
  if (!tenant) return { success: false, code: 'NOT_FOUND' }

  const planLimit = await tryEnforce({
    tenant,
    resource: 'tenantScopedCatalogs',
  })
  if (planLimit) return planLimit

  try {
    const category = await prisma.$transaction(async (tx) => {
      const created = await categoryRepo.create(
        {
          scope: 'TENANT',
          tenantId: input.tenantId,
          slug: input.slug,
          name: input.name,
          description: input.description ?? null,
        },
        tx,
      )
      await auditRepo.log(
        {
          actorUserId: principal!.userId,
          action: 'TENANT_CATEGORY_CREATED',
          entityType: 'TENANT_CATEGORY',
          entityId: created.id,
          metadata: {
            tenantId: input.tenantId,
            slug: input.slug,
            name: input.name,
          },
        },
        tx,
      )
      return created
    })
    return { success: true, data: category }
  } catch (error) {
    if (isPrismaUniqueViolation(error)) {
      return { success: false, code: 'ALREADY_EXISTS' }
    }
    throw error
  }
}
