import { prisma } from '~/lib/db'
import { assertShiftParticipantOrCoord } from '~/server/authorization/assert-shift-participant-or-coord'
import type { ShiftTimelineEvent } from '~/server/lib/shift-timeline-projection'
import type { AssignmentRepository } from '~/server/repositories/assignment.repository'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type { ShiftCandidateRepository } from '~/server/repositories/candidate.repository'
import type { RequestRepository } from '~/server/repositories/request.repository'
import type { ScheduleRepository } from '~/server/repositories/schedule.repository'
import type { ShiftRepository } from '~/server/repositories/shift.repository'
import type { ShiftTimelineNoteRepository } from '~/server/repositories/shift-timeline-note.repository'
import type { UserRepository } from '~/server/repositories/user.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface AddShiftTimelineNoteInput {
  shiftId: string
  note: string
}

export type AddShiftTimelineNoteResult =
  | { success: true; data: ShiftTimelineEvent }
  | { success: false; code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' }

export async function addShiftTimelineNote(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  shiftRepo: ShiftRepository,
  scheduleRepo: ScheduleRepository,
  assignmentRepo: AssignmentRepository,
  shiftCandidateRepo: ShiftCandidateRepository,
  requestRepo: RequestRepository,
  shiftTimelineNoteRepo: ShiftTimelineNoteRepository,
  auditRepo: AuditLogRepository,
  userRepo: UserRepository,
  principal: Principal | null,
  input: AddShiftTimelineNoteInput,
): Promise<AddShiftTimelineNoteResult> {
  const auth = await assertShiftParticipantOrCoord(
    {
      workspaceMembershipRepo,
      shiftRepo,
      scheduleRepo,
      assignmentRepo,
      shiftCandidateRepo,
      requestRepo,
    },
    principal,
    input.shiftId,
  )
  if (!auth.authorized) return { success: false, code: auth.code }

  // assertion guarantees principal is non-null
  const principalUserId = principal!.userId
  const trimmed = input.note.trim()

  const created = await prisma.$transaction(async (tx) => {
    const note = await shiftTimelineNoteRepo.create(
      {
        shiftId: input.shiftId,
        authorUserId: principalUserId,
        note: trimmed,
      },
      tx,
    )
    await auditRepo.log(
      {
        actorUserId: principalUserId,
        action: 'SHIFT_TIMELINE_NOTE_ADDED',
        entityType: 'SHIFT',
        entityId: input.shiftId,
        metadata: {
          noteId: note.id,
          length: trimmed.length,
          authorReason: auth.reason,
        },
      },
      tx,
    )
    return note
  })

  const [user] = await userRepo.listByIds([principalUserId])

  return {
    success: true,
    data: {
      id: `note:${created.id}`,
      type: 'NOTE_ADDED',
      actorUserId: created.authorUserId,
      actorName: user?.fullName ?? null,
      occurredAt: created.createdAt,
      payload: { note: created.note },
    },
  }
}
