import { prisma } from '~/lib/db'
import { assertAdminOrCoordenadorOfWorkspace } from '~/server/authorization/assert-admin-or-coordenador-of-workspace'
import type { AssignmentRepository } from '~/server/repositories/assignment.repository'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type {
  TimeEntryRepository,
  TimeEntryRow,
} from '~/server/repositories/time-entry.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface CloseAssignmentInput {
  assignmentId: string
  notes?: string
}

export type CloseAssignmentResult =
  | { success: true; data: TimeEntryRow }
  | {
      success: false
      code:
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'INVALID_STATE_TRANSITION'
    }

export async function closeAssignment(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  assignmentRepo: AssignmentRepository,
  timeEntryRepo: TimeEntryRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: CloseAssignmentInput,
): Promise<CloseAssignmentResult> {
  if (!principal) return { success: false, code: 'UNAUTHENTICATED' }

  const assignment = await assignmentRepo.findByIdWithShiftAndSchedule(
    input.assignmentId,
  )
  if (!assignment) return { success: false, code: 'NOT_FOUND' }

  const auth = await assertAdminOrCoordenadorOfWorkspace(
    workspaceMembershipRepo,
    principal,
    assignment.shift.schedule.workspaceId,
  )
  if (!auth.authorized) return { success: false, code: auth.code }

  if (assignment.status !== 'PENDING_CLOSURE') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  const entry = await timeEntryRepo.findByAssignmentId(input.assignmentId)
  if (!entry) return { success: false, code: 'INVALID_STATE_TRANSITION' }
  if (!entry.clockInAt || !entry.clockOutAt) {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  const now = new Date()

  return prisma.$transaction(async (tx) => {
    const updated = await timeEntryRepo.update(
      entry.id,
      {
        closedByUserId: principal.userId,
        closedAt: now,
        ...(input.notes !== undefined && { notes: input.notes }),
      },
      tx,
    )
    await assignmentRepo.update(input.assignmentId, { status: 'COMPLETED' }, tx)
    await auditRepo.log(
      {
        actorUserId: principal.userId,
        action: 'ASSIGNMENT_COMPLETED',
        entityType: 'SHIFT_ASSIGNMENT',
        entityId: input.assignmentId,
        metadata: {
          shiftId: assignment.shiftId,
          timeEntryId: entry.id,
          hasNotes: input.notes != null,
        },
      },
      tx,
    )
    return { success: true, data: updated } as CloseAssignmentResult
  })
}
