import { describe, expect, it, vi } from 'vitest'

import { submitOfferRequest } from '../submit-offer.use-case'
import {
  makeAssignmentRepoMock,
  makeAuditRepoMock,
  makeRequestRepoMock,
  makeWorkspaceMembershipRepoMock,
} from '../../__tests__/helpers'

vi.mock('~/lib/db', () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({}),
    ),
    tenant: {
      findFirst: vi.fn().mockResolvedValue({
        id: 'tenant-1',
        plan: 'CORPORATE',
        gracePeriodUntil: null,
        timezone: 'America/Sao_Paulo',
      }),
    },
    workspace: {
      findFirst: vi.fn().mockResolvedValue({
        timezone: 'America/Sao_Paulo',
        tenant: {
          id: 'tenant-1',
          plan: 'CORPORATE',
          gracePeriodUntil: null,
          timezone: 'America/Sao_Paulo',
        },
      }),
      count: vi.fn().mockResolvedValue(0),
    },
    workspaceMembership: { count: vi.fn().mockResolvedValue(0) },
    category: { count: vi.fn().mockResolvedValue(0) },
    specialty: { count: vi.fn().mockResolvedValue(0) },
    schedule: { count: vi.fn().mockResolvedValue(0) },
    shift: { count: vi.fn().mockResolvedValue(0) },
    request: {
      count: vi.fn().mockResolvedValue(0),
      aggregate: vi
        .fn()
        .mockResolvedValue({ _sum: { attachmentSizeBytes: null } }),
    },
  },
}))
vi.mock('~/server/notifications/request-events', () => ({
  notifyRequestSubmitted: vi.fn(),
  notifyRequestResolved: vi.fn(),
  notifyRequestPeerDecision: vi.fn(),
}))

const principal = { userId: 'u-requester', role: 'USER' }
const futureStart = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
const futureEnd = new Date(futureStart.getTime() + 8 * 60 * 60 * 1000)

const acceptedAssignment = {
  id: 'asg-1',
  shiftId: 'shift-1',
  userId: 'u-requester',
  assignedByUserId: 'u-coord',
  status: 'ACCEPTED' as const,
  decisionDeadline: new Date(),
  decidedAt: new Date(),
  rejectionReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  shift: {
    id: 'shift-1',
    scheduleId: 'sch-1',
    categoryId: 'cat-1',
    startAt: futureStart,
    endAt: futureEnd,
    headcount: 1,
    status: 'OPEN',
    assignmentMode: 'DIRECT_ASSIGN',
    schedule: { workspaceId: 'ws-1', status: 'PUBLISHED' },
  },
}

const memberAuth = makeWorkspaceMembershipRepoMock({
  findActive: vi
    .fn()
    .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
})

describe('submitOfferRequest', () => {
  it('UNAUTHENTICATED', async () => {
    const r = await submitOfferRequest(
      memberAuth,
      makeAssignmentRepoMock(),
      makeRequestRepoMock(),
      makeAuditRepoMock(),
      null,
      {
        workspaceId: 'ws-1',
        offerSourceAssignmentId: 'asg-1',
        reason: 'r',
      },
    )
    expect(r).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('FORBIDDEN when assignment is not owned by caller', async () => {
    const r = await submitOfferRequest(
      memberAuth,
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi
          .fn()
          .mockResolvedValue({ ...acceptedAssignment, userId: 'u-other' }),
      }),
      makeRequestRepoMock(),
      makeAuditRepoMock(),
      principal,
      { workspaceId: 'ws-1', offerSourceAssignmentId: 'asg-1', reason: 'r' },
    )
    expect(r).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('INVALID_STATE_TRANSITION when shift is already OPEN_FOR_APPLY', async () => {
    const r = await submitOfferRequest(
      memberAuth,
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi.fn().mockResolvedValue({
          ...acceptedAssignment,
          shift: {
            ...acceptedAssignment.shift,
            assignmentMode: 'OPEN_FOR_APPLY',
          },
        }),
      }),
      makeRequestRepoMock(),
      makeAuditRepoMock(),
      principal,
      { workspaceId: 'ws-1', offerSourceAssignmentId: 'asg-1', reason: 'r' },
    )
    expect(r).toEqual({ success: false, code: 'INVALID_STATE_TRANSITION' })
  })

  it('creates an OFFER request on the happy path', async () => {
    const createOffer = vi
      .fn()
      .mockResolvedValue({ id: 'req-1', type: 'OFFER', status: 'PENDING' })
    const r = await submitOfferRequest(
      memberAuth,
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi
          .fn()
          .mockResolvedValue(acceptedAssignment),
      }),
      makeRequestRepoMock({ createOffer }),
      makeAuditRepoMock(),
      principal,
      { workspaceId: 'ws-1', offerSourceAssignmentId: 'asg-1', reason: 'r' },
    )
    expect(r.success).toBe(true)
    expect(createOffer).toHaveBeenCalled()
  })
})
