import { prisma } from '~/lib/db'
import { assertAdminOrCoordenadorOfWorkspace } from '~/server/authorization/assert-admin-or-coordenador-of-workspace'
import {
  loadTenantContextByWorkspaceId,
  tryEnforce,
  type PlanLimitFailure,
} from '~/server/plan-limits/try-enforce'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type { CategoryRepository } from '~/server/repositories/category.repository'
import type {
  ScheduleRepository,
  ScheduleRow,
} from '~/server/repositories/schedule.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface CreateScheduleInput {
  workspaceId: string
  categoryId: string
  name?: string | null
  periodStart: Date
  periodEnd: Date
}

export type CreateScheduleResult =
  | { success: true; data: ScheduleRow }
  | {
      success: false
      code:
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'VALIDATION_ERROR'
        | 'NOT_FOUND'
        | 'SCHEDULE_PERIOD_OVERLAP'
    }
  | PlanLimitFailure

export async function createSchedule(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  categoryRepo: CategoryRepository,
  scheduleRepo: ScheduleRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: CreateScheduleInput,
): Promise<CreateScheduleResult> {
  const auth = await assertAdminOrCoordenadorOfWorkspace(
    workspaceMembershipRepo,
    principal,
    input.workspaceId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  if (input.periodStart >= input.periodEnd) {
    return { success: false, code: 'VALIDATION_ERROR' }
  }

  const tenant = await loadTenantContextByWorkspaceId(input.workspaceId)
  if (!tenant) return { success: false, code: 'NOT_FOUND' }
  const planLimit = await tryEnforce({
    tenant,
    resource: 'activeSchedulesPerWorkspace',
    workspaceId: input.workspaceId,
  })
  if (planLimit) return planLimit

  const category = await categoryRepo.findAvailableForWorkspace(
    input.workspaceId,
    input.categoryId,
  )
  if (!category) {
    return { success: false, code: 'NOT_FOUND' }
  }

  const overlap = await scheduleRepo.findOverlapping({
    workspaceId: input.workspaceId,
    categoryId: input.categoryId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
  })
  if (overlap) {
    return { success: false, code: 'SCHEDULE_PERIOD_OVERLAP' }
  }

  const result = await prisma.$transaction(async (tx) => {
    const schedule = await scheduleRepo.create(
      {
        workspaceId: input.workspaceId,
        categoryId: input.categoryId,
        name: input.name ?? null,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
      },
      tx,
    )
    await auditRepo.log(
      {
        actorUserId: principal!.userId,
        action: 'SCHEDULE_CREATED',
        entityType: 'SCHEDULE',
        entityId: schedule.id,
        metadata: {
          workspaceId: input.workspaceId,
          categoryId: input.categoryId,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
        },
      },
      tx,
    )
    return schedule
  })

  return { success: true, data: result }
}
