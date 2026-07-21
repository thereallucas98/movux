import {
  confirmDelivery,
  confirmSafetyCheckIn,
  markCollected,
  markDelivered,
  markInTransit,
  submitReview,
} from '~/server/use-cases'
import { builder } from '../builder'
import { gqlError, gqlErrorFromResult } from '../errors'
import {
  DeliveryConfirmationType,
  ReviewType,
  SafetyCheckInType,
} from '../types/shipment-lifecycle.type'

builder.mutationField('confirmSafetyCheckIn', (t) =>
  t.field({
    type: SafetyCheckInType,
    args: { shipmentId: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (ctx.principal.role !== 'CUSTOMER' && ctx.principal.role !== 'CARRIER') {
        throw gqlError('FORBIDDEN')
      }

      const result = await confirmSafetyCheckIn(
        {
          customerProfileRepo: ctx.repos.customerProfileRepo,
          shipmentRepo: ctx.repos.shipmentRepo,
          proposalRepo: ctx.repos.proposalRepo,
          safetyCheckInRepo: ctx.repos.safetyCheckInRepo,
          shipmentEventRepo: ctx.repos.shipmentEventRepo,
        },
        ctx.principal.userId,
        ctx.principal.role,
        String(args.shipmentId),
        // IP não propagado do request HTTP até o contexto GraphQL — só é
        // usado pra registro de auditoria, não afeta a regra de negócio.
        null,
      )
      if (!result.success) throw gqlErrorFromResult(result)

      return result.checkIn
    },
  }),
)

builder.mutationField('markCollected', (t) =>
  t.field({
    type: 'Boolean',
    args: { shipmentId: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (ctx.principal.role !== 'CARRIER') throw gqlError('FORBIDDEN')

      const result = await markCollected(
        {
          shipmentRepo: ctx.repos.shipmentRepo,
          proposalRepo: ctx.repos.proposalRepo,
          safetyCheckInRepo: ctx.repos.safetyCheckInRepo,
          shipmentEventRepo: ctx.repos.shipmentEventRepo,
        },
        ctx.principal.userId,
        String(args.shipmentId),
      )
      if (!result.success) throw gqlErrorFromResult(result)

      return true
    },
  }),
)

builder.mutationField('markInTransit', (t) =>
  t.field({
    type: 'Boolean',
    args: { shipmentId: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (ctx.principal.role !== 'CARRIER') throw gqlError('FORBIDDEN')

      const result = await markInTransit(
        {
          shipmentRepo: ctx.repos.shipmentRepo,
          proposalRepo: ctx.repos.proposalRepo,
          shipmentEventRepo: ctx.repos.shipmentEventRepo,
        },
        ctx.principal.userId,
        String(args.shipmentId),
      )
      if (!result.success) throw gqlErrorFromResult(result)

      return true
    },
  }),
)

builder.mutationField('markDelivered', (t) =>
  t.field({
    type: 'Boolean',
    args: { shipmentId: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (ctx.principal.role !== 'CARRIER') throw gqlError('FORBIDDEN')

      const result = await markDelivered(
        {
          shipmentRepo: ctx.repos.shipmentRepo,
          proposalRepo: ctx.repos.proposalRepo,
          shipmentEventRepo: ctx.repos.shipmentEventRepo,
          customerProfileRepo: ctx.repos.customerProfileRepo,
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

const ConfirmDeliveryInput = builder.inputType('ConfirmDeliveryInput', {
  fields: (t) => ({
    confirmed: t.boolean({ required: true }),
    issueDescription: t.string(),
  }),
})

builder.mutationField('confirmDelivery', (t) =>
  t.field({
    type: DeliveryConfirmationType,
    args: {
      shipmentId: t.arg.id({ required: true }),
      input: t.arg({ type: ConfirmDeliveryInput, required: true }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (ctx.principal.role !== 'CUSTOMER') throw gqlError('FORBIDDEN')

      const result = await confirmDelivery(
        {
          customerProfileRepo: ctx.repos.customerProfileRepo,
          shipmentRepo: ctx.repos.shipmentRepo,
          deliveryConfirmationRepo: ctx.repos.deliveryConfirmationRepo,
        },
        ctx.principal.userId,
        String(args.shipmentId),
        args.input.confirmed,
        args.input.issueDescription ?? undefined,
      )
      if (!result.success) throw gqlErrorFromResult(result)

      return result.confirmation
    },
  }),
)

builder.mutationField('submitReview', (t) =>
  t.field({
    type: ReviewType,
    args: {
      shipmentId: t.arg.id({ required: true }),
      rating: t.arg.int({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (ctx.principal.role !== 'CUSTOMER' && ctx.principal.role !== 'CARRIER') {
        throw gqlError('FORBIDDEN')
      }

      const result = await submitReview(
        {
          customerProfileRepo: ctx.repos.customerProfileRepo,
          carrierProfileRepo: ctx.repos.carrierProfileRepo,
          shipmentRepo: ctx.repos.shipmentRepo,
          proposalRepo: ctx.repos.proposalRepo,
          reviewRepo: ctx.repos.reviewRepo,
          reviewTagRepo: ctx.repos.reviewTagRepo,
        },
        ctx.principal.userId,
        ctx.principal.role,
        String(args.shipmentId),
        { rating: args.rating },
      )
      if (!result.success) throw gqlErrorFromResult(result)

      return result.review
    },
  }),
)
