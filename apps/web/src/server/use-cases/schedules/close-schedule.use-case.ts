import { prisma } from '~/lib/db'
import { assertAdminOrCoordenadorOfWorkspace } from '~/server/authorization/assert-admin-or-coordenador-of-workspace'
import { notifyScheduleClosed } from '~/server/notifications/schedule-events'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type {
  ScheduleRepository,
  ScheduleRow,
} from '~/server/repositories/schedule.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface CloseScheduleInput {
  scheduleId: string
}

export type CloseScheduleResult =
  | { success: true; data: ScheduleRow; closedEarly: boolean }
  | {
      success: false
      code:
        | 'UNAUTHENTICATED'
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'INVALID_STATE_TRANSITION'
    }

export async function closeSchedule(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  scheduleRepo: ScheduleRepository,
  auditRepo: AuditLogRepository,
  principal: Principal | null,
  input: CloseScheduleInput,
): Promise<CloseScheduleResult> {
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

  if (current.status !== 'PUBLISHED') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  const closedAt = new Date()
  const closedEarly = closedAt < current.periodEnd

  const result = await prisma.$transaction(async (tx) => {
    const updated = await scheduleRepo.update(
      current.id,
      { status: 'CLOSED', closedAt },
      tx,
    )
    await auditRepo.log(
      {
        actorUserId: principal!.userId,
        action: 'SCHEDULE_CLOSED',
        entityType: 'SCHEDULE',
        entityId: updated.id,
        metadata: {
          workspaceId: updated.workspaceId,
          categoryId: updated.categoryId,
          closedAt: updated.closedAt,
          periodEnd: updated.periodEnd,
          closedEarly,
        },
      },
      tx,
    )
    return updated
  })

  const recipients = await workspaceMembershipRepo.listActiveByRole(
    result.workspaceId,
    ['ADMIN', 'COORDENADOR'],
  )
  await notifyScheduleClosed({
    schedule: {
      id: result.id,
      workspaceId: result.workspaceId,
      name: result.name,
    },
    closedEarly,
    actorUserId: principal.userId,
    recipientUserIds: recipients.map((r) => r.userId),
  })

  return { success: true, data: result, closedEarly }
}
