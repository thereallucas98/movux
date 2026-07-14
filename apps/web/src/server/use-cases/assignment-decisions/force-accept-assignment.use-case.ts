import { prisma } from '~/lib/db'
import { assertAdminOrCoordenadorOfWorkspace } from '~/server/authorization/assert-admin-or-coordenador-of-workspace'
import type {
  AssignmentRepository,
  AssignmentRow,
} from '~/server/repositories/assignment.repository'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type { ShiftRepository } from '~/server/repositories/shift.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface ForceAcceptAssignmentInput {
  assignmentId: string
}

export type ForceAcceptAssignmentResult =
  | { success: true; data: AssignmentRow; shiftFilled: boolean }
  | {
      success: false
      code:
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'INVALID_STATE_TRANSITION'
    }

export async function forceAcceptAssignment(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  shiftRepo: ShiftRepository,
  assignmentRepo: AssignmentRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: ForceAcceptAssignmentInput,
): Promise<ForceAcceptAssignmentResult> {
  if (!principal) {
    return { success: false, code: 'UNAUTHENTICATED' }
  }

  const row = await assignmentRepo.findByIdWithShiftAndSchedule(
    input.assignmentId,
  )
  if (!row) return { success: false, code: 'NOT_FOUND' }

  const auth = await assertAdminOrCoordenadorOfWorkspace(
    workspaceMembershipRepo,
    principal,
    row.shift.schedule.workspaceId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  // Only PENDING_ACCEPT or EXPIRED can be force-accepted
  if (row.status !== 'PENDING_ACCEPT' && row.status !== 'EXPIRED') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  const wasExpired = row.status === 'EXPIRED'
  const bypassedDeadline = Date.now() > row.decisionDeadline.getTime()

  const result = await prisma.$transaction(async (tx) => {
    const updated = await assignmentRepo.update(
      row.id,
      { status: 'ACCEPTED', decidedAt: new Date() },
      tx,
    )
    await auditRepo.log(
      {
        actorUserId: principal.userId,
        action: 'ASSIGNMENT_FORCE_ACCEPTED',
        entityType: 'SHIFT_ASSIGNMENT',
        entityId: row.id,
        metadata: {
          shiftId: row.shiftId,
          forcedByAdmin: true,
          revivedFromExpired: wasExpired,
          bypassedDeadline,
        },
      },
      tx,
    )

    let shiftFilled = false
    const acceptedCount = await assignmentRepo.countByShiftAndStatus(
      row.shiftId,
      ['ACCEPTED'],
      tx,
    )
    if (
      acceptedCount === row.shift.headcount &&
      row.shift.schedule.status === 'PUBLISHED'
    ) {
      await shiftRepo.setStatus(row.shiftId, 'FILLED', {}, tx)
      await auditRepo.log(
        {
          actorUserId: principal.userId,
          action: 'SHIFT_FILLED',
          entityType: 'SHIFT',
          entityId: row.shiftId,
          metadata: {
            triggeredByAssignmentId: row.id,
            forcedByAdmin: true,
          },
        },
        tx,
      )
      shiftFilled = true
    }

    return { updated, shiftFilled }
  })

  return {
    success: true,
    data: result.updated,
    shiftFilled: result.shiftFilled,
  }
}
