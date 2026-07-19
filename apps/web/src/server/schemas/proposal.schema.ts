import { z } from 'zod'

const slaHoursSchema = z.union([
  z.literal(4),
  z.literal(6),
  z.literal(8),
  z.literal(12),
  z.literal(24),
])

export const SubmitProposalSchema = z.object({
  priceInCents: z.number().int().positive(),
  carrierSlaHours: slaHoursSchema,
  message: z.string().optional(),
})

export const AddProposalAttemptSchema = z.object({
  priceInCents: z.number().int().positive(),
  message: z.string().optional(),
})

export const ProposalIdParamSchema = z.object({
  shipmentId: z.uuid(),
  proposalId: z.uuid(),
})
