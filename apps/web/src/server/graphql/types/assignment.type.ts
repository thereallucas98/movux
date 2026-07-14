import { builder } from '../builder'
import {
  AssignmentStatusEnum,
  CompositionStatusEnum,
} from '../enums/assignment.enum'

export const AssignmentType = builder.simpleObject('Assignment', {
  fields: (t) => ({
    id: t.id(),
    shiftId: t.id(),
    userId: t.id(),
    assignedByUserId: t.id(),
    status: t.field({ type: AssignmentStatusEnum }),
    decisionDeadline: t.field({ type: 'DateTime' }),
    decidedAt: t.field({ type: 'DateTime', nullable: true }),
    rejectionReason: t.string({ nullable: true }),
    compositionStatus: t.field({ type: CompositionStatusEnum }),
    createdAt: t.field({ type: 'DateTime' }),
    updatedAt: t.field({ type: 'DateTime' }),
  }),
})
