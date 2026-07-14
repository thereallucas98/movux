import { prisma } from '~/lib/db'
import { assertAdminOrCoordenadorOfWorkspace } from '~/server/authorization/assert-admin-or-coordenador-of-workspace'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type { ShiftCandidateRepository } from '~/server/repositories/candidate.repository'
import type { ScheduleRepository } from '~/server/repositories/schedule.repository'
import type {
  ShiftAssignmentMode,
  ShiftRepository,
  ShiftRow,
} from '~/server/repositories/shift.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface UpdateShiftInput {
  shiftId: string
  data: {
    categoryId?: string
    startAt?: Date
    endAt?: Date
    headcount?: number
    assignmentMode?: ShiftAssignmentMode
    notes?: string | null
  }
}

export type UpdateShiftResult =
  | { success: true; data: ShiftRow }
  | {
      success: false
      code:
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'INVALID_STATE_TRANSITION'
        | 'SHIFT_TIME_INVALID'
    }

export async function updateShift(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  scheduleRepo: ScheduleRepository,
  shiftRepo: ShiftRepository,
  candidateRepo: ShiftCandidateRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: UpdateShiftInput,
): Promise<UpdateShiftResult> {
  if (!principal) {
    return { success: false, code: 'UNAUTHENTICATED' }
  }

  const shift = await shiftRepo.findById(input.shiftId)
  if (!shift) return { success: false, code: 'NOT_FOUND' }

  const schedule = await scheduleRepo.findById(shift.scheduleId)
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

  const nextStart = input.data.startAt ?? shift.startAt
  const nextEnd = input.data.endAt ?? shift.endAt
  if (nextStart >= nextEnd) {
    return { success: false, code: 'SHIFT_TIME_INVALID' }
  }

  // Task 11 (RQ8): block mode-change if there are active QUEUED candidates
  if (
    input.data.assignmentMode !== undefined &&
    input.data.assignmentMode !== shift.assignmentMode
  ) {
    const queuedCount = await candidateRepo.countByShift(shift.id, ['QUEUED'])
    if (queuedCount > 0) {
      return { success: false, code: 'INVALID_STATE_TRANSITION' }
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await shiftRepo.update(
      shift.id,
      {
        ...(input.data.categoryId !== undefined && {
          categoryId: input.data.categoryId,
        }),
        ...(input.data.startAt !== undefined && {
          startAt: input.data.startAt,
        }),
        ...(input.data.endAt !== undefined && {
          endAt: input.data.endAt,
        }),
        ...(input.data.headcount !== undefined && {
          headcount: input.data.headcount,
        }),
        ...(input.data.assignmentMode !== undefined && {
          assignmentMode: input.data.assignmentMode,
        }),
        ...(input.data.notes !== undefined && { notes: input.data.notes }),
      },
      tx,
    )
    await auditRepo.log(
      {
        actorUserId: principal.userId,
        action: 'SHIFT_UPDATED',
        entityType: 'SHIFT',
        entityId: updated.id,
        metadata: { changes: input.data },
      },
      tx,
    )
    return updated
  })

  return { success: true, data: result }
}
