import type { AssignmentRepository } from '~/server/repositories/assignment.repository'
import type { ShiftCandidateRepository } from '~/server/repositories/candidate.repository'
import type { RequestRepository } from '~/server/repositories/request.repository'
import type { ScheduleRepository } from '~/server/repositories/schedule.repository'
import type { ShiftRepository } from '~/server/repositories/shift.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from './assert-super-admin-of-tenant'

const COORD_ROLES = new Set(['ADMIN', 'COORDENADOR'])

export interface ShiftParticipantRepos {
  workspaceMembershipRepo: WorkspaceMembershipRepository
  shiftRepo: ShiftRepository
  scheduleRepo: ScheduleRepository
  assignmentRepo: AssignmentRepository
  shiftCandidateRepo: ShiftCandidateRepository
  requestRepo: RequestRepository
}

export type ShiftParticipantAuthorization =
  | { authorized: true; reason: 'COORD' | 'PARTICIPANT'; workspaceId: string }
  | {
      authorized: false
      code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND'
    }

/**
 * Authorizes a caller against a shift timeline.
 *
 * Resolution order (Q8 Good — split 404 outsider vs 403 non-participant):
 *  1. No principal                        → UNAUTHENTICATED (401)
 *  2. Shift missing                       → NOT_FOUND (404)
 *  3. Caller is NOT workspace member      → NOT_FOUND (404)  (hides existence)
 *  4. Caller is workspace ADMIN/COORD     → authorized as COORD
 *  5. Caller is shift participant
 *     (active assignment, candidate,
 *      or swap target via Request)        → authorized as PARTICIPANT
 *  6. Else                                → FORBIDDEN (403)  (member, not participant)
 */
export async function assertShiftParticipantOrCoord(
  repos: ShiftParticipantRepos,
  principal: Principal | null,
  shiftId: string,
): Promise<ShiftParticipantAuthorization> {
  if (!principal) return { authorized: false, code: 'UNAUTHENTICATED' }

  const shift = await repos.shiftRepo.findById(shiftId)
  if (!shift) return { authorized: false, code: 'NOT_FOUND' }

  const schedule = await repos.scheduleRepo.findById(shift.scheduleId)
  if (!schedule) return { authorized: false, code: 'NOT_FOUND' }

  const membership = await repos.workspaceMembershipRepo.findActive({
    workspaceId: schedule.workspaceId,
    userId: principal.userId,
  })
  if (!membership || !membership.isActive) {
    // Outsider: hide existence.
    return { authorized: false, code: 'NOT_FOUND' }
  }

  if (COORD_ROLES.has(membership.role)) {
    return {
      authorized: true,
      reason: 'COORD',
      workspaceId: schedule.workspaceId,
    }
  }

  // Check participant paths.
  const assignment = await repos.assignmentRepo.findActiveOnShiftForUser(
    shiftId,
    principal.userId,
  )
  if (assignment) {
    return {
      authorized: true,
      reason: 'PARTICIPANT',
      workspaceId: schedule.workspaceId,
    }
  }

  const candidate = await repos.shiftCandidateRepo.findActiveByShiftAndUser(
    shiftId,
    principal.userId,
  )
  if (candidate) {
    return {
      authorized: true,
      reason: 'PARTICIPANT',
      workspaceId: schedule.workspaceId,
    }
  }

  const swapTarget = await repos.requestRepo.findSwapTargetForShift({
    shiftId,
    userId: principal.userId,
  })
  if (swapTarget) {
    return {
      authorized: true,
      reason: 'PARTICIPANT',
      workspaceId: schedule.workspaceId,
    }
  }

  return { authorized: false, code: 'FORBIDDEN' }
}
