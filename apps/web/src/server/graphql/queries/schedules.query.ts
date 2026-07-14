import { getScheduleById, listSchedulesForWorkspace } from '~/server/use-cases'
import { builder } from '../builder'
import { ScheduleStatusEnum } from '../enums/schedule.enum'
import { gqlError } from '../errors'
import { ScheduleType } from '../types/schedule.type'

builder.queryField('workspaceSchedules', (t) =>
  t.field({
    type: [ScheduleType],
    args: {
      workspaceId: t.arg.id({ required: true }),
      status: t.arg({ type: ScheduleStatusEnum }),
      categoryId: t.arg.id(),
    },
    resolve: async (_root, args, ctx) => {
      const result = await listSchedulesForWorkspace(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.scheduleRepo,
        ctx.principal,
        {
          workspaceId: String(args.workspaceId),
          filter: {
            status: args.status ?? undefined,
            categoryId: args.categoryId ? String(args.categoryId) : undefined,
          },
          limit: 100,
        },
      )
      if (!result.success) throw gqlError(result.code)
      return result.data.data
    },
  }),
)

builder.queryField('schedule', (t) =>
  t.field({
    type: ScheduleType,
    args: { id: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const result = await getScheduleById(
        ctx.repos.scheduleRepo,
        ctx.repos.workspaceMembershipRepo,
        ctx.principal,
        { scheduleId: String(args.id) },
      )
      if (!result.success) throw gqlError(result.code)
      return result.data
    },
  }),
)
