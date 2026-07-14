import type {
  NotificationChannel,
  NotificationType,
} from '~/generated/prisma/client'
import type { NotificationRepository } from '~/server/repositories/notification.repository'
import type { NotificationPreferenceRepository } from '~/server/repositories/notification-preference.repository'
import { sendEmail } from './adapters/email.adapter'
import { writeInApp } from './adapters/in-app.adapter'
import { sendPush } from './adapters/push.adapter'
import { sendWhatsApp } from './adapters/whatsapp.adapter'
import type { PayloadFor } from './payloads'
import {
  ALL_CHANNELS,
  DEFAULT_ENABLED_BY_CHANNEL,
} from './preferences-defaults'

export interface NotificationDeps {
  notificationRepo: NotificationRepository
  notificationPreferenceRepo: NotificationPreferenceRepository
}

export interface DispatchInput<T extends NotificationType> {
  type: T
  payload: PayloadFor<T>
  workspaceId: string
  recipientUserIds: string[]
}

interface RowForChannel {
  userId: string
  workspaceId: string
  type: NotificationType
  payload: PayloadFor<NotificationType>
}

/**
 * Fans an event out to every recipient × every enabled channel. In v1 only
 * the in-app adapter persists rows; the other adapters are no-ops (Phase 2).
 *
 * Pre-conditions:
 * - Caller has already enumerated recipients (Q2 = Fast strategy).
 * - Caller invokes this AFTER the originating prisma.$transaction commits
 *   (fire-and-forget post-tx).
 *
 * Failure mode: each adapter is wrapped in try/catch; a failure in one channel
 * does not prevent the others from running. Callers do not see adapter errors.
 */
export async function dispatch<T extends NotificationType>(
  deps: NotificationDeps,
  input: DispatchInput<T>,
): Promise<void> {
  const recipients = [...new Set(input.recipientUserIds)].filter(Boolean)
  if (recipients.length === 0) return

  // Read prefs once, build a fast lookup keyed by `${userId}:${channel}`.
  const prefRows = await Promise.all(
    recipients.map((userId) =>
      deps.notificationPreferenceRepo.listForUser(userId),
    ),
  ).then((arr) => arr.flat())

  const enabledKey = (userId: string, channel: NotificationChannel) =>
    `${userId}:${channel}`
  const explicit = new Map<string, boolean>()
  for (const row of prefRows) {
    if (row.type === input.type) {
      explicit.set(enabledKey(row.userId, row.channel), row.enabled)
    }
  }

  const isEnabled = (userId: string, channel: NotificationChannel): boolean => {
    const v = explicit.get(enabledKey(userId, channel))
    return v ?? DEFAULT_ENABLED_BY_CHANNEL[channel]
  }

  const byChannel: Record<NotificationChannel, RowForChannel[]> = {
    IN_APP: [],
    EMAIL: [],
    PUSH: [],
    WHATSAPP: [],
  }

  for (const userId of recipients) {
    for (const channel of ALL_CHANNELS) {
      if (!isEnabled(userId, channel)) continue
      byChannel[channel].push({
        userId,
        workspaceId: input.workspaceId,
        type: input.type,
        payload: input.payload,
      })
    }
  }

  await Promise.all([
    safeRun('in-app', () =>
      writeInApp(deps.notificationRepo, byChannel.IN_APP),
    ),
    safeRun('email', () => sendEmail(byChannel.EMAIL)),
    safeRun('push', () => sendPush(byChannel.PUSH)),
    safeRun('whatsapp', () => sendWhatsApp(byChannel.WHATSAPP)),
  ])
}

async function safeRun(
  channel: string,
  fn: () => Promise<void>,
): Promise<void> {
  try {
    await fn()
  } catch (err) {
    console.error(`[notifications:${channel}] adapter failed`, err)
  }
}
