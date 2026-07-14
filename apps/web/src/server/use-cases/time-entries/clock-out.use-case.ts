import { prisma } from '~/lib/db'
import {
  computeOvertimeMinutes,
  isWithinTolerance,
} from '~/server/lib/clock-tolerance'
import { assertActiveMemberOfWorkspace } from '~/server/authorization/assert-active-member-of-workspace'
import { createRuleEngine } from '~/server/rule-engine/engine'
import { cltRules, type CLTContext } from '~/server/rule-engine/clt-rules'
import type { AssignmentRepository } from '~/server/repositories/assignment.repository'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type {
  ClockLocation,
  TimeEntryRepository,
  TimeEntryRow,
} from '~/server/repositories/time-entry.repository'
import type { WorkspaceRepository } from '~/server/repositories/workspace.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface ClockOutInput {
  assignmentId: string
  location?: ClockLocation
}

export type ClockOutResult =
  | { success: true; data: TimeEntryRow }
  | {
      success: false
      code:
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'INVALID_STATE_TRANSITION'
    }

export async function clockOutOfShift(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  workspaceRepo: WorkspaceRepository,
  assignmentRepo: AssignmentRepository,
  timeEntryRepo: TimeEntryRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: ClockOutInput,
): Promise<ClockOutResult> {
  if (!principal) return { success: false, code: 'UNAUTHENTICATED' }

  const assignment = await assignmentRepo.findByIdWithShiftAndSchedule(
    input.assignmentId,
  )
  if (!assignment) return { success: false, code: 'NOT_FOUND' }
  if (assignment.userId !== principal.userId) {
    return { success: false, code: 'FORBIDDEN' }
  }

  const auth = await assertActiveMemberOfWorkspace(
    workspaceMembershipRepo,
    principal,
    assignment.shift.schedule.workspaceId,
  )
  if (!auth.authorized) return { success: false, code: auth.code }

  if (assignment.status !== 'ACCEPTED') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  const entry = await timeEntryRepo.findByAssignmentId(input.assignmentId)
  if (!entry) return { success: false, code: 'INVALID_STATE_TRANSITION' }
  if (entry.clockOutAt) {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  const workspace = await workspaceRepo.findById(
    assignment.shift.schedule.workspaceId,
  )
  if (!workspace) return { success: false, code: 'NOT_FOUND' }

  const now = new Date()
  const within = isWithinTolerance({
    actualAt: now,
    anchorAt: assignment.shift.endAt,
    toleranceMinutes: workspace.clockToleranceMinutes,
  })
  const overtimeMinutes = computeOvertimeMinutes({
    clockOutAt: now,
    shiftEndAt: assignment.shift.endAt,
  })

  const updated = await prisma.$transaction(async (tx) => {
    const updatedEntry = await timeEntryRepo.update(
      entry.id,
      {
        clockOutAt: now,
        clockOutLocation: input.location ?? null,
        clockOutWithinTolerance: within,
        overtimeMinutes,
      },
      tx,
    )
    await assignmentRepo.update(
      input.assignmentId,
      { status: 'PENDING_CLOSURE' },
      tx,
    )
    await auditRepo.log(
      {
        actorUserId: principal.userId,
        action: 'TIME_ENTRY_CLOCK_OUT',
        entityType: 'TIME_ENTRY',
        entityId: updatedEntry.id,
        metadata: {
          shiftAssignmentId: input.assignmentId,
          shiftId: assignment.shiftId,
          withinTolerance: within,
          overtimeMinutes,
          hasLocation: input.location != null,
        },
      },
      tx,
    )
    await auditRepo.log(
      {
        actorUserId: principal.userId,
        action: 'ASSIGNMENT_PENDING_CLOSURE',
        entityType: 'SHIFT_ASSIGNMENT',
        entityId: input.assignmentId,
        metadata: { shiftId: assignment.shiftId },
      },
      tx,
    )
    return updatedEntry
  })

  // CLT rule warnings — emitted post-tx; never block the clock-out.
  const lastClockOutAt = await timeEntryRepo.findLastClockOutBefore({
    userId: principal.userId,
    before: now,
  })
  const hoursThisWeek = await timeEntryRepo.sumHoursForUserInWeek({
    userId: principal.userId,
    anchor: now,
  })
  const cltContext: CLTContext = {
    userId: principal.userId,
    workspaceId: workspace.id,
    clockOutAt: now,
    shiftEndAt: assignment.shift.endAt,
    lastClockOutAt,
    hoursThisWeek,
  }
  const violations = createRuleEngine<CLTContext>(cltRules).evaluate(cltContext)
  for (const v of violations) {
    await auditRepo.log({
      actorUserId: principal.userId,
      action: 'CLT_RULE_WARNING',
      entityType: 'TIME_ENTRY',
      entityId: updated.id,
      metadata: {
        ruleId: v.ruleId,
        severity: v.severity,
        message: v.message,
        ...v.metadata,
      },
    })
  }

  return { success: true, data: updated }
}
