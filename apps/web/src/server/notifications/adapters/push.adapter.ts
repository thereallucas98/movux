import type { NotificationType } from '~/generated/prisma/client'
import type { AnyNotificationPayload } from '../payloads'

export interface PushDispatchRow {
  userId: string
  workspaceId: string
  type: NotificationType
  payload: AnyNotificationPayload
}

export async function sendPush(rows: PushDispatchRow[]): Promise<void> {
  if (rows.length === 0) return
  console.log(`[notifications:push] phase-2 no-op (${rows.length} rows)`)
}
