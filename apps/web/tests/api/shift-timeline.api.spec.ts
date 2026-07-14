import type { APIRequestContext } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { resetDatabase } from './fixtures/db'
import {
  createUserFixture,
  seedAuditLog,
  seedCategory,
  seedSchedule,
  seedShift,
  seedShiftAssignment,
  seedShiftTimelineNote,
  seedTenantWithOwner,
  seedUser,
  seedWorkspaceMembership,
  seedWorkspaceWithAdmin,
} from './fixtures/factories'

const NON_EXISTENT = '00000000-0000-0000-0000-000000000000'

interface Setup {
  owner: Awaited<ReturnType<typeof createUserFixture>>
  ws: { id: string }
  shift: { id: string }
  assigneeUserDbId: string
}

async function setup(request: APIRequestContext): Promise<Setup> {
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
    startAt: new Date('2026-10-15T08:00:00Z'),
    endAt: new Date('2026-10-15T17:00:00Z'),
    headcount: 1,
  })
  const assignee = await seedUser()
  await seedWorkspaceMembership({
    workspaceId: ws.id,
    userId: assignee.id,
    role: 'COLABORADOR',
  })
  await seedShiftAssignment({
    shiftId: shift.id,
    userId: assignee.id,
    assignedByUserId: owner.user.id,
    status: 'ACCEPTED',
  })
  return { owner, ws, shift, assigneeUserDbId: assignee.id }
}

test.describe('/api/shifts/:shiftId/timeline (+ /notes)', () => {
  test.beforeEach(async () => {
    await resetDatabase()
  })

  test.describe('GET timeline', () => {
    test('200 ADMIN sees projected events from audit log', async ({
      request,
    }) => {
      const s = await setup(request)
      await seedAuditLog({
        actorUserId: s.owner.user.id,
        action: 'SHIFT_CREATED',
        entityType: 'SHIFT',
        entityId: s.shift.id,
        metadata: { scheduleId: 'x' },
        createdAt: new Date('2026-10-01T12:00:00Z'),
      })
      const res = await request.get(
        `/api/shifts/${s.shift.id}/timeline`,
      )
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(Array.isArray(body.data)).toBe(true)
      expect(body.data.find((e: { type: string }) => e.type === 'CREATED')).toBeTruthy()
    })

    test('200 includes NOTE_ADDED events from notes table (full body)', async ({
      request,
    }) => {
      const s = await setup(request)
      await seedShiftTimelineNote({
        shiftId: s.shift.id,
        authorUserId: s.owner.user.id,
        note: 'handoff: paciente estável',
      })
      const res = await request.get(
        `/api/shifts/${s.shift.id}/timeline`,
      )
      expect(res.status()).toBe(200)
      const body = await res.json()
      const note = body.data.find(
        (e: { type: string }) => e.type === 'NOTE_ADDED',
      )
      expect(note?.payload?.note).toBe('handoff: paciente estável')
    })

    test('200 projects metadata.shiftId match', async ({ request }) => {
      const s = await setup(request)
      await seedAuditLog({
        actorUserId: s.owner.user.id,
        action: 'ASSIGNMENT_ACCEPTED',
        entityType: 'SHIFT_ASSIGNMENT',
        entityId: 'asg-x',
        metadata: { shiftId: s.shift.id },
        createdAt: new Date('2026-10-01T13:00:00Z'),
      })
      const res = await request.get(
        `/api/shifts/${s.shift.id}/timeline`,
      )
      const body = await res.json()
      expect(
        body.data.some((e: { type: string }) => e.type === 'ACCEPTED'),
      ).toBe(true)
    })

    test('respects ?order=desc', async ({ request }) => {
      const s = await setup(request)
      const t1 = new Date('2026-10-01T08:00:00Z')
      const t2 = new Date('2026-10-01T09:00:00Z')
      await seedAuditLog({
        actorUserId: s.owner.user.id,
        action: 'SHIFT_CREATED',
        entityType: 'SHIFT',
        entityId: s.shift.id,
        metadata: null,
        createdAt: t1,
      })
      await seedAuditLog({
        actorUserId: s.owner.user.id,
        action: 'ASSIGNMENT_CREATED',
        entityType: 'SHIFT_ASSIGNMENT',
        entityId: 'asg-x',
        metadata: { shiftId: s.shift.id },
        createdAt: t2,
      })
      const res = await request.get(
        `/api/shifts/${s.shift.id}/timeline?order=desc`,
      )
      const body = await res.json()
      const types = body.data.map((e: { type: string }) => e.type)
      // ASSIGNED (newer) should come before CREATED in desc order.
      expect(types.indexOf('ASSIGNED')).toBeLessThan(types.indexOf('CREATED'))
    })

    test('?since filter in the future returns empty', async ({ request }) => {
      // NOTE: precise boundary tests live in unit tests; pg + timestamp-without-tz
      // makes absolute datetime assertions environmental in API E2E (see Task 13
      // §11 for the same caveat).
      const s = await setup(request)
      await seedAuditLog({
        actorUserId: s.owner.user.id,
        action: 'SHIFT_CREATED',
        entityType: 'SHIFT',
        entityId: s.shift.id,
        metadata: null,
      })
      const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      const res = await request.get(
        `/api/shifts/${s.shift.id}/timeline?since=${future}`,
      )
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.data).toEqual([])
    })

    test('400 on invalid order value', async ({ request }) => {
      const s = await setup(request)
      const res = await request.get(
        `/api/shifts/${s.shift.id}/timeline?order=newest`,
      )
      expect(res.status()).toBe(400)
    })

    test('401 unauthenticated', async ({ playwright }) => {
      const ctx = await playwright.request.newContext()
      const res = await ctx.get(`/api/shifts/${NON_EXISTENT}/timeline`)
      expect(res.status()).toBe(401)
      await ctx.dispose()
    })

    test('404 outsider (non-workspace-member)', async ({
      request,
      playwright,
    }) => {
      const s = await setup(request)
      const ctx = await playwright.request.newContext()
      await createUserFixture(ctx)
      const res = await ctx.get(`/api/shifts/${s.shift.id}/timeline`)
      expect(res.status()).toBe(404)
      await ctx.dispose()
    })

    test('403 workspace member but not participant', async ({
      request,
      playwright,
    }) => {
      const s = await setup(request)
      const colabCtx = await playwright.request.newContext()
      const colab = await createUserFixture(colabCtx)
      await seedWorkspaceMembership({
        workspaceId: s.ws.id,
        userId: colab.user.id,
        role: 'COLABORADOR',
      })
      const res = await colabCtx.get(`/api/shifts/${s.shift.id}/timeline`)
      expect(res.status()).toBe(403)
      await colabCtx.dispose()
    })

    test('404 unknown shift', async ({ request }) => {
      await setup(request)
      const res = await request.get(`/api/shifts/${NON_EXISTENT}/timeline`)
      expect(res.status()).toBe(404)
    })
  })

  test.describe('POST notes', () => {
    test('201 creates note (Coord/Admin) and appears in subsequent GET', async ({
      request,
    }) => {
      const s = await setup(request)
      const post = await request.post(
        `/api/shifts/${s.shift.id}/timeline/notes`,
        { data: { note: 'handoff' } },
      )
      expect(post.status()).toBe(201)
      const created = await post.json()
      expect(created.type).toBe('NOTE_ADDED')

      const list = await request.get(`/api/shifts/${s.shift.id}/timeline`)
      const body = await list.json()
      expect(
        body.data.some(
          (e: { type: string; payload?: { note?: string } }) =>
            e.type === 'NOTE_ADDED' && e.payload?.note === 'handoff',
        ),
      ).toBe(true)
    })

    test('400 empty note rejected', async ({ request }) => {
      const s = await setup(request)
      const res = await request.post(
        `/api/shifts/${s.shift.id}/timeline/notes`,
        { data: { note: '   ' } },
      )
      expect(res.status()).toBe(400)
    })

    test('400 oversize note rejected', async ({ request }) => {
      const s = await setup(request)
      const res = await request.post(
        `/api/shifts/${s.shift.id}/timeline/notes`,
        { data: { note: 'a'.repeat(2001) } },
      )
      expect(res.status()).toBe(400)
    })

    test('401 unauthenticated', async ({ playwright }) => {
      const ctx = await playwright.request.newContext()
      const res = await ctx.post(`/api/shifts/${NON_EXISTENT}/timeline/notes`, {
        data: { note: 'x' },
      })
      expect(res.status()).toBe(401)
      await ctx.dispose()
    })

    test('403 workspace member but not participant', async ({
      request,
      playwright,
    }) => {
      const s = await setup(request)
      const colabCtx = await playwright.request.newContext()
      const colab = await createUserFixture(colabCtx)
      await seedWorkspaceMembership({
        workspaceId: s.ws.id,
        userId: colab.user.id,
        role: 'COLABORADOR',
      })
      const res = await colabCtx.post(
        `/api/shifts/${s.shift.id}/timeline/notes`,
        { data: { note: 'spam' } },
      )
      expect(res.status()).toBe(403)
      await colabCtx.dispose()
    })

    test('404 outsider', async ({ request, playwright }) => {
      const s = await setup(request)
      const ctx = await playwright.request.newContext()
      await createUserFixture(ctx)
      const res = await ctx.post(
        `/api/shifts/${s.shift.id}/timeline/notes`,
        { data: { note: 'x' } },
      )
      expect(res.status()).toBe(404)
      await ctx.dispose()
    })
  })
})
