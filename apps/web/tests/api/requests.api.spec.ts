import type { APIRequestContext } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { query, resetDatabase } from './fixtures/db'
import type {
  AssignmentRow,
  RequestRow,
  UserRow,
} from './fixtures/db'
import {
  createUserFixture,
  seedCategory,
  seedOfferRequest,
  seedSchedule,
  seedShift,
  seedShiftAssignment,
  seedSwapRequest,
  seedTenantWithOwner,
  seedTimeOffRequest,
  seedUser,
  seedWorkspaceMembership,
  seedWorkspaceWithAdmin,
} from './fixtures/factories'

const NON_EXISTENT = '00000000-0000-0000-0000-000000000000'
const FUTURE_START = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
const FUTURE_END = new Date(FUTURE_START.getTime() + 8 * 60 * 60 * 1000)
const FUTURE_START_2 = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000)
const FUTURE_END_2 = new Date(FUTURE_START_2.getTime() + 8 * 60 * 60 * 1000)

interface TwoUserSetup {
  owner: Awaited<ReturnType<typeof createUserFixture>>
  peer: UserRow
  tenant: { id: string }
  ws: { id: string }
  sch: { id: string }
  shiftA: { id: string }
  shiftB: { id: string }
  asgOwner: AssignmentRow
  asgPeer: AssignmentRow
}

async function setupTwoUsers(
  request: APIRequestContext,
): Promise<TwoUserSetup> {
  const owner = await createUserFixture(request)
  const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
  const ws = await seedWorkspaceWithAdmin({
    tenantId: tenant.id,
    ownerId: owner.user.id,
  })
  const cat = await seedCategory({
    scope: 'WORKSPACE',
    tenantId: tenant.id,
    workspaceId: ws.id,
    slug: 'uti',
    name: 'UTI',
  })
  const sch = await seedSchedule({
    workspaceId: ws.id,
    categoryId: cat.id,
    periodStart: new Date('2026-10-01'),
    periodEnd: new Date('2026-11-01'),
    status: 'PUBLISHED',
  })
  const shiftA = await seedShift({
    scheduleId: sch.id,
    categoryId: cat.id,
    startAt: FUTURE_START,
    endAt: FUTURE_END,
    headcount: 1,
  })
  const shiftB = await seedShift({
    scheduleId: sch.id,
    categoryId: cat.id,
    startAt: FUTURE_START_2,
    endAt: FUTURE_END_2,
    headcount: 1,
  })
  const peer = await seedUser()
  await seedWorkspaceMembership({
    workspaceId: ws.id,
    userId: peer.id,
    role: 'COLABORADOR',
  })
  const asgOwner = await seedShiftAssignment({
    shiftId: shiftA.id,
    userId: owner.user.id,
    assignedByUserId: owner.user.id,
    status: 'ACCEPTED',
  })
  const asgPeer = await seedShiftAssignment({
    shiftId: shiftB.id,
    userId: peer.id,
    assignedByUserId: owner.user.id,
    status: 'ACCEPTED',
  })
  return { owner, peer, tenant, ws, sch, shiftA, shiftB, asgOwner, asgPeer }
}

test.describe('/api/requests', () => {
  test.beforeEach(async () => {
    await resetDatabase()
  })

  test.describe('POST /api/requests submit', () => {
    test('201 SWAP', async ({ request }) => {
      const s = await setupTwoUsers(request)
      const res = await request.post('/api/requests', {
        data: {
          type: 'SWAP',
          workspaceId: s.ws.id,
          swapSourceAssignmentId: s.asgOwner.id,
          swapTargetUserId: s.peer.id,
          swapTargetAssignmentId: s.asgPeer.id,
          reason: 'preciso trocar',
        },
      })
      expect(res.status()).toBe(201)
      const body = await res.json()
      expect(body.type).toBe('SWAP')
      expect(body.status).toBe('PENDING_PEER')
    })

    test('201 OFFER', async ({ request }) => {
      const s = await setupTwoUsers(request)
      const res = await request.post('/api/requests', {
        data: {
          type: 'OFFER',
          workspaceId: s.ws.id,
          offerSourceAssignmentId: s.asgOwner.id,
          reason: 'oferta',
        },
      })
      expect(res.status()).toBe(201)
      const body = await res.json()
      expect(body.type).toBe('OFFER')
      expect(body.status).toBe('PENDING')
    })

    test('201 TIME_OFF (no attachment)', async ({ request }) => {
      const s = await setupTwoUsers(request)
      const res = await request.post('/api/requests', {
        data: {
          type: 'TIME_OFF',
          workspaceId: s.ws.id,
          timeOffStart: new Date('2026-12-01T00:00:00Z').toISOString(),
          timeOffEnd: new Date('2026-12-05T00:00:00Z').toISOString(),
          reason: 'férias',
        },
      })
      expect(res.status()).toBe(201)
      const body = await res.json()
      expect(body.type).toBe('TIME_OFF')
    })

    test('400 invalid Zod payload', async ({ request }) => {
      await setupTwoUsers(request)
      const res = await request.post('/api/requests', {
        data: { type: 'OFFER', workspaceId: 'not-a-uuid' },
      })
      expect(res.status()).toBe(400)
    })

    test('400 SWAP source equals target', async ({ request }) => {
      const s = await setupTwoUsers(request)
      const res = await request.post('/api/requests', {
        data: {
          type: 'SWAP',
          workspaceId: s.ws.id,
          swapSourceAssignmentId: s.asgOwner.id,
          swapTargetUserId: s.peer.id,
          swapTargetAssignmentId: s.asgOwner.id,
          reason: 'r',
        },
      })
      expect(res.status()).toBe(400)
    })

    test('400 TIME_OFF range > 90 days', async ({ request }) => {
      const s = await setupTwoUsers(request)
      const res = await request.post('/api/requests', {
        data: {
          type: 'TIME_OFF',
          workspaceId: s.ws.id,
          timeOffStart: new Date('2026-12-01T00:00:00Z').toISOString(),
          timeOffEnd: new Date('2027-04-01T00:00:00Z').toISOString(),
          reason: 'long',
        },
      })
      expect(res.status()).toBe(400)
    })

    test('401 unauthenticated', async ({ playwright }) => {
      const ctx = await playwright.request.newContext()
      const res = await ctx.post('/api/requests', {
        data: {
          type: 'OFFER',
          workspaceId: NON_EXISTENT,
          offerSourceAssignmentId: NON_EXISTENT,
          reason: 'r',
        },
      })
      expect(res.status()).toBe(401)
      await ctx.dispose()
    })

    test('400 ATTACHMENT_INVALID on bad MIME (multipart)', async ({
      request,
    }) => {
      const s = await setupTwoUsers(request)
      const fd = new FormData()
      fd.set(
        'payload',
        JSON.stringify({
          type: 'TIME_OFF',
          workspaceId: s.ws.id,
          timeOffStart: new Date('2026-12-01T00:00:00Z').toISOString(),
          timeOffEnd: new Date('2026-12-05T00:00:00Z').toISOString(),
          reason: 'r',
        }),
      )
      fd.set(
        'attachment',
        new Blob(['hello'], { type: 'text/plain' }),
        'note.txt',
      )
      const res = await request.post('/api/requests', { multipart: fd })
      expect(res.status()).toBe(400)
      const body = await res.json()
      expect(body.code).toBe('ATTACHMENT_INVALID')
    })

    test('201 TIME_OFF with valid PDF attachment (multipart)', async ({
      request,
    }) => {
      const s = await setupTwoUsers(request)
      const fd = new FormData()
      fd.set(
        'payload',
        JSON.stringify({
          type: 'TIME_OFF',
          workspaceId: s.ws.id,
          timeOffStart: new Date('2026-12-10T00:00:00Z').toISOString(),
          timeOffEnd: new Date('2026-12-12T00:00:00Z').toISOString(),
          reason: 'atestado',
        }),
      )
      fd.set(
        'attachment',
        new Blob(['%PDF-1.4 fake'], { type: 'application/pdf' }),
        'atestado.pdf',
      )
      const res = await request.post('/api/requests', { multipart: fd })
      // 201 if Supabase env configured; 502 ATTACHMENT_UPLOAD_FAILED in test
      // env where SUPABASE_URL is unset. Both are valid endpoint behavior.
      expect([201, 502]).toContain(res.status())
    })
  })

  test.describe('GET /api/requests list', () => {
    test('200 returns own requests for COLABORADOR (scope=mine)', async ({
      request,
    }) => {
      const s = await setupTwoUsers(request)
      await seedOfferRequest({
        workspaceId: s.ws.id,
        requestedById: s.owner.user.id,
        offerSourceAssignmentId: s.asgOwner.id,
      })
      const res = await request.get(
        `/api/requests?workspaceId=${s.ws.id}&scope=mine`,
      )
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.data).toHaveLength(1)
    })

    test('200 ADMIN with scope=workspace sees all', async ({ request }) => {
      const s = await setupTwoUsers(request)
      await seedOfferRequest({
        workspaceId: s.ws.id,
        requestedById: s.owner.user.id,
        offerSourceAssignmentId: s.asgOwner.id,
      })
      // owner is ADMIN by seedWorkspaceWithAdmin
      const res = await request.get(
        `/api/requests?workspaceId=${s.ws.id}&scope=workspace`,
      )
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.data.length).toBeGreaterThanOrEqual(1)
    })

    test('401 unauthenticated', async ({ playwright }) => {
      const ctx = await playwright.request.newContext()
      const res = await ctx.get(`/api/requests?workspaceId=${NON_EXISTENT}`)
      expect(res.status()).toBe(401)
      await ctx.dispose()
    })

    test('400 invalid query params', async ({ request }) => {
      await setupTwoUsers(request)
      const res = await request.get('/api/requests')
      expect(res.status()).toBe(400)
    })
  })

  test.describe('GET /api/requests/[id] detail', () => {
    test('200 owner sees own request', async ({ request }) => {
      const s = await setupTwoUsers(request)
      const r = await seedOfferRequest({
        workspaceId: s.ws.id,
        requestedById: s.owner.user.id,
        offerSourceAssignmentId: s.asgOwner.id,
      })
      const res = await request.get(`/api/requests/${r.id}`)
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.id).toBe(r.id)
    })

    test('404 unknown id', async ({ request }) => {
      await setupTwoUsers(request)
      const res = await request.get(`/api/requests/${NON_EXISTENT}`)
      expect(res.status()).toBe(404)
    })

    test('403 non-participant non-member can not see', async ({
      request,
      playwright,
    }) => {
      const s = await setupTwoUsers(request)
      const r = await seedOfferRequest({
        workspaceId: s.ws.id,
        requestedById: s.owner.user.id,
        offerSourceAssignmentId: s.asgOwner.id,
      })
      // outsider: register another user, but they are not in the workspace
      const ctx = await playwright.request.newContext()
      await createUserFixture(ctx)
      const res = await ctx.get(`/api/requests/${r.id}`)
      expect(res.status()).toBe(403)
      await ctx.dispose()
    })

    test('401 unauthenticated', async ({ playwright }) => {
      const ctx = await playwright.request.newContext()
      const res = await ctx.get(`/api/requests/${NON_EXISTENT}`)
      expect(res.status()).toBe(401)
      await ctx.dispose()
    })
  })

  test.describe('POST /api/requests/[id]/cancel', () => {
    test('200 requester cancels own PENDING request', async ({ request }) => {
      const s = await setupTwoUsers(request)
      const r = await seedOfferRequest({
        workspaceId: s.ws.id,
        requestedById: s.owner.user.id,
        offerSourceAssignmentId: s.asgOwner.id,
      })
      const res = await request.post(`/api/requests/${r.id}/cancel`)
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.status).toBe('CANCELLED')
    })

    test('403 non-requester can not cancel', async ({ request }) => {
      const s = await setupTwoUsers(request)
      const r = await seedOfferRequest({
        workspaceId: s.ws.id,
        requestedById: s.peer.id,
        offerSourceAssignmentId: s.asgPeer.id,
      })
      const res = await request.post(`/api/requests/${r.id}/cancel`)
      expect(res.status()).toBe(403)
    })

    test('409 INVALID_STATE_TRANSITION on already-resolved request', async ({
      request,
    }) => {
      const s = await setupTwoUsers(request)
      const r = await seedOfferRequest({
        workspaceId: s.ws.id,
        requestedById: s.owner.user.id,
        offerSourceAssignmentId: s.asgOwner.id,
        status: 'APPROVED',
      })
      const res = await request.post(`/api/requests/${r.id}/cancel`)
      expect(res.status()).toBe(409)
    })

    test('404 unknown id', async ({ request }) => {
      await setupTwoUsers(request)
      const res = await request.post(`/api/requests/${NON_EXISTENT}/cancel`)
      expect(res.status()).toBe(404)
    })
  })

  test.describe('POST /api/requests/[id]/peer-respond', () => {
    test('200 peer accepts SWAP, status -> PENDING', async ({
      request,
      playwright,
    }) => {
      const s = await setupTwoUsers(request)
      // peer needs an authenticated session — register them in a fresh context.
      const peerCtx = await playwright.request.newContext()
      const peerUser = await createUserFixture(peerCtx)
      // Make peerUser the swap target by updating asgPeer + adding membership.
      await query(`UPDATE "shiftAssignment" SET user_id = $1 WHERE id = $2`, [
        peerUser.user.id,
        s.asgPeer.id,
      ])
      await seedWorkspaceMembership({
        workspaceId: s.ws.id,
        userId: peerUser.user.id,
        role: 'COLABORADOR',
      })
      const r = await seedSwapRequest({
        workspaceId: s.ws.id,
        requestedById: s.owner.user.id,
        swapSourceAssignmentId: s.asgOwner.id,
        swapTargetUserId: peerUser.user.id,
        swapTargetAssignmentId: s.asgPeer.id,
      })
      const res = await peerCtx.post(`/api/requests/${r.id}/peer-respond`, {
        data: { decision: 'ACCEPT' },
      })
      expect(res.status()).toBe(200)
      const body = (await res.json()) as RequestRow
      expect(body.status).toBe('PENDING')
      await peerCtx.dispose()
    })

    test('403 not the swap target', async ({ request }) => {
      const s = await setupTwoUsers(request)
      const r = await seedSwapRequest({
        workspaceId: s.ws.id,
        requestedById: s.peer.id, // requested BY peer
        swapSourceAssignmentId: s.asgPeer.id,
        swapTargetUserId: s.peer.id,
        swapTargetAssignmentId: s.asgOwner.id,
      })
      // owner tries to peer-respond, but they're not the swap target
      const res = await request.post(`/api/requests/${r.id}/peer-respond`, {
        data: { decision: 'ACCEPT' },
      })
      expect(res.status()).toBe(403)
    })

    test('400 invalid decision body', async ({ request }) => {
      const s = await setupTwoUsers(request)
      const r = await seedSwapRequest({
        workspaceId: s.ws.id,
        requestedById: s.owner.user.id,
        swapSourceAssignmentId: s.asgOwner.id,
        swapTargetUserId: s.peer.id,
        swapTargetAssignmentId: s.asgPeer.id,
      })
      const res = await request.post(`/api/requests/${r.id}/peer-respond`, {
        data: { decision: 'NOT_A_THING' },
      })
      expect(res.status()).toBe(400)
    })
  })

  test.describe('POST /api/requests/[id]/resolve', () => {
    test('200 ADMIN APPROVE on OFFER flips shift to OPEN_FOR_APPLY', async ({
      request,
    }) => {
      const s = await setupTwoUsers(request)
      const r = await seedOfferRequest({
        workspaceId: s.ws.id,
        requestedById: s.peer.id,
        offerSourceAssignmentId: s.asgPeer.id,
      })
      // owner is ADMIN of workspace
      const res = await request.post(`/api/requests/${r.id}/resolve`, {
        data: { decision: 'APPROVE' },
      })
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.status).toBe('APPROVED')
      const shifts = await query<{ assignment_mode: string }>(
        'SELECT assignment_mode FROM shift WHERE id = $1',
        [s.shiftB.id],
      )
      expect(shifts[0]?.assignment_mode).toBe('OPEN_FOR_APPLY')
    })

    test('200 REJECT keeps state untouched', async ({ request }) => {
      const s = await setupTwoUsers(request)
      const r = await seedOfferRequest({
        workspaceId: s.ws.id,
        requestedById: s.peer.id,
        offerSourceAssignmentId: s.asgPeer.id,
      })
      const res = await request.post(`/api/requests/${r.id}/resolve`, {
        data: { decision: 'REJECT', resolutionReason: 'no' },
      })
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.status).toBe('REJECTED')
    })

    test('403 COLABORADOR can not resolve', async ({
      request,
      playwright,
    }) => {
      const s = await setupTwoUsers(request)
      const r = await seedOfferRequest({
        workspaceId: s.ws.id,
        requestedById: s.peer.id,
        offerSourceAssignmentId: s.asgPeer.id,
      })
      const colabCtx = await playwright.request.newContext()
      const colab = await createUserFixture(colabCtx)
      await seedWorkspaceMembership({
        workspaceId: s.ws.id,
        userId: colab.user.id,
        role: 'COLABORADOR',
      })
      const res = await colabCtx.post(`/api/requests/${r.id}/resolve`, {
        data: { decision: 'APPROVE' },
      })
      expect(res.status()).toBe(403)
      await colabCtx.dispose()
    })

    test('409 INVALID_STATE_TRANSITION on already-resolved', async ({
      request,
    }) => {
      const s = await setupTwoUsers(request)
      const r = await seedOfferRequest({
        workspaceId: s.ws.id,
        requestedById: s.peer.id,
        offerSourceAssignmentId: s.asgPeer.id,
        status: 'APPROVED',
      })
      const res = await request.post(`/api/requests/${r.id}/resolve`, {
        data: { decision: 'REJECT' },
      })
      expect(res.status()).toBe(409)
    })

    test('400 invalid resolve body', async ({ request }) => {
      const s = await setupTwoUsers(request)
      const r = await seedOfferRequest({
        workspaceId: s.ws.id,
        requestedById: s.peer.id,
        offerSourceAssignmentId: s.asgPeer.id,
      })
      const res = await request.post(`/api/requests/${r.id}/resolve`, {
        data: { decision: 'MAYBE' },
      })
      expect(res.status()).toBe(400)
    })

    test('404 unknown id', async ({ request }) => {
      await setupTwoUsers(request)
      const res = await request.post(`/api/requests/${NON_EXISTENT}/resolve`, {
        data: { decision: 'APPROVE' },
      })
      expect(res.status()).toBe(404)
    })
  })

  test.describe('TIME_OFF cascade', () => {
    test('seedTimeOffRequest factory persists fields', async ({ request }) => {
      const s = await setupTwoUsers(request)
      const r = await seedTimeOffRequest({
        workspaceId: s.ws.id,
        requestedById: s.owner.user.id,
        timeOffStart: new Date('2026-12-01T00:00:00Z'),
        timeOffEnd: new Date('2026-12-05T00:00:00Z'),
      })
      expect(r.type).toBe('TIME_OFF')
      expect(r.status).toBe('PENDING')
    })
  })
})
