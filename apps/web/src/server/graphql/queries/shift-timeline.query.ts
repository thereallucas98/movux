import { listShiftTimeline } from '~/server/use-cases'
import { builder } from '../builder'
import { gqlError } from '../errors'
import { ShiftTimelineEventType } from '../types/shift-timeline.type'

builder.queryField('shiftTimeline', (t) =>
  t.field({
    type: [ShiftTimelineEventType],
    args: {
      shiftId: t.arg.id({ required: true }),
      order: t.arg({ type: 'String' }),
      since: t.arg({ type: 'DateTime' }),
      limit: t.arg.int(),
    },
    resolve: async (_root, args, ctx) => {
      const order = args.order === 'desc' ? 'desc' : 'asc'
      const result = await listShiftTimeline(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.shiftRepo,
        ctx.repos.scheduleRepo,
        ctx.repos.assignmentRepo,
        ctx.repos.shiftCandidateRepo,
        ctx.repos.requestRepo,
        ctx.repos.auditLogRepo,
        ctx.repos.shiftTimelineNoteRepo,
        ctx.repos.userRepo,
        ctx.principal,
        {
          shiftId: String(args.shiftId),
          order,
          ...(args.since && { since: new Date(args.since) }),
          ...(args.limit && { limit: args.limit }),
        },
      )
      if (!result.success) throw gqlError(result.code)
      return result.data
    },
  }),
)
