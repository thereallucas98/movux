import { prisma } from '~/lib/db'
import { assertAdminOrCoordenadorOfWorkspace } from '~/server/authorization/assert-admin-or-coordenador-of-workspace'
import {
  computeShiftTimes,
  diffInDays,
  expandPatternDates,
} from '~/server/lib/shift-time'
import { preflightPatternQuota } from '~/server/plan-limits/preflight-pattern-quota'
import {
  loadTenantContextByWorkspaceId,
  type PlanLimitFailure,
} from '~/server/plan-limits/try-enforce'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type { ScheduleRepository } from '~/server/repositories/schedule.repository'
import type { ShiftPatternRepository } from '~/server/repositories/shift-pattern.repository'
import type { ShiftRepository } from '~/server/repositories/shift.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

const MAX_RANGE_DAYS = 90

export interface GenerateShiftsFromPatternInput {
  patternId: string
  rangeStart: Date
  rangeEnd: Date
}

export type GenerateShiftsFromPatternResult =
  | {
      success: true
      data: { generated: number; skipped: number }
    }
  | {
      success: false
      code:
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'INVALID_STATE_TRANSITION'
        | 'PATTERN_RANGE_TOO_LARGE'
        | 'VALIDATION_ERROR'
    }
  | PlanLimitFailure

export async function generateShiftsFromPattern(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  scheduleRepo: ScheduleRepository,
  patternRepo: ShiftPatternRepository,
  shiftRepo: ShiftRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: GenerateShiftsFromPatternInput,
): Promise<GenerateShiftsFromPatternResult> {
  if (!principal) {
    return { success: false, code: 'UNAUTHENTICATED' }
  }

  if (input.rangeStart >= input.rangeEnd) {
    return { success: false, code: 'VALIDATION_ERROR' }
  }
  if (diffInDays(input.rangeStart, input.rangeEnd) > MAX_RANGE_DAYS) {
    return { success: false, code: 'PATTERN_RANGE_TOO_LARGE' }
  }

  const pattern = await patternRepo.findById(input.patternId)
  if (!pattern) return { success: false, code: 'NOT_FOUND' }

  const schedule = await scheduleRepo.findById(pattern.scheduleId)
  if (!schedule) return { success: false, code: 'NOT_FOUND' }

  const auth = await assertAdminOrCoordenadorOfWorkspace(
    workspaceMembershipRepo,
    principal,
    schedule.workspaceId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  if (schedule.status !== 'DRAFT') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  const tenant = await loadTenantContextByWorkspaceId(schedule.workspaceId)
  if (!tenant) return { success: false, code: 'NOT_FOUND' }
  const preflight = await preflightPatternQuota(
    { db: prisma },
    {
      workspaceId: schedule.workspaceId,
      timezone: tenant.workspaceTimezone,
      rangeStart: input.rangeStart,
      rangeEnd: input.rangeEnd,
      pattern: {
        daysOfWeek: pattern.daysOfWeek,
        startTimeMinutes: pattern.startTimeMinutes,
        endTimeMinutes: pattern.endTimeMinutes,
        crossesMidnight: pattern.crossesMidnight,
      },
      plan: tenant.plan,
    },
  )
  if (!preflight.ok) {
    return { success: false, code: 'PLAN_LIMIT_REACHED', meta: preflight.meta }
  }

  const dates = expandPatternDates(
    input.rangeStart,
    input.rangeEnd,
    pattern.daysOfWeek,
  )
  const expectedCount = dates.length
  const rows = dates.map((date) => {
    const { startAt, endAt } = computeShiftTimes({
      date,
      startTimeMinutes: pattern.startTimeMinutes,
      endTimeMinutes: pattern.endTimeMinutes,
      crossesMidnight: pattern.crossesMidnight,
    })
    return {
      scheduleId: pattern.scheduleId,
      categoryId: pattern.categoryId,
      patternId: pattern.id,
      startAt,
      endAt,
      headcount: pattern.headcount,
    }
  })

  const result = await prisma.$transaction(async (tx) => {
    const insertResult = await shiftRepo.bulkCreateFromPattern(rows, tx)
    const generated = insertResult.count
    const skipped = expectedCount - generated
    await auditRepo.log(
      {
        actorUserId: principal.userId,
        action: 'PATTERN_GENERATED',
        entityType: 'SHIFT_PATTERN',
        entityId: pattern.id,
        metadata: {
          patternId: pattern.id,
          rangeStart: input.rangeStart,
          rangeEnd: input.rangeEnd,
          generated,
          skipped,
        },
      },
      tx,
    )
    return { generated, skipped }
  })

  return { success: true, data: result }
}
