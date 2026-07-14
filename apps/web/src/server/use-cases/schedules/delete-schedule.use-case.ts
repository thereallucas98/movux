import { prisma } from '~/lib/db'
import { assertAdminOrCoordenadorOfWorkspace } from '~/server/authorization/assert-admin-or-coordenador-of-workspace'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type { ScheduleRepository } from '~/server/repositories/schedule.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface DeleteScheduleInput {
  scheduleId: string
}

export type DeleteScheduleResult =
  | { success: true; hardDelete: boolean }
  | {
      success: false
      code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND'
    }

export async function deleteSchedule(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  scheduleRepo: ScheduleRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: DeleteScheduleInput,
): Promise<DeleteScheduleResult> {
  if (!principal) {
    return { success: false, code: 'UNAUTHENTICATED' }
  }
  const current = await scheduleRepo.findById(input.scheduleId)
  if (!current) return { success: false, code: 'NOT_FOUND' }

  const auth = await assertAdminOrCoordenadorOfWorkspace(
    workspaceMembershipRepo,
    principal,
    current.workspaceId,
  )
  if (!auth.authorized) {
    return { success: false, code: auth.code }
  }

  const hardDelete = current.status === 'DRAFT'

  await prisma.$transaction(async (tx) => {
    await auditRepo.log(
      {
        actorUserId: principal!.userId,
        action: 'SCHEDULE_DELETED',
        entityType: 'SCHEDULE',
        entityId: current.id,
        metadata: {
          workspaceId: current.workspaceId,
          categoryId: current.categoryId,
          status: current.status,
          hardDelete,
        },
      },
      tx,
    )
    if (hardDelete) {
      await scheduleRepo.hardDelete(current.id, tx)
    } else {
      await scheduleRepo.softDelete(current.id, tx)
    }
  })

  return { success: true, hardDelete }
}
