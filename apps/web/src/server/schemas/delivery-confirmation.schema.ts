import { z } from 'zod'

export const DeliveryConfirmationBodySchema = z
  .object({
    confirmed: z.boolean(),
    issueDescription: z.string().min(1).optional(),
  })
  .refine((data) => data.confirmed || !!data.issueDescription, {
    message: 'issueDescription is required when confirmed is false',
    path: ['issueDescription'],
  })
