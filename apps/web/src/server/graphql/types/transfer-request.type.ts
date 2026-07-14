import { builder } from '../builder'
import { TransferRequestStatusEnum } from '../enums/transfer-request.enum'

export const TransferRequestType = builder.simpleObject('TransferRequest', {
  fields: (t) => ({
    id: t.id(),
    originalAssignmentId: t.id(),
    targetUserId: t.id(),
    requestedByUserId: t.id(),
    reason: t.string(),
    status: t.field({ type: TransferRequestStatusEnum }),
    decidedByUserId: t.id({ nullable: true }),
    decidedAt: t.field({ type: 'DateTime', nullable: true }),
    decisionReason: t.string({ nullable: true }),
    newAssignmentId: t.id({ nullable: true }),
    createdAt: t.field({ type: 'DateTime' }),
    updatedAt: t.field({ type: 'DateTime' }),
  }),
})
