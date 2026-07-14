import { describe, expect, it } from 'vitest'
import {
  ATTACHMENT_MAX_BYTES,
  parseAttachmentField,
  SubmitRequestSchema,
} from '../request.schema'

const VALID_UUID_A = '11111111-1111-4111-8111-111111111111'
const VALID_UUID_B = '22222222-2222-4222-8222-222222222222'
const VALID_UUID_C = '33333333-3333-4333-8333-333333333333'
const VALID_UUID_D = '44444444-4444-4444-8444-444444444444'

describe('SubmitRequestSchema', () => {
  it('accepts a valid SWAP body', () => {
    const parsed = SubmitRequestSchema.safeParse({
      type: 'SWAP',
      workspaceId: VALID_UUID_A,
      swapSourceAssignmentId: VALID_UUID_B,
      swapTargetUserId: VALID_UUID_C,
      swapTargetAssignmentId: VALID_UUID_D,
      reason: 'preciso trocar',
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects SWAP when source and target assignment ids match', () => {
    const parsed = SubmitRequestSchema.safeParse({
      type: 'SWAP',
      workspaceId: VALID_UUID_A,
      swapSourceAssignmentId: VALID_UUID_B,
      swapTargetUserId: VALID_UUID_C,
      swapTargetAssignmentId: VALID_UUID_B,
      reason: 'troca inválida',
    })
    expect(parsed.success).toBe(false)
  })

  it('accepts a valid OFFER body', () => {
    const parsed = SubmitRequestSchema.safeParse({
      type: 'OFFER',
      workspaceId: VALID_UUID_A,
      offerSourceAssignmentId: VALID_UUID_B,
      reason: 'oferta para o time',
    })
    expect(parsed.success).toBe(true)
  })

  it('accepts a valid TIME_OFF body within 90 days', () => {
    const parsed = SubmitRequestSchema.safeParse({
      type: 'TIME_OFF',
      workspaceId: VALID_UUID_A,
      timeOffStart: '2026-05-10T00:00:00.000Z',
      timeOffEnd: '2026-05-15T00:00:00.000Z',
      reason: 'férias',
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects TIME_OFF when end <= start', () => {
    const parsed = SubmitRequestSchema.safeParse({
      type: 'TIME_OFF',
      workspaceId: VALID_UUID_A,
      timeOffStart: '2026-05-10T00:00:00.000Z',
      timeOffEnd: '2026-05-10T00:00:00.000Z',
      reason: 'período inválido',
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects TIME_OFF when range exceeds 90 days', () => {
    const parsed = SubmitRequestSchema.safeParse({
      type: 'TIME_OFF',
      workspaceId: VALID_UUID_A,
      timeOffStart: '2026-05-01T00:00:00.000Z',
      timeOffEnd: '2026-09-01T00:00:00.000Z',
      reason: 'período longo demais',
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects mixed type / wrong-shape bodies', () => {
    const parsed = SubmitRequestSchema.safeParse({
      type: 'OFFER',
      workspaceId: VALID_UUID_A,
      swapSourceAssignmentId: VALID_UUID_B,
      reason: 'shape errada',
    })
    expect(parsed.success).toBe(false)
  })
})

describe('parseAttachmentField', () => {
  it('returns file: null when no attachment field present', () => {
    const fd = new FormData()
    expect(parseAttachmentField(fd)).toEqual({ success: true, file: null })
  })

  it('accepts a valid PDF attachment', () => {
    const file = new File(['hello'], 'atestado.pdf', {
      type: 'application/pdf',
    })
    const fd = new FormData()
    fd.set('attachment', file)
    const res = parseAttachmentField(fd)
    expect(res.success).toBe(true)
    if (res.success) expect(res.file?.name).toBe('atestado.pdf')
  })

  it('rejects an attachment with a forbidden MIME type', () => {
    const file = new File(['x'], 'note.txt', { type: 'text/plain' })
    const fd = new FormData()
    fd.set('attachment', file)
    expect(parseAttachmentField(fd)).toEqual({
      success: false,
      code: 'ATTACHMENT_INVALID',
    })
  })

  it('rejects an attachment over the size cap', () => {
    const big = new Uint8Array(ATTACHMENT_MAX_BYTES + 1)
    const file = new File([big], 'big.pdf', { type: 'application/pdf' })
    const fd = new FormData()
    fd.set('attachment', file)
    expect(parseAttachmentField(fd)).toEqual({
      success: false,
      code: 'ATTACHMENT_INVALID',
    })
  })
})
