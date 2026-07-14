import type { RequestRow } from '~/server/repositories/request.repository'
import { builder } from '../builder'
import { RequestStatusEnum, RequestTypeEnum } from '../enums/request.enum'

export interface SwapDetails {
  __kind: 'Swap'
  sourceAssignmentId: string
  targetUserId: string
  targetAssignmentId: string
  peerAcceptedAt: Date | null
  peerRejectedAt: Date | null
}

export interface OfferDetails {
  __kind: 'Offer'
  sourceAssignmentId: string
}

export interface TimeOffDetails {
  __kind: 'TimeOff'
  timeOffStart: Date
  timeOffEnd: Date
}

export type RequestDetails = SwapDetails | OfferDetails | TimeOffDetails

const SwapDetailsType = builder.simpleObject('SwapDetails', {
  fields: (t) => ({
    sourceAssignmentId: t.id(),
    targetUserId: t.id(),
    targetAssignmentId: t.id(),
    peerAcceptedAt: t.field({ type: 'DateTime', nullable: true }),
    peerRejectedAt: t.field({ type: 'DateTime', nullable: true }),
  }),
})

const OfferDetailsType = builder.simpleObject('OfferDetails', {
  fields: (t) => ({
    sourceAssignmentId: t.id(),
  }),
})

const TimeOffDetailsType = builder.simpleObject('TimeOffDetails', {
  fields: (t) => ({
    timeOffStart: t.field({ type: 'DateTime' }),
    timeOffEnd: t.field({ type: 'DateTime' }),
  }),
})

export const RequestDetailsUnion = builder.unionType('RequestDetails', {
  types: [SwapDetailsType, OfferDetailsType, TimeOffDetailsType],
  resolveType(value) {
    const v = value as RequestDetails
    if (v.__kind === 'Swap') return 'SwapDetails'
    if (v.__kind === 'TimeOff') return 'TimeOffDetails'
    return 'OfferDetails'
  },
})

export interface RequestPayload {
  id: string
  workspaceId: string
  type: 'SWAP' | 'OFFER' | 'TIME_OFF'
  status: 'PENDING_PEER' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  requestedById: string
  resolvedById: string | null
  reason: string
  resolutionReason: string | null
  attachmentUrl: string | null
  attachmentMimeType: string | null
  attachmentSizeBytes: number | null
  resolvedAt: Date | null
  createdAt: Date
  updatedAt: Date
  details: RequestDetails
}

export const RequestType = builder.simpleObject('Request', {
  fields: (t) => ({
    id: t.id(),
    workspaceId: t.id(),
    type: t.field({ type: RequestTypeEnum }),
    status: t.field({ type: RequestStatusEnum }),
    requestedById: t.id(),
    resolvedById: t.id({ nullable: true }),
    reason: t.string(),
    resolutionReason: t.string({ nullable: true }),
    attachmentUrl: t.string({ nullable: true }),
    attachmentMimeType: t.string({ nullable: true }),
    attachmentSizeBytes: t.int({ nullable: true }),
    resolvedAt: t.field({ type: 'DateTime', nullable: true }),
    createdAt: t.field({ type: 'DateTime' }),
    updatedAt: t.field({ type: 'DateTime' }),
    details: t.field({ type: RequestDetailsUnion }),
  }),
})

/**
 * Builds the discriminated `details` object from a flat repository row.
 * Use cases return `RequestRow`; resolvers wrap it via `toRequestPayload`.
 */
export function toRequestPayload(row: RequestRow): RequestPayload {
  let details: RequestDetails
  if (row.type === 'SWAP') {
    details = {
      __kind: 'Swap',
      sourceAssignmentId: row.swapSourceAssignmentId ?? '',
      targetUserId: row.swapTargetUserId ?? '',
      targetAssignmentId: row.swapTargetAssignmentId ?? '',
      peerAcceptedAt: row.peerAcceptedAt,
      peerRejectedAt: row.peerRejectedAt,
    }
  } else if (row.type === 'OFFER') {
    details = {
      __kind: 'Offer',
      sourceAssignmentId: row.offerSourceAssignmentId ?? '',
    }
  } else {
    details = {
      __kind: 'TimeOff',
      timeOffStart: row.timeOffStart ?? new Date(0),
      timeOffEnd: row.timeOffEnd ?? new Date(0),
    }
  }
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    type: row.type,
    status: row.status,
    requestedById: row.requestedById,
    resolvedById: row.resolvedById,
    reason: row.reason,
    resolutionReason: row.resolutionReason,
    attachmentUrl: row.attachmentUrl,
    attachmentMimeType: row.attachmentMimeType,
    attachmentSizeBytes: row.attachmentSizeBytes,
    resolvedAt: row.resolvedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    details,
  }
}
