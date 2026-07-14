import { prisma } from '~/lib/db'
import { assertAdminOrCoordenadorOfWorkspace } from '~/server/authorization/assert-admin-or-coordenador-of-workspace'
import {
  loadTenantContextByWorkspaceId,
  tryEnforce,
  type PlanLimitFailure,
} from '~/server/plan-limits/try-enforce'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type { CategoryRepository } from '~/server/repositories/category.repository'
import type { ScheduleRepository } from '~/server/repositories/schedule.repository'
import type {
  ShiftRepository,
  ShiftRow,
} from '~/server/repositories/shift.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface CreateShiftInput {
  workspaceId: string
  scheduleId: string
  categoryId: string
  startAt: Date
  endAt: Date
  headcount: number
  notes?: string | null
}

export type CreateShiftResult =
  | { success: true; data: ShiftRow }
  | {
      success: false
      code:
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'SHIFT_TIME_INVALID'
        | 'INVALID_STATE_TRANSITION'
    }
  | PlanLimitFailure

export async function createShift(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  scheduleRepo: ScheduleRepository,
  shiftRepo: ShiftRepository,
  categoryRepo: CategoryRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: CreateShiftInput,
): Promise<CreateShiftResult> {
  if (!principal) {
    return { success: false, code: 'UNAUTHENTICATED' }
  }

  const auth = await assertAdminOrCoordenadorOfWorkspace(
    workspaceMembershipRepo,
    principal,
    input.workspaceId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  if (input.startAt >= input.endAt) {
    return { success: false, code: 'SHIFT_TIME_INVALID' }
  }

  const schedule = await scheduleRepo.findById(input.scheduleId)
  if (!schedule || schedule.workspaceId !== input.workspaceId) {
    return { success: false, code: 'NOT_FOUND' }
  }
  if (schedule.status !== 'DRAFT') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  const category = await categoryRepo.findAvailableForWorkspace(
    input.workspaceId,
    input.categoryId,
  )
  if (!category) {
    return { success: false, code: 'NOT_FOUND' }
  }

  const tenant = await loadTenantContextByWorkspaceId(input.workspaceId)
  if (!tenant) return { success: false, code: 'NOT_FOUND' }
  const planLimit = await tryEnforce({
    tenant,
    resource: 'shiftsPerMonthPerWorkspace',
    workspaceId: input.workspaceId,
    monthDate: input.startAt,
    timeZone: tenant.workspaceTimezone,
  })
  if (planLimit) return planLimit

  const result = await prisma.$transaction(async (tx) => {
    const shift = await shiftRepo.create(
      {
        scheduleId: input.scheduleId,
        categoryId: input.categoryId,
        startAt: input.startAt,
        endAt: input.endAt,
        headcount: input.headcount,
        notes: input.notes ?? null,
      },
      tx,
    )
    await auditRepo.log(
      {
        actorUserId: principal.userId,
        action: 'SHIFT_CREATED',
        entityType: 'SHIFT',
        entityId: shift.id,
        metadata: {
          scheduleId: input.scheduleId,
          categoryId: input.categoryId,
          startAt: input.startAt,
          endAt: input.endAt,
          headcount: input.headcount,
        },
      },
      tx,
    )
    return shift
  })

  return { success: true, data: result }
}
