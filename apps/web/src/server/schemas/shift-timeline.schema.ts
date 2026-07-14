import { z } from 'zod'

export const ShiftIdParamSchema = z.object({
  shiftId: z.uuid(),
})

export const ListShiftTimelineQuerySchema = z.object({
  order: z.enum(['asc', 'desc']).default('asc'),
  since: z.iso.datetime().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
})

export const AddShiftTimelineNoteBodySchema = z.object({
  note: z.string().trim().min(1).max(2000),
})

export type ListShiftTimelineQuery = z.infer<
  typeof ListShiftTimelineQuerySchema
>
export type AddShiftTimelineNoteBody = z.infer<
  typeof AddShiftTimelineNoteBodySchema
>
