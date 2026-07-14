import { z } from 'zod'

export const PatternIdParamSchema = z.object({
  id: z.uuid(),
  scheduleId: z.uuid(),
  patternId: z.uuid(),
})

const TimeMinutes = z.number().int().min(0).max(1439)

export const CreatePatternSchema = z.object({
  categoryId: z.uuid(),
  name: z.string().trim().min(2).max(120).nullable().optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  startTimeMinutes: TimeMinutes,
  endTimeMinutes: TimeMinutes,
  crossesMidnight: z.boolean().default(false),
  headcount: z.number().int().min(1).max(1000).default(1),
})

export const GeneratePatternSchema = z
  .object({
    rangeStart: z.coerce.date(),
    rangeEnd: z.coerce.date(),
  })
  .refine((d) => d.rangeStart < d.rangeEnd, {
    message: 'rangeStart must be before rangeEnd',
  })
