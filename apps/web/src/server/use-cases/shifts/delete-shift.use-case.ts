import { prisma } from '~/lib/db'
import { assertAdminOrCoordenadorOfWorkspace } from '~/server/authorization/assert-admin-or-coordenador-of-workspace'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type { ScheduleRepository } from '~/server/repositories/schedule.repository'
import type { ShiftRepository } from '~/server/repositories/shift.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface DeleteShiftInput {
  shiftId: string
  reason?: string | null
}

export type DeleteShiftResult =
  | { success: true; mode: 'HARD' | 'CANCELLED' }
  | {
      success: false
      code:
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'INVALID_STATE_TRANSITION'
    }

export async function deleteShift(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  scheduleRepo: ScheduleRepository,
  shiftRepo: ShiftRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: DeleteShiftInput,
): Promise<DeleteShiftResult> {
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

  if (schedule.status === 'CLOSED') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  const mode: 'HARD' | 'CANCELLED' =
    schedule.status === 'DRAFT' ? 'HARD' : 'CANCELLED'

  await prisma.$transaction(async (tx) => {
    await auditRepo.log(
      {
        actorUserId: principal.userId,
        action: mode === 'HARD' ? 'SHIFT_DELETED' : 'SHIFT_CANCELLED',
        entityType: 'SHIFT',
        entityId: shift.id,
        metadata: {
          scheduleId: shift.scheduleId,
          scheduleStatus: schedule.status,
          mode,
          reason: input.reason ?? null,
        },
      },
      tx,
    )
    if (mode === 'HARD') {
      await shiftRepo.hardDelete(shift.id, tx)
    } else {
      await shiftRepo.setStatus(
        shift.id,
        'CANCELLED',
        {
          cancelledAt: new Date(),
          cancelReason: input.reason ?? null,
        },
        tx,
      )
    }
  })

  return { success: true, mode }
}
