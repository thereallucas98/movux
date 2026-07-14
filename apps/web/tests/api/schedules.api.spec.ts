import { expect, test } from '@playwright/test'
import { query, resetDatabase } from './fixtures/db'
import type { ScheduleRow } from './fixtures/db'
import {
  createUserFixture,
  seedCategory,
  seedSchedule,
  seedTenantWithOwner,
  seedUser,
  seedWorkspaceMembership,
  seedWorkspaceWithAdmin,
} from './fixtures/factories'

const NON_EXISTENT_ID = '00000000-0000-0000-0000-000000000000'

const JUL_START = new Date('2026-07-01T00:00:00.000Z')
const JUL_END = new Date('2026-08-01T00:00:00.000Z')
const AUG_START = new Date('2026-08-01T00:00:00.000Z')
const AUG_END = new Date('2026-09-01T00:00:00.000Z')
const JUL_MID_START = new Date('2026-07-15T00:00:00.000Z')
const JUL_MID_END = new Date('2026-08-15T00:00:00.000Z')

async function setupWsAndCategory(request: import('@playwright/test').APIRequestContext) {
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
  return { owner, tenant, ws, cat }
}

test.describe('/api/workspaces/:id/schedules', () => {
  test.beforeEach(async () => {
    await resetDatabase()
  })

  test.describe('POST', () => {
    test('201 creates schedule', async ({ request }) => {
      const { ws, cat } = await setupWsAndCategory(request)
      const res = await request.post(
        `/api/workspaces/${ws.id}/schedules`,
        {
          data: {
            categoryId: cat.id,
            name: 'Escala Julho 2026',
            periodStart: JUL_START.toISOString(),
            periodEnd: JUL_END.toISOString(),
          },
        },
      )
      expect(res.status()).toBe(201)
      const body = await res.json()
      expect(body.status).toBe('DRAFT')
      expect(body.name).toBe('Escala Julho 2026')
    })

    test('409 SCHEDULE_PERIOD_OVERLAP', async ({ request }) => {
      const { ws, cat } = await setupWsAndCategory(request)
      await seedSchedule({
        workspaceId: ws.id,
        categoryId: cat.id,
        periodStart: JUL_START,
        periodEnd: JUL_END,
      })
      const res = await request.post(
        `/api/workspaces/${ws.id}/schedules`,
        {
          data: {
            categoryId: cat.id,
            periodStart: JUL_MID_START.toISOString(),
            periodEnd: JUL_MID_END.toISOString(),
          },
        },
      )
      expect(res.status()).toBe(409)
      expect((await res.json()).code).toBe('SCHEDULE_PERIOD_OVERLAP')
    })

    test('201 back-to-back half-open boundary allowed', async ({ request }) => {
      const { ws, cat } = await setupWsAndCategory(request)
      await seedSchedule({
        workspaceId: ws.id,
        categoryId: cat.id,
        periodStart: JUL_START,
        periodEnd: JUL_END,
      })
      const res = await request.post(
        `/api/workspaces/${ws.id}/schedules`,
        {
          data: {
            categoryId: cat.id,
            periodStart: AUG_START.toISOString(),
            periodEnd: AUG_END.toISOString(),
          },
        },
      )
      expect(res.status()).toBe(201)
    })

    test('403 for COLABORADOR', async ({ request }) => {
      const ownerData = await seedUser()
      const tenant = await seedTenantWithOwner({ ownerId: ownerData.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: ownerData.id,
      })
      const cat = await seedCategory({
        scope: 'WORKSPACE',
        tenantId: tenant.id,
        workspaceId: ws.id,
        slug: 'uti',
        name: 'UTI',
      })
      const caller = await createUserFixture(request)
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: caller.user.id,
        role: 'COLABORADOR',
      })
      const res = await request.post(
        `/api/workspaces/${ws.id}/schedules`,
        {
          data: {
            categoryId: cat.id,
            periodStart: JUL_START.toISOString(),
            periodEnd: JUL_END.toISOString(),
          },
        },
      )
      expect(res.status()).toBe(403)
    })

    test('400 on invalid period (start >= end)', async ({ request }) => {
      const { ws, cat } = await setupWsAndCategory(request)
      const res = await request.post(
        `/api/workspaces/${ws.id}/schedules`,
        {
          data: {
            categoryId: cat.id,
            periodStart: JUL_END.toISOString(),
            periodEnd: JUL_START.toISOString(),
          },
        },
      )
      expect(res.status()).toBe(400)
    })

    test('401 without session cookie', async ({ request }) => {
      const res = await request.post(
        `/api/workspaces/${NON_EXISTENT_ID}/schedules`,
        {
          data: {
            categoryId: NON_EXISTENT_ID,
            periodStart: JUL_START.toISOString(),
            periodEnd: JUL_END.toISOString(),
          },
        },
      )
      expect(res.status()).toBe(401)
    })
  })

  test.describe('GET list', () => {
    test('200 returns schedules', async ({ request }) => {
      const { ws, cat } = await setupWsAndCategory(request)
      await seedSchedule({ workspaceId: ws.id, categoryId: cat.id })
      const res = await request.get(`/api/workspaces/${ws.id}/schedules`)
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.data).toHaveLength(1)
    })

    test('200 filters by status', async ({ request }) => {
      const { ws, cat } = await setupWsAndCategory(request)
      await seedSchedule({
        workspaceId: ws.id,
        categoryId: cat.id,
        status: 'DRAFT',
      })
      await seedSchedule({
        workspaceId: ws.id,
        categoryId: cat.id,
        status: 'PUBLISHED',
        periodStart: AUG_START,
        periodEnd: AUG_END,
      })
      const res = await request.get(
        `/api/workspaces/${ws.id}/schedules?status=PUBLISHED`,
      )
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.data).toHaveLength(1)
      expect(body.data[0].status).toBe('PUBLISHED')
    })

    test('403 non-member', async ({ request }) => {
      const ownerData = await seedUser()
      const tenant = await seedTenantWithOwner({ ownerId: ownerData.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: ownerData.id,
      })
      await createUserFixture(request)
      const res = await request.get(`/api/workspaces/${ws.id}/schedules`)
      expect(res.status()).toBe(403)
    })

    test('401 without session', async ({ request }) => {
      const res = await request.get(
        `/api/workspaces/${NON_EXISTENT_ID}/schedules`,
      )
      expect(res.status()).toBe(401)
    })
  })

  test.describe('GET detail', () => {
    test('200 returns schedule', async ({ request }) => {
      const { ws, cat } = await setupWsAndCategory(request)
      const sch = await seedSchedule({ workspaceId: ws.id, categoryId: cat.id })
      const res = await request.get(
        `/api/workspaces/${ws.id}/schedules/${sch.id}`,
      )
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.id).toBe(sch.id)
    })

    test('404 when schedule missing', async ({ request }) => {
      const { ws } = await setupWsAndCategory(request)
      const res = await request.get(
        `/api/workspaces/${ws.id}/schedules/${NON_EXISTENT_ID}`,
      )
      expect(res.status()).toBe(404)
    })

    test('401 without session', async ({ request }) => {
      const res = await request.get(
        `/api/workspaces/${NON_EXISTENT_ID}/schedules/${NON_EXISTENT_ID}`,
      )
      expect(res.status()).toBe(401)
    })
  })

  test.describe('PATCH', () => {
    test('200 updates DRAFT', async ({ request }) => {
      const { ws, cat } = await setupWsAndCategory(request)
      const sch = await seedSchedule({ workspaceId: ws.id, categoryId: cat.id })
      const res = await request.patch(
        `/api/workspaces/${ws.id}/schedules/${sch.id}`,
        { data: { name: 'Renamed' } },
      )
      expect(res.status()).toBe(200)
      expect((await res.json()).name).toBe('Renamed')
    })

    test('409 INVALID_STATE_TRANSITION on PUBLISHED', async ({ request }) => {
      const { ws, cat } = await setupWsAndCategory(request)
      const sch = await seedSchedule({
        workspaceId: ws.id,
        categoryId: cat.id,
        status: 'PUBLISHED',
      })
      const res = await request.patch(
        `/api/workspaces/${ws.id}/schedules/${sch.id}`,
        { data: { name: 'Valid Name' } },
      )
      expect(res.status()).toBe(409)
      expect((await res.json()).code).toBe('INVALID_STATE_TRANSITION')
    })

    test('401 without session', async ({ request }) => {
      const res = await request.patch(
        `/api/workspaces/${NON_EXISTENT_ID}/schedules/${NON_EXISTENT_ID}`,
        { data: { name: 'Valid Name' } },
      )
      expect(res.status()).toBe(401)
    })
  })

  test.describe('POST /publish', () => {
    test('200 publishes DRAFT', async ({ request }) => {
      const { ws, cat } = await setupWsAndCategory(request)
      const sch = await seedSchedule({ workspaceId: ws.id, categoryId: cat.id })
      const res = await request.post(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/publish`,
      )
      expect(res.status()).toBe(200)
      expect((await res.json()).status).toBe('PUBLISHED')
    })

    test('409 when already PUBLISHED', async ({ request }) => {
      const { ws, cat } = await setupWsAndCategory(request)
      const sch = await seedSchedule({
        workspaceId: ws.id,
        categoryId: cat.id,
        status: 'PUBLISHED',
      })
      const res = await request.post(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/publish`,
      )
      expect(res.status()).toBe(409)
    })

    test('401 without session', async ({ request }) => {
      const res = await request.post(
        `/api/workspaces/${NON_EXISTENT_ID}/schedules/${NON_EXISTENT_ID}/publish`,
      )
      expect(res.status()).toBe(401)
    })
  })

  test.describe('POST /close', () => {
    test('200 closes with closedEarly=true (before periodEnd)', async ({
      request,
    }) => {
      const { ws, cat } = await setupWsAndCategory(request)
      const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      const sch = await seedSchedule({
        workspaceId: ws.id,
        categoryId: cat.id,
        periodStart: new Date(),
        periodEnd: future,
        status: 'PUBLISHED',
      })
      const res = await request.post(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/close`,
      )
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.closedEarly).toBe(true)
      expect(body.schedule.status).toBe('CLOSED')
    })

    test('200 closes with closedEarly=false (after periodEnd)', async ({
      request,
    }) => {
      const { ws, cat } = await setupWsAndCategory(request)
      const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const sch = await seedSchedule({
        workspaceId: ws.id,
        categoryId: cat.id,
        periodStart: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        periodEnd: past,
        status: 'PUBLISHED',
      })
      const res = await request.post(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/close`,
      )
      expect(res.status()).toBe(200)
      expect((await res.json()).closedEarly).toBe(false)
    })

    test('409 on DRAFT', async ({ request }) => {
      const { ws, cat } = await setupWsAndCategory(request)
      const sch = await seedSchedule({ workspaceId: ws.id, categoryId: cat.id })
      const res = await request.post(
        `/api/workspaces/${ws.id}/schedules/${sch.id}/close`,
      )
      expect(res.status()).toBe(409)
    })

    test('401 without session', async ({ request }) => {
      const res = await request.post(
        `/api/workspaces/${NON_EXISTENT_ID}/schedules/${NON_EXISTENT_ID}/close`,
      )
      expect(res.status()).toBe(401)
    })
  })

  test.describe('DELETE', () => {
    test('204 hard-deletes DRAFT', async ({ request }) => {
      const { ws, cat } = await setupWsAndCategory(request)
      const sch = await seedSchedule({ workspaceId: ws.id, categoryId: cat.id })
      const res = await request.delete(
        `/api/workspaces/${ws.id}/schedules/${sch.id}`,
      )
      expect(res.status()).toBe(204)
      const rows = await query<ScheduleRow>(
        'SELECT * FROM "schedule" WHERE id = $1',
        [sch.id],
      )
      expect(rows).toHaveLength(0)
    })

    test('204 soft-deletes PUBLISHED', async ({ request }) => {
      const { ws, cat } = await setupWsAndCategory(request)
      const sch = await seedSchedule({
        workspaceId: ws.id,
        categoryId: cat.id,
        status: 'PUBLISHED',
      })
      const res = await request.delete(
        `/api/workspaces/${ws.id}/schedules/${sch.id}`,
      )
      expect(res.status()).toBe(204)
      const [row] = await query<ScheduleRow>(
        'SELECT * FROM "schedule" WHERE id = $1',
        [sch.id],
      )
      expect(row.is_active).toBe(false)
      expect(row.deleted_at).not.toBeNull()
    })

    test('401 without session', async ({ request }) => {
      const res = await request.delete(
        `/api/workspaces/${NON_EXISTENT_ID}/schedules/${NON_EXISTENT_ID}`,
      )
      expect(res.status()).toBe(401)
    })
  })
})
