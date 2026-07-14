import { z } from 'zod'

export const ShiftIdParamSchema = z.object({
  id: z.uuid(),
  scheduleId: z.uuid(),
  shiftId: z.uuid(),
})

export const CreateShiftSchema = z
  .object({
    categoryId: z.uuid(),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    headcount: z.number().int().min(1).max(1000).default(1),
    notes: z.string().trim().max(500).nullable().optional(),
  })
  .refine((d) => d.startAt < d.endAt, {
    message: 'startAt must be before endAt',
  })

export const ShiftAssignmentModeSchema = z.enum([
  'DIRECT_ASSIGN',
  'OPEN_FOR_APPLY',
])

export const UpdateShiftSchema = z
  .object({
    categoryId: z.uuid().optional(),
    startAt: z.coerce.date().optional(),
    endAt: z.coerce.date().optional(),
    headcount: z.number().int().min(1).max(1000).optional(),
    assignmentMode: ShiftAssignmentModeSchema.optional(),
    notes: z.string().trim().max(500).nullable().optional(),
  })
  .refine(
    (d) =>
      d.categoryId !== undefined ||
      d.startAt !== undefined ||
      d.endAt !== undefined ||
      d.headcount !== undefined ||
      d.assignmentMode !== undefined ||
      d.notes !== undefined,
    { message: 'At least one field must be provided.' },
  )
  .refine(
    (d) => {
      if (d.startAt && d.endAt) return d.startAt < d.endAt
      return true
    },
    { message: 'startAt must be before endAt' },
  )

export const ShiftStatusSchema = z.enum([
  'OPEN',
  'FILLED',
  'CANCELLED',
  'COMPLETED',
])

export const ListShiftsQuerySchema = z.object({
  status: ShiftStatusSchema.optional(),
  categoryId: z.uuid().optional(),
  fromAt: z.coerce.date().optional(),
  toAt: z.coerce.date().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(20),
})

export const SetExpectedCompositionSchema = z.object({
  items: z
    .array(
      z.object({
        specialtyId: z.uuid(),
        count: z.number().int().min(1).max(1000),
      }),
    )
    .max(50),
})
