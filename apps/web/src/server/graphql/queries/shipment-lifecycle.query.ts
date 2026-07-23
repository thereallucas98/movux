import {
  getDeliveryConfirmationStatus,
  getSafetyCheckInStatus,
  getShipmentCounterpartInfo,
  getShipmentEvents,
  listProposalsForShipment,
  listReviewsForShipment,
} from '~/server/use-cases'
import { builder } from '../builder'
import { gqlError, gqlErrorFromResult } from '../errors'
import { SHIPMENT_EVENT_DESCRIPTIONS } from '../shipment-event-descriptions'
import { ReviewerRoleEnum } from '../enums/shipment-lifecycle.enum'
import {
  CounterpartInfoType,
  DeliveryConfirmationType,
  ProposalForCustomerType,
  ReviewTagOptionType,
  ReviewType,
  SafetyCheckInStatusType,
} from '../types/shipment-lifecycle.type'
import { ShipmentEventType } from '../types/shipment-event.type'

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
          const [carrier, contact] = await Promise.all([
            ctx.repos.userRepo.findById(proposal.carrierId),
            ctx.repos.carrierProfileRepo.findContactInfoByUserId(
              proposal.carrierId,
            ),
          ])
          const latestAttempt = proposal.attempts[proposal.attempts.length - 1]
          return {
            id: proposal.id,
            status: proposal.status,
            carrierId: proposal.carrierId,
            carrierName: carrier?.fullName ?? 'Transportador',
            carrierPhone: contact?.phone ?? null,
            carrierAvgRating: contact?.avgRating ?? null,
            priceInCents: latestAttempt?.priceInCents ?? 0,
            currentAttempt: proposal.currentAttempt,
            currentAttemptResponseType: latestAttempt?.responseType ?? null,
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
      if (
        ctx.principal.role !== 'CUSTOMER' &&
        ctx.principal.role !== 'CARRIER'
      ) {
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
      if (
        ctx.principal.role !== 'CUSTOMER' &&
        ctx.principal.role !== 'CARRIER'
      ) {
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
      if (
        ctx.principal.role !== 'CUSTOMER' &&
        ctx.principal.role !== 'CARRIER'
      ) {
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

      return result.reviews.map((review) => ({
        ...review,
        tags: review.tagSelections.map((selection) => selection.tag.label),
      }))
    },
  }),
)

// Achado #10 da QA momento-zero — tags disponíveis pro picker de avaliação,
// filtradas pelo papel de quem está SENDO avaliado (targetRole), não de quem
// avalia. Leitura pura, sem use-case (mesmo padrão de vehicle-taxonomy.query.ts).
builder.queryField('reviewTagOptions', (t) =>
  t.field({
    type: [ReviewTagOptionType],
    args: { targetRole: t.arg({ type: ReviewerRoleEnum, required: true }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (
        ctx.principal.role !== 'CUSTOMER' &&
        ctx.principal.role !== 'CARRIER'
      ) {
        throw gqlError('FORBIDDEN')
      }

      return ctx.repos.reviewTagRepo.findActiveByTargetRole(args.targetRole)
    },
  }),
)

builder.queryField('shipmentCounterpartInfo', (t) =>
  t.field({
    type: CounterpartInfoType,
    nullable: true,
    args: { shipmentId: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (
        ctx.principal.role !== 'CUSTOMER' &&
        ctx.principal.role !== 'CARRIER'
      ) {
        throw gqlError('FORBIDDEN')
      }

      const result = await getShipmentCounterpartInfo(
        {
          customerProfileRepo: ctx.repos.customerProfileRepo,
          shipmentRepo: ctx.repos.shipmentRepo,
          proposalRepo: ctx.repos.proposalRepo,
          carrierProfileRepo: ctx.repos.carrierProfileRepo,
          userRepo: ctx.repos.userRepo,
          reviewRepo: ctx.repos.reviewRepo,
        },
        ctx.principal.userId,
        ctx.principal.role,
        String(args.shipmentId),
      )
      if (!result.success) throw gqlErrorFromResult(result)

      return result.info
    },
  }),
)

builder.queryField('shipmentEvents', (t) =>
  t.field({
    type: [ShipmentEventType],
    args: { shipmentId: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (
        ctx.principal.role !== 'CUSTOMER' &&
        ctx.principal.role !== 'CARRIER'
      ) {
        throw gqlError('FORBIDDEN')
      }

      const result = await getShipmentEvents(
        {
          customerProfileRepo: ctx.repos.customerProfileRepo,
          shipmentRepo: ctx.repos.shipmentRepo,
          proposalRepo: ctx.repos.proposalRepo,
          shipmentEventRepo: ctx.repos.shipmentEventRepo,
        },
        ctx.principal.userId,
        ctx.principal.role,
        String(args.shipmentId),
      )
      if (!result.success) throw gqlErrorFromResult(result)

      return result.events.map((event) => ({
        id: event.id,
        eventType: event.eventType,
        description: SHIPMENT_EVENT_DESCRIPTIONS[event.eventType],
        occurredAt: event.occurredAt,
      }))
    },
  }),
)
