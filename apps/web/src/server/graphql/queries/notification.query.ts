import {
  getMyNotificationPreferences,
  getMyUnreadNotificationCount,
  listMyNotifications,
} from '~/server/use-cases'
import { builder } from '../builder'
import { gqlError } from '../errors'
import {
  NotificationGqlType,
  NotificationPreferenceGqlType,
} from '../types/notification.type'

builder.queryField('myNotifications', (t) =>
  t.field({
    type: [NotificationGqlType],
    args: {
      status: t.arg({ type: 'String' }),
      cursor: t.arg({ type: 'String' }),
      limit: t.arg.int(),
    },
    resolve: async (_root, args, ctx) => {
      const status =
        args.status === 'unread' ? 'unread' : ('all' as 'unread' | 'all')
      const result = await listMyNotifications(
        ctx.repos.notificationRepo,
        ctx.principal,
        {
          status,
          ...(args.cursor && { cursor: args.cursor }),
          ...(args.limit && { limit: args.limit }),
        },
      )
      if (!result.success) throw gqlError(result.code)
      return result.data
    },
  }),
)

builder.queryField('myUnreadNotificationCount', (t) =>
  t.int({
    resolve: async (_root, _args, ctx) => {
      const result = await getMyUnreadNotificationCount(
        ctx.repos.notificationRepo,
        ctx.principal,
      )
      if (!result.success) throw gqlError(result.code)
      return result.count
    },
  }),
)

builder.queryField('myNotificationPreferences', (t) =>
  t.field({
    type: [NotificationPreferenceGqlType],
    resolve: async (_root, _args, ctx) => {
      const result = await getMyNotificationPreferences(
        ctx.repos.notificationPreferenceRepo,
        ctx.principal,
      )
      if (!result.success) throw gqlError(result.code)
      return result.data
    },
  }),
)
