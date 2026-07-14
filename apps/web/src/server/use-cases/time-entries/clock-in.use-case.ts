import { prisma } from '~/lib/db'
import { isWithinTolerance } from '~/server/lib/clock-tolerance'
import { assertActiveMemberOfWorkspace } from '~/server/authorization/assert-active-member-of-workspace'
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

export interface ClockInInput {
  assignmentId: string
  location?: ClockLocation
}

export type ClockInResult =
  | { success: true; data: TimeEntryRow }
  | {
      success: false
      code:
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'INVALID_STATE_TRANSITION'
        | 'ALREADY_CLOCKED_IN'
    }

export async function clockInToShift(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  workspaceRepo: WorkspaceRepository,
  assignmentRepo: AssignmentRepository,
  timeEntryRepo: TimeEntryRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: ClockInInput,
): Promise<ClockInResult> {
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

  const existing = await timeEntryRepo.findByAssignmentId(input.assignmentId)
  if (existing) return { success: false, code: 'ALREADY_CLOCKED_IN' }

  const workspace = await workspaceRepo.findById(
    assignment.shift.schedule.workspaceId,
  )
  if (!workspace) return { success: false, code: 'NOT_FOUND' }

  const now = new Date()
  const within = isWithinTolerance({
    actualAt: now,
    anchorAt: assignment.shift.startAt,
    toleranceMinutes: workspace.clockToleranceMinutes,
  })

  try {
    return await prisma.$transaction(async (tx) => {
      const entry = await timeEntryRepo.create(
        {
          shiftAssignmentId: input.assignmentId,
          userId: principal.userId,
          clockInAt: now,
          clockInLocation: input.location ?? null,
          clockInWithinTolerance: within,
        },
        tx,
      )
      await auditRepo.log(
        {
          actorUserId: principal.userId,
          action: 'TIME_ENTRY_CLOCK_IN',
          entityType: 'TIME_ENTRY',
          entityId: entry.id,
          metadata: {
            shiftAssignmentId: input.assignmentId,
            shiftId: assignment.shiftId,
            withinTolerance: within,
            hasLocation: input.location != null,
          },
        },
        tx,
      )
      return { success: true, data: entry } as ClockInResult
    })
  } catch (err) {
    const code =
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code?: string }).code === 'P2002'
        ? 'ALREADY_CLOCKED_IN'
        : null
    if (code) return { success: false, code }
    throw err
  }
}
