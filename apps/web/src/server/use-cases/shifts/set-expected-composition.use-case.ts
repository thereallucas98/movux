import { prisma } from '~/lib/db'
import { assertAdminOrCoordenadorOfWorkspace } from '~/server/authorization/assert-admin-or-coordenador-of-workspace'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type { ScheduleRepository } from '~/server/repositories/schedule.repository'
import type {
  ShiftExpectedCompositionRepository,
  ShiftExpectedCompositionRow,
} from '~/server/repositories/shift-expected-composition.repository'
import type { ShiftRepository } from '~/server/repositories/shift.repository'
import type { SpecialtyRepository } from '~/server/repositories/specialty.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface SetExpectedCompositionInput {
  shiftId: string
  items: { specialtyId: string; count: number }[]
}

export type SetExpectedCompositionResult =
  | { success: true; data: ShiftExpectedCompositionRow[] }
  | {
      success: false
      code:
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'INVALID_STATE_TRANSITION'
        | 'SPECIALTY_NOT_IN_WORKSPACE'
        | 'VALIDATION_ERROR'
    }

export async function setExpectedComposition(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  scheduleRepo: ScheduleRepository,
  shiftRepo: ShiftRepository,
  specialtyRepo: SpecialtyRepository,
  compositionRepo: ShiftExpectedCompositionRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: SetExpectedCompositionInput,
): Promise<SetExpectedCompositionResult> {
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

  const seen = new Set<string>()
  for (const item of input.items) {
    if (seen.has(item.specialtyId)) {
      return { success: false, code: 'VALIDATION_ERROR' }
    }
    seen.add(item.specialtyId)
    const sp = await specialtyRepo.findAvailableForWorkspace(
      schedule.workspaceId,
      item.specialtyId,
    )
    if (!sp) {
      return { success: false, code: 'SPECIALTY_NOT_IN_WORKSPACE' }
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    await compositionRepo.deleteAllForShift(shift.id, tx)
    if (input.items.length > 0) {
      await compositionRepo.createMany(
        input.items.map((i) => ({
          shiftId: shift.id,
          specialtyId: i.specialtyId,
          count: i.count,
        })),
        tx,
      )
    }
    const updated = await compositionRepo.findByShift(shift.id, tx)
    await auditRepo.log(
      {
        actorUserId: principal.userId,
        action: 'SHIFT_COMPOSITION_SET',
        entityType: 'SHIFT',
        entityId: shift.id,
        metadata: { items: input.items, count: input.items.length },
      },
      tx,
    )
    return updated
  })

  return { success: true, data: result }
}
