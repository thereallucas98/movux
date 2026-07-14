import type { APIRequestContext } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { query, resetDatabase } from './fixtures/db'
import type { AssignmentRow } from './fixtures/db'
import {
  createUserFixture,
  seedCategory,
  seedSchedule,
  seedShift,
  seedShiftExpectedComposition,
  seedShiftAssignment,
  seedSpecialty,
  seedTenantWithOwner,
  seedUser,
  seedUserSpecialty,
  seedWorkspaceMembership,
  seedWorkspaceWithAdmin,
} from './fixtures/factories'

const NON_EXISTENT_ID = '00000000-0000-0000-0000-000000000000'
const SHIFT_START = new Date('2026-07-13T08:00:00.000Z')
const SHIFT_END = new Date('2026-07-13T17:00:00.000Z')

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
  const sp = await seedSpecialty({
    scope: 'WORKSPACE',
    tenantId: tenant.id,
    workspaceId: ws.id,
    slug: 'enfermeiro',
    name: 'Enfermeiro',
  })
  const sch = await seedSchedule({
    workspaceId: ws.id,
    categoryId: cat.id,
    periodStart: new Date('2026-07-01'),
    periodEnd: new Date('2026-08-01'),
    status: 'PUBLISHED',
  })
  const shift = await seedShift({
    scheduleId: sch.id,
    categoryId: cat.id,
    startAt: SHIFT_START,
    endAt: SHIFT_END,
    headcount: 2,
  })
  return { owner, tenant, ws, cat, sp, sch, shift }
}

test.describe('/api/workspaces/:id/.../shifts/:shiftId/assignments', () => {
  test.beforeEach(async () => {
    await resetDatabase()
  })

  test.describe('POST', () => {
    test('201 assigns single user (PENDING_ACCEPT)', async ({ request }) => {
      const { ws, sch, shift } = await setup(request)
      const colab = await seedUser({})
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: colab.id,
        role: 'COLABORADOR',
      })
      // Owner is admin (logged-in via setup)
      const res = await request.post(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/shifts/${shift.id}/assignments`,
        { data: { userIds: [colab.id] } },
      )
      expect(res.status()).toBe(201)
      const body = await res.json()
      expect(body).toHaveLength(1)
      expect(body[0].status).toBe('PENDING_ACCEPT')
      expect(body[0].compositionStatus).toBe('UNKNOWN')
    })

    test('201 bulk: 2 users PENDING_ACCEPT atomic', async ({ request }) => {
      const { ws, sch, shift } = await setup(request)
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
      const res = await request.post(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/shifts/${shift.id}/assignments`,
        { data: { userIds: [c1.id, c2.id] } },
      )
      expect(res.status()).toBe(201)
      const body = await res.json()
      expect(body).toHaveLength(2)
    })

    test('201 self-assign auto-ACCEPTED', async ({ request }) => {
      const { ws, owner, sch, shift } = await setup(request)
      const res = await request.post(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/shifts/${shift.id}/assignments`,
        { data: { userIds: [owner.user.id] } },
      )
      expect(res.status()).toBe(201)
      const body = await res.json()
      expect(body[0].status).toBe('ACCEPTED')
      expect(body[0].decidedAt).not.toBeNull()
    })

    test('401 unauthenticated', async ({ request }) => {
      const res = await request.post(
        `/api/workspaces/${NON_EXISTENT_ID}/schedules/${NON_EXISTENT_ID}/shifts/${NON_EXISTENT_ID}/assignments`,
        { data: { userIds: [NON_EXISTENT_ID] } },
      )
      expect(res.status()).toBe(401)
    })

    test('404 USER_NOT_WORKSPACE_MEMBER', async ({ request }) => {
      const { ws, sch, shift } = await setup(request)
      const outsider = await seedUser({})
      // outsider has no membership in ws
      const res = await request.post(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/shifts/${shift.id}/assignments`,
        { data: { userIds: [outsider.id] } },
      )
      expect(res.status()).toBe(404)
      const body = await res.json()
      expect(body.code).toBe('USER_NOT_WORKSPACE_MEMBER')
    })

    test('409 INVALID_STATE_TRANSITION when schedule is DRAFT', async ({
      request,
    }) => {
      const { ws, sch, shift } = await setup(request)
      await query(
        `UPDATE "schedule" SET status = 'DRAFT' WHERE id = $1`,
        [sch.id],
      )
      const colab = await seedUser({})
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: colab.id,
        role: 'COLABORADOR',
      })
      const res = await request.post(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/shifts/${shift.id}/assignments`,
        { data: { userIds: [colab.id] } },
      )
      expect(res.status()).toBe(409)
      const body = await res.json()
      expect(body.code).toBe('INVALID_STATE_TRANSITION')
    })

    test('409 SHIFT_HEADCOUNT_FULL', async ({ request }) => {
      const { ws, owner, sch, shift } = await setup(request)
      // Pre-fill 2 slots (headcount=2)
      const u1 = await seedUser({})
      const u2 = await seedUser({})
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: u1.id,
        role: 'COLABORADOR',
      })
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: u2.id,
        role: 'COLABORADOR',
      })
      await seedShiftAssignment({
        shiftId: shift.id,
        userId: u1.id,
        assignedByUserId: owner.user.id,
        status: 'ACCEPTED',
      })
      await seedShiftAssignment({
        shiftId: shift.id,
        userId: u2.id,
        assignedByUserId: owner.user.id,
        status: 'PENDING_ACCEPT',
      })
      const u3 = await seedUser({})
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: u3.id,
        role: 'COLABORADOR',
      })
      const res = await request.post(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/shifts/${shift.id}/assignments`,
        { data: { userIds: [u3.id] } },
      )
      expect(res.status()).toBe(409)
      const body = await res.json()
      expect(body.code).toBe('SHIFT_HEADCOUNT_FULL')
    })

    test('409 SHIFT_OVERLAP_CONFLICT with details.alternatives array', async ({
      request,
    }) => {
      const { ws, owner, sch, cat, shift } = await setup(request)
      const colab = await seedUser({})
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: colab.id,
        role: 'COLABORADOR',
      })
      // Create another shift in same time as target, then accept colab into it
      const otherShift = await seedShift({
        scheduleId: sch.id,
        categoryId: cat.id,
        startAt: new Date('2026-07-13T10:00:00Z'),
        endAt: new Date('2026-07-13T18:00:00Z'),
        headcount: 1,
      })
      await seedShiftAssignment({
        shiftId: otherShift.id,
        userId: colab.id,
        assignedByUserId: owner.user.id,
        status: 'ACCEPTED',
      })
      // Add an alternative open shift (different time, same category)
      await seedShift({
        scheduleId: sch.id,
        categoryId: cat.id,
        startAt: new Date('2026-07-14T08:00:00Z'),
        endAt: new Date('2026-07-14T17:00:00Z'),
        headcount: 2,
      })
      const res = await request.post(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/shifts/${shift.id}/assignments`,
        { data: { userIds: [colab.id] } },
      )
      expect(res.status()).toBe(409)
      const body = await res.json()
      expect(body.code).toBe('SHIFT_OVERLAP_CONFLICT')
      expect(Array.isArray(body.details.conflicts)).toBe(true)
      expect(Array.isArray(body.details.alternatives)).toBe(true)
      expect(body.details.alternatives.length).toBeGreaterThan(0)
    })
  })

  test.describe('GET nested list', () => {
    test('200 with compositionStatus per row', async ({ request }) => {
      const { ws, owner, sch, sp, shift } = await setup(request)
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
      await seedUserSpecialty({
        userId: c1.id,
        workspaceId: ws.id,
        specialtyId: sp.id,
      })
      await seedShiftExpectedComposition({
        shiftId: shift.id,
        specialtyId: sp.id,
        count: 2,
      })
      await seedShiftAssignment({
        shiftId: shift.id,
        userId: c1.id,
        assignedByUserId: owner.user.id,
      })
      await seedShiftAssignment({
        shiftId: shift.id,
        userId: c2.id,
        assignedByUserId: owner.user.id,
      })
      const res = await request.get(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/shifts/${shift.id}/assignments`,
      )
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body).toHaveLength(2)
      const c1Assign = body.find(
        (b: { userId: string }) => b.userId === c1.id,
      )
      const c2Assign = body.find(
        (b: { userId: string }) => b.userId === c2.id,
      )
      expect(c1Assign.compositionStatus).toBe('MATCH')
      expect(c2Assign.compositionStatus).toBe('UNKNOWN')
    })

    test('200 with empty composition returns UNKNOWN for everyone', async ({
      request,
    }) => {
      const { ws, owner, sch, shift } = await setup(request)
      const c1 = await seedUser({})
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: c1.id,
        role: 'COLABORADOR',
      })
      await seedShiftAssignment({
        shiftId: shift.id,
        userId: c1.id,
        assignedByUserId: owner.user.id,
      })
      const res = await request.get(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/shifts/${shift.id}/assignments`,
      )
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body[0].compositionStatus).toBe('UNKNOWN')
    })

    test('401 unauthenticated', async ({ request }) => {
      const res = await request.get(
        `/api/workspaces/${NON_EXISTENT_ID}/schedules/${NON_EXISTENT_ID}/shifts/${NON_EXISTENT_ID}/assignments`,
      )
      expect(res.status()).toBe(401)
    })
  })

  test.describe('GET flat detail', () => {
    test('200 returns assignment via /api/assignments/:id', async ({
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
      })
      const res = await request.get(`/api/assignments/${a.id}`)
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.id).toBe(a.id)
      expect(body.compositionStatus).toBeTruthy()
    })

    test('404 when not found', async ({ request }) => {
      await setup(request)
      const res = await request.get(`/api/assignments/${NON_EXISTENT_ID}`)
      expect(res.status()).toBe(404)
    })

    test('401 unauthenticated', async ({ request }) => {
      const res = await request.get(`/api/assignments/${NON_EXISTENT_ID}`)
      expect(res.status()).toBe(401)
    })
  })

  test.describe('DELETE flat', () => {
    test('204 hard-deletes PENDING', async ({ request }) => {
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
        status: 'PENDING_ACCEPT',
      })
      const res = await request.delete(`/api/assignments/${a.id}`)
      expect(res.status()).toBe(204)
      const rows = await query<AssignmentRow>(
        'SELECT * FROM "shiftAssignment" WHERE id = $1',
        [a.id],
      )
      expect(rows).toHaveLength(0)
    })

    test('409 INVALID_STATE_TRANSITION when ACCEPTED', async ({ request }) => {
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
      const res = await request.delete(`/api/assignments/${a.id}`)
      expect(res.status()).toBe(409)
    })

    test('401 unauthenticated', async ({ request }) => {
      const res = await request.delete(`/api/assignments/${NON_EXISTENT_ID}`)
      expect(res.status()).toBe(401)
    })
  })

  test.describe('Composition status verification', () => {
    test('MATCH: user specialty in composition', async ({ request }) => {
      const { ws, owner, sch, sp, shift } = await setup(request)
      const colab = await seedUser({})
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: colab.id,
        role: 'COLABORADOR',
      })
      await seedUserSpecialty({
        userId: colab.id,
        workspaceId: ws.id,
        specialtyId: sp.id,
      })
      await seedShiftExpectedComposition({
        shiftId: shift.id,
        specialtyId: sp.id,
        count: 1,
      })
      const res = await request.post(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/shifts/${shift.id}/assignments`,
        { data: { userIds: [colab.id] } },
      )
      expect(res.status()).toBe(201)
      const body = await res.json()
      expect(body[0].compositionStatus).toBe('MATCH')
      void owner
    })

    test('MISMATCH: user specialty not in composition', async ({ request }) => {
      const { ws, tenant, sch, sp, shift } = await setup(request)
      const otherSp = await seedSpecialty({
        scope: 'WORKSPACE',
        tenantId: tenant.id,
        workspaceId: ws.id,
        slug: 'tecnico',
        name: 'Técnico',
      })
      const colab = await seedUser({})
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: colab.id,
        role: 'COLABORADOR',
      })
      await seedUserSpecialty({
        userId: colab.id,
        workspaceId: ws.id,
        specialtyId: otherSp.id,
      })
      await seedShiftExpectedComposition({
        shiftId: shift.id,
        specialtyId: sp.id,
        count: 1,
      })
      const res = await request.post(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/shifts/${shift.id}/assignments`,
        { data: { userIds: [colab.id] } },
      )
      expect(res.status()).toBe(201)
      const body = await res.json()
      expect(body[0].compositionStatus).toBe('MISMATCH')
    })
  })
})
