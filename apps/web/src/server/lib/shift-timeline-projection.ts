import type { AuditLogRow } from '~/server/repositories/audit-log.repository'

/**
 * Projection from raw audit log actions to the BF §7.12 timeline event
 * vocabulary. Pure, table-driven (Task 14 research §2). Returns null when
 * the action is unknown or not relevant to a shift timeline.
 */

export type ShiftTimelineEventType =
  | 'CREATED'
  | 'UPDATED'
  | 'CANCELLED'
  | 'COMPOSITION_SET'
  | 'ASSIGNED'
  | 'UNASSIGNED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'TRANSFER_REQUESTED'
  | 'TRANSFER_APPROVED'
  | 'TRANSFER_REJECTED'
  | 'TRANSFER_CANCELLED'
  | 'CANDIDATE_APPLIED'
  | 'CANDIDATE_APPROVED'
  | 'CANDIDATE_REJECTED'
  | 'CANDIDATE_WITHDRAWN'
  | 'CLOCK_IN'
  | 'CLOCK_OUT'
  | 'CLT_WARNING'
  | 'PENDING_CLOSURE'
  | 'COMPLETED'
  | 'FILLED'
  | 'UNFILLED'
  | 'ASSIGNMENT_CANCELLED_BY_OFFER'
  | 'ASSIGNMENT_CANCELLED_BY_TIME_OFF'
  | 'REQUEST_SWAP_SUBMITTED'
  | 'REQUEST_SWAP_APPROVED'
  | 'REQUEST_SWAP_REJECTED'
  | 'REQUEST_SWAP_CANCELLED'
  | 'REQUEST_SWAP_PEER_ACCEPTED'
  | 'REQUEST_SWAP_PEER_REJECTED'
  | 'REQUEST_OFFER_SUBMITTED'
  | 'REQUEST_OFFER_APPROVED'
  | 'REQUEST_OFFER_REJECTED'
  | 'REQUEST_OFFER_CANCELLED'
  | 'NOTE_ADDED'

export interface ShiftTimelineEvent {
  id: string
  type: ShiftTimelineEventType
  actorUserId: string | null
  actorName: string | null
  occurredAt: Date
  payload: Record<string, unknown> | null
}

const ACTION_TO_EVENT_TYPE: Record<string, ShiftTimelineEventType> = {
  // SHIFT
  SHIFT_CREATED: 'CREATED',
  SHIFT_UPDATED: 'UPDATED',
  SHIFT_CANCELLED: 'CANCELLED',
  SHIFT_DELETED: 'CANCELLED',
  SHIFT_COMPOSITION_SET: 'COMPOSITION_SET',
  SHIFT_FILLED: 'FILLED',
  SHIFT_UNFILLED: 'UNFILLED',

  // SHIFT_ASSIGNMENT
  ASSIGNMENT_CREATED: 'ASSIGNED',
  ASSIGNMENT_UNASSIGNED: 'UNASSIGNED',
  ASSIGNMENT_ACCEPTED: 'ACCEPTED',
  ASSIGNMENT_FORCE_ACCEPTED: 'ACCEPTED',
  ASSIGNMENT_REJECTED: 'REJECTED',
  ASSIGNMENT_TRANSFERRED: 'TRANSFER_APPROVED',
  ASSIGNMENT_PENDING_CLOSURE: 'PENDING_CLOSURE',
  ASSIGNMENT_COMPLETED: 'COMPLETED',
  ASSIGNMENT_CANCELLED_BY_OFFER: 'ASSIGNMENT_CANCELLED_BY_OFFER',
  ASSIGNMENT_CANCELLED_BY_TIME_OFF: 'ASSIGNMENT_CANCELLED_BY_TIME_OFF',

  // TRANSFER_REQUEST
  TRANSFER_REQUESTED: 'TRANSFER_REQUESTED',
  TRANSFER_APPROVED: 'TRANSFER_APPROVED',
  TRANSFER_REJECTED: 'TRANSFER_REJECTED',
  TRANSFER_CANCELLED: 'TRANSFER_CANCELLED',

  // SHIFT_CANDIDATE
  CANDIDATE_QUEUED: 'CANDIDATE_APPLIED',
  CANDIDATE_APPROVED: 'CANDIDATE_APPROVED',
  CANDIDATE_REJECTED: 'CANDIDATE_REJECTED',
  CANDIDATE_WITHDRAWN: 'CANDIDATE_WITHDRAWN',

  // TIME_ENTRY
  TIME_ENTRY_CLOCK_IN: 'CLOCK_IN',
  TIME_ENTRY_CLOCK_OUT: 'CLOCK_OUT',
  CLT_RULE_WARNING: 'CLT_WARNING',

  // REQUEST (type-discriminated paths handled below)
  REQUEST_SWAP_SUBMITTED: 'REQUEST_SWAP_SUBMITTED',
  REQUEST_SWAP_APPROVED: 'REQUEST_SWAP_APPROVED',
  REQUEST_SWAP_PEER_ACCEPTED: 'REQUEST_SWAP_PEER_ACCEPTED',
  REQUEST_SWAP_PEER_REJECTED: 'REQUEST_SWAP_PEER_REJECTED',
  REQUEST_OFFER_SUBMITTED: 'REQUEST_OFFER_SUBMITTED',
  REQUEST_OFFER_APPROVED: 'REQUEST_OFFER_APPROVED',
}

function projectRequestRejected(
  metadata: Record<string, unknown> | null,
): ShiftTimelineEventType | null {
  const t = (metadata as { type?: string } | null)?.type
  if (t === 'SWAP') return 'REQUEST_SWAP_REJECTED'
  if (t === 'OFFER') return 'REQUEST_OFFER_REJECTED'
  // TIME_OFF skipped (Q2 Fast — cascade audits cover per-shift effect).
  return null
}

function projectRequestCancelled(
  metadata: Record<string, unknown> | null,
): ShiftTimelineEventType | null {
  const t = (metadata as { type?: string } | null)?.type
  if (t === 'SWAP') return 'REQUEST_SWAP_CANCELLED'
  if (t === 'OFFER') return 'REQUEST_OFFER_CANCELLED'
  return null
}

export function projectAuditRow(
  row: AuditLogRow,
  actorName: string | null = null,
): ShiftTimelineEvent | null {
  // The audit emit-side for note creation is for observability only; the
  // timeline surfaces NOTE_ADDED events directly from the shiftTimelineNote
  // table (with the full body), so we drop these here to avoid duplicates.
  if (row.action === 'SHIFT_TIMELINE_NOTE_ADDED') return null

  let type: ShiftTimelineEventType | null = null
  if (row.action === 'REQUEST_REJECTED') {
    type = projectRequestRejected(row.metadata)
  } else if (row.action === 'REQUEST_CANCELLED') {
    type = projectRequestCancelled(row.metadata)
  } else {
    type = ACTION_TO_EVENT_TYPE[row.action] ?? null
  }

  if (!type) return null

  return {
    id: `audit:${row.id}`,
    type,
    actorUserId: row.actorUserId,
    actorName,
    occurredAt: row.createdAt,
    payload: row.metadata,
  }
}
