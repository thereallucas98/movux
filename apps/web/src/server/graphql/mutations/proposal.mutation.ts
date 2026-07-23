import {
  acceptProposal,
  addProposalAttempt,
  rejectProposal,
  submitProposal,
  withdrawProposal,
} from '~/server/use-cases'
import { builder } from '../builder'
import { gqlError, gqlErrorFromResult } from '../errors'
import { ProposalType } from '../types/proposal.type'

const SubmitProposalInput = builder.inputType('SubmitProposalInput', {
  fields: (t) => ({
    priceInCents: t.int({ required: true }),
    carrierSlaHours: t.int({ required: true }),
    message: t.string(),
  }),
})

const AddProposalAttemptInput = builder.inputType('AddProposalAttemptInput', {
  fields: (t) => ({
    priceInCents: t.int({ required: true }),
    message: t.string(),
  }),
})

builder.mutationField('submitProposal', (t) =>
  t.field({
    type: ProposalType,
    args: {
      shipmentId: t.arg.id({ required: true }),
      input: t.arg({ type: SubmitProposalInput, required: true }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (ctx.principal.role !== 'CARRIER') throw gqlError('FORBIDDEN')

      const result = await submitProposal(
        {
          shipmentRepo: ctx.repos.shipmentRepo,
          queueRepo: ctx.repos.proposalQueueRepo,
          proposalRepo: ctx.repos.proposalRepo,
          shipmentEventRepo: ctx.repos.shipmentEventRepo,
          customerProfileRepo: ctx.repos.customerProfileRepo,
          carrierProfileRepo: ctx.repos.carrierProfileRepo,
          userRepo: ctx.repos.userRepo,
          notificationLogRepo: ctx.repos.notificationLogRepo,
        },
        ctx.principal.userId,
        String(args.shipmentId),
        {
          priceInCents: args.input.priceInCents,
          carrierSlaHours: args.input.carrierSlaHours,
          message: args.input.message ?? undefined,
        },
      )
      if (!result.success) throw gqlErrorFromResult(result)

      return result.proposal
    },
  }),
)

builder.mutationField('addProposalAttempt', (t) =>
  t.field({
    type: ProposalType,
    args: {
      shipmentId: t.arg.id({ required: true }),
      input: t.arg({ type: AddProposalAttemptInput, required: true }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (ctx.principal.role !== 'CARRIER') throw gqlError('FORBIDDEN')

      const result = await addProposalAttempt(
        {
          proposalRepo: ctx.repos.proposalRepo,
          queueRepo: ctx.repos.proposalQueueRepo,
          userRepo: ctx.repos.userRepo,
          notificationLogRepo: ctx.repos.notificationLogRepo,
        },
        ctx.principal.userId,
        String(args.shipmentId),
        {
          priceInCents: args.input.priceInCents,
          message: args.input.message ?? undefined,
        },
      )
      if (!result.success) throw gqlErrorFromResult(result)

      return result.proposal
    },
  }),
)

builder.mutationField('withdrawProposal', (t) =>
  t.field({
    type: 'Boolean',
    args: { shipmentId: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (ctx.principal.role !== 'CARRIER') throw gqlError('FORBIDDEN')

      const result = await withdrawProposal(
        {
          proposalRepo: ctx.repos.proposalRepo,
          queueRepo: ctx.repos.proposalQueueRepo,
          userRepo: ctx.repos.userRepo,
          notificationLogRepo: ctx.repos.notificationLogRepo,
        },
        ctx.principal.userId,
        String(args.shipmentId),
      )
      if (!result.success) throw gqlErrorFromResult(result)

      return true
    },
  }),
)

builder.mutationField('acceptProposal', (t) =>
  t.field({
    type: 'Boolean',
    args: {
      shipmentId: t.arg.id({ required: true }),
      proposalId: t.arg.id({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (ctx.principal.role !== 'CUSTOMER') throw gqlError('FORBIDDEN')

      const result = await acceptProposal(
        {
          customerProfileRepo: ctx.repos.customerProfileRepo,
          shipmentRepo: ctx.repos.shipmentRepo,
          proposalRepo: ctx.repos.proposalRepo,
          queueRepo: ctx.repos.proposalQueueRepo,
          shipmentEventRepo: ctx.repos.shipmentEventRepo,
          userRepo: ctx.repos.userRepo,
          notificationLogRepo: ctx.repos.notificationLogRepo,
        },
        ctx.principal.userId,
        String(args.shipmentId),
        String(args.proposalId),
      )
      if (!result.success) throw gqlErrorFromResult(result)

      return true
    },
  }),
)

builder.mutationField('rejectProposal', (t) =>
  t.field({
    type: 'Boolean',
    args: {
      shipmentId: t.arg.id({ required: true }),
      proposalId: t.arg.id({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (ctx.principal.role !== 'CUSTOMER') throw gqlError('FORBIDDEN')

      const result = await rejectProposal(
        {
          customerProfileRepo: ctx.repos.customerProfileRepo,
          shipmentRepo: ctx.repos.shipmentRepo,
          proposalRepo: ctx.repos.proposalRepo,
          queueRepo: ctx.repos.proposalQueueRepo,
          shipmentEventRepo: ctx.repos.shipmentEventRepo,
          userRepo: ctx.repos.userRepo,
          notificationLogRepo: ctx.repos.notificationLogRepo,
        },
        ctx.principal.userId,
        String(args.shipmentId),
        String(args.proposalId),
      )
      if (!result.success) throw gqlErrorFromResult(result)

      return true
    },
  }),
)
