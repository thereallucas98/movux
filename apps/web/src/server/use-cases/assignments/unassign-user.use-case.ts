import { prisma } from '~/lib/db'
import { assertAdminOrCoordenadorOfWorkspace } from '~/server/authorization/assert-admin-or-coordenador-of-workspace'
import type { AssignmentRepository } from '~/server/repositories/assignment.repository'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface UnassignUserInput {
  assignmentId: string
}

export type UnassignUserResult =
  | { success: true }
  | {
      success: false
      code:
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'INVALID_STATE_TRANSITION'
    }

export async function unassignUser(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  assignmentRepo: AssignmentRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: UnassignUserInput,
): Promise<UnassignUserResult> {
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

  if (row.status !== 'PENDING_ACCEPT') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  await prisma.$transaction(async (tx) => {
    await auditRepo.log(
      {
        actorUserId: principal.userId,
        action: 'ASSIGNMENT_UNASSIGNED',
        entityType: 'SHIFT_ASSIGNMENT',
        entityId: row.id,
        metadata: {
          shiftId: row.shiftId,
          assigneeUserId: row.userId,
        },
      },
      tx,
    )
    await assignmentRepo.hardDelete(row.id, tx)
  })

  return { success: true }
}
