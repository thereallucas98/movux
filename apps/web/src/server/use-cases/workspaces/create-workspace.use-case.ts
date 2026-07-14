import { prisma } from '~/lib/db'
import { assertSuperAdminOfTenant } from '~/server/authorization/assert-super-admin-of-tenant'
import {
  loadTenantContext,
  tryEnforce,
  type PlanLimitFailure,
} from '~/server/plan-limits/try-enforce'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type { CategoryRepository } from '~/server/repositories/category.repository'
import type { TenantMembershipRepository } from '~/server/repositories/tenant-membership.repository'
import type {
  MembershipRow as WorkspaceMembershipRow,
  WorkspaceMembershipRepository,
} from '~/server/repositories/workspace-membership.repository'
import type {
  WorkspaceRepository,
  WorkspaceRow,
} from '~/server/repositories/workspace.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export type WorkspaceVertical = 'HOSPITAL' | 'CLINIC' | 'GYM' | 'OTHER'

export interface CreateWorkspaceInput {
  tenantId: string
  name: string
  timezone?: string
  vertical: WorkspaceVertical
}

export type CreateWorkspaceResult =
  | {
      success: true
      data: { workspace: WorkspaceRow; membership: WorkspaceMembershipRow }
    }
  | { success: false; code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' }
  | PlanLimitFailure

export async function createWorkspace(
  workspaceRepo: WorkspaceRepository,
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  tenantMembershipRepo: TenantMembershipRepository,
  categoryRepo: CategoryRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: CreateWorkspaceInput,
): Promise<CreateWorkspaceResult> {
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
    resource: 'workspacesPerTenant',
  })
  if (planLimit) return planLimit

  const result = await prisma.$transaction(async (tx) => {
    const workspace = await workspaceRepo.create(
      {
        tenantId: input.tenantId,
        name: input.name,
        vertical: input.vertical,
        timezone: input.timezone,
      },
      tx,
    )
    const membership = await workspaceMembershipRepo.create(
      { workspaceId: workspace.id, userId: principal!.userId, role: 'ADMIN' },
      tx,
    )
    const geral = await categoryRepo.create(
      {
        scope: 'WORKSPACE',
        tenantId: workspace.tenantId,
        workspaceId: workspace.id,
        slug: 'general',
        name: 'Geral',
      },
      tx,
    )
    await auditRepo.log(
      {
        actorUserId: principal!.userId,
        action: 'WORKSPACE_CREATED',
        entityType: 'WORKSPACE',
        entityId: workspace.id,
        metadata: {
          tenantId: workspace.tenantId,
          name: workspace.name,
          vertical: workspace.vertical,
          geralCategoryId: geral.id,
        },
      },
      tx,
    )
    return { workspace, membership }
  })

  return { success: true, data: result }
}
