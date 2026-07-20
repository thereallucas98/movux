import { getMyProposal } from '~/server/use-cases'
import { builder } from '../builder'
import { gqlError } from '../errors'
import { ProposalType } from '../types/proposal.type'

builder.queryField('myProposal', (t) =>
  t.field({
    type: ProposalType,
    nullable: true,
    args: { shipmentId: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (ctx.principal.role !== 'CARRIER') throw gqlError('FORBIDDEN')

      const result = await getMyProposal(
        {
          proposalRepo: ctx.repos.proposalRepo,
          queueRepo: ctx.repos.proposalQueueRepo,
          userRepo: ctx.repos.userRepo,
          notificationLogRepo: ctx.repos.notificationLogRepo,
        },
        ctx.principal.userId,
        String(args.shipmentId),
      )
      // NOT_FOUND é estado esperado ("ainda não propôs"), não erro
      if (!result.success) return null

      return result.proposal
    },
  }),
)
