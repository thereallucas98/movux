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
 * FAILED) in NotificationLog, including the rendered HTML — a ReactElement
 * can't be persisted/replayed later, so a retry (S6-T3) resends this exact
 * HTML rather than re-running the business logic that produced it.
 */
export async function sendEmailNotification(
  notificationLogRepo: NotificationLogRepository,
  input: SendEmailNotificationInput,
): Promise<void> {
  const { render } = await import('@react-email/components')
  const html = await render(input.react)

  try {
    const result = await getEmailClient().send({
      to: input.to,
      subject: input.subject,
      react: input.react,
    })
    await notificationLogRepo.create(input.userId, 'EMAIL', input.templateCode, 'SENT', {
      providerMessageId: result.id,
      to: input.to,
      subject: input.subject,
      html,
    })
  } catch (error) {
    await notificationLogRepo.create(input.userId, 'EMAIL', input.templateCode, 'FAILED', {
      error: error instanceof Error ? error.message : String(error),
      to: input.to,
      subject: input.subject,
      html,
    })
  }
}
