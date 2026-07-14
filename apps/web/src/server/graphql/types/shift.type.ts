import { builder } from '../builder'
import { ShiftAssignmentModeEnum } from '../enums/candidate.enum'
import { ShiftStatusEnum } from '../enums/shift.enum'

export const ShiftExpectedCompositionType = builder.simpleObject(
  'ShiftExpectedComposition',
  {
    fields: (t) => ({
      id: t.id(),
      shiftId: t.id(),
      specialtyId: t.id(),
      count: t.int(),
      createdAt: t.field({ type: 'DateTime' }),
      updatedAt: t.field({ type: 'DateTime' }),
    }),
  },
)

export const ShiftType = builder.simpleObject('Shift', {
  fields: (t) => ({
    id: t.id(),
    scheduleId: t.id(),
    categoryId: t.id(),
    patternId: t.id({ nullable: true }),
    startAt: t.field({ type: 'DateTime' }),
    endAt: t.field({ type: 'DateTime' }),
    headcount: t.int(),
    status: t.field({ type: ShiftStatusEnum }),
    assignmentMode: t.field({ type: ShiftAssignmentModeEnum }),
    notes: t.string({ nullable: true }),
    cancelledAt: t.field({ type: 'DateTime', nullable: true }),
    cancelReason: t.string({ nullable: true }),
    expectedComposition: t.field({
      type: [ShiftExpectedCompositionType],
    }),
    createdAt: t.field({ type: 'DateTime' }),
    updatedAt: t.field({ type: 'DateTime' }),
  }),
})

export const GeneratePatternResultType = builder.simpleObject(
  'GeneratePatternResult',
  {
    fields: (t) => ({
      generated: t.int(),
      skipped: t.int(),
    }),
  },
)
