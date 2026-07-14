import { z } from 'zod'

export const WorkspaceIdParamSchema = z.object({
  id: z.uuid(),
})

export const ScheduleIdParamSchema = z.object({
  id: z.uuid(),
  scheduleId: z.uuid(),
})

export const CreateScheduleSchema = z
  .object({
    categoryId: z.uuid(),
    name: z.string().trim().min(2).max(120).optional(),
    periodStart: z.coerce.date(),
    periodEnd: z.coerce.date(),
  })
  .refine((d) => d.periodStart < d.periodEnd, {
    message: 'periodStart must be before periodEnd',
  })

export const UpdateScheduleSchema = z
  .object({
    categoryId: z.uuid().optional(),
    name: z.string().trim().min(2).max(120).nullable().optional(),
    periodStart: z.coerce.date().optional(),
    periodEnd: z.coerce.date().optional(),
  })
  .refine(
    (d) =>
      d.categoryId !== undefined ||
      d.name !== undefined ||
      d.periodStart !== undefined ||
      d.periodEnd !== undefined,
    { message: 'At least one field must be provided.' },
  )
  .refine(
    (d) => {
      if (d.periodStart && d.periodEnd) return d.periodStart < d.periodEnd
      return true
    },
    { message: 'periodStart must be before periodEnd' },
  )

export const ScheduleStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'CLOSED'])

export const ListSchedulesQuerySchema = z.object({
  status: ScheduleStatusSchema.optional(),
  categoryId: z.uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
