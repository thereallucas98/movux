import { prisma } from '~/lib/db'
import { assertAdminOrCoordenadorOfWorkspace } from '~/server/authorization/assert-admin-or-coordenador-of-workspace'
import { computeTransferDeadline } from '~/server/lib/decision-window'
import { notifyCandidateApproved } from '~/server/notifications/candidate-events'
import type {
  AssignmentRepository,
  AssignmentRow,
} from '~/server/repositories/assignment.repository'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type {
  ShiftCandidateRepository,
  ShiftCandidateRow,
} from '~/server/repositories/candidate.repository'
import type { ShiftRepository } from '~/server/repositories/shift.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface ApproveCandidateInput {
  candidateId: string
  autoAccept: boolean
}

export interface ApproveCandidateData {
  candidate: ShiftCandidateRow
  assignment: AssignmentRow
  shiftFilled: boolean
}

export type ApproveCandidateResult =
  | { success: true; data: ApproveCandidateData }
  | {
      success: false
      code:
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'INVALID_STATE_TRANSITION'
        | 'SHIFT_HEADCOUNT_FULL'
        | 'SHIFT_OVERLAP_CONFLICT'
    }

export async function approveCandidate(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  shiftRepo: ShiftRepository,
  assignmentRepo: AssignmentRepository,
  candidateRepo: ShiftCandidateRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: ApproveCandidateInput,
): Promise<ApproveCandidateResult> {
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
  if (candidate.shift.schedule.status !== 'PUBLISHED') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  const filled = await assignmentRepo.countByShiftAndStatus(candidate.shiftId, [
    'PENDING_ACCEPT',
    'ACCEPTED',
  ])
  if (filled >= candidate.shift.headcount) {
    return { success: false, code: 'SHIFT_HEADCOUNT_FULL' }
  }

  const overlaps = await assignmentRepo.findOverlappingForUser({
    userId: candidate.userId,
    startAt: candidate.shift.startAt,
    endAt: candidate.shift.endAt,
    excludeShiftId: candidate.shiftId,
  })
  if (overlaps.length > 0) {
    return { success: false, code: 'SHIFT_OVERLAP_CONFLICT' }
  }

  const now = new Date()
  const decisionDeadline = computeTransferDeadline({
    now,
    shiftStartAt: candidate.shift.startAt,
    decisionWindowHours: candidate.shift.decisionWindowHours,
  })

  const result = await prisma.$transaction(async (tx) => {
    // Atomic check + flip; race-safe vs withdraw
    const updateResult = await candidateRepo.updateIfQueued(
      candidate.id,
      {
        status: 'APPROVED',
        decidedByUserId: principal.userId,
        decidedAt: now,
        resultingAssignmentId: null,
      },
      tx,
    )
    if (updateResult.count === 0) {
      throw new Error('CANDIDATE_RACE_LOST')
    }

    const assignment = await assignmentRepo.create(
      {
        shiftId: candidate.shiftId,
        userId: candidate.userId,
        assignedByUserId: principal.userId,
        status: input.autoAccept ? 'ACCEPTED' : 'PENDING_ACCEPT',
        decisionDeadline,
        decidedAt: input.autoAccept ? now : null,
      },
      tx,
    )

    // Link assignment back to candidate
    const updatedCandidate = await candidateRepo.update(
      candidate.id,
      { resultingAssignmentId: assignment.id },
      tx,
    )

    await auditRepo.log(
      {
        actorUserId: principal.userId,
        action: 'CANDIDATE_APPROVED',
        entityType: 'SHIFT_CANDIDATE',
        entityId: candidate.id,
        metadata: {
          shiftId: candidate.shiftId,
          assignmentId: assignment.id,
          autoAccepted: input.autoAccept,
        },
      },
      tx,
    )
    await auditRepo.log(
      {
        actorUserId: principal.userId,
        action: 'ASSIGNMENT_CREATED',
        entityType: 'SHIFT_ASSIGNMENT',
        entityId: assignment.id,
        metadata: {
          viaCandidateId: candidate.id,
          shiftId: candidate.shiftId,
          autoAccepted: input.autoAccept,
        },
      },
      tx,
    )

    // Auto-FILL shift if last slot accepted
    let shiftFilled = false
    if (input.autoAccept) {
      const acceptedCount = await assignmentRepo.countByShiftAndStatus(
        candidate.shiftId,
        ['ACCEPTED'],
        tx,
      )
      if (
        acceptedCount === candidate.shift.headcount &&
        candidate.shift.status === 'OPEN'
      ) {
        await shiftRepo.setStatus(candidate.shiftId, 'FILLED', {}, tx)
        await auditRepo.log(
          {
            actorUserId: principal.userId,
            action: 'SHIFT_FILLED',
            entityType: 'SHIFT',
            entityId: candidate.shiftId,
            metadata: {
              triggeredByAssignmentId: assignment.id,
              viaCandidateId: candidate.id,
            },
          },
          tx,
        )
        shiftFilled = true
      }
    }

    return { candidate: updatedCandidate, assignment, shiftFilled }
  })

  await notifyCandidateApproved({
    candidateId: candidate.id,
    shiftId: candidate.shiftId,
    scheduleId: candidate.shift.scheduleId,
    workspaceId: candidate.shift.schedule.workspaceId,
    shiftStartAt: candidate.shift.startAt,
    shiftEndAt: candidate.shift.endAt,
    decidedByUserId: principal.userId,
    reason: null,
    recipientUserIds: [candidate.userId],
  })

  return { success: true, data: result }
}
