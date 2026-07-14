import { builder } from '../builder'
import { ShiftTimelineEventTypeEnum } from '../enums/shift-timeline.enum'

export const ShiftTimelineEventType = builder.simpleObject(
  'ShiftTimelineEvent',
  {
    fields: (t) => ({
      id: t.id(),
      type: t.field({ type: ShiftTimelineEventTypeEnum }),
      actorUserId: t.id({ nullable: true }),
      actorName: t.string({ nullable: true }),
      occurredAt: t.field({ type: 'DateTime' }),
      payload: t.field({ type: 'JSON', nullable: true }),
    }),
  },
)
