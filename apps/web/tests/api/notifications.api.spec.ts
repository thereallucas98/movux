import type { APIRequestContext } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { query, resetDatabase } from './fixtures/db'
import {
  createUserFixture,
  seedCategory,
  seedSchedule,
  seedShift,
  seedTenantWithOwner,
  seedWorkspaceMembership,
  seedWorkspaceWithAdmin,
} from './fixtures/factories'

const NON_EXISTENT = '00000000-0000-0000-0000-000000000000'

interface Setup {
  admin: Awaited<ReturnType<typeof createUserFixture>>
  colaborador: Awaited<ReturnType<typeof createUserFixture>>
  ws: { id: string }
  schedule: { id: string }
  shift: { id: string }
}

async function setup(request: APIRequestContext): Promise<Setup> {
  const admin = await createUserFixture(request)
  const tenant = await seedTenantWithOwner({ ownerId: admin.user.id })
  const ws = await seedWorkspaceWithAdmin({
    tenantId: tenant.id,
    ownerId: admin.user.id,
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
    startAt: new Date('2026-10-15T08:00:00Z'),
    endAt: new Date('2026-10-15T17:00:00Z'),
    headcount: 1,
  })
  // Create the colaborador via real registration (so they have their own cookie jar).
  const colaborador = await createUserFixture(request)
  await seedWorkspaceMembership({
    workspaceId: ws.id,
    userId: colaborador.user.id,
    role: 'COLABORADOR',
  })
  return { admin, colaborador, ws, schedule: sch, shift }
}

async function loginAs(
  request: APIRequestContext,
  user: { email: string; password: string },
): Promise<void> {
  const res = await request.post('/api/auth/login', {
    data: { email: user.email, password: user.password },
  })
  expect(res.status()).toBe(200)
}

test.describe('/api/me/notifications', () => {
  test.beforeEach(async () => {
    await resetDatabase()
  })

  test('401 without cookie', async ({ request }) => {
    const res = await request.get('/api/me/notifications', {
      headers: { cookie: '' },
    })
    expect(res.status()).toBe(401)
  })

  test('GET returns empty list for fresh user', async ({ request }) => {
    await createUserFixture(request)
    const res = await request.get('/api/me/notifications')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data).toEqual([])
    expect(body.nextCursor).toBeNull()
  })

  test('admin assigning colaborador produces ASSIGNMENT_CREATED notification', async ({
    request,
  }) => {
    const s = await setup(request)
    // Admin re-login (createUserFixture for colaborador switched the cookie jar).
    await loginAs(request, {
      email: s.admin.email,
      password: s.admin.password,
    })
    const assignRes = await request.post(
      `/api/workspaces/${s.ws.id}/schedules/${s.schedule.id}/shifts/${s.shift.id}/assignments`,
      { data: { userIds: [s.colaborador.user.id] } },
    )
    expect(assignRes.status()).toBe(201)

    // Login as colaborador to read inbox.
    await loginAs(request, {
      email: s.colaborador.email,
      password: s.colaborador.password,
    })
    const listRes = await request.get('/api/me/notifications')
    expect(listRes.status()).toBe(200)
    const list = await listRes.json()
    expect(list.data.length).toBeGreaterThan(0)
    const created = list.data.find(
      (n: { type: string }) => n.type === 'ASSIGNMENT_CREATED',
    )
    expect(created).toBeTruthy()
    expect(created.readAt).toBeNull()
  })

  test('unread-count returns the colaborador unread count', async ({
    request,
  }) => {
    const s = await setup(request)
    await loginAs(request, {
      email: s.admin.email,
      password: s.admin.password,
    })
    await request.post(
      `/api/workspaces/${s.ws.id}/schedules/${s.schedule.id}/shifts/${s.shift.id}/assignments`,
      { data: { userIds: [s.colaborador.user.id] } },
    )
    await loginAs(request, {
      email: s.colaborador.email,
      password: s.colaborador.password,
    })
    const res = await request.get('/api/me/notifications/unread-count')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.count).toBeGreaterThanOrEqual(1)
  })

  test('mark-as-read flips readAt, idempotent on second call', async ({
    request,
  }) => {
    const s = await setup(request)
    await loginAs(request, {
      email: s.admin.email,
      password: s.admin.password,
    })
    await request.post(
      `/api/workspaces/${s.ws.id}/schedules/${s.schedule.id}/shifts/${s.shift.id}/assignments`,
      { data: { userIds: [s.colaborador.user.id] } },
    )
    await loginAs(request, {
      email: s.colaborador.email,
      password: s.colaborador.password,
    })
    const list = await (await request.get('/api/me/notifications')).json()
    const id = list.data[0].id
    const r1 = await request.post(`/api/me/notifications/${id}/read`)
    expect(r1.status()).toBe(200)
    const body1 = await r1.json()
    expect(body1.readAt).toBeTruthy()
    const r2 = await request.post(`/api/me/notifications/${id}/read`)
    expect(r2.status()).toBe(200)
    const body2 = await r2.json()
    expect(body2.readAt).toBe(body1.readAt) // unchanged
  })

  test('cross-user mark-as-read returns 404 (does not leak existence)', async ({
    request,
  }) => {
    const s = await setup(request)
    await loginAs(request, {
      email: s.admin.email,
      password: s.admin.password,
    })
    await request.post(
      `/api/workspaces/${s.ws.id}/schedules/${s.schedule.id}/shifts/${s.shift.id}/assignments`,
      { data: { userIds: [s.colaborador.user.id] } },
    )
    // Pull colaborador's notification id directly from DB so we can attempt
    // a cross-user read while staying logged in as admin.
    const rows = await query<{ id: string }>(
      `SELECT id FROM notification WHERE user_id = $1 LIMIT 1`,
      [s.colaborador.user.id],
    )
    const otherId = rows[0]?.id
    expect(otherId).toBeTruthy()
    const res = await request.post(`/api/me/notifications/${otherId}/read`)
    expect(res.status()).toBe(404)
  })

  test('mark-all-read returns updated count', async ({ request }) => {
    const s = await setup(request)
    await loginAs(request, {
      email: s.admin.email,
      password: s.admin.password,
    })
    await request.post(
      `/api/workspaces/${s.ws.id}/schedules/${s.schedule.id}/shifts/${s.shift.id}/assignments`,
      { data: { userIds: [s.colaborador.user.id] } },
    )
    await loginAs(request, {
      email: s.colaborador.email,
      password: s.colaborador.password,
    })
    const res = await request.post('/api/me/notifications/read-all')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.updated).toBeGreaterThanOrEqual(1)
    const next = await (
      await request.get('/api/me/notifications/unread-count')
    ).json()
    expect(next.count).toBe(0)
  })

  test('400 on /:id/read with non-uuid', async ({ request }) => {
    await createUserFixture(request)
    const res = await request.post('/api/me/notifications/not-a-uuid/read')
    expect(res.status()).toBe(400)
  })

  test('GET preferences returns full grid (16 types × 4 channels = 64)', async ({
    request,
  }) => {
    await createUserFixture(request)
    const res = await request.get('/api/me/notification-preferences')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(64)
    const whatsapp = body.data.find(
      (p: { channel: string }) => p.channel === 'WHATSAPP',
    )
    expect(whatsapp.enabled).toBe(false) // LGPD-conservative default
  })

  test('PATCH preferences upserts and returns the updated grid', async ({
    request,
  }) => {
    await createUserFixture(request)
    const res = await request.patch('/api/me/notification-preferences', {
      data: {
        updates: [
          {
            type: 'ASSIGNMENT_CREATED',
            channel: 'IN_APP',
            enabled: false,
          },
        ],
      },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    const updated = body.data.find(
      (p: { type: string; channel: string }) =>
        p.type === 'ASSIGNMENT_CREATED' && p.channel === 'IN_APP',
    )
    expect(updated.enabled).toBe(false)
  })

  test('400 on PATCH with empty updates array', async ({ request }) => {
    await createUserFixture(request)
    const res = await request.patch('/api/me/notification-preferences', {
      data: { updates: [] },
    })
    expect(res.status()).toBe(400)
  })

  test('disabling IN_APP for ASSIGNMENT_CREATED suppresses subsequent rows', async ({
    request,
  }) => {
    const s = await setup(request)
    // Colaborador disables IN_APP for ASSIGNMENT_CREATED
    await loginAs(request, {
      email: s.colaborador.email,
      password: s.colaborador.password,
    })
    await request.patch('/api/me/notification-preferences', {
      data: {
        updates: [
          {
            type: 'ASSIGNMENT_CREATED',
            channel: 'IN_APP',
            enabled: false,
          },
        ],
      },
    })
    // Admin assigns
    await loginAs(request, {
      email: s.admin.email,
      password: s.admin.password,
    })
    await request.post(
      `/api/workspaces/${s.ws.id}/schedules/${s.schedule.id}/shifts/${s.shift.id}/assignments`,
      { data: { userIds: [s.colaborador.user.id] } },
    )
    // Colaborador inbox should remain empty for ASSIGNMENT_CREATED
    await loginAs(request, {
      email: s.colaborador.email,
      password: s.colaborador.password,
    })
    const list = await (await request.get('/api/me/notifications')).json()
    const created = list.data.find(
      (n: { type: string }) => n.type === 'ASSIGNMENT_CREATED',
    )
    expect(created).toBeUndefined()
  })

  test('NOT_FOUND when notification id does not exist for principal', async ({
    request,
  }) => {
    await createUserFixture(request)
    const res = await request.post(`/api/me/notifications/${NON_EXISTENT}/read`)
    expect(res.status()).toBe(404)
  })
})
