import { prisma } from '~/lib/db'
import { assertAdminOrCoordenadorOfWorkspace } from '~/server/authorization/assert-admin-or-coordenador-of-workspace'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type { CategoryRepository } from '~/server/repositories/category.repository'
import type {
  ScheduleRepository,
  ScheduleRow,
} from '~/server/repositories/schedule.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface UpdateScheduleInput {
  scheduleId: string
  data: {
    categoryId?: string
    name?: string | null
    periodStart?: Date
    periodEnd?: Date
  }
}

export type UpdateScheduleResult =
  | { success: true; data: ScheduleRow }
  | {
      success: false
      code:
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'INVALID_STATE_TRANSITION'
        | 'VALIDATION_ERROR'
        | 'SCHEDULE_PERIOD_OVERLAP'
    }

export async function updateSchedule(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  categoryRepo: CategoryRepository,
  scheduleRepo: ScheduleRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: UpdateScheduleInput,
): Promise<UpdateScheduleResult> {
  if (!principal) {
    return { success: false, code: 'UNAUTHENTICATED' }
  }
  const current = await scheduleRepo.findById(input.scheduleId)
  if (!current) return { success: false, code: 'NOT_FOUND' }

  const auth = await assertAdminOrCoordenadorOfWorkspace(
    workspaceMembershipRepo,
    principal,
    current.workspaceId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  if (current.status !== 'DRAFT') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  const nextCategoryId = input.data.categoryId ?? current.categoryId
  const nextStart = input.data.periodStart ?? current.periodStart
  const nextEnd = input.data.periodEnd ?? current.periodEnd

  if (nextStart >= nextEnd) {
    return { success: false, code: 'VALIDATION_ERROR' }
  }

  if (input.data.categoryId && input.data.categoryId !== current.categoryId) {
    const category = await categoryRepo.findAvailableForWorkspace(
      current.workspaceId,
      input.data.categoryId,
    )
    if (!category) {
      return { success: false, code: 'NOT_FOUND' }
    }
  }

  const periodChanged =
    input.data.periodStart !== undefined ||
    input.data.periodEnd !== undefined ||
    (input.data.categoryId !== undefined &&
      input.data.categoryId !== current.categoryId)

  if (periodChanged) {
    const overlap = await scheduleRepo.findOverlapping({
      workspaceId: current.workspaceId,
      categoryId: nextCategoryId,
      periodStart: nextStart,
      periodEnd: nextEnd,
      excludeId: current.id,
    })
    if (overlap) {
      return { success: false, code: 'SCHEDULE_PERIOD_OVERLAP' }
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await scheduleRepo.update(
      current.id,
      {
        ...(input.data.categoryId !== undefined && {
          categoryId: input.data.categoryId,
        }),
        ...(input.data.name !== undefined && { name: input.data.name }),
        ...(input.data.periodStart !== undefined && {
          periodStart: input.data.periodStart,
        }),
        ...(input.data.periodEnd !== undefined && {
          periodEnd: input.data.periodEnd,
        }),
      },
      tx,
    )
    await auditRepo.log(
      {
        actorUserId: principal!.userId,
        action: 'SCHEDULE_UPDATED',
        entityType: 'SCHEDULE',
        entityId: updated.id,
        metadata: { changes: input.data },
      },
      tx,
    )
    return updated
  })

  return { success: true, data: result }
}
