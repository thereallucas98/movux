import { builder } from '../builder'
import { ScheduleStatusEnum } from '../enums/schedule.enum'

export const ScheduleType = builder.simpleObject('Schedule', {
  fields: (t) => ({
    id: t.id(),
    workspaceId: t.id(),
    categoryId: t.id(),
    name: t.string({ nullable: true }),
    periodStart: t.field({ type: 'DateTime' }),
    periodEnd: t.field({ type: 'DateTime' }),
    status: t.field({ type: ScheduleStatusEnum }),
    publishedAt: t.field({ type: 'DateTime', nullable: true }),
    closedAt: t.field({ type: 'DateTime', nullable: true }),
    isActive: t.boolean(),
    createdAt: t.field({ type: 'DateTime' }),
    updatedAt: t.field({ type: 'DateTime' }),
  }),
})

export const CloseScheduleResultType = builder.simpleObject(
  'CloseScheduleResult',
  {
    fields: (t) => ({
      schedule: t.field({ type: ScheduleType }),
      closedEarly: t.boolean(),
    }),
  },
)
