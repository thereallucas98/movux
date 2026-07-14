import type { NotificationType } from '~/generated/prisma/client'
import type { NotificationRepository } from '~/server/repositories/notification.repository'
import type { AnyNotificationPayload } from '../payloads'

export interface InAppDispatchRow {
  userId: string
  workspaceId: string
  type: NotificationType
  payload: AnyNotificationPayload
}

export async function writeInApp(
  repo: NotificationRepository,
  rows: InAppDispatchRow[],
): Promise<void> {
  if (rows.length === 0) return
  await repo.createMany(
    rows.map((r) => ({
      userId: r.userId,
      workspaceId: r.workspaceId,
      type: r.type,
      payload: r.payload as unknown as Record<string, unknown>,
    })),
  )
}
