import { builder } from '../builder'
import { ShiftCandidateStatusEnum } from '../enums/candidate.enum'

export const ShiftCandidateType = builder.simpleObject('ShiftCandidate', {
  fields: (t) => ({
    id: t.id(),
    shiftId: t.id(),
    userId: t.id(),
    queuePosition: t.int(),
    status: t.field({ type: ShiftCandidateStatusEnum }),
    decidedByUserId: t.id({ nullable: true }),
    decidedAt: t.field({ type: 'DateTime', nullable: true }),
    decisionReason: t.string({ nullable: true }),
    resultingAssignmentId: t.id({ nullable: true }),
    createdAt: t.field({ type: 'DateTime' }),
    updatedAt: t.field({ type: 'DateTime' }),
  }),
})

export const MyCandidacyType = builder.simpleObject('MyCandidacy', {
  fields: (t) => ({
    candidateId: t.id({ nullable: true }),
    position: t.int({ nullable: true }),
    count: t.int(),
    status: t.field({ type: ShiftCandidateStatusEnum, nullable: true }),
  }),
})
