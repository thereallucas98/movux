import { describe, expect, it } from 'vitest'

import type { AuditLogRow } from '~/server/repositories/audit-log.repository'
import { projectAuditRow } from '../shift-timeline-projection'

function row(overrides: Partial<AuditLogRow> = {}): AuditLogRow {
  return {
    id: 'a-1',
    actorUserId: 'u-1',
    action: 'SHIFT_CREATED',
    entityType: 'SHIFT',
    entityId: 'shift-1',
    metadata: null,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    ...overrides,
  }
}

describe('projectAuditRow', () => {
  it('SHIFT_CREATED → CREATED with audit: prefix', () => {
    const r = projectAuditRow(row({ id: 'a-1', action: 'SHIFT_CREATED' }))
    expect(r).toMatchObject({ id: 'audit:a-1', type: 'CREATED' })
  })

  it('SHIFT_DELETED → CANCELLED (collapsed)', () => {
    expect(projectAuditRow(row({ action: 'SHIFT_DELETED' }))?.type).toBe(
      'CANCELLED',
    )
  })

  it('SHIFT_FILLED → FILLED', () => {
    expect(projectAuditRow(row({ action: 'SHIFT_FILLED' }))?.type).toBe(
      'FILLED',
    )
  })

  it('ASSIGNMENT_CREATED → ASSIGNED', () => {
    expect(projectAuditRow(row({ action: 'ASSIGNMENT_CREATED' }))?.type).toBe(
      'ASSIGNED',
    )
  })

  it('ASSIGNMENT_FORCE_ACCEPTED → ACCEPTED (collapsed)', () => {
    expect(
      projectAuditRow(row({ action: 'ASSIGNMENT_FORCE_ACCEPTED' }))?.type,
    ).toBe('ACCEPTED')
  })

  it('ASSIGNMENT_TRANSFERRED → TRANSFER_APPROVED', () => {
    expect(
      projectAuditRow(row({ action: 'ASSIGNMENT_TRANSFERRED' }))?.type,
    ).toBe('TRANSFER_APPROVED')
  })

  it('ASSIGNMENT_CANCELLED_BY_OFFER preserved as separate event type', () => {
    expect(
      projectAuditRow(row({ action: 'ASSIGNMENT_CANCELLED_BY_OFFER' }))?.type,
    ).toBe('ASSIGNMENT_CANCELLED_BY_OFFER')
  })

  it('TRANSFER_REQUESTED → TRANSFER_REQUESTED', () => {
    expect(projectAuditRow(row({ action: 'TRANSFER_REQUESTED' }))?.type).toBe(
      'TRANSFER_REQUESTED',
    )
  })

  it('CANDIDATE_QUEUED → CANDIDATE_APPLIED', () => {
    expect(projectAuditRow(row({ action: 'CANDIDATE_QUEUED' }))?.type).toBe(
      'CANDIDATE_APPLIED',
    )
  })

  it('TIME_ENTRY_CLOCK_IN → CLOCK_IN', () => {
    expect(projectAuditRow(row({ action: 'TIME_ENTRY_CLOCK_IN' }))?.type).toBe(
      'CLOCK_IN',
    )
  })

  it('CLT_RULE_WARNING → CLT_WARNING', () => {
    expect(projectAuditRow(row({ action: 'CLT_RULE_WARNING' }))?.type).toBe(
      'CLT_WARNING',
    )
  })

  it('REQUEST_SWAP_SUBMITTED → REQUEST_SWAP_SUBMITTED (no metadata.type lookup needed)', () => {
    expect(
      projectAuditRow(row({ action: 'REQUEST_SWAP_SUBMITTED' }))?.type,
    ).toBe('REQUEST_SWAP_SUBMITTED')
  })

  it('REQUEST_REJECTED with metadata.type=SWAP → REQUEST_SWAP_REJECTED', () => {
    expect(
      projectAuditRow(
        row({ action: 'REQUEST_REJECTED', metadata: { type: 'SWAP' } }),
      )?.type,
    ).toBe('REQUEST_SWAP_REJECTED')
  })

  it('REQUEST_REJECTED with metadata.type=OFFER → REQUEST_OFFER_REJECTED', () => {
    expect(
      projectAuditRow(
        row({ action: 'REQUEST_REJECTED', metadata: { type: 'OFFER' } }),
      )?.type,
    ).toBe('REQUEST_OFFER_REJECTED')
  })

  it('REQUEST_REJECTED with metadata.type=TIME_OFF → null (Q2 Fast)', () => {
    expect(
      projectAuditRow(
        row({ action: 'REQUEST_REJECTED', metadata: { type: 'TIME_OFF' } }),
      ),
    ).toBeNull()
  })

  it('REQUEST_CANCELLED with metadata.type=SWAP → REQUEST_SWAP_CANCELLED', () => {
    expect(
      projectAuditRow(
        row({ action: 'REQUEST_CANCELLED', metadata: { type: 'SWAP' } }),
      )?.type,
    ).toBe('REQUEST_SWAP_CANCELLED')
  })

  it('SHIFT_TIMELINE_NOTE_ADDED → null (de-dup; surfaced from notes table)', () => {
    expect(
      projectAuditRow(row({ action: 'SHIFT_TIMELINE_NOTE_ADDED' })),
    ).toBeNull()
  })

  it('Unknown action → null', () => {
    expect(projectAuditRow(row({ action: 'SOMETHING_NEW' }))).toBeNull()
  })

  it('preserves actorUserId, occurredAt and payload from row', () => {
    const at = new Date('2026-09-15T08:00:00.000Z')
    const r = projectAuditRow(
      row({
        id: 'a-42',
        action: 'CANDIDATE_QUEUED',
        actorUserId: 'u-42',
        createdAt: at,
        metadata: { shiftId: 'shift-1', queuePosition: 3 },
      }),
    )
    expect(r).toMatchObject({
      id: 'audit:a-42',
      type: 'CANDIDATE_APPLIED',
      actorUserId: 'u-42',
      occurredAt: at,
      payload: { shiftId: 'shift-1', queuePosition: 3 },
    })
  })
})
