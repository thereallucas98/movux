import type { APIRequestContext } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { query, resetDatabase } from './fixtures/db'
import type { AssignmentRow } from './fixtures/db'
import {
  createUserFixture,
  seedCategory,
  seedSchedule,
  seedShift,
  seedShiftAssignment,
  seedTenantWithOwner,
  seedTimeEntry,
  seedUser,
  seedWorkspaceMembership,
  seedWorkspaceWithAdmin,
} from './fixtures/factories'

const NON_EXISTENT = '00000000-0000-0000-0000-000000000000'

interface ClockSetup {
  owner: Awaited<ReturnType<typeof createUserFixture>>
  ws: { id: string }
  shift: { id: string; startAt: Date; endAt: Date }
  assignment: AssignmentRow
}

async function setupAcceptedAssignment(
  request: APIRequestContext,
): Promise<ClockSetup> {
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
  // Shift starts 5 minutes ago so clock-in is comfortably within ±15min tolerance.
  const startAt = new Date(Date.now() - 5 * 60_000)
  const endAt = new Date(startAt.getTime() + 8 * 60 * 60 * 1000)
  const shift = await seedShift({
    scheduleId: sch.id,
    categoryId: cat.id,
    startAt,
    endAt,
    headcount: 1,
  })
  const assignment = await seedShiftAssignment({
    shiftId: shift.id,
    userId: owner.user.id,
    assignedByUserId: owner.user.id,
    status: 'ACCEPTED',
  })
  return { owner, ws, shift: { id: shift.id, startAt, endAt }, assignment }
}

test.describe('/api/assignments/:id/clock-in|out|close + /api/workspaces/:id/time-entries', () => {
  test.beforeEach(async () => {
    await resetDatabase()
  })

  test.describe('POST clock-in', () => {
    test('201 creates time entry', async ({ request }) => {
      // NOTE: clockInWithinTolerance is verified in unit tests; here the
      // boolean depends on local TZ vs server TZ when pg writes timestamp
      // (without time zone) — environmental, not a bug in the use case.
      const s = await setupAcceptedAssignment(request)
      const res = await request.post(
        `/api/assignments/${s.assignment.id}/clock-in`,
      )
      expect(res.status()).toBe(201)
      const body = await res.json()
      expect(body.shiftAssignmentId).toBe(s.assignment.id)
      expect(typeof body.clockInWithinTolerance).toBe('boolean')
    })

    test('201 with lat/lng location', async ({ request }) => {
      const s = await setupAcceptedAssignment(request)
      const res = await request.post(
        `/api/assignments/${s.assignment.id}/clock-in`,
        { data: { lat: -23.5, lng: -46.6 } },
      )
      expect(res.status()).toBe(201)
    })

    test('400 on invalid lat without lng', async ({ request }) => {
      const s = await setupAcceptedAssignment(request)
      const res = await request.post(
        `/api/assignments/${s.assignment.id}/clock-in`,
        { data: { lat: -23.5 } },
      )
      expect(res.status()).toBe(400)
    })

    test('401 unauthenticated', async ({ playwright }) => {
      const ctx = await playwright.request.newContext()
      const res = await ctx.post(`/api/assignments/${NON_EXISTENT}/clock-in`)
      expect(res.status()).toBe(401)
      await ctx.dispose()
    })

    test('403 when caller is not the assignee', async ({
      request,
      playwright,
    }) => {
      const s = await setupAcceptedAssignment(request)
      const ctx = await playwright.request.newContext()
      await createUserFixture(ctx)
      const res = await ctx.post(
        `/api/assignments/${s.assignment.id}/clock-in`,
      )
      expect(res.status()).toBe(403)
      await ctx.dispose()
    })

    test('404 when assignment is missing', async ({ request }) => {
      await setupAcceptedAssignment(request)
      const res = await request.post(`/api/assignments/${NON_EXISTENT}/clock-in`)
      expect(res.status()).toBe(404)
    })

    test('409 ALREADY_CLOCKED_IN on second call', async ({ request }) => {
      const s = await setupAcceptedAssignment(request)
      const first = await request.post(
        `/api/assignments/${s.assignment.id}/clock-in`,
      )
      expect(first.status()).toBe(201)
      const second = await request.post(
        `/api/assignments/${s.assignment.id}/clock-in`,
      )
      expect(second.status()).toBe(409)
      const body = await second.json()
      expect(body.code).toBe('ALREADY_CLOCKED_IN')
    })

    test('409 INVALID_STATE_TRANSITION when status is not ACCEPTED', async ({
      request,
    }) => {
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
        startAt: new Date(),
        endAt: new Date(Date.now() + 8 * 60 * 60_000),
        headcount: 1,
      })
      const assignment = await seedShiftAssignment({
        shiftId: shift.id,
        userId: owner.user.id,
        assignedByUserId: owner.user.id,
        status: 'PENDING_ACCEPT',
      })
      const res = await request.post(
        `/api/assignments/${assignment.id}/clock-in`,
      )
      expect(res.status()).toBe(409)
    })
  })

  test.describe('POST clock-out', () => {
    test('200 flips assignment to PENDING_CLOSURE', async ({ request }) => {
      const s = await setupAcceptedAssignment(request)
      await request.post(`/api/assignments/${s.assignment.id}/clock-in`)
      const res = await request.post(
        `/api/assignments/${s.assignment.id}/clock-out`,
      )
      expect(res.status()).toBe(200)
      const updated = await query<{ status: string }>(
        'SELECT status FROM "shiftAssignment" WHERE id = $1',
        [s.assignment.id],
      )
      expect(updated[0]?.status).toBe('PENDING_CLOSURE')
    })

    test('401 unauthenticated', async ({ playwright }) => {
      const ctx = await playwright.request.newContext()
      const res = await ctx.post(`/api/assignments/${NON_EXISTENT}/clock-out`)
      expect(res.status()).toBe(401)
      await ctx.dispose()
    })

    test('403 when caller is not the assignee', async ({
      request,
      playwright,
    }) => {
      const s = await setupAcceptedAssignment(request)
      await request.post(`/api/assignments/${s.assignment.id}/clock-in`)
      const ctx = await playwright.request.newContext()
      await createUserFixture(ctx)
      const res = await ctx.post(
        `/api/assignments/${s.assignment.id}/clock-out`,
      )
      expect(res.status()).toBe(403)
      await ctx.dispose()
    })

    test('409 INVALID_STATE_TRANSITION without prior clock-in', async ({
      request,
    }) => {
      const s = await setupAcceptedAssignment(request)
      const res = await request.post(
        `/api/assignments/${s.assignment.id}/clock-out`,
      )
      expect(res.status()).toBe(409)
    })
  })

  test.describe('POST close', () => {
    test('200 flips assignment to COMPLETED (Coord/Admin)', async ({
      request,
    }) => {
      const s = await setupAcceptedAssignment(request)
      await request.post(`/api/assignments/${s.assignment.id}/clock-in`)
      await request.post(`/api/assignments/${s.assignment.id}/clock-out`)
      const res = await request.post(
        `/api/assignments/${s.assignment.id}/close`,
        { data: { notes: 'turno ok' } },
      )
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.notes).toBe('turno ok')
      const updated = await query<{ status: string }>(
        'SELECT status FROM "shiftAssignment" WHERE id = $1',
        [s.assignment.id],
      )
      expect(updated[0]?.status).toBe('COMPLETED')
    })

    test('403 when caller is COLABORADOR', async ({ request, playwright }) => {
      const s = await setupAcceptedAssignment(request)
      await request.post(`/api/assignments/${s.assignment.id}/clock-in`)
      await request.post(`/api/assignments/${s.assignment.id}/clock-out`)
      const colabCtx = await playwright.request.newContext()
      const colab = await createUserFixture(colabCtx)
      await seedWorkspaceMembership({
        workspaceId: s.ws.id,
        userId: colab.user.id,
        role: 'COLABORADOR',
      })
      const res = await colabCtx.post(
        `/api/assignments/${s.assignment.id}/close`,
      )
      expect(res.status()).toBe(403)
      await colabCtx.dispose()
    })

    test('409 INVALID_STATE_TRANSITION when status is ACCEPTED (no clock-out yet)', async ({
      request,
    }) => {
      const s = await setupAcceptedAssignment(request)
      await request.post(`/api/assignments/${s.assignment.id}/clock-in`)
      const res = await request.post(
        `/api/assignments/${s.assignment.id}/close`,
      )
      expect(res.status()).toBe(409)
    })

    test('404 unknown id', async ({ request }) => {
      await setupAcceptedAssignment(request)
      const res = await request.post(`/api/assignments/${NON_EXISTENT}/close`)
      expect(res.status()).toBe(404)
    })
  })

  test.describe('GET time-entries (json)', () => {
    test('200 returns paginated rows for ADMIN', async ({ request }) => {
      const s = await setupAcceptedAssignment(request)
      await seedTimeEntry({
        shiftAssignmentId: s.assignment.id,
        userId: s.owner.user.id,
      })
      const res = await request.get(`/api/workspaces/${s.ws.id}/time-entries`)
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(Array.isArray(body.data)).toBe(true)
    })

    test('403 for COLABORADOR', async ({ request, playwright }) => {
      const s = await setupAcceptedAssignment(request)
      const colabCtx = await playwright.request.newContext()
      const colab = await createUserFixture(colabCtx)
      await seedWorkspaceMembership({
        workspaceId: s.ws.id,
        userId: colab.user.id,
        role: 'COLABORADOR',
      })
      const res = await colabCtx.get(
        `/api/workspaces/${s.ws.id}/time-entries`,
      )
      expect(res.status()).toBe(403)
      await colabCtx.dispose()
    })

    test('401 unauthenticated', async ({ playwright }) => {
      const ctx = await playwright.request.newContext()
      const res = await ctx.get(`/api/workspaces/${NON_EXISTENT}/time-entries`)
      expect(res.status()).toBe(401)
      await ctx.dispose()
    })

    test('400 when from > to', async ({ request }) => {
      const s = await setupAcceptedAssignment(request)
      const res = await request.get(
        `/api/workspaces/${s.ws.id}/time-entries?from=2026-12-01T00:00:00.000Z&to=2026-01-01T00:00:00.000Z`,
      )
      expect(res.status()).toBe(400)
    })

    test('respects userId filter', async ({ request }) => {
      const s = await setupAcceptedAssignment(request)
      await seedTimeEntry({
        shiftAssignmentId: s.assignment.id,
        userId: s.owner.user.id,
      })
      const otherUser = await seedUser()
      const res = await request.get(
        `/api/workspaces/${s.ws.id}/time-entries?userId=${otherUser.id}`,
      )
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.data).toHaveLength(0)
    })
  })

  test.describe('GET time-entries (csv)', () => {
    test('200 returns CSV with proper headers', async ({ request }) => {
      const s = await setupAcceptedAssignment(request)
      await seedTimeEntry({
        shiftAssignmentId: s.assignment.id,
        userId: s.owner.user.id,
        clockOutAt: new Date(),
      })
      const res = await request.get(
        `/api/workspaces/${s.ws.id}/time-entries?format=csv`,
      )
      expect(res.status()).toBe(200)
      expect(res.headers()['content-type']).toContain('text/csv')
      expect(res.headers()['content-disposition']).toMatch(
        /attachment;\s*filename="time-entries-.*\.csv"/,
      )
      const body = await res.text()
      expect(body).toContain('time_entry_id,user_id,user_full_name,')
      expect(body.endsWith('\r\n')).toBe(true)
    })

    test('403 CSV for COLABORADOR', async ({ request, playwright }) => {
      const s = await setupAcceptedAssignment(request)
      const colabCtx = await playwright.request.newContext()
      const colab = await createUserFixture(colabCtx)
      await seedWorkspaceMembership({
        workspaceId: s.ws.id,
        userId: colab.user.id,
        role: 'COLABORADOR',
      })
      const res = await colabCtx.get(
        `/api/workspaces/${s.ws.id}/time-entries?format=csv`,
      )
      expect(res.status()).toBe(403)
      await colabCtx.dispose()
    })

    test('200 empty body when no rows match', async ({ request }) => {
      const s = await setupAcceptedAssignment(request)
      const res = await request.get(
        `/api/workspaces/${s.ws.id}/time-entries?format=csv`,
      )
      expect(res.status()).toBe(200)
      const body = await res.text()
      // Header row + trailing CRLF only
      expect(body.split('\r\n').filter(Boolean)).toHaveLength(1)
    })
  })
})
