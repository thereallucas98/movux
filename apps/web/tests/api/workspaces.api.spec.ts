import { expect, test } from '@playwright/test'
import {
  query,
  resetDatabase,
  type AuditLogRow,
  type WorkspaceMembershipRow,
  type WorkspaceRow,
} from './fixtures/db'
import {
  createUserFixture,
  seedTenantWithOwner,
  seedUser,
  seedWorkspaceWithAdmin,
} from './fixtures/factories'

const NON_EXISTENT_ID = '00000000-0000-0000-0000-000000000000'

test.describe('/api/workspaces', () => {
  test.beforeEach(async () => {
    await resetDatabase()
  })

  test.describe('POST /api/workspaces', () => {
    test('201 creates workspace and auto-adds caller as ADMIN', async ({
      request,
    }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })

      const res = await request.post('/api/workspaces', {
        data: {
          tenantId: tenant.id,
          name: 'Hospital Central',
          vertical: 'HOSPITAL',
        },
      })
      expect(res.status()).toBe(201)
      const body = await res.json()
      expect(body.workspace).toMatchObject({
        tenantId: tenant.id,
        name: 'Hospital Central',
        vertical: 'HOSPITAL',
        isActive: true,
      })
      expect(body.membership).toMatchObject({
        workspaceId: body.workspace.id,
        userId: owner.user.id,
        role: 'ADMIN',
        isActive: true,
      })

      const memberships = await query<WorkspaceMembershipRow>(
        'SELECT * FROM "workspaceMembership" WHERE workspace_id = $1',
        [body.workspace.id],
      )
      expect(memberships).toHaveLength(1)
    })

    test('401 without session cookie', async ({ request }) => {
      const res = await request.post('/api/workspaces', {
        data: {
          tenantId: NON_EXISTENT_ID,
          name: 'Valid Name',
          vertical: 'HOSPITAL',
        },
      })
      expect(res.status()).toBe(401)
    })

    test('400 when name is too short', async ({ request }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const res = await request.post('/api/workspaces', {
        data: { tenantId: tenant.id, name: 'x', vertical: 'GYM' },
      })
      expect(res.status()).toBe(400)
    })

    test('400 when vertical is missing', async ({ request }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const res = await request.post('/api/workspaces', {
        data: { tenantId: tenant.id, name: 'Valid' },
      })
      expect(res.status()).toBe(400)
    })

    test('400 when timezone is not IANA', async ({ request }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const res = await request.post('/api/workspaces', {
        data: {
          tenantId: tenant.id,
          name: 'Valid',
          vertical: 'HOSPITAL',
          timezone: 'Not/Real',
        },
      })
      expect(res.status()).toBe(400)
    })

    test('403 when caller is not SUPER_ADMIN of tenant', async ({ request }) => {
      const outsider = await seedUser()
      const tenant = await seedTenantWithOwner({ ownerId: outsider.id })

      await createUserFixture(request)
      const res = await request.post('/api/workspaces', {
        data: { tenantId: tenant.id, name: 'Hijack', vertical: 'HOSPITAL' },
      })
      expect(res.status()).toBe(403)
    })
  })

  test.describe('GET /api/workspaces', () => {
    test('200 returns empty when user has no workspaces', async ({
      request,
    }) => {
      await createUserFixture(request)
      const res = await request.get('/api/workspaces')
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.data).toEqual([])
      expect(body.nextCursor).toBeNull()
    })

    test('200 returns only workspaces caller belongs to', async ({
      request,
    }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
        name: 'Mine A',
      })
      await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
        name: 'Mine B',
      })

      const outsider = await seedUser()
      const otherTenant = await seedTenantWithOwner({ ownerId: outsider.id })
      await seedWorkspaceWithAdmin({
        tenantId: otherTenant.id,
        ownerId: outsider.id,
        name: 'Not Mine',
      })

      const res = await request.get('/api/workspaces')
      expect(res.status()).toBe(200)
      const body = await res.json()
      const names = body.data.map((w: { name: string }) => w.name).sort()
      expect(names).toEqual(['Mine A', 'Mine B'])
    })

    test('200 paginates with nextCursor', async ({ request }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      for (let i = 0; i < 3; i += 1) {
        await seedWorkspaceWithAdmin({
          tenantId: tenant.id,
          ownerId: owner.user.id,
          name: `WS ${i}`,
        })
      }
      const res = await request.get('/api/workspaces?limit=2')
      const body = await res.json()
      expect(body.data).toHaveLength(2)
      expect(body.nextCursor).toBeTruthy()
    })

    test('401 without session cookie', async ({ request }) => {
      const res = await request.get('/api/workspaces')
      expect(res.status()).toBe(401)
    })
  })

  test.describe('GET /api/tenants/:id/workspaces', () => {
    test('200 lists workspaces for SUPER_ADMIN of tenant', async ({
      request,
    }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
        name: 'WS A',
      })

      const res = await request.get(`/api/tenants/${tenant.id}/workspaces`)
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.data).toHaveLength(1)
    })

    test('403 for non-SUPER_ADMIN', async ({ request }) => {
      const outsider = await seedUser()
      const tenant = await seedTenantWithOwner({ ownerId: outsider.id })
      await createUserFixture(request)
      const res = await request.get(`/api/tenants/${tenant.id}/workspaces`)
      expect(res.status()).toBe(403)
    })

    test('401 without session cookie', async ({ request }) => {
      const res = await request.get(`/api/tenants/${NON_EXISTENT_ID}/workspaces`)
      expect(res.status()).toBe(401)
    })
  })

  test.describe('GET /api/workspaces/:id', () => {
    test('200 returns workspace + memberships for ADMIN', async ({
      request,
    }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
      })
      const res = await request.get(`/api/workspaces/${ws.id}`)
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.id).toBe(ws.id)
      expect(body.memberships).toHaveLength(1)
    })

    test('200 returns workspace without memberships for COLABORADOR', async ({
      request,
    }) => {
      // Owner creates ws. Caller = seeded COLABORADOR member.
      const ownerData = await seedUser()
      const tenant = await seedTenantWithOwner({ ownerId: ownerData.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: ownerData.id,
      })

      const caller = await createUserFixture(request)
      const { seedWorkspaceMembership } = await import('./fixtures/factories')
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: caller.user.id,
        role: 'COLABORADOR',
      })

      const res = await request.get(`/api/workspaces/${ws.id}`)
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.memberships).toEqual([])
    })

    test('403 for non-member', async ({ request }) => {
      const outsider = await seedUser()
      const tenant = await seedTenantWithOwner({ ownerId: outsider.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: outsider.id,
      })
      await createUserFixture(request)
      const res = await request.get(`/api/workspaces/${ws.id}`)
      expect(res.status()).toBe(403)
    })

    test('401 without session cookie', async ({ request }) => {
      const res = await request.get(`/api/workspaces/${NON_EXISTENT_ID}`)
      expect(res.status()).toBe(401)
    })
  })

  test.describe('PATCH /api/workspaces/:id', () => {
    test('200 updates workspace and writes audit', async ({ request }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
      })

      const res = await request.patch(`/api/workspaces/${ws.id}`, {
        data: { name: 'Renamed' },
      })
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.name).toBe('Renamed')

      const audits = await query<AuditLogRow>(
        `SELECT * FROM "auditLog" WHERE entity_type = 'WORKSPACE' AND entity_id = $1`,
        [ws.id],
      )
      expect(audits.length).toBeGreaterThanOrEqual(1)
    })

    test('400 when body is empty', async ({ request }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
      })
      const res = await request.patch(`/api/workspaces/${ws.id}`, { data: {} })
      expect(res.status()).toBe(400)
    })

    test('403 for non-ADMIN', async ({ request }) => {
      const outsider = await seedUser()
      const tenant = await seedTenantWithOwner({ ownerId: outsider.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: outsider.id,
      })
      await createUserFixture(request)
      const res = await request.patch(`/api/workspaces/${ws.id}`, {
        data: { name: 'Hijack Attempt' },
      })
      expect(res.status()).toBe(403)
    })

    test('401 without session cookie', async ({ request }) => {
      const res = await request.patch(`/api/workspaces/${NON_EXISTENT_ID}`, {
        data: { name: 'Valid Name' },
      })
      expect(res.status()).toBe(401)
    })
  })

  test.describe('DELETE /api/workspaces/:id', () => {
    test('204 soft-deletes workspace and cascades memberships', async ({
      request,
    }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
      })

      const res = await request.delete(`/api/workspaces/${ws.id}`)
      expect(res.status()).toBe(204)

      const [fresh] = await query<WorkspaceRow>(
        'SELECT * FROM "workspace" WHERE id = $1',
        [ws.id],
      )
      expect(fresh?.is_active).toBe(false)
      expect(fresh?.deleted_at).not.toBeNull()

      const memberships = await query<WorkspaceMembershipRow>(
        'SELECT * FROM "workspaceMembership" WHERE workspace_id = $1 AND is_active = true',
        [ws.id],
      )
      expect(memberships).toHaveLength(0)
    })

    test('403 for non-ADMIN', async ({ request }) => {
      const outsider = await seedUser()
      const tenant = await seedTenantWithOwner({ ownerId: outsider.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: outsider.id,
      })
      await createUserFixture(request)
      const res = await request.delete(`/api/workspaces/${ws.id}`)
      expect(res.status()).toBe(403)
    })

    test('401 without session cookie', async ({ request }) => {
      const res = await request.delete(`/api/workspaces/${NON_EXISTENT_ID}`)
      expect(res.status()).toBe(401)
    })
  })
})
