import { z } from 'zod'

export const ShiftIdParamSchema = z.object({
  shiftId: z.uuid(),
})

export const CandidateIdParamSchema = z.object({
  candidateId: z.uuid(),
})

export const ApproveCandidateSchema = z.object({
  autoAccept: z.boolean().default(false),
})

export const RejectCandidateSchema = z.object({
  reason: z.string().trim().min(1).max(500),
})

export const ShiftCandidateStatusSchema = z.enum([
  'QUEUED',
  'APPROVED',
  'REJECTED',
  'WITHDRAWN',
])

export const ListCandidatesQuerySchema = z.object({
  status: ShiftCandidateStatusSchema.optional(),
})
