import { z } from 'zod'

export const AssignmentIdActionParamSchema = z.object({
  assignmentId: z.uuid(),
})

export const TransferRequestIdParamSchema = z.object({
  transferRequestId: z.uuid(),
})

export const WorkspaceIdParamSchema = z.object({
  id: z.uuid(),
})

export const RejectAssignmentSchema = z.object({
  reason: z.string().trim().min(1).max(500),
})

export const RequestTransferSchema = z.object({
  targetUserId: z.uuid(),
  reason: z.string().trim().min(1).max(500),
})

export const TransferDecisionSchema = z.enum(['APPROVE', 'REJECT'])

export const DecideTransferRequestSchema = z
  .object({
    decision: TransferDecisionSchema,
    reason: z.string().trim().min(1).max(500).optional(),
  })
  .refine(
    (d) =>
      d.decision === 'APPROVE' ||
      (d.reason !== undefined && d.reason.length > 0),
    { message: 'reason is required when rejecting', path: ['reason'] },
  )

export const TransferRequestStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
])

export const ListTransferRequestsQuerySchema = z.object({
  status: TransferRequestStatusSchema.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
