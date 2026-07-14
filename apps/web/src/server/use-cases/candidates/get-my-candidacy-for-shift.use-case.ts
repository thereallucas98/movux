import { assertActiveMemberOfWorkspace } from '~/server/authorization/assert-active-member-of-workspace'
import type {
  ShiftCandidateRepository,
  ShiftCandidateStatus,
} from '~/server/repositories/candidate.repository'
import type { ScheduleRepository } from '~/server/repositories/schedule.repository'
import type { ShiftRepository } from '~/server/repositories/shift.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface GetMyCandidacyForShiftInput {
  shiftId: string
}

export interface MyCandidacyData {
  candidateId: string | null
  position: number | null
  count: number
  status: ShiftCandidateStatus | null
}

export type GetMyCandidacyForShiftResult =
  | { success: true; data: MyCandidacyData }
  | { success: false; code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' }

export async function getMyCandidacyForShift(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  scheduleRepo: ScheduleRepository,
  shiftRepo: ShiftRepository,
  candidateRepo: ShiftCandidateRepository,
  principal: Principal | null,
  input: GetMyCandidacyForShiftInput,
): Promise<GetMyCandidacyForShiftResult> {
  if (!principal) {
    return { success: false, code: 'UNAUTHENTICATED' }
  }

  const shift = await shiftRepo.findById(input.shiftId)
  if (!shift) return { success: false, code: 'NOT_FOUND' }

  const schedule = await scheduleRepo.findById(shift.scheduleId)
  if (!schedule) return { success: false, code: 'NOT_FOUND' }

  const auth = await assertActiveMemberOfWorkspace(
    workspaceMembershipRepo,
    principal,
    schedule.workspaceId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  const [own, count] = await Promise.all([
    candidateRepo.findActiveByShiftAndUser(input.shiftId, principal.userId),
    candidateRepo.countByShift(input.shiftId, ['QUEUED']),
  ])

  return {
    success: true,
    data: {
      candidateId: own?.id ?? null,
      position: own?.queuePosition ?? null,
      count,
      status: own?.status ?? null,
    },
  }
}
