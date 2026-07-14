import { assertShiftParticipantOrCoord } from '~/server/authorization/assert-shift-participant-or-coord'
import {
  projectAuditRow,
  type ShiftTimelineEvent,
} from '~/server/lib/shift-timeline-projection'
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

export interface ListShiftTimelineInput {
  shiftId: string
  order?: 'asc' | 'desc'
  cursor?: string | null
  limit?: number
  since?: Date
}

export type ListShiftTimelineResult =
  | {
      success: true
      data: ShiftTimelineEvent[]
      nextCursor: string | null
    }
  | { success: false; code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' }

export async function listShiftTimeline(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  shiftRepo: ShiftRepository,
  scheduleRepo: ScheduleRepository,
  assignmentRepo: AssignmentRepository,
  shiftCandidateRepo: ShiftCandidateRepository,
  requestRepo: RequestRepository,
  auditRepo: AuditLogRepository,
  shiftTimelineNoteRepo: ShiftTimelineNoteRepository,
  userRepo: UserRepository,
  principal: Principal | null,
  input: ListShiftTimelineInput,
): Promise<ListShiftTimelineResult> {
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

  const order = input.order ?? 'asc'
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500)

  const auditPage = await auditRepo.listForShift({
    shiftId: input.shiftId,
    cursor: input.cursor ?? null,
    limit,
    order,
    ...(input.since && { since: input.since }),
  })

  // Notes are surfaced from the dedicated table (with full body).
  // listForShift always returns them in ascending order; we re-sort
  // below to match the requested order.
  const notes = await shiftTimelineNoteRepo.listForShift(
    input.shiftId,
    input.since ? { since: input.since } : undefined,
  )

  const actorIds = new Set<string>()
  for (const row of auditPage.data) {
    if (row.actorUserId) actorIds.add(row.actorUserId)
  }
  for (const n of notes) {
    if (n.authorUserId) actorIds.add(n.authorUserId)
  }
  const users = actorIds.size > 0 ? await userRepo.listByIds([...actorIds]) : []
  const nameById = new Map(users.map((u) => [u.id, u.fullName]))

  const auditEvents = auditPage.data
    .map((row) =>
      projectAuditRow(
        row,
        row.actorUserId ? (nameById.get(row.actorUserId) ?? null) : null,
      ),
    )
    .filter((e): e is ShiftTimelineEvent => e !== null)

  const noteEvents: ShiftTimelineEvent[] = notes.map((n) => ({
    id: `note:${n.id}`,
    type: 'NOTE_ADDED',
    actorUserId: n.authorUserId,
    actorName: n.authorUserId ? (nameById.get(n.authorUserId) ?? null) : null,
    occurredAt: n.createdAt,
    payload: { note: n.note },
  }))

  const merged = [...auditEvents, ...noteEvents].sort((a, b) => {
    const diff = a.occurredAt.getTime() - b.occurredAt.getTime()
    if (diff !== 0) return order === 'asc' ? diff : -diff
    return order === 'asc' ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id)
  })

  return { success: true, data: merged, nextCursor: auditPage.nextCursor }
}
