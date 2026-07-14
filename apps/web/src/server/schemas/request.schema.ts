import { z } from 'zod'

export const RequestIdParamSchema = z.object({
  requestId: z.uuid(),
})

export const RequestTypeSchema = z.enum(['SWAP', 'OFFER', 'TIME_OFF'])

export const RequestStatusSchema = z.enum([
  'PENDING_PEER',
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
])

const ReasonSchema = z.string().trim().min(1).max(2000)
const ResolutionReasonSchema = z.string().trim().min(1).max(2000)

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000

export const SubmitSwapBodySchema = z.object({
  type: z.literal('SWAP'),
  workspaceId: z.uuid(),
  swapSourceAssignmentId: z.uuid(),
  swapTargetUserId: z.uuid(),
  swapTargetAssignmentId: z.uuid(),
  reason: ReasonSchema,
})

export const SubmitOfferBodySchema = z.object({
  type: z.literal('OFFER'),
  workspaceId: z.uuid(),
  offerSourceAssignmentId: z.uuid(),
  reason: ReasonSchema,
})

export const SubmitTimeOffBodySchema = z.object({
  type: z.literal('TIME_OFF'),
  workspaceId: z.uuid(),
  timeOffStart: z.iso.datetime(),
  timeOffEnd: z.iso.datetime(),
  reason: ReasonSchema,
})

export const SubmitRequestSchema = z
  .discriminatedUnion('type', [
    SubmitSwapBodySchema,
    SubmitOfferBodySchema,
    SubmitTimeOffBodySchema,
  ])
  .superRefine((data, ctx) => {
    if (data.type === 'SWAP') {
      if (data.swapSourceAssignmentId === data.swapTargetAssignmentId) {
        ctx.addIssue({
          code: 'custom',
          message:
            'swapSourceAssignmentId must differ from swapTargetAssignmentId',
          path: ['swapTargetAssignmentId'],
        })
      }
    }
    if (data.type === 'TIME_OFF') {
      const start = new Date(data.timeOffStart).getTime()
      const end = new Date(data.timeOffEnd).getTime()
      if (!(end > start)) {
        ctx.addIssue({
          code: 'custom',
          message: 'timeOffEnd must be after timeOffStart',
          path: ['timeOffEnd'],
        })
      }
      if (end - start > NINETY_DAYS_MS) {
        ctx.addIssue({
          code: 'custom',
          message: 'timeOff range must be <= 90 days',
          path: ['timeOffEnd'],
        })
      }
    }
  })

export const PeerRespondBodySchema = z.object({
  decision: z.enum(['ACCEPT', 'REJECT']),
})

export const ResolveRequestBodySchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  resolutionReason: ResolutionReasonSchema.optional(),
})

export const ListRequestsQuerySchema = z.object({
  workspaceId: z.uuid(),
  status: RequestStatusSchema.optional(),
  type: RequestTypeSchema.optional(),
  scope: z.enum(['mine', 'workspace']).default('mine'),
})

export const ATTACHMENT_MIME_WHITELIST = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
] as const
export type AttachmentMimeType = (typeof ATTACHMENT_MIME_WHITELIST)[number]

export const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024

export type ParseAttachmentResult =
  | { success: true; file: File | null }
  | { success: false; code: 'ATTACHMENT_INVALID' }

/**
 * Parses + validates an `attachment` field on multipart/form-data submissions.
 * Returns `file: null` when no attachment was provided (valid for all types).
 */
export function parseAttachmentField(
  formData: FormData,
): ParseAttachmentResult {
  const raw = formData.get('attachment')
  if (raw === null || raw === '') return { success: true, file: null }

  if (!(raw instanceof File))
    return { success: false, code: 'ATTACHMENT_INVALID' }
  if (raw.size === 0) return { success: true, file: null }
  if (raw.size > ATTACHMENT_MAX_BYTES) {
    return { success: false, code: 'ATTACHMENT_INVALID' }
  }
  if (
    !ATTACHMENT_MIME_WHITELIST.includes(
      raw.type as (typeof ATTACHMENT_MIME_WHITELIST)[number],
    )
  ) {
    return { success: false, code: 'ATTACHMENT_INVALID' }
  }
  return { success: true, file: raw }
}

export type SubmitRequestInput = z.infer<typeof SubmitRequestSchema>
export type SubmitSwapInput = z.infer<typeof SubmitSwapBodySchema>
export type SubmitOfferInput = z.infer<typeof SubmitOfferBodySchema>
export type SubmitTimeOffInput = z.infer<typeof SubmitTimeOffBodySchema>
export type PeerRespondInput = z.infer<typeof PeerRespondBodySchema>
export type ResolveRequestInput = z.infer<typeof ResolveRequestBodySchema>
export type ListRequestsQuery = z.infer<typeof ListRequestsQuerySchema>
