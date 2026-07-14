import type { APIRequestContext } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { query, resetDatabase } from './fixtures/db'
import type { ShiftCompositionRow, ShiftRow } from './fixtures/db'
import {
  createUserFixture,
  seedCategory,
  seedSchedule,
  seedShift,
  seedShiftExpectedComposition,
  seedShiftPattern,
  seedSpecialty,
  seedTenantWithOwner,
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
    status: 'DRAFT',
  })
  return { owner, tenant, ws, cat, sp, sch }
}

test.describe('/api/workspaces/:id/schedules/:scheduleId/shifts', () => {
  test.beforeEach(async () => {
    await resetDatabase()
  })

  test.describe('POST shift', () => {
    test('201 creates shift on DRAFT schedule', async ({ request }) => {
      const { ws, cat, sch } = await setup(request)
      const res = await request.post(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/shifts`,
        {
          data: {
            categoryId: cat.id,
            startAt: SHIFT_START.toISOString(),
            endAt: SHIFT_END.toISOString(),
            headcount: 2,
          },
        },
      )
      expect(res.status()).toBe(201)
      const body = await res.json()
      expect(body.status).toBe('OPEN')
      expect(body.headcount).toBe(2)
      const rows = await query<ShiftRow>(
        'SELECT * FROM "shift" WHERE id = $1',
        [body.id],
      )
      expect(rows).toHaveLength(1)
    })

    test('401 when not authenticated', async ({ request }) => {
      const res = await request.post(
        `/api/workspaces/${NON_EXISTENT_ID}/schedules/${NON_EXISTENT_ID}/shifts`,
        {
          data: {
            categoryId: NON_EXISTENT_ID,
            startAt: SHIFT_START.toISOString(),
            endAt: SHIFT_END.toISOString(),
            headcount: 1,
          },
        },
      )
      expect(res.status()).toBe(401)
    })

    test('403 when caller is not workspace member', async ({ playwright }) => {
      // Setup with one user
      const setupContext = await playwright.request.newContext()
      const { ws, cat, sch } = await setup(setupContext)
      // Different user logs in via fresh context (no membership in ws)
      const outsider = await playwright.request.newContext()
      await createUserFixture(outsider)
      const res = await outsider.post(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/shifts`,
        {
          data: {
            categoryId: cat.id,
            startAt: SHIFT_START.toISOString(),
            endAt: SHIFT_END.toISOString(),
            headcount: 1,
          },
        },
      )
      expect(res.status()).toBe(403)
    })

    test('400 SHIFT_TIME_INVALID when startAt >= endAt', async ({ request }) => {
      const { ws, cat, sch } = await setup(request)
      const res = await request.post(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/shifts`,
        {
          data: {
            categoryId: cat.id,
            startAt: SHIFT_END.toISOString(),
            endAt: SHIFT_START.toISOString(),
            headcount: 1,
          },
        },
      )
      expect(res.status()).toBe(400)
    })

    test('409 INVALID_STATE_TRANSITION when schedule is PUBLISHED', async ({
      request,
    }) => {
      const { ws, cat, sch } = await setup(request)
      // Publish the schedule directly
      await query(
        `UPDATE "schedule" SET status = 'PUBLISHED', published_at = NOW() WHERE id = $1`,
        [sch.id],
      )
      const res = await request.post(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/shifts`,
        {
          data: {
            categoryId: cat.id,
            startAt: SHIFT_START.toISOString(),
            endAt: SHIFT_END.toISOString(),
            headcount: 1,
          },
        },
      )
      expect(res.status()).toBe(409)
      const body = await res.json()
      expect(body.code).toBe('INVALID_STATE_TRANSITION')
    })

    test('404 when category not accessible', async ({ request }) => {
      const { ws, sch } = await setup(request)
      const res = await request.post(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/shifts`,
        {
          data: {
            categoryId: NON_EXISTENT_ID,
            startAt: SHIFT_START.toISOString(),
            endAt: SHIFT_END.toISOString(),
            headcount: 1,
          },
        },
      )
      expect(res.status()).toBe(404)
    })
  })

  test.describe('GET list', () => {
    test('200 lists shifts', async ({ request }) => {
      const { ws, cat, sch } = await setup(request)
      await seedShift({
        scheduleId: sch.id,
        categoryId: cat.id,
        startAt: SHIFT_START,
        endAt: SHIFT_END,
      })
      const res = await request.get(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/shifts`,
      )
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.data).toHaveLength(1)
    })

    test('200 filters by status', async ({ request }) => {
      const { ws, cat, sch } = await setup(request)
      await seedShift({
        scheduleId: sch.id,
        categoryId: cat.id,
        startAt: SHIFT_START,
        endAt: SHIFT_END,
      })
      await seedShift({
        scheduleId: sch.id,
        categoryId: cat.id,
        startAt: new Date('2026-07-14T08:00:00Z'),
        endAt: new Date('2026-07-14T17:00:00Z'),
        status: 'CANCELLED',
      })
      const res = await request.get(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/shifts?status=OPEN`,
      )
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.data).toHaveLength(1)
      expect(body.data[0].status).toBe('OPEN')
    })

    test('401 unauthenticated', async ({ request }) => {
      const res = await request.get(
        `/api/workspaces/${NON_EXISTENT_ID}/schedules/${NON_EXISTENT_ID}/shifts`,
      )
      expect(res.status()).toBe(401)
    })
  })

  test.describe('GET detail', () => {
    test('200 returns shift with composition', async ({ request }) => {
      const { ws, cat, sch, sp } = await setup(request)
      const sh = await seedShift({
        scheduleId: sch.id,
        categoryId: cat.id,
        startAt: SHIFT_START,
        endAt: SHIFT_END,
      })
      await seedShiftExpectedComposition({
        shiftId: sh.id,
        specialtyId: sp.id,
        count: 3,
      })
      const res = await request.get(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/shifts/${sh.id}`,
      )
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.expectedComposition).toHaveLength(1)
      expect(body.expectedComposition[0].count).toBe(3)
    })

    test('404 when shift missing', async ({ request }) => {
      const { ws, sch } = await setup(request)
      const res = await request.get(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/shifts/${NON_EXISTENT_ID}`,
      )
      expect(res.status()).toBe(404)
    })
  })

  test.describe('PATCH', () => {
    test('200 updates shift on DRAFT schedule', async ({ request }) => {
      const { ws, cat, sch } = await setup(request)
      const sh = await seedShift({
        scheduleId: sch.id,
        categoryId: cat.id,
        startAt: SHIFT_START,
        endAt: SHIFT_END,
      })
      const res = await request.patch(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/shifts/${sh.id}`,
        { data: { headcount: 5 } },
      )
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.headcount).toBe(5)
    })

    test('409 INVALID_STATE_TRANSITION on PUBLISHED schedule', async ({
      request,
    }) => {
      const { ws, cat, sch } = await setup(request)
      const sh = await seedShift({
        scheduleId: sch.id,
        categoryId: cat.id,
        startAt: SHIFT_START,
        endAt: SHIFT_END,
      })
      await query(
        `UPDATE "schedule" SET status = 'PUBLISHED', published_at = NOW() WHERE id = $1`,
        [sch.id],
      )
      const res = await request.patch(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/shifts/${sh.id}`,
        { data: { headcount: 3 } },
      )
      expect(res.status()).toBe(409)
    })
  })

  test.describe('DELETE', () => {
    test('204 hard-deletes when schedule is DRAFT', async ({ request }) => {
      const { ws, cat, sch } = await setup(request)
      const sh = await seedShift({
        scheduleId: sch.id,
        categoryId: cat.id,
        startAt: SHIFT_START,
        endAt: SHIFT_END,
      })
      const res = await request.delete(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/shifts/${sh.id}`,
      )
      expect(res.status()).toBe(204)
      const rows = await query<ShiftRow>(
        'SELECT * FROM "shift" WHERE id = $1',
        [sh.id],
      )
      expect(rows).toHaveLength(0)
    })

    test('204 sets status=CANCELLED when schedule is PUBLISHED', async ({
      request,
    }) => {
      const { ws, cat, sch } = await setup(request)
      const sh = await seedShift({
        scheduleId: sch.id,
        categoryId: cat.id,
        startAt: SHIFT_START,
        endAt: SHIFT_END,
      })
      await query(
        `UPDATE "schedule" SET status = 'PUBLISHED', published_at = NOW() WHERE id = $1`,
        [sch.id],
      )
      const res = await request.delete(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/shifts/${sh.id}?reason=no-show`,
      )
      expect(res.status()).toBe(204)
      const rows = await query<ShiftRow>(
        'SELECT * FROM "shift" WHERE id = $1',
        [sh.id],
      )
      expect(rows).toHaveLength(1)
      expect(rows[0].status).toBe('CANCELLED')
      expect(rows[0].cancel_reason).toBe('no-show')
      expect(rows[0].cancelled_at).not.toBeNull()
    })

    test('409 when schedule is CLOSED', async ({ request }) => {
      const { ws, cat, sch } = await setup(request)
      const sh = await seedShift({
        scheduleId: sch.id,
        categoryId: cat.id,
        startAt: SHIFT_START,
        endAt: SHIFT_END,
      })
      await query(
        `UPDATE "schedule" SET status = 'CLOSED', published_at = NOW(), closed_at = NOW() WHERE id = $1`,
        [sch.id],
      )
      const res = await request.delete(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/shifts/${sh.id}`,
      )
      expect(res.status()).toBe(409)
    })

    test('401 DELETE unauthenticated', async ({ request }) => {
      const res = await request.delete(
        `/api/workspaces/${NON_EXISTENT_ID}/schedules/${NON_EXISTENT_ID}/shifts/${NON_EXISTENT_ID}`,
      )
      expect(res.status()).toBe(401)
    })
  })

  test.describe('PATCH expected-composition', () => {
    test('200 replaces composition', async ({ request }) => {
      const { ws, cat, sch, sp } = await setup(request)
      const sh = await seedShift({
        scheduleId: sch.id,
        categoryId: cat.id,
        startAt: SHIFT_START,
        endAt: SHIFT_END,
      })
      const res = await request.patch(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/shifts/${sh.id}/expected-composition`,
        { data: { items: [{ specialtyId: sp.id, count: 2 }] } },
      )
      expect(res.status()).toBe(200)
      const rows = await query<ShiftCompositionRow>(
        'SELECT * FROM "shiftExpectedComposition" WHERE shift_id = $1',
        [sh.id],
      )
      expect(rows).toHaveLength(1)
      expect(rows[0].count).toBe(2)
    })

    test('200 clears composition when items=[]', async ({ request }) => {
      const { ws, cat, sch, sp } = await setup(request)
      const sh = await seedShift({
        scheduleId: sch.id,
        categoryId: cat.id,
        startAt: SHIFT_START,
        endAt: SHIFT_END,
      })
      await seedShiftExpectedComposition({
        shiftId: sh.id,
        specialtyId: sp.id,
        count: 1,
      })
      const res = await request.patch(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/shifts/${sh.id}/expected-composition`,
        { data: { items: [] } },
      )
      expect(res.status()).toBe(200)
      const rows = await query<ShiftCompositionRow>(
        'SELECT * FROM "shiftExpectedComposition" WHERE shift_id = $1',
        [sh.id],
      )
      expect(rows).toHaveLength(0)
    })

    test('404 SPECIALTY_NOT_IN_WORKSPACE', async ({ request }) => {
      const { ws, cat, sch } = await setup(request)
      const sh = await seedShift({
        scheduleId: sch.id,
        categoryId: cat.id,
        startAt: SHIFT_START,
        endAt: SHIFT_END,
      })
      const res = await request.patch(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/shifts/${sh.id}/expected-composition`,
        {
          data: { items: [{ specialtyId: NON_EXISTENT_ID, count: 1 }] },
        },
      )
      expect(res.status()).toBe(404)
    })

    test('409 when schedule is PUBLISHED', async ({ request }) => {
      const { ws, cat, sch, sp } = await setup(request)
      const sh = await seedShift({
        scheduleId: sch.id,
        categoryId: cat.id,
        startAt: SHIFT_START,
        endAt: SHIFT_END,
      })
      await query(
        `UPDATE "schedule" SET status = 'PUBLISHED', published_at = NOW() WHERE id = $1`,
        [sch.id],
      )
      const res = await request.patch(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/shifts/${sh.id}/expected-composition`,
        { data: { items: [{ specialtyId: sp.id, count: 1 }] } },
      )
      expect(res.status()).toBe(409)
    })
  })

  test.describe('POST pattern', () => {
    test('201 creates pattern', async ({ request }) => {
      const { ws, cat, sch } = await setup(request)
      const res = await request.post(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/patterns`,
        {
          data: {
            categoryId: cat.id,
            daysOfWeek: [1, 3],
            startTimeMinutes: 8 * 60,
            endTimeMinutes: 17 * 60,
            crossesMidnight: false,
            headcount: 2,
          },
        },
      )
      expect(res.status()).toBe(201)
      const body = await res.json()
      expect(body.daysOfWeek).toEqual([1, 3])
    })

    test('400 SHIFT_TIME_INVALID when end <= start without crossesMidnight', async ({
      request,
    }) => {
      const { ws, cat, sch } = await setup(request)
      const res = await request.post(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/patterns`,
        {
          data: {
            categoryId: cat.id,
            daysOfWeek: [1],
            startTimeMinutes: 17 * 60,
            endTimeMinutes: 8 * 60,
            crossesMidnight: false,
            headcount: 1,
          },
        },
      )
      expect(res.status()).toBe(400)
    })

    test('401 pattern unauthenticated', async ({ request }) => {
      const res = await request.post(
        `/api/workspaces/${NON_EXISTENT_ID}/schedules/${NON_EXISTENT_ID}/patterns`,
        {
          data: {
            categoryId: NON_EXISTENT_ID,
            daysOfWeek: [1],
            startTimeMinutes: 0,
            endTimeMinutes: 60,
            crossesMidnight: false,
            headcount: 1,
          },
        },
      )
      expect(res.status()).toBe(401)
    })
  })

  test.describe('POST pattern generate', () => {
    test('200 generates Mon/Wed shifts (4 in 14-day range)', async ({
      request,
    }) => {
      const { ws, cat, sch } = await setup(request)
      const pattern = await seedShiftPattern({
        scheduleId: sch.id,
        categoryId: cat.id,
        daysOfWeek: [1, 3],
        startTimeMinutes: 8 * 60,
        endTimeMinutes: 17 * 60,
      })
      const res = await request.post(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/patterns/${pattern.id}/generate`,
        {
          data: {
            rangeStart: '2026-07-01T00:00:00Z', // Wed
            rangeEnd: '2026-07-15T00:00:00Z',
          },
        },
      )
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.generated).toBe(4)
      expect(body.skipped).toBe(0)
    })

    test('200 idempotent rerun reports skipped > 0', async ({ request }) => {
      const { ws, cat, sch } = await setup(request)
      const pattern = await seedShiftPattern({
        scheduleId: sch.id,
        categoryId: cat.id,
        daysOfWeek: [1, 3],
        startTimeMinutes: 8 * 60,
        endTimeMinutes: 17 * 60,
      })
      const url = `/api/workspaces/${ws.id}/schedules/${sch.id}/patterns/${pattern.id}/generate`
      const data = {
        rangeStart: '2026-07-01T00:00:00Z',
        rangeEnd: '2026-07-15T00:00:00Z',
      }
      await request.post(url, { data })
      const res2 = await request.post(url, { data })
      expect(res2.status()).toBe(200)
      const body = await res2.json()
      expect(body.generated).toBe(0)
      expect(body.skipped).toBe(4)
    })

    test('409 PATTERN_RANGE_TOO_LARGE when range > 90 days', async ({
      request,
    }) => {
      const { ws, cat, sch } = await setup(request)
      const pattern = await seedShiftPattern({
        scheduleId: sch.id,
        categoryId: cat.id,
      })
      const res = await request.post(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/patterns/${pattern.id}/generate`,
        {
          data: {
            rangeStart: '2026-01-01T00:00:00Z',
            rangeEnd: '2026-04-15T00:00:00Z',
          },
        },
      )
      expect(res.status()).toBe(409)
      const body = await res.json()
      expect(body.code).toBe('PATTERN_RANGE_TOO_LARGE')
    })

    test('crossesMidnight pattern produces endAt on next day', async ({
      request,
    }) => {
      const { ws, cat, sch } = await setup(request)
      const pattern = await seedShiftPattern({
        scheduleId: sch.id,
        categoryId: cat.id,
        daysOfWeek: [1], // Mon
        startTimeMinutes: 22 * 60,
        endTimeMinutes: 6 * 60,
        crossesMidnight: true,
      })
      const res = await request.post(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/patterns/${pattern.id}/generate`,
        {
          data: {
            rangeStart: '2026-07-06T00:00:00Z', // Monday
            rangeEnd: '2026-07-07T00:00:00Z',
          },
        },
      )
      expect(res.status()).toBe(200)
      // Read back via API (Prisma serializes UTC ISO consistently)
      const listRes = await request.get(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/shifts`,
      )
      const list = await listRes.json()
      expect(list.data).toHaveLength(1)
      expect(list.data[0].startAt).toBe('2026-07-06T22:00:00.000Z')
      expect(list.data[0].endAt).toBe('2026-07-07T06:00:00.000Z')
    })
  })

  test.describe('Specialty soft-delete with composition refs (Task 06 patch)', () => {
    test('409 CANNOT_DELETE_IN_USE when composition references specialty', async ({
      request,
    }) => {
      const { ws, cat, sch, sp } = await setup(request)
      const sh = await seedShift({
        scheduleId: sch.id,
        categoryId: cat.id,
        startAt: SHIFT_START,
        endAt: SHIFT_END,
      })
      await seedShiftExpectedComposition({
        shiftId: sh.id,
        specialtyId: sp.id,
        count: 1,
      })
      const res = await request.delete(
        `/api/workspaces/${ws.id}/specialties/${sp.id}`,
      )
      expect(res.status()).toBe(409)
      const body = await res.json()
      expect(body.code).toBe('CANNOT_DELETE_IN_USE')
    })
  })
})
