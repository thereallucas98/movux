import { prisma } from '~/lib/db'
import { notifyCandidateWithdrawn } from '~/server/notifications/candidate-events'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type { ShiftCandidateRepository } from '~/server/repositories/candidate.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface WithdrawFromShiftInput {
  candidateId: string
}

export type WithdrawFromShiftResult =
  | { success: true }
  | {
      success: false
      code:
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'INVALID_STATE_TRANSITION'
    }

export async function withdrawFromShift(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  candidateRepo: ShiftCandidateRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: WithdrawFromShiftInput,
): Promise<WithdrawFromShiftResult> {
  if (!principal) {
    return { success: false, code: 'UNAUTHENTICATED' }
  }

  const candidate = await candidateRepo.findByIdWithJoins(input.candidateId)
  if (!candidate) return { success: false, code: 'NOT_FOUND' }

  if (candidate.userId !== principal.userId) {
    return { success: false, code: 'FORBIDDEN' }
  }
  if (candidate.status !== 'QUEUED') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  await prisma.$transaction(async (tx) => {
    await candidateRepo.update(
      candidate.id,
      { status: 'WITHDRAWN', decidedAt: new Date() },
      tx,
    )
    await auditRepo.log(
      {
        actorUserId: principal.userId,
        action: 'CANDIDATE_WITHDRAWN',
        entityType: 'SHIFT_CANDIDATE',
        entityId: candidate.id,
        metadata: {
          shiftId: candidate.shiftId,
          queuePosition: candidate.queuePosition,
        },
      },
      tx,
    )
  })

  const coords = await workspaceMembershipRepo.listActiveByRole(
    candidate.shift.schedule.workspaceId,
    ['ADMIN', 'COORDENADOR'],
  )
  await notifyCandidateWithdrawn({
    candidateId: candidate.id,
    shiftId: candidate.shiftId,
    scheduleId: candidate.shift.scheduleId,
    workspaceId: candidate.shift.schedule.workspaceId,
    candidateUserId: candidate.userId,
    recipientUserIds: coords.map((c) => c.userId),
  })

  return { success: true }
}
