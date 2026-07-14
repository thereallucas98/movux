import { prisma } from '~/lib/db'
import { assertAdminOrCoordenadorOfWorkspace } from '~/server/authorization/assert-admin-or-coordenador-of-workspace'
import { notifyCandidateRejected } from '~/server/notifications/candidate-events'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type {
  ShiftCandidateRepository,
  ShiftCandidateRow,
} from '~/server/repositories/candidate.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface RejectCandidateInput {
  candidateId: string
  reason: string
}

export type RejectCandidateResult =
  | { success: true; data: ShiftCandidateRow }
  | {
      success: false
      code:
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'INVALID_STATE_TRANSITION'
    }

export async function rejectCandidate(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  candidateRepo: ShiftCandidateRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: RejectCandidateInput,
): Promise<RejectCandidateResult> {
  if (!principal) {
    return { success: false, code: 'UNAUTHENTICATED' }
  }

  const candidate = await candidateRepo.findByIdWithJoins(input.candidateId)
  if (!candidate) return { success: false, code: 'NOT_FOUND' }

  const auth = await assertAdminOrCoordenadorOfWorkspace(
    workspaceMembershipRepo,
    principal,
    candidate.shift.schedule.workspaceId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  if (candidate.status !== 'QUEUED') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const u = await candidateRepo.update(
      candidate.id,
      {
        status: 'REJECTED',
        decidedByUserId: principal.userId,
        decidedAt: new Date(),
        decisionReason: input.reason,
      },
      tx,
    )
    await auditRepo.log(
      {
        actorUserId: principal.userId,
        action: 'CANDIDATE_REJECTED',
        entityType: 'SHIFT_CANDIDATE',
        entityId: candidate.id,
        metadata: {
          shiftId: candidate.shiftId,
          queuePosition: candidate.queuePosition,
          reason: input.reason,
        },
      },
      tx,
    )
    return u
  })

  await notifyCandidateRejected({
    candidateId: candidate.id,
    shiftId: candidate.shiftId,
    scheduleId: candidate.shift.scheduleId,
    workspaceId: candidate.shift.schedule.workspaceId,
    shiftStartAt: candidate.shift.startAt,
    shiftEndAt: candidate.shift.endAt,
    decidedByUserId: principal.userId,
    reason: input.reason,
    recipientUserIds: [candidate.userId],
  })

  return { success: true, data: updated }
}
