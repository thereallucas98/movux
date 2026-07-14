import { z } from 'zod'

export const AssignmentIdParamSchema = z.object({
  assignmentId: z.uuid(),
})

export const WorkspaceIdParamSchema = z.object({
  id: z.uuid(),
})

const LatLngFields = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
})

const requireBothOrNeither = (
  data: { lat?: number; lng?: number },
  ctx: z.RefinementCtx,
) => {
  const hasLat = data.lat !== undefined
  const hasLng = data.lng !== undefined
  if (hasLat !== hasLng) {
    ctx.addIssue({
      code: 'custom',
      message: 'lat and lng must be provided together',
      path: hasLat ? ['lng'] : ['lat'],
    })
  }
}

export const ClockInBodySchema = LatLngFields.superRefine(requireBothOrNeither)
export const ClockOutBodySchema = LatLngFields.superRefine(requireBothOrNeither)

export const CloseAssignmentBodySchema = z.object({
  notes: z.string().trim().min(1).max(2000).optional(),
})

export const ListTimeEntriesQuerySchema = z
  .object({
    format: z.enum(['json', 'csv']).default('json'),
    from: z.iso.datetime().optional(),
    to: z.iso.datetime().optional(),
    userId: z.uuid().optional(),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.from && data.to) {
      const from = new Date(data.from).getTime()
      const to = new Date(data.to).getTime()
      if (from > to) {
        ctx.addIssue({
          code: 'custom',
          message: 'from must be <= to',
          path: ['to'],
        })
      }
    }
  })

export type ClockInBody = z.infer<typeof ClockInBodySchema>
export type ClockOutBody = z.infer<typeof ClockOutBodySchema>
export type CloseAssignmentBody = z.infer<typeof CloseAssignmentBodySchema>
export type ListTimeEntriesQuery = z.infer<typeof ListTimeEntriesQuerySchema>
