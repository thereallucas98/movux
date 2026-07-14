import { z } from 'zod'
import {
  ALL_CHANNELS,
  ALL_NOTIFICATION_TYPES,
} from '~/server/notifications/preferences-defaults'

const NotificationTypeEnum = z.enum(
  ALL_NOTIFICATION_TYPES as [string, ...string[]],
)
const NotificationChannelEnum = z.enum(ALL_CHANNELS as [string, ...string[]])

export const ListMyNotificationsQuerySchema = z.object({
  status: z.enum(['unread', 'all']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

export const NotificationIdParamSchema = z.object({
  id: z.uuid(),
})

export const UpdateNotificationPreferencesBodySchema = z.object({
  updates: z
    .array(
      z.object({
        type: NotificationTypeEnum,
        channel: NotificationChannelEnum,
        enabled: z.boolean(),
      }),
    )
    .min(1)
    .max(64),
})

export type ListMyNotificationsQuery = z.infer<
  typeof ListMyNotificationsQuerySchema
>
export type UpdateNotificationPreferencesBody = z.infer<
  typeof UpdateNotificationPreferencesBodySchema
>
