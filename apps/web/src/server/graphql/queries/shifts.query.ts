import { getShiftById, listShiftsForSchedule } from '~/server/use-cases'
import { builder } from '../builder'
import { ShiftStatusEnum } from '../enums/shift.enum'
import { gqlError } from '../errors'
import { ShiftType } from '../types/shift.type'

builder.queryField('scheduleShifts', (t) =>
  t.field({
    type: [ShiftType],
    args: {
      scheduleId: t.arg.id({ required: true }),
      status: t.arg({ type: ShiftStatusEnum }),
      categoryId: t.arg.id(),
    },
    resolve: async (_root, args, ctx) => {
      const result = await listShiftsForSchedule(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.scheduleRepo,
        ctx.repos.shiftRepo,
        ctx.principal,
        {
          scheduleId: String(args.scheduleId),
          filter: {
            status: args.status ?? undefined,
            categoryId: args.categoryId ? String(args.categoryId) : undefined,
          },
          limit: 100,
        },
      )
      if (!result.success) throw gqlError(result.code)
      return result.data.data.map((shift) => ({
        ...shift,
        expectedComposition: [],
      }))
    },
  }),
)

builder.queryField('shift', (t) =>
  t.field({
    type: ShiftType,
    args: { id: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const result = await getShiftById(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.scheduleRepo,
        ctx.repos.shiftRepo,
        ctx.repos.shiftCompositionRepo,
        ctx.principal,
        { shiftId: String(args.id) },
      )
      if (!result.success) throw gqlError(result.code)
      return result.data
    },
  }),
)
