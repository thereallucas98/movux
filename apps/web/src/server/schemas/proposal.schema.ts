import { z } from 'zod'
import { slaHoursSchema } from './sla-hours.schema'

const priceInCentsSchema = z
  .number({ error: 'Informe o valor da proposta' })
  .int()
  .positive('O valor da proposta precisa ser maior que zero')

export const SubmitProposalSchema = z.object({
  priceInCents: priceInCentsSchema,
  carrierSlaHours: slaHoursSchema('Selecione um prazo de resposta'),
  message: z.string().optional(),
})

export const AddProposalAttemptSchema = z.object({
  priceInCents: priceInCentsSchema,
  message: z.string().optional(),
})

export const ProposalIdParamSchema = z.object({
  shipmentId: z.uuid(),
  proposalId: z.uuid(),
})
