import { getEmailClient } from '~/lib/email/client'
import type { NotificationLogRepository } from '../../repositories/notification-log.repository'

export type RetryNotificationResult =
  | { success: true }
  | { success: false; code: 'NOT_FOUND' | 'INVALID_STATE_TRANSITION' }

interface RetryNotificationRepos {
  notificationLogRepo: NotificationLogRepository
}

interface RetryableMetadata {
  to: string
  subject: string
  html: string
}

function isRetryableMetadata(metadata: unknown): metadata is RetryableMetadata {
  if (!metadata || typeof metadata !== 'object') return false
  const m = metadata as Record<string, unknown>
  return typeof m.to === 'string' && typeof m.subject === 'string' && typeof m.html === 'string'
}

export async function retryNotification(
  repos: RetryNotificationRepos,
  notificationId: string,
): Promise<RetryNotificationResult> {
  const notification = await repos.notificationLogRepo.findById(notificationId)
  if (!notification) {
    return { success: false, code: 'NOT_FOUND' }
  }
  if (notification.status !== 'FAILED') {
    return { success: false, code: 'INVALID_STATE_TRANSITION' }
  }

  if (!isRetryableMetadata(notification.metadata)) {
    await repos.notificationLogRepo.markFailedAgain(
      notificationId,
      'Missing stored content — cannot retry a notification recorded before S6-T3',
    )
    return { success: true }
  }

  try {
    const result = await getEmailClient().send({
      to: notification.metadata.to,
      subject: notification.metadata.subject,
      html: notification.metadata.html,
    })
    await repos.notificationLogRepo.markSent(notificationId, result.id)
  } catch (error) {
    await repos.notificationLogRepo.markFailedAgain(
      notificationId,
      error instanceof Error ? error.message : String(error),
    )
  }

  return { success: true }
}
