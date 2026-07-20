import { builder } from '../builder'
import { QueueEntryStatusEnum } from '../enums/proposal.enum'
import { BrowseShipmentType } from './browse-shipment.type'
import { ProposalType } from './proposal.type'

export const QueueEntryType = builder.simpleObject('QueueEntry', {
  fields: (t) => ({
    id: t.id(),
    status: t.field({ type: QueueEntryStatusEnum }),
    position: t.int(),
    calledAt: t.field({ type: 'DateTime', nullable: true }),
    exhaustedAt: t.field({ type: 'DateTime', nullable: true }),
  }),
})

export const CarrierQueueEntryType = builder.simpleObject('CarrierQueueEntry', {
  fields: (t) => ({
    id: t.id(),
    status: t.field({ type: QueueEntryStatusEnum }),
    position: t.int(),
    calledAt: t.field({ type: 'DateTime', nullable: true }),
    exhaustedAt: t.field({ type: 'DateTime', nullable: true }),
    shipment: t.field({ type: BrowseShipmentType }),
    proposal: t.field({ type: ProposalType, nullable: true }),
  }),
})

export const CarrierQueueEntryConnectionType = builder.simpleObject(
  'CarrierQueueEntryConnection',
  {
    fields: (t) => ({
      data: t.field({ type: [CarrierQueueEntryType] }),
      nextCursor: t.id({ nullable: true }),
    }),
  },
)
