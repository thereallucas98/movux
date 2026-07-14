import { listTimeEntries } from '~/server/use-cases'
import { builder } from '../builder'
import { gqlError } from '../errors'
import { TimeEntryType, toTimeEntryPayload } from '../types/time-entry.type'

builder.queryField('timeEntriesForWorkspace', (t) =>
  t.field({
    type: [TimeEntryType],
    args: {
      workspaceId: t.arg.id({ required: true }),
      from: t.arg({ type: 'DateTime' }),
      to: t.arg({ type: 'DateTime' }),
      userId: t.arg.id(),
    },
    resolve: async (_root, args, ctx) => {
      const result = await listTimeEntries(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.timeEntryRepo,
        ctx.principal,
        {
          workspaceId: String(args.workspaceId),
          ...(args.from && { from: new Date(args.from) }),
          ...(args.to && { to: new Date(args.to) }),
          ...(args.userId && { userId: String(args.userId) }),
          limit: 100,
        },
      )
      if (!result.success) throw gqlError(result.code)
      return result.data.map(toTimeEntryPayload)
    },
  }),
)
