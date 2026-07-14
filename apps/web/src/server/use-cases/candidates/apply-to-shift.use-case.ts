import { prisma } from '~/lib/db'
import { assertActiveMemberOfWorkspace } from '~/server/authorization/assert-active-member-of-workspace'
import { notifyCandidateQueued } from '~/server/notifications/candidate-events'
import type { AssignmentRepository } from '~/server/repositories/assignment.repository'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type {
  ShiftCandidateRepository,
  ShiftCandidateRow,
} from '~/server/repositories/candidate.repository'
import type { ScheduleRepository } from '~/server/repositories/schedule.repository'
import type { ShiftRepository } from '~/server/repositories/shift.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface ApplyToShiftInput {
  shiftId: string
}

export type ApplyToShiftResult =
  | { success: true; data: ShiftCandidateRow }
  | {
      success: false
      code:
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'INVALID_STATE_TRANSITION'
        | 'ALREADY_EXISTS'
        | 'SHIFT_OVERLAP_CONFLICT'
    }

export async function applyToShift(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  scheduleRepo: ScheduleRepository,
  shiftRepo: ShiftRepository,
  assignmentRepo: AssignmentRepository,
  candidateRepo: ShiftCandidateRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: ApplyToShiftInput,
): Promise<ApplyToShiftResult> {
  if (!principal) {
    return { success: false, code: 'UNAUTHENTICATED' }
  }

  const shift = await shiftRepo.findById(input.shiftId)
  if (!shift) return { success: false, code: 'NOT_FOUND' }

  const schedule = await scheduleRepo.findById(shift.scheduleId)
  if (!schedule) return { success: false, code: 'NOT_FOUND' }
  if (schedule.status !== 'PUBLISHED') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  const auth = await assertActiveMemberOfWorkspace(
    workspaceMembershipRepo,
    principal,
    schedule.workspaceId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  if (shift.assignmentMode !== 'OPEN_FOR_APPLY') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  const existing = await candidateRepo.findActiveByShiftAndUser(
    input.shiftId,
    principal.userId,
  )
  if (existing) {
    return { success: false, code: 'ALREADY_EXISTS' }
  }

  const overlaps = await assignmentRepo.findOverlappingForUser({
    userId: principal.userId,
    startAt: shift.startAt,
    endAt: shift.endAt,
    excludeShiftId: input.shiftId,
  })
  if (overlaps.length > 0) {
    return { success: false, code: 'SHIFT_OVERLAP_CONFLICT' }
  }

  // Insert with retry on (shiftId, queuePosition) unique violation.
  const tryInsert = async () => {
    return prisma.$transaction(async (tx) => {
      const position = await candidateRepo.nextQueuePosition(input.shiftId, tx)
      const candidate = await candidateRepo.create(
        {
          shiftId: input.shiftId,
          userId: principal.userId,
          queuePosition: position,
        },
        tx,
      )
      await auditRepo.log(
        {
          actorUserId: principal.userId,
          action: 'CANDIDATE_QUEUED',
          entityType: 'SHIFT_CANDIDATE',
          entityId: candidate.id,
          metadata: { shiftId: input.shiftId, queuePosition: position },
        },
        tx,
      )
      return candidate
    })
  }

  let attempts = 0
  // Retry once on unique-violation race; after that, let the error bubble up.
  while (true) {
    try {
      const candidate = await tryInsert()
      const coords = await workspaceMembershipRepo.listActiveByRole(
        schedule.workspaceId,
        ['ADMIN', 'COORDENADOR'],
      )
      await notifyCandidateQueued({
        candidateId: candidate.id,
        shiftId: shift.id,
        scheduleId: shift.scheduleId,
        workspaceId: schedule.workspaceId,
        shiftStartAt: shift.startAt,
        shiftEndAt: shift.endAt,
        candidateUserId: principal.userId,
        queuePosition: candidate.queuePosition,
        recipientUserIds: coords.map((c) => c.userId),
      })
      return { success: true, data: candidate }
    } catch (err) {
      const isUniqueViolation =
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code?: string }).code === 'P2002'
      if (!isUniqueViolation || attempts >= 1) throw err
      attempts += 1
    }
  }
}
