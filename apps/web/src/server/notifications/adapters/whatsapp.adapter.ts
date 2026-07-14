import type { NotificationType } from '~/generated/prisma/client'
import type { AnyNotificationPayload } from '../payloads'

export interface WhatsAppDispatchRow {
  userId: string
  workspaceId: string
  type: NotificationType
  payload: AnyNotificationPayload
}

export async function sendWhatsApp(rows: WhatsAppDispatchRow[]): Promise<void> {
  if (rows.length === 0) return
  console.log(`[notifications:whatsapp] phase-2 no-op (${rows.length} rows)`)
}
