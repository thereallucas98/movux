import { describe, expect, it, vi } from 'vitest'

import { submitSwapRequest } from '../submit-swap.use-case'
import {
  makeAssignmentRepoMock,
  makeAuditRepoMock,
  makeRequestRepoMock,
  makeShiftRepoMock,
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

const baseSchedule = { workspaceId: 'ws-1', status: 'PUBLISHED' }
const baseShiftA = {
  id: 'shift-A',
  scheduleId: 'sch-1',
  categoryId: 'cat-1',
  startAt: futureStart,
  endAt: futureEnd,
  headcount: 1,
  status: 'OPEN',
  assignmentMode: 'DIRECT_ASSIGN',
  schedule: baseSchedule,
}
const baseShiftB = { ...baseShiftA, id: 'shift-B' }

const sourceAssignment = {
  id: 'asg-source',
  shiftId: 'shift-A',
  userId: 'u-requester',
  assignedByUserId: 'u-coord',
  status: 'ACCEPTED' as const,
  decisionDeadline: new Date(),
  decidedAt: new Date(),
  rejectionReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  shift: baseShiftA,
}
const targetAssignment = {
  ...sourceAssignment,
  id: 'asg-target',
  shiftId: 'shift-B',
  userId: 'u-target',
  shift: baseShiftB,
}

const memberAuth = makeWorkspaceMembershipRepoMock({
  findActive: vi.fn().mockResolvedValue({
    role: 'COLABORADOR',
    isActive: true,
  }),
})

function callUseCase(
  overrides: {
    membership?: ReturnType<typeof makeWorkspaceMembershipRepoMock>
    assignmentRepo?: ReturnType<typeof makeAssignmentRepoMock>
    requestRepo?: ReturnType<typeof makeRequestRepoMock>
    principal?: typeof principal | null
    input?: Partial<Parameters<typeof submitSwapRequest>[6]>
  } = {},
) {
  return submitSwapRequest(
    overrides.membership ?? memberAuth,
    makeShiftRepoMock(),
    overrides.assignmentRepo ??
      makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi
          .fn()
          .mockResolvedValueOnce(sourceAssignment)
          .mockResolvedValueOnce(targetAssignment),
      }),
    overrides.requestRepo ??
      makeRequestRepoMock({
        createSwap: vi.fn().mockResolvedValue({
          id: 'req-1',
          type: 'SWAP',
          status: 'PENDING_PEER',
        }),
      }),
    makeAuditRepoMock(),
    'principal' in overrides ? (overrides.principal ?? null) : principal,
    {
      workspaceId: 'ws-1',
      swapSourceAssignmentId: 'asg-source',
      swapTargetUserId: 'u-target',
      swapTargetAssignmentId: 'asg-target',
      reason: 'preciso trocar',
      ...(overrides.input ?? {}),
    },
  )
}

describe('submitSwapRequest', () => {
  it('UNAUTHENTICATED when no principal', async () => {
    const r = await callUseCase({ principal: null })
    expect(r).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('VALIDATION_ERROR when source and target assignment ids match', async () => {
    const r = await callUseCase({
      input: { swapTargetAssignmentId: 'asg-source' },
    })
    expect(r).toEqual({ success: false, code: 'VALIDATION_ERROR' })
  })

  it('VALIDATION_ERROR when target user is the requester', async () => {
    const r = await callUseCase({ input: { swapTargetUserId: 'u-requester' } })
    expect(r).toEqual({ success: false, code: 'VALIDATION_ERROR' })
  })

  it('FORBIDDEN when caller is not a workspace member', async () => {
    const r = await callUseCase({
      membership: makeWorkspaceMembershipRepoMock({
        findActive: vi.fn().mockResolvedValue(null),
      }),
    })
    expect(r).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('NOT_FOUND when source assignment is missing', async () => {
    const r = await callUseCase({
      assignmentRepo: makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi.fn().mockResolvedValueOnce(null),
      }),
    })
    expect(r).toEqual({ success: false, code: 'NOT_FOUND' })
  })

  it('FORBIDDEN when source assignment does not belong to caller', async () => {
    const r = await callUseCase({
      assignmentRepo: makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi
          .fn()
          .mockResolvedValueOnce({ ...sourceAssignment, userId: 'u-other' }),
      }),
    })
    expect(r).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('INVALID_STATE_TRANSITION when source is not ACCEPTED', async () => {
    const r = await callUseCase({
      assignmentRepo: makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi.fn().mockResolvedValueOnce({
          ...sourceAssignment,
          status: 'PENDING_ACCEPT',
        }),
      }),
    })
    expect(r).toEqual({ success: false, code: 'INVALID_STATE_TRANSITION' })
  })

  it('INVALID_STATE_TRANSITION when target is not owned by swapTargetUserId', async () => {
    const r = await callUseCase({
      assignmentRepo: makeAssignmentRepoMock({
        findByIdWithShiftAndSchedule: vi
          .fn()
          .mockResolvedValueOnce(sourceAssignment)
          .mockResolvedValueOnce({
            ...targetAssignment,
            userId: 'u-someone-else',
          }),
      }),
    })
    expect(r).toEqual({ success: false, code: 'INVALID_STATE_TRANSITION' })
  })

  it('creates a SWAP request on the happy path', async () => {
    const createSwap = vi
      .fn()
      .mockResolvedValue({ id: 'req-1', type: 'SWAP', status: 'PENDING_PEER' })
    const r = await callUseCase({
      requestRepo: makeRequestRepoMock({ createSwap }),
    })
    expect(r.success).toBe(true)
    expect(createSwap).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'ws-1',
        requestedById: 'u-requester',
        swapSourceAssignmentId: 'asg-source',
        swapTargetUserId: 'u-target',
        swapTargetAssignmentId: 'asg-target',
      }),
      expect.anything(),
    )
  })
})
