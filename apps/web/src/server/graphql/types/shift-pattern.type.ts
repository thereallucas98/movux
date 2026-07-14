import { builder } from '../builder'

export const ShiftPatternType = builder.simpleObject('ShiftPattern', {
  fields: (t) => ({
    id: t.id(),
    scheduleId: t.id(),
    categoryId: t.id(),
    name: t.string({ nullable: true }),
    daysOfWeek: t.field({ type: ['Int'] }),
    startTimeMinutes: t.int(),
    endTimeMinutes: t.int(),
    crossesMidnight: t.boolean(),
    headcount: t.int(),
    isActive: t.boolean(),
    createdAt: t.field({ type: 'DateTime' }),
    updatedAt: t.field({ type: 'DateTime' }),
  }),
})
