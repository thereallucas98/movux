import { builder } from '../builder'
import {
  NotificationChannelEnum,
  NotificationTypeEnum,
} from '../enums/notification.enum'

export const NotificationGqlType = builder.simpleObject('Notification', {
  fields: (t) => ({
    id: t.id(),
    userId: t.id(),
    workspaceId: t.id(),
    type: t.field({ type: NotificationTypeEnum }),
    payload: t.field({ type: 'JSON' }),
    readAt: t.field({ type: 'DateTime', nullable: true }),
    createdAt: t.field({ type: 'DateTime' }),
  }),
})

export const NotificationPreferenceGqlType = builder.simpleObject(
  'NotificationPreference',
  {
    fields: (t) => ({
      type: t.field({ type: NotificationTypeEnum }),
      channel: t.field({ type: NotificationChannelEnum }),
      enabled: t.boolean(),
    }),
  },
)
