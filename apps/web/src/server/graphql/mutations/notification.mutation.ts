import {
  markAllMyNotificationsRead,
  markNotificationRead,
  updateMyNotificationPreferences,
} from '~/server/use-cases'
import type {
  NotificationChannel,
  NotificationType,
} from '~/generated/prisma/client'
import { builder } from '../builder'
import { gqlError } from '../errors'
import {
  NotificationGqlType,
  NotificationPreferenceGqlType,
} from '../types/notification.type'
import {
  NotificationChannelEnum,
  NotificationTypeEnum,
} from '../enums/notification.enum'

const PreferenceUpdateInput = builder.inputType('PreferenceUpdateInput', {
  fields: (t) => ({
    type: t.field({ type: NotificationTypeEnum, required: true }),
    channel: t.field({ type: NotificationChannelEnum, required: true }),
    enabled: t.boolean({ required: true }),
  }),
})

builder.mutationField('markNotificationRead', (t) =>
  t.field({
    type: NotificationGqlType,
    args: { id: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const r = await markNotificationRead(
        ctx.repos.notificationRepo,
        ctx.principal,
        { id: String(args.id) },
      )
      if (!r.success) throw gqlError(r.code)
      return r.data
    },
  }),
)

builder.mutationField('markAllMyNotificationsRead', (t) =>
  t.int({
    resolve: async (_root, _args, ctx) => {
      const r = await markAllMyNotificationsRead(
        ctx.repos.notificationRepo,
        ctx.principal,
      )
      if (!r.success) throw gqlError(r.code)
      return r.updated
    },
  }),
)

builder.mutationField('updateMyNotificationPreferences', (t) =>
  t.field({
    type: [NotificationPreferenceGqlType],
    args: {
      updates: t.arg({ type: [PreferenceUpdateInput], required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const updates = args.updates.map((u) => ({
        type: u.type as NotificationType,
        channel: u.channel as NotificationChannel,
        enabled: u.enabled,
      }))
      const r = await updateMyNotificationPreferences(
        ctx.repos.notificationPreferenceRepo,
        ctx.principal,
        { updates },
      )
      if (!r.success) throw gqlError(r.code)
      return r.data
    },
  }),
)
