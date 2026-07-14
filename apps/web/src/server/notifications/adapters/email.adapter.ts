import type { NotificationType } from '~/generated/prisma/client'
import type { AnyNotificationPayload } from '../payloads'

export interface EmailDispatchRow {
  userId: string
  workspaceId: string
  type: NotificationType
  payload: AnyNotificationPayload
}

export async function sendEmail(rows: EmailDispatchRow[]): Promise<void> {
  if (rows.length === 0) return
  // Phase 2 will swap this for a Resend / React Email send. Logging once per
  // call keeps the no-op observable in dev without spamming production logs.
  console.log(`[notifications:email] phase-2 no-op (${rows.length} rows)`)
}
