import { prisma } from '~/lib/db'
import { assertAdminOrCoordenadorOfWorkspace } from '~/server/authorization/assert-admin-or-coordenador-of-workspace'
import { isPatternTimeValid } from '~/server/lib/shift-time'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type { CategoryRepository } from '~/server/repositories/category.repository'
import type { ScheduleRepository } from '~/server/repositories/schedule.repository'
import type {
  ShiftPatternRepository,
  ShiftPatternRow,
} from '~/server/repositories/shift-pattern.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface CreatePatternInput {
  workspaceId: string
  scheduleId: string
  categoryId: string
  name?: string | null
  daysOfWeek: number[]
  startTimeMinutes: number
  endTimeMinutes: number
  crossesMidnight: boolean
  headcount: number
}

export type CreatePatternResult =
  | { success: true; data: ShiftPatternRow }
  | {
      success: false
      code:
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'INVALID_STATE_TRANSITION'
        | 'SHIFT_TIME_INVALID'
    }

export async function createPattern(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  scheduleRepo: ScheduleRepository,
  patternRepo: ShiftPatternRepository,
  categoryRepo: CategoryRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: CreatePatternInput,
): Promise<CreatePatternResult> {
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

  if (
    !isPatternTimeValid({
      startTimeMinutes: input.startTimeMinutes,
      endTimeMinutes: input.endTimeMinutes,
      crossesMidnight: input.crossesMidnight,
    })
  ) {
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

  const result = await prisma.$transaction(async (tx) => {
    const pattern = await patternRepo.create(
      {
        scheduleId: input.scheduleId,
        categoryId: input.categoryId,
        name: input.name ?? null,
        daysOfWeek: input.daysOfWeek,
        startTimeMinutes: input.startTimeMinutes,
        endTimeMinutes: input.endTimeMinutes,
        crossesMidnight: input.crossesMidnight,
        headcount: input.headcount,
      },
      tx,
    )
    await auditRepo.log(
      {
        actorUserId: principal.userId,
        action: 'PATTERN_CREATED',
        entityType: 'SHIFT_PATTERN',
        entityId: pattern.id,
        metadata: {
          scheduleId: input.scheduleId,
          daysOfWeek: input.daysOfWeek,
          startTimeMinutes: input.startTimeMinutes,
          endTimeMinutes: input.endTimeMinutes,
          crossesMidnight: input.crossesMidnight,
        },
      },
      tx,
    )
    return pattern
  })

  return { success: true, data: result }
}
