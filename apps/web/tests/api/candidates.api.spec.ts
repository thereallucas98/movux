import type { APIRequestContext } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { query, resetDatabase } from './fixtures/db'
import type { AssignmentRow, ShiftCandidateRow } from './fixtures/db'
import {
  createUserFixture,
  seedCategory,
  seedSchedule,
  seedShift,
  seedShiftAssignment,
  seedShiftCandidate,
  seedTenantWithOwner,
  seedUser,
  seedWorkspaceMembership,
  seedWorkspaceWithAdmin,
} from './fixtures/factories'

const NON_EXISTENT_ID = '00000000-0000-0000-0000-000000000000'
const SHIFT_START = new Date('2026-10-15T08:00:00.000Z')
const SHIFT_END = new Date('2026-10-15T17:00:00.000Z')

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
    periodStart: new Date('2026-10-01'),
    periodEnd: new Date('2026-11-01'),
    status: 'PUBLISHED',
  })
  const shift = await seedShift({
    scheduleId: sch.id,
    categoryId: cat.id,
    startAt: SHIFT_START,
    endAt: SHIFT_END,
    headcount: 1,
    assignmentMode: 'OPEN_FOR_APPLY',
  })
  return { owner, tenant, ws, cat, sch, shift }
}

test.describe('/api/shifts/[id]/(apply|candidates) + /api/candidates/[id]/...', () => {
  test.beforeEach(async () => {
    await resetDatabase()
  })

  test.describe('apply', () => {
    test('201 creates candidate with position 1', async ({ request }) => {
      const { owner, shift } = await setup(request)
      const res = await request.post(`/api/shifts/${shift.id}/apply`)
      expect(res.status()).toBe(201)
      const body = await res.json()
      expect(body.queuePosition).toBe(1)
      expect(body.status).toBe('QUEUED')
      expect(body.userId).toBe(owner.user.id)
    })

    test('401 unauthenticated', async ({ request }) => {
      const res = await request.post(`/api/shifts/${NON_EXISTENT_ID}/apply`)
      expect(res.status()).toBe(401)
    })

    test('409 INVALID_STATE_TRANSITION when shift is DIRECT_ASSIGN', async ({
      request,
    }) => {
      const { ws, cat, sch } = await setup(request)
      const directShift = await seedShift({
        scheduleId: sch.id,
        categoryId: cat.id,
        startAt: new Date('2026-10-16T08:00:00Z'),
        endAt: new Date('2026-10-16T17:00:00Z'),
        headcount: 1,
        assignmentMode: 'DIRECT_ASSIGN',
      })
      void ws
      const res = await request.post(`/api/shifts/${directShift.id}/apply`)
      expect(res.status()).toBe(409)
      const body = await res.json()
      expect(body.code).toBe('INVALID_STATE_TRANSITION')
    })

    test('409 ALREADY_EXISTS on second apply', async ({ request }) => {
      const { shift } = await setup(request)
      const first = await request.post(`/api/shifts/${shift.id}/apply`)
      expect(first.status()).toBe(201)
      const second = await request.post(`/api/shifts/${shift.id}/apply`)
      expect(second.status()).toBe(409)
      const body = await second.json()
      expect(body.code).toBe('ALREADY_EXISTS')
    })

    test('409 SHIFT_OVERLAP_CONFLICT', async ({ request }) => {
      const { ws, owner, cat, sch, shift } = await setup(request)
      // Owner has overlapping ACCEPTED in same time
      const overlap = await seedShift({
        scheduleId: sch.id,
        categoryId: cat.id,
        startAt: new Date('2026-10-15T10:00:00Z'),
        endAt: new Date('2026-10-15T19:00:00Z'),
        headcount: 1,
      })
      await seedShiftAssignment({
        shiftId: overlap.id,
        userId: owner.user.id,
        assignedByUserId: owner.user.id,
        status: 'ACCEPTED',
      })
      void ws
      const res = await request.post(`/api/shifts/${shift.id}/apply`)
      expect(res.status()).toBe(409)
      expect((await res.json()).code).toBe('SHIFT_OVERLAP_CONFLICT')
    })
  })

  test.describe('list candidates (admin only)', () => {
    test('200 ADMIN sees all', async ({ request }) => {
      const { ws, owner, shift } = await setup(request)
      const c1 = await seedUser({})
      const c2 = await seedUser({})
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: c1.id,
        role: 'COLABORADOR',
      })
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: c2.id,
        role: 'COLABORADOR',
      })
      await seedShiftCandidate({
        shiftId: shift.id,
        userId: c1.id,
        queuePosition: 1,
      })
      await seedShiftCandidate({
        shiftId: shift.id,
        userId: c2.id,
        queuePosition: 2,
      })
      void owner
      const res = await request.get(`/api/shifts/${shift.id}/candidates`)
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body).toHaveLength(2)
      expect(body[0].queuePosition).toBe(1)
    })

    test('200 with status filter', async ({ request }) => {
      const { ws, shift } = await setup(request)
      const c1 = await seedUser({})
      const c2 = await seedUser({})
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: c1.id,
        role: 'COLABORADOR',
      })
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: c2.id,
        role: 'COLABORADOR',
      })
      await seedShiftCandidate({
        shiftId: shift.id,
        userId: c1.id,
        queuePosition: 1,
        status: 'QUEUED',
      })
      await seedShiftCandidate({
        shiftId: shift.id,
        userId: c2.id,
        queuePosition: 2,
        status: 'WITHDRAWN',
      })
      const res = await request.get(
        `/api/shifts/${shift.id}/candidates?status=QUEUED`,
      )
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body).toHaveLength(1)
      expect(body[0].status).toBe('QUEUED')
    })

    test('401 unauthenticated', async ({ request }) => {
      const res = await request.get(
        `/api/shifts/${NON_EXISTENT_ID}/candidates`,
      )
      expect(res.status()).toBe(401)
    })
  })

  test.describe('me + count', () => {
    test('200 /me with null fields when no candidacy + count', async ({
      request,
    }) => {
      const { shift } = await setup(request)
      const res = await request.get(`/api/shifts/${shift.id}/candidates/me`)
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.candidateId).toBeNull()
      expect(body.position).toBeNull()
      expect(body.status).toBeNull()
      expect(body.count).toBe(0)
    })

    test('200 /me with applicant data', async ({ request }) => {
      const { shift } = await setup(request)
      // owner applies
      await request.post(`/api/shifts/${shift.id}/apply`)
      const res = await request.get(`/api/shifts/${shift.id}/candidates/me`)
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.candidateId).not.toBeNull()
      expect(body.position).toBe(1)
      expect(body.status).toBe('QUEUED')
      expect(body.count).toBe(1)
    })

    test('200 /count returns 0 for empty queue', async ({ request }) => {
      const { shift } = await setup(request)
      const res = await request.get(
        `/api/shifts/${shift.id}/candidates/count`,
      )
      expect(res.status()).toBe(200)
      expect((await res.json()).count).toBe(0)
    })

    test('200 /count after apply returns 1', async ({ request }) => {
      const { shift } = await setup(request)
      await request.post(`/api/shifts/${shift.id}/apply`)
      const res = await request.get(
        `/api/shifts/${shift.id}/candidates/count`,
      )
      expect((await res.json()).count).toBe(1)
    })
  })

  test.describe('approve', () => {
    test('200 autoAccept=false → PENDING_ACCEPT assignment', async ({
      request,
    }) => {
      const { ws, owner, shift } = await setup(request)
      const colab = await seedUser({})
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: colab.id,
        role: 'COLABORADOR',
      })
      const c = await seedShiftCandidate({
        shiftId: shift.id,
        userId: colab.id,
        queuePosition: 1,
      })
      void owner
      const res = await request.post(`/api/candidates/${c.id}/approve`, {
        data: {},
      })
      expect(res.status()).toBe(200)
      const rows = await query<AssignmentRow>(
        'SELECT * FROM "shiftAssignment" WHERE shift_id = $1 AND user_id = $2',
        [shift.id, colab.id],
      )
      expect(rows).toHaveLength(1)
      expect(rows[0].status).toBe('PENDING_ACCEPT')
    })

    test('200 autoAccept=true → ACCEPTED + auto-FILL', async ({ request }) => {
      const { ws, owner, shift } = await setup(request)
      const colab = await seedUser({})
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: colab.id,
        role: 'COLABORADOR',
      })
      const c = await seedShiftCandidate({
        shiftId: shift.id,
        userId: colab.id,
        queuePosition: 1,
      })
      void owner
      const res = await request.post(`/api/candidates/${c.id}/approve`, {
        data: { autoAccept: true },
      })
      expect(res.status()).toBe(200)
      const aRows = await query<AssignmentRow>(
        'SELECT * FROM "shiftAssignment" WHERE shift_id = $1',
        [shift.id],
      )
      expect(aRows[0].status).toBe('ACCEPTED')
      const sRows = await query<{ status: string }>(
        'SELECT status FROM "shift" WHERE id = $1',
        [shift.id],
      )
      expect(sRows[0].status).toBe('FILLED')
    })

    test('409 SHIFT_HEADCOUNT_FULL', async ({ request }) => {
      const { ws, owner, shift } = await setup(request)
      const filler = await seedUser({})
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: filler.id,
        role: 'COLABORADOR',
      })
      await seedShiftAssignment({
        shiftId: shift.id,
        userId: filler.id,
        assignedByUserId: owner.user.id,
        status: 'ACCEPTED',
      })
      const colab = await seedUser({})
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: colab.id,
        role: 'COLABORADOR',
      })
      const c = await seedShiftCandidate({
        shiftId: shift.id,
        userId: colab.id,
        queuePosition: 1,
      })
      const res = await request.post(`/api/candidates/${c.id}/approve`, {
        data: {},
      })
      expect(res.status()).toBe(409)
      expect((await res.json()).code).toBe('SHIFT_HEADCOUNT_FULL')
    })

    test('409 INVALID_STATE_TRANSITION when not QUEUED', async ({ request }) => {
      const { ws, owner, shift } = await setup(request)
      const colab = await seedUser({})
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: colab.id,
        role: 'COLABORADOR',
      })
      const c = await seedShiftCandidate({
        shiftId: shift.id,
        userId: colab.id,
        status: 'WITHDRAWN',
      })
      void owner
      const res = await request.post(`/api/candidates/${c.id}/approve`, {
        data: {},
      })
      expect(res.status()).toBe(409)
    })

    test('401 unauthenticated', async ({ request }) => {
      const res = await request.post(
        `/api/candidates/${NON_EXISTENT_ID}/approve`,
        { data: {} },
      )
      expect(res.status()).toBe(401)
    })
  })

  test.describe('reject', () => {
    test('200 happy with reason', async ({ request }) => {
      const { ws, owner, shift } = await setup(request)
      const colab = await seedUser({})
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: colab.id,
        role: 'COLABORADOR',
      })
      const c = await seedShiftCandidate({
        shiftId: shift.id,
        userId: colab.id,
        queuePosition: 1,
      })
      void owner
      const res = await request.post(`/api/candidates/${c.id}/reject`, {
        data: { reason: 'overqualified' },
      })
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.status).toBe('REJECTED')
    })

    test('400 missing reason', async ({ request }) => {
      const { ws, owner, shift } = await setup(request)
      const colab = await seedUser({})
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: colab.id,
        role: 'COLABORADOR',
      })
      const c = await seedShiftCandidate({
        shiftId: shift.id,
        userId: colab.id,
      })
      void owner
      const res = await request.post(`/api/candidates/${c.id}/reject`, {
        data: {},
      })
      expect(res.status()).toBe(400)
    })

    test('409 not QUEUED', async ({ request }) => {
      const { ws, shift } = await setup(request)
      const colab = await seedUser({})
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: colab.id,
        role: 'COLABORADOR',
      })
      const c = await seedShiftCandidate({
        shiftId: shift.id,
        userId: colab.id,
        status: 'WITHDRAWN',
      })
      const res = await request.post(`/api/candidates/${c.id}/reject`, {
        data: { reason: 'late' },
      })
      expect(res.status()).toBe(409)
    })
  })

  test.describe('withdraw', () => {
    test('204 happy by owner', async ({ request }) => {
      const { shift } = await setup(request)
      const apply = await request.post(`/api/shifts/${shift.id}/apply`)
      const candidate = await apply.json()
      const res = await request.post(
        `/api/candidates/${candidate.id}/withdraw`,
      )
      expect(res.status()).toBe(204)
      const rows = await query<ShiftCandidateRow>(
        'SELECT status FROM "shiftCandidate" WHERE id = $1',
        [candidate.id],
      )
      expect(rows[0].status).toBe('WITHDRAWN')
    })

    test('403 by other user', async ({ request }) => {
      const { ws, owner, shift } = await setup(request)
      const colab = await seedUser({})
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: colab.id,
        role: 'COLABORADOR',
      })
      const c = await seedShiftCandidate({
        shiftId: shift.id,
        userId: colab.id,
        queuePosition: 1,
      })
      // owner is logged in but not the candidate owner
      void owner
      const res = await request.post(`/api/candidates/${c.id}/withdraw`)
      expect(res.status()).toBe(403)
    })

    test('409 not QUEUED', async ({ request }) => {
      const { owner, shift } = await setup(request)
      const c = await seedShiftCandidate({
        shiftId: shift.id,
        userId: owner.user.id,
        status: 'APPROVED',
      })
      const res = await request.post(`/api/candidates/${c.id}/withdraw`)
      expect(res.status()).toBe(409)
    })
  })

  test.describe('mode mutual exclusion', () => {
    test('assignUsersToShift blocked on OPEN_FOR_APPLY shift', async ({
      request,
    }) => {
      const { ws, owner, sch, shift } = await setup(request)
      void owner
      const res = await request.post(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/shifts/${shift.id}/assignments`,
        { data: { userIds: [owner.user.id] } },
      )
      expect(res.status()).toBe(409)
      expect((await res.json()).code).toBe('INVALID_STATE_TRANSITION')
    })

    test('updateShift mode-change blocked with QUEUED candidates (RQ8)', async ({
      request,
    }) => {
      const { ws, cat, owner } = await setup(request)
      // Use DRAFT schedule for updateShift validation
      const draftSch = await seedSchedule({
        workspaceId: ws.id,
        categoryId: cat.id,
        periodStart: new Date('2026-11-01'),
        periodEnd: new Date('2026-12-01'),
        status: 'DRAFT',
      })
      const draftShift = await seedShift({
        scheduleId: draftSch.id,
        categoryId: cat.id,
        startAt: new Date('2026-11-15T08:00:00Z'),
        endAt: new Date('2026-11-15T17:00:00Z'),
        headcount: 1,
        assignmentMode: 'OPEN_FOR_APPLY',
      })
      const colab = await seedUser({})
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: colab.id,
        role: 'COLABORADOR',
      })
      await seedShiftCandidate({
        shiftId: draftShift.id,
        userId: colab.id,
        queuePosition: 1,
      })
      void owner
      const res = await request.patch(
        `/api/workspaces/${ws.id}/schedules/${draftSch.id}/shifts/${draftShift.id}`,
        { data: { assignmentMode: 'DIRECT_ASSIGN' } },
      )
      expect(res.status()).toBe(409)
      expect((await res.json()).code).toBe('INVALID_STATE_TRANSITION')
    })
  })
})
