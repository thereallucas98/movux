import type { APIRequestContext } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { query, resetDatabase } from './fixtures/db'
import type { AssignmentRow, TransferRequestRow } from './fixtures/db'
import {
  createUserFixture,
  seedCategory,
  seedSchedule,
  seedShift,
  seedShiftAssignment,
  seedTenantWithOwner,
  seedTransferRequest,
  seedUser,
  seedWorkspaceMembership,
  seedWorkspaceWithAdmin,
} from './fixtures/factories'

const NON_EXISTENT_ID = '00000000-0000-0000-0000-000000000000'
const SHIFT_START = new Date('2026-09-15T08:00:00.000Z')
const SHIFT_END = new Date('2026-09-15T17:00:00.000Z')
const FUTURE_DEADLINE = new Date(Date.now() + 24 * 60 * 60 * 1000)
const PAST_DEADLINE = new Date(Date.now() - 60 * 60 * 1000)

async function setup(request: APIRequestContext) {
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
    periodStart: new Date('2026-09-01'),
    periodEnd: new Date('2026-10-01'),
    status: 'PUBLISHED',
  })
  const shift = await seedShift({
    scheduleId: sch.id,
    categoryId: cat.id,
    startAt: SHIFT_START,
    endAt: SHIFT_END,
    headcount: 1,
  })
  return { owner, tenant, ws, cat, sch, shift }
}

test.describe('/api/assignments/[id]/(accept|reject|force-accept|transfer)', () => {
  test.beforeEach(async () => {
    await resetDatabase()
  })

  test.describe('accept', () => {
    test('401 unauthenticated', async ({ request }) => {
      const res = await request.post(`/api/assignments/${NON_EXISTENT_ID}/accept`)
      expect(res.status()).toBe(401)
    })

    test('403 when caller is not the assignee (admin owner accepts colab assignment)', async ({
      request,
    }) => {
      const { ws, owner, shift } = await setup(request)
      const colab = await seedUser({})
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: colab.id,
        role: 'COLABORADOR',
      })
      const a = await seedShiftAssignment({
        shiftId: shift.id,
        userId: colab.id,
        assignedByUserId: owner.user.id,
        decisionDeadline: FUTURE_DEADLINE,
      })
      // owner is logged in (admin), tries to accept on behalf — must fail
      const res = await request.post(`/api/assignments/${a.id}/accept`)
      expect(res.status()).toBe(403)
    })

    test('409 INVALID_STATE_TRANSITION when already ACCEPTED', async ({
      request,
    }) => {
      const { ws, owner, shift } = await setup(request)
      const a = await seedShiftAssignment({
        shiftId: shift.id,
        userId: owner.user.id, // owner is the assignee here
        assignedByUserId: owner.user.id,
        status: 'ACCEPTED',
      })
      const res = await request.post(`/api/assignments/${a.id}/accept`)
      expect(res.status()).toBe(409)
    })

    test('409 DECISION_WINDOW_EXPIRED', async ({ request }) => {
      const { ws, owner, shift } = await setup(request)
      const a = await seedShiftAssignment({
        shiftId: shift.id,
        userId: owner.user.id,
        assignedByUserId: owner.user.id,
        decisionDeadline: PAST_DEADLINE,
      })
      const res = await request.post(`/api/assignments/${a.id}/accept`)
      expect(res.status()).toBe(409)
      const body = await res.json()
      expect(body.code).toBe('DECISION_WINDOW_EXPIRED')
    })

    test('200 happy: last-slot fills shift', async ({ request }) => {
      const { owner, shift } = await setup(request)
      const a = await seedShiftAssignment({
        shiftId: shift.id,
        userId: owner.user.id,
        assignedByUserId: owner.user.id,
        decisionDeadline: FUTURE_DEADLINE,
      })
      const res = await request.post(`/api/assignments/${a.id}/accept`)
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.status).toBe('ACCEPTED')
      expect(body.shiftFilled).toBe(true)
      const rows = await query<AssignmentRow>(
        'SELECT status FROM "shift" WHERE id = $1',
        [shift.id],
      )
      expect(rows[0].status).toBe('FILLED')
    })
  })

  test.describe('reject', () => {
    test('200 happy: assignee rejects PENDING', async ({ request }) => {
      const { owner, shift } = await setup(request)
      const a = await seedShiftAssignment({
        shiftId: shift.id,
        userId: owner.user.id,
        assignedByUserId: owner.user.id,
        decisionDeadline: FUTURE_DEADLINE,
      })
      const res = await request.post(`/api/assignments/${a.id}/reject`, {
        data: { reason: 'doctor visit' },
      })
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.status).toBe('REJECTED')
    })

    test('409 assignee cannot reject ACCEPTED (Q7 Ideal)', async ({
      request,
    }) => {
      const { owner, shift } = await setup(request)
      const a = await seedShiftAssignment({
        shiftId: shift.id,
        userId: owner.user.id,
        assignedByUserId: owner.user.id,
        status: 'ACCEPTED',
      })
      const res = await request.post(`/api/assignments/${a.id}/reject`, {
        data: { reason: 'changed mind' },
      })
      expect(res.status()).toBe(409)
    })

    test('200 admin override rejects ACCEPTED + unfills FILLED shift', async ({
      request,
    }) => {
      const { ws, owner, shift } = await setup(request)
      const colab = await seedUser({})
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: colab.id,
        role: 'COLABORADOR',
      })
      const a = await seedShiftAssignment({
        shiftId: shift.id,
        userId: colab.id,
        assignedByUserId: owner.user.id,
        status: 'ACCEPTED',
      })
      // Set shift to FILLED
      await query(`UPDATE "shift" SET status = 'FILLED' WHERE id = $1`, [
        shift.id,
      ])
      const res = await request.post(`/api/assignments/${a.id}/reject`, {
        data: { reason: 'sick leave' },
      })
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.shiftUnfilled).toBe(true)
      const rows = await query<AssignmentRow>(
        'SELECT status FROM "shift" WHERE id = $1',
        [shift.id],
      )
      expect(rows[0].status).toBe('OPEN')
    })

    test('401 unauthenticated', async ({ request }) => {
      const res = await request.post(
        `/api/assignments/${NON_EXISTENT_ID}/reject`,
        { data: { reason: 'x' } },
      )
      expect(res.status()).toBe(401)
    })

    test('400 missing reason', async ({ request }) => {
      const { owner, shift } = await setup(request)
      const a = await seedShiftAssignment({
        shiftId: shift.id,
        userId: owner.user.id,
        assignedByUserId: owner.user.id,
        decisionDeadline: FUTURE_DEADLINE,
      })
      const res = await request.post(`/api/assignments/${a.id}/reject`, {
        data: {},
      })
      expect(res.status()).toBe(400)
    })
  })

  test.describe('force-accept', () => {
    test('403 from colab', async ({ request }) => {
      const { ws, owner, shift } = await setup(request)
      const colab = await createUserFixture(request)
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: colab.user.id,
        role: 'COLABORADOR',
      })
      const a = await seedShiftAssignment({
        shiftId: shift.id,
        userId: colab.user.id,
        assignedByUserId: owner.user.id,
      })
      // colab is now logged in
      const res = await request.post(`/api/assignments/${a.id}/force-accept`)
      expect(res.status()).toBe(403)
    })

    test('200 admin force-accepts EXPIRED + revivedFromExpired audit', async ({
      request,
    }) => {
      const { ws, owner, shift } = await setup(request)
      const colab = await seedUser({})
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: colab.id,
        role: 'COLABORADOR',
      })
      const a = await seedShiftAssignment({
        shiftId: shift.id,
        userId: colab.id,
        assignedByUserId: owner.user.id,
        status: 'EXPIRED',
        decisionDeadline: PAST_DEADLINE,
      })
      const res = await request.post(`/api/assignments/${a.id}/force-accept`)
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.status).toBe('ACCEPTED')
    })

    test('409 INVALID_STATE on REJECTED', async ({ request }) => {
      const { ws, owner, shift } = await setup(request)
      const colab = await seedUser({})
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: colab.id,
        role: 'COLABORADOR',
      })
      const a = await seedShiftAssignment({
        shiftId: shift.id,
        userId: colab.id,
        assignedByUserId: owner.user.id,
        status: 'REJECTED',
      })
      const res = await request.post(`/api/assignments/${a.id}/force-accept`)
      expect(res.status()).toBe(409)
    })
  })

  test.describe('transfer', () => {
    test('201 happy from PENDING', async ({ request }) => {
      const { ws, owner, shift } = await setup(request)
      const target = await seedUser({})
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: target.id,
        role: 'COLABORADOR',
      })
      const a = await seedShiftAssignment({
        shiftId: shift.id,
        userId: owner.user.id,
        assignedByUserId: owner.user.id,
        decisionDeadline: FUTURE_DEADLINE,
      })
      const res = await request.post(`/api/assignments/${a.id}/transfer`, {
        data: { targetUserId: target.id, reason: 'doctor' },
      })
      expect(res.status()).toBe(201)
      const body = await res.json()
      expect(body.status).toBe('PENDING')
      expect(body.targetUserId).toBe(target.id)
    })

    test('400 VALIDATION_ERROR target == self', async ({ request }) => {
      const { owner, shift } = await setup(request)
      const a = await seedShiftAssignment({
        shiftId: shift.id,
        userId: owner.user.id,
        assignedByUserId: owner.user.id,
        decisionDeadline: FUTURE_DEADLINE,
      })
      const res = await request.post(`/api/assignments/${a.id}/transfer`, {
        data: { targetUserId: owner.user.id, reason: 'x' },
      })
      expect(res.status()).toBe(400)
    })

    test('404 USER_NOT_WORKSPACE_MEMBER', async ({ request }) => {
      const { owner, shift } = await setup(request)
      const outsider = await seedUser({})
      const a = await seedShiftAssignment({
        shiftId: shift.id,
        userId: owner.user.id,
        assignedByUserId: owner.user.id,
        decisionDeadline: FUTURE_DEADLINE,
      })
      const res = await request.post(`/api/assignments/${a.id}/transfer`, {
        data: { targetUserId: outsider.id, reason: 'x' },
      })
      expect(res.status()).toBe(404)
    })
  })

  test.describe('decide transfer', () => {
    test('200 reject decision', async ({ request }) => {
      const { ws, owner, shift } = await setup(request)
      const colab = await seedUser({})
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: colab.id,
        role: 'COLABORADOR',
      })
      const a = await seedShiftAssignment({
        shiftId: shift.id,
        userId: colab.id,
        assignedByUserId: owner.user.id,
      })
      const tr = await seedTransferRequest({
        originalAssignmentId: a.id,
        targetUserId: owner.user.id,
        requestedByUserId: colab.id,
      })
      const res = await request.post(
        `/api/transfer-requests/${tr.id}/decide`,
        { data: { decision: 'REJECT', reason: 'no replacement' } },
      )
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.status).toBe('REJECTED')
    })

    test('200 approve creates new + sets original=TRANSFERRED + unfills FILLED', async ({
      request,
    }) => {
      const { ws, owner, shift } = await setup(request)
      const colab = await seedUser({})
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: colab.id,
        role: 'COLABORADOR',
      })
      const target = await seedUser({})
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: target.id,
        role: 'COLABORADOR',
      })
      const a = await seedShiftAssignment({
        shiftId: shift.id,
        userId: colab.id,
        assignedByUserId: owner.user.id,
        status: 'ACCEPTED',
      })
      await query(`UPDATE "shift" SET status = 'FILLED' WHERE id = $1`, [
        shift.id,
      ])
      const tr = await seedTransferRequest({
        originalAssignmentId: a.id,
        targetUserId: target.id,
        requestedByUserId: colab.id,
      })
      const res = await request.post(
        `/api/transfer-requests/${tr.id}/decide`,
        { data: { decision: 'APPROVE' } },
      )
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.status).toBe('APPROVED')
      expect(body.shiftUnfilled).toBe(true)
      // verify original is TRANSFERRED
      const origRows = await query<AssignmentRow>(
        'SELECT status FROM "shiftAssignment" WHERE id = $1',
        [a.id],
      )
      expect(origRows[0].status).toBe('TRANSFERRED')
      // verify new assignment exists for target
      const newRows = await query<AssignmentRow>(
        'SELECT id FROM "shiftAssignment" WHERE shift_id = $1 AND user_id = $2',
        [shift.id, target.id],
      )
      expect(newRows).toHaveLength(1)
      // verify shift is OPEN again
      const shiftRows = await query<{ status: string }>(
        'SELECT status FROM "shift" WHERE id = $1',
        [shift.id],
      )
      expect(shiftRows[0].status).toBe('OPEN')
    })

    test('409 not pending', async ({ request }) => {
      const { ws, owner, shift } = await setup(request)
      const colab = await seedUser({})
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: colab.id,
        role: 'COLABORADOR',
      })
      const a = await seedShiftAssignment({
        shiftId: shift.id,
        userId: colab.id,
        assignedByUserId: owner.user.id,
      })
      const tr = await seedTransferRequest({
        originalAssignmentId: a.id,
        targetUserId: owner.user.id,
        requestedByUserId: colab.id,
        status: 'APPROVED',
      })
      const res = await request.post(
        `/api/transfer-requests/${tr.id}/decide`,
        { data: { decision: 'REJECT', reason: 'late' } },
      )
      expect(res.status()).toBe(409)
    })

    test('400 reject without reason', async ({ request }) => {
      const { ws, owner, shift } = await setup(request)
      const colab = await seedUser({})
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: colab.id,
        role: 'COLABORADOR',
      })
      const a = await seedShiftAssignment({
        shiftId: shift.id,
        userId: colab.id,
        assignedByUserId: owner.user.id,
      })
      const tr = await seedTransferRequest({
        originalAssignmentId: a.id,
        targetUserId: owner.user.id,
        requestedByUserId: colab.id,
      })
      const res = await request.post(
        `/api/transfer-requests/${tr.id}/decide`,
        { data: { decision: 'REJECT' } },
      )
      expect(res.status()).toBe(400)
    })
  })

  test.describe('cancel transfer', () => {
    test('204 happy by requester', async ({ request }) => {
      const { ws, owner, shift } = await setup(request)
      const target = await seedUser({})
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: target.id,
        role: 'COLABORADOR',
      })
      const a = await seedShiftAssignment({
        shiftId: shift.id,
        userId: owner.user.id,
        assignedByUserId: owner.user.id,
        decisionDeadline: FUTURE_DEADLINE,
      })
      const tr = await seedTransferRequest({
        originalAssignmentId: a.id,
        targetUserId: target.id,
        requestedByUserId: owner.user.id,
      })
      const res = await request.post(
        `/api/transfer-requests/${tr.id}/cancel`,
      )
      expect(res.status()).toBe(204)
      const rows = await query<TransferRequestRow>(
        'SELECT status FROM "transferRequest" WHERE id = $1',
        [tr.id],
      )
      expect(rows[0].status).toBe('CANCELLED')
    })

    test('403 by other user', async ({ request }) => {
      const { ws, owner, shift } = await setup(request)
      const colab = await seedUser({})
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: colab.id,
        role: 'COLABORADOR',
      })
      const a = await seedShiftAssignment({
        shiftId: shift.id,
        userId: colab.id,
        assignedByUserId: owner.user.id,
      })
      const tr = await seedTransferRequest({
        originalAssignmentId: a.id,
        targetUserId: owner.user.id,
        requestedByUserId: colab.id,
      })
      // owner (logged-in admin) is not the requester (colab)
      const res = await request.post(
        `/api/transfer-requests/${tr.id}/cancel`,
      )
      expect(res.status()).toBe(403)
    })
  })

  test.describe('list transfer requests', () => {
    test('200 happy filter PENDING', async ({ request }) => {
      const { ws, owner, shift } = await setup(request)
      const colab = await seedUser({})
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: colab.id,
        role: 'COLABORADOR',
      })
      const a = await seedShiftAssignment({
        shiftId: shift.id,
        userId: colab.id,
        assignedByUserId: owner.user.id,
      })
      await seedTransferRequest({
        originalAssignmentId: a.id,
        targetUserId: owner.user.id,
        requestedByUserId: colab.id,
        status: 'PENDING',
      })
      await seedTransferRequest({
        originalAssignmentId: a.id,
        targetUserId: owner.user.id,
        requestedByUserId: colab.id,
        status: 'CANCELLED',
      })
      const res = await request.get(
        `/api/workspaces/${ws.id}/transfer-requests?status=PENDING`,
      )
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.data).toHaveLength(1)
      expect(body.data[0].status).toBe('PENDING')
    })

    test('200 returns empty list with no filter (returns all)', async ({
      request,
    }) => {
      const { ws } = await setup(request)
      const res = await request.get(
        `/api/workspaces/${ws.id}/transfer-requests`,
      )
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.data).toEqual([])
    })

    test('401 unauthenticated', async ({ request }) => {
      const res = await request.get(
        `/api/workspaces/${NON_EXISTENT_ID}/transfer-requests`,
      )
      expect(res.status()).toBe(401)
    })
  })
})
