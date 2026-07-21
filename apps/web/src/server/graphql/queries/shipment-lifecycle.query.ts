import {
  getDeliveryConfirmationStatus,
  getSafetyCheckInStatus,
  listProposalsForShipment,
  listReviewsForShipment,
} from '~/server/use-cases'
import { builder } from '../builder'
import { gqlError, gqlErrorFromResult } from '../errors'
import {
  DeliveryConfirmationType,
  ProposalForCustomerType,
  ReviewType,
  SafetyCheckInStatusType,
} from '../types/shipment-lifecycle.type'

builder.queryField('proposalsForShipment', (t) =>
  t.field({
    type: [ProposalForCustomerType],
    args: { shipmentId: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (ctx.principal.role !== 'CUSTOMER') throw gqlError('FORBIDDEN')

      const result = await listProposalsForShipment(
        {
          customerProfileRepo: ctx.repos.customerProfileRepo,
          shipmentRepo: ctx.repos.shipmentRepo,
          proposalRepo: ctx.repos.proposalRepo,
          queueRepo: ctx.repos.proposalQueueRepo,
          userRepo: ctx.repos.userRepo,
          notificationLogRepo: ctx.repos.notificationLogRepo,
        },
        ctx.principal.userId,
        String(args.shipmentId),
      )
      if (!result.success) throw gqlErrorFromResult(result)

      return Promise.all(
        result.data.map(async (proposal) => {
          const carrier = await ctx.repos.userRepo.findById(proposal.carrierId)
          const latestAttempt = proposal.attempts[proposal.attempts.length - 1]
          return {
            id: proposal.id,
            status: proposal.status,
            carrierId: proposal.carrierId,
            carrierName: carrier?.fullName ?? 'Transportador',
            priceInCents: latestAttempt?.priceInCents ?? 0,
            currentAttempt: proposal.currentAttempt,
            expiresAt: proposal.expiresAt,
            createdAt: proposal.createdAt,
          }
        }),
      )
    },
  }),
)

builder.queryField('safetyCheckInStatus', (t) =>
  t.field({
    type: SafetyCheckInStatusType,
    args: { shipmentId: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (ctx.principal.role !== 'CUSTOMER' && ctx.principal.role !== 'CARRIER') {
        throw gqlError('FORBIDDEN')
      }

      const result = await getSafetyCheckInStatus(
        {
          customerProfileRepo: ctx.repos.customerProfileRepo,
          shipmentRepo: ctx.repos.shipmentRepo,
          proposalRepo: ctx.repos.proposalRepo,
          safetyCheckInRepo: ctx.repos.safetyCheckInRepo,
        },
        ctx.principal.userId,
        ctx.principal.role,
        String(args.shipmentId),
      )
      if (!result.success) throw gqlErrorFromResult(result)

      return { customer: result.customer, carrier: result.carrier }
    },
  }),
)

builder.queryField('deliveryConfirmationStatus', (t) =>
  t.field({
    type: DeliveryConfirmationType,
    nullable: true,
    args: { shipmentId: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (ctx.principal.role !== 'CUSTOMER' && ctx.principal.role !== 'CARRIER') {
        throw gqlError('FORBIDDEN')
      }

      const result = await getDeliveryConfirmationStatus(
        {
          customerProfileRepo: ctx.repos.customerProfileRepo,
          shipmentRepo: ctx.repos.shipmentRepo,
          proposalRepo: ctx.repos.proposalRepo,
          deliveryConfirmationRepo: ctx.repos.deliveryConfirmationRepo,
        },
        ctx.principal.userId,
        ctx.principal.role,
        String(args.shipmentId),
      )
      if (!result.success) throw gqlErrorFromResult(result)

      return result.confirmation
    },
  }),
)

builder.queryField('reviewsForShipment', (t) =>
  t.field({
    type: [ReviewType],
    args: { shipmentId: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (ctx.principal.role !== 'CUSTOMER' && ctx.principal.role !== 'CARRIER') {
        throw gqlError('FORBIDDEN')
      }

      const result = await listReviewsForShipment(
        {
          customerProfileRepo: ctx.repos.customerProfileRepo,
          shipmentRepo: ctx.repos.shipmentRepo,
          proposalRepo: ctx.repos.proposalRepo,
          reviewRepo: ctx.repos.reviewRepo,
        },
        ctx.principal.userId,
        ctx.principal.role,
        String(args.shipmentId),
      )
      if (!result.success) throw gqlErrorFromResult(result)

      return result.reviews
    },
  }),
)
