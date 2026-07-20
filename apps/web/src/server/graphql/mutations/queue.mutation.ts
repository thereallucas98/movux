import { joinProposalQueue, withdrawProposalQueue } from '~/server/use-cases'
import { builder } from '../builder'
import { gqlError, gqlErrorFromResult } from '../errors'
import { QueueEntryType } from '../types/queue-entry.type'

builder.mutationField('joinProposalQueue', (t) =>
  t.field({
    type: QueueEntryType,
    args: { shipmentId: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (ctx.principal.role !== 'CARRIER') throw gqlError('FORBIDDEN')

      const result = await joinProposalQueue(
        {
          shipmentRepo: ctx.repos.shipmentRepo,
          queueRepo: ctx.repos.proposalQueueRepo,
          proposalRepo: ctx.repos.proposalRepo,
          userRepo: ctx.repos.userRepo,
          notificationLogRepo: ctx.repos.notificationLogRepo,
        },
        ctx.principal.userId,
        String(args.shipmentId),
      )
      if (!result.success) throw gqlErrorFromResult(result)

      return result.entry
    },
  }),
)

builder.mutationField('withdrawFromQueue', (t) =>
  t.field({
    type: 'Boolean',
    args: { shipmentId: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (ctx.principal.role !== 'CARRIER') throw gqlError('FORBIDDEN')

      const result = await withdrawProposalQueue(
        ctx.repos.proposalQueueRepo,
        ctx.repos.userRepo,
        ctx.repos.notificationLogRepo,
        ctx.principal.userId,
        String(args.shipmentId),
      )
      if (!result.success) throw gqlErrorFromResult(result)

      return true
    },
  }),
)
