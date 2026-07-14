import {
  closeSchedule,
  createSchedule,
  deleteSchedule,
  publishSchedule,
  updateSchedule,
} from '~/server/use-cases'
import { builder } from '../builder'
import { gqlError, gqlErrorFromResult } from '../errors'
import { CloseScheduleResultType, ScheduleType } from '../types/schedule.type'

const CreateScheduleInput = builder.inputType('CreateScheduleInput', {
  fields: (t) => ({
    categoryId: t.id({ required: true }),
    name: t.string(),
    periodStart: t.field({ type: 'DateTime', required: true }),
    periodEnd: t.field({ type: 'DateTime', required: true }),
  }),
})

const UpdateScheduleInput = builder.inputType('UpdateScheduleInput', {
  fields: (t) => ({
    categoryId: t.id(),
    name: t.string(),
    periodStart: t.field({ type: 'DateTime' }),
    periodEnd: t.field({ type: 'DateTime' }),
  }),
})

builder.mutationField('createSchedule', (t) =>
  t.field({
    type: ScheduleType,
    args: {
      workspaceId: t.arg.id({ required: true }),
      input: t.arg({ type: CreateScheduleInput, required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const result = await createSchedule(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.categoryRepo,
        ctx.repos.scheduleRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        {
          workspaceId: String(args.workspaceId),
          categoryId: String(args.input.categoryId),
          name: args.input.name ?? undefined,
          periodStart: new Date(args.input.periodStart as Date | string),
          periodEnd: new Date(args.input.periodEnd as Date | string),
        },
      )
      if (!result.success) throw gqlErrorFromResult(result)
      return result.data
    },
  }),
)

builder.mutationField('updateSchedule', (t) =>
  t.field({
    type: ScheduleType,
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: UpdateScheduleInput, required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const data: {
        categoryId?: string
        name?: string | null
        periodStart?: Date
        periodEnd?: Date
      } = {}
      if (args.input.categoryId !== null && args.input.categoryId !== undefined)
        data.categoryId = String(args.input.categoryId)
      if (args.input.name !== undefined) data.name = args.input.name
      if (
        args.input.periodStart !== null &&
        args.input.periodStart !== undefined
      )
        data.periodStart = new Date(args.input.periodStart as Date | string)
      if (args.input.periodEnd !== null && args.input.periodEnd !== undefined)
        data.periodEnd = new Date(args.input.periodEnd as Date | string)

      if (Object.keys(data).length === 0) {
        throw gqlError(
          'VALIDATION_ERROR',
          'At least one field must be provided',
        )
      }

      const result = await updateSchedule(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.categoryRepo,
        ctx.repos.scheduleRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        { scheduleId: String(args.id), data },
      )
      if (!result.success) throw gqlErrorFromResult(result)
      return result.data
    },
  }),
)

builder.mutationField('publishSchedule', (t) =>
  t.field({
    type: ScheduleType,
    args: { id: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const result = await publishSchedule(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.scheduleRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        { scheduleId: String(args.id) },
      )
      if (!result.success) throw gqlErrorFromResult(result)
      return result.data
    },
  }),
)

builder.mutationField('closeSchedule', (t) =>
  t.field({
    type: CloseScheduleResultType,
    args: { id: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const result = await closeSchedule(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.scheduleRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        { scheduleId: String(args.id) },
      )
      if (!result.success) throw gqlErrorFromResult(result)
      return { schedule: result.data, closedEarly: result.closedEarly }
    },
  }),
)

builder.mutationField('deleteSchedule', (t) =>
  t.boolean({
    args: { id: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const result = await deleteSchedule(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.scheduleRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        { scheduleId: String(args.id) },
      )
      if (!result.success) throw gqlErrorFromResult(result)
      return true
    },
  }),
)
