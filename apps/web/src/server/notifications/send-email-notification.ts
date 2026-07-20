import type { ReactElement } from 'react'
import { getEmailClient } from '~/lib/email/client'
import type { NotificationLogRepository } from '../repositories/notification-log.repository'

export interface SendEmailNotificationInput {
  userId: string
  to: string
  subject: string
  react: ReactElement
  templateCode: string
}

/**
 * Never throws — email delivery is best-effort and must never break the
 * business flow that triggered it. Always records the outcome (SENT or
 * FAILED) in NotificationLog.
 */
export async function sendEmailNotification(
  notificationLogRepo: NotificationLogRepository,
  input: SendEmailNotificationInput,
): Promise<void> {
  try {
    const result = await getEmailClient().send({
      to: input.to,
      subject: input.subject,
      react: input.react,
    })
    await notificationLogRepo.create(input.userId, 'EMAIL', input.templateCode, 'SENT', {
      providerMessageId: result.id,
    })
  } catch (error) {
    await notificationLogRepo.create(input.userId, 'EMAIL', input.templateCode, 'FAILED', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
