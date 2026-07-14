import { describe, expect, it, vi } from 'vitest'

import { submitTimeOffRequest } from '../submit-time-off.use-case'
import {
  makeAuditRepoMock,
  makeRequestRepoMock,
  makeWorkspaceMembershipRepoMock,
} from '../../__tests__/helpers'

const uploadFileMock = vi.fn()
const deleteFileMock = vi.fn()

vi.mock('~/lib/storage/supabase', () => ({
  uploadFile: (...args: unknown[]) => uploadFileMock(...args),
  deleteFile: (...args: unknown[]) => deleteFileMock(...args),
}))

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

const principal = { userId: 'u-1', role: 'USER' }
const start = new Date('2026-06-01T00:00:00Z')
const end = new Date('2026-06-05T00:00:00Z')

const memberAuth = makeWorkspaceMembershipRepoMock({
  findActive: vi
    .fn()
    .mockResolvedValue({ role: 'COLABORADOR', isActive: true }),
})

describe('submitTimeOffRequest', () => {
  it('UNAUTHENTICATED', async () => {
    const r = await submitTimeOffRequest(
      memberAuth,
      makeRequestRepoMock(),
      makeAuditRepoMock(),
      null,
      {
        workspaceId: 'ws-1',
        timeOffStart: start,
        timeOffEnd: end,
        reason: 'r',
      },
    )
    expect(r).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('VALIDATION_ERROR when end <= start', async () => {
    const r = await submitTimeOffRequest(
      memberAuth,
      makeRequestRepoMock(),
      makeAuditRepoMock(),
      principal,
      {
        workspaceId: 'ws-1',
        timeOffStart: start,
        timeOffEnd: start,
        reason: 'r',
      },
    )
    expect(r).toEqual({ success: false, code: 'VALIDATION_ERROR' })
  })

  it('FORBIDDEN when caller is not a workspace member', async () => {
    const r = await submitTimeOffRequest(
      makeWorkspaceMembershipRepoMock({
        findActive: vi.fn().mockResolvedValue(null),
      }),
      makeRequestRepoMock(),
      makeAuditRepoMock(),
      principal,
      {
        workspaceId: 'ws-1',
        timeOffStart: start,
        timeOffEnd: end,
        reason: 'r',
      },
    )
    expect(r).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('INVALID_STATE_TRANSITION when an overlapping approved TIME_OFF exists', async () => {
    const r = await submitTimeOffRequest(
      memberAuth,
      makeRequestRepoMock({
        hasOverlappingApprovedTimeOff: vi.fn().mockResolvedValue(true),
      }),
      makeAuditRepoMock(),
      principal,
      {
        workspaceId: 'ws-1',
        timeOffStart: start,
        timeOffEnd: end,
        reason: 'r',
      },
    )
    expect(r).toEqual({ success: false, code: 'INVALID_STATE_TRANSITION' })
  })

  it('happy path without attachment', async () => {
    const createTimeOff = vi
      .fn()
      .mockResolvedValue({ id: 'req-1', type: 'TIME_OFF', status: 'PENDING' })
    const r = await submitTimeOffRequest(
      memberAuth,
      makeRequestRepoMock({ createTimeOff }),
      makeAuditRepoMock(),
      principal,
      {
        workspaceId: 'ws-1',
        timeOffStart: start,
        timeOffEnd: end,
        reason: 'férias',
      },
    )
    expect(r.success).toBe(true)
    expect(uploadFileMock).not.toHaveBeenCalled()
    expect(createTimeOff).toHaveBeenCalled()
  })

  it('uploads attachment and persists URL on the happy path', async () => {
    uploadFileMock.mockResolvedValueOnce({
      path: 'requests/ws-1/u-1/123-atestado.pdf',
      url: 'https://signed.example/abc',
    })
    const createTimeOff = vi
      .fn()
      .mockResolvedValue({ id: 'req-1', type: 'TIME_OFF', status: 'PENDING' })
    const r = await submitTimeOffRequest(
      memberAuth,
      makeRequestRepoMock({ createTimeOff }),
      makeAuditRepoMock(),
      principal,
      {
        workspaceId: 'ws-1',
        timeOffStart: start,
        timeOffEnd: end,
        reason: 'atestado',
        attachment: {
          file: Buffer.from('hello'),
          contentType: 'application/pdf',
          sizeBytes: 5,
          originalFilename: 'atestado.pdf',
        },
      },
    )
    expect(r.success).toBe(true)
    expect(uploadFileMock).toHaveBeenCalledTimes(1)
    expect(createTimeOff).toHaveBeenCalledWith(
      expect.objectContaining({
        attachmentUrl: 'https://signed.example/abc',
        attachmentMimeType: 'application/pdf',
        attachmentSizeBytes: 5,
      }),
      expect.anything(),
    )
  })

  it('returns ATTACHMENT_UPLOAD_FAILED when uploadFile throws', async () => {
    uploadFileMock.mockRejectedValueOnce(new Error('boom'))
    const r = await submitTimeOffRequest(
      memberAuth,
      makeRequestRepoMock(),
      makeAuditRepoMock(),
      principal,
      {
        workspaceId: 'ws-1',
        timeOffStart: start,
        timeOffEnd: end,
        reason: 'atestado',
        attachment: {
          file: Buffer.from(''),
          contentType: 'application/pdf',
          sizeBytes: 1,
        },
      },
    )
    expect(r).toEqual({ success: false, code: 'ATTACHMENT_UPLOAD_FAILED' })
  })
})
