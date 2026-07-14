import { expect, test } from '@playwright/test'
import {
  query,
  resetDatabase,
  type AuditLogRow,
  type CategoryRow,
} from './fixtures/db'
import {
  createUserFixture,
  seedCategory,
  seedTenantWithOwner,
  seedUser,
  seedWorkspaceMembership,
  seedWorkspaceWithAdmin,
} from './fixtures/factories'

const NON_EXISTENT_ID = '00000000-0000-0000-0000-000000000000'

test.describe('/api/workspaces/:id/categories', () => {
  test.beforeEach(async () => {
    await resetDatabase()
  })

  test.describe('POST cascade (Geral auto-created by createWorkspace)', () => {
    test('GET returns the Geral category right after workspace creation', async ({
      request,
    }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })

      const created = await request.post('/api/workspaces', {
        data: {
          tenantId: tenant.id,
          name: 'Hospital Central',
          vertical: 'HOSPITAL',
        },
      })
      expect(created.status()).toBe(201)
      const { workspace } = await created.json()

      const list = await request.get(`/api/workspaces/${workspace.id}/categories`)
      expect(list.status()).toBe(200)
      const body = await list.json()
      const geral = body.find(
        (c: { slug: string }) => c.slug === 'general',
      )
      expect(geral).toBeDefined()
      expect(geral.source).toBe('WORKSPACE')
      expect(geral.name).toBe('Geral')
    })
  })

  test.describe('POST /api/workspaces/:id/categories', () => {
    test('201 creates a custom category and writes audit', async ({
      request,
    }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
      })

      const res = await request.post(`/api/workspaces/${ws.id}/categories`, {
        data: { slug: 'custom', name: 'Custom' },
      })
      expect(res.status()).toBe(201)
      const body = await res.json()
      expect(body).toMatchObject({
        scope: 'WORKSPACE',
        slug: 'custom',
        name: 'Custom',
        workspaceId: ws.id,
      })

      const audits = await query<AuditLogRow>(
        `SELECT * FROM "auditLog" WHERE entity_type = 'WORKSPACE_CATEGORY' AND entity_id = $1`,
        [body.id],
      )
      expect(audits.length).toBeGreaterThanOrEqual(1)
    })

    test('409 ALREADY_EXISTS on duplicate slug', async ({ request }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
      })
      await request.post(`/api/workspaces/${ws.id}/categories`, {
        data: { slug: 'dup', name: 'First' },
      })
      const res = await request.post(`/api/workspaces/${ws.id}/categories`, {
        data: { slug: 'dup', name: 'Second' },
      })
      expect(res.status()).toBe(409)
    })

    test('403 for non-ADMIN', async ({ request }) => {
      const outsider = await seedUser()
      const tenant = await seedTenantWithOwner({ ownerId: outsider.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: outsider.id,
      })
      await createUserFixture(request)
      const res = await request.post(`/api/workspaces/${ws.id}/categories`, {
        data: { slug: 'valid-slug', name: 'Valid Name' },
      })
      expect(res.status()).toBe(403)
    })

    test('400 when slug is invalid', async ({ request }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
      })
      const res = await request.post(`/api/workspaces/${ws.id}/categories`, {
        data: { slug: 'INVALID UPPER', name: 'X' },
      })
      expect(res.status()).toBe(400)
    })

    test('401 without session cookie', async ({ request }) => {
      const res = await request.post(
        `/api/workspaces/${NON_EXISTENT_ID}/categories`,
        { data: { slug: 'valid-slug', name: 'Valid Name' } },
      )
      expect(res.status()).toBe(401)
    })
  })

  test.describe('GET /api/workspaces/:id/categories', () => {
    test('200 returns merged list with override WORKSPACE > TENANT > GLOBAL', async ({
      request,
    }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
        vertical: 'HOSPITAL',
      })

      // Seed GLOBAL icu + nursing for HOSPITAL
      await seedCategory({
        scope: 'GLOBAL',
        vertical: 'HOSPITAL',
        slug: 'icu',
        name: 'UTI GLOBAL',
      })
      await seedCategory({
        scope: 'GLOBAL',
        vertical: 'HOSPITAL',
        slug: 'nursing',
        name: 'Enfermagem',
      })

      // Override icu at WORKSPACE level
      await seedCategory({
        scope: 'WORKSPACE',
        tenantId: tenant.id,
        workspaceId: ws.id,
        slug: 'icu',
        name: 'UTI CUSTOM',
      })

      const res = await request.get(`/api/workspaces/${ws.id}/categories`)
      expect(res.status()).toBe(200)
      const body: Array<{
        slug: string
        source: string
        name: string
      }> = await res.json()

      const icu = body.find((c) => c.slug === 'icu')
      expect(icu?.source).toBe('WORKSPACE')
      expect(icu?.name).toBe('UTI CUSTOM')

      const nursing = body.find((c) => c.slug === 'nursing')
      expect(nursing?.source).toBe('GLOBAL')

      // Geral comes from the createWorkspace cascade? No — seedWorkspaceWithAdmin
      // is direct SQL; no Geral. But if absent, it's absent.
      const slugs = body.map((c) => c.slug).sort()
      expect(slugs).toContain('icu')
      expect(slugs).toContain('nursing')
    })

    test('200 empty when no categories exist for the workspace vertical', async ({
      request,
    }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
      })
      const res = await request.get(`/api/workspaces/${ws.id}/categories`)
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(Array.isArray(body)).toBe(true)
    })

    test('200 also works for COLABORADOR (any active member)', async ({
      request,
    }) => {
      const ownerData = await seedUser()
      const tenant = await seedTenantWithOwner({ ownerId: ownerData.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: ownerData.id,
      })

      const caller = await createUserFixture(request)
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: caller.user.id,
        role: 'COLABORADOR',
      })

      const res = await request.get(`/api/workspaces/${ws.id}/categories`)
      expect(res.status()).toBe(200)
    })

    test('403 for non-member', async ({ request }) => {
      const outsider = await seedUser()
      const tenant = await seedTenantWithOwner({ ownerId: outsider.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: outsider.id,
      })
      await createUserFixture(request)
      const res = await request.get(`/api/workspaces/${ws.id}/categories`)
      expect(res.status()).toBe(403)
    })

    test('401 without session cookie', async ({ request }) => {
      const res = await request.get(
        `/api/workspaces/${NON_EXISTENT_ID}/categories`,
      )
      expect(res.status()).toBe(401)
    })
  })

  test.describe('PATCH /api/workspaces/:id/categories/:categoryId', () => {
    test('200 updates a WORKSPACE-scope category', async ({ request }) => {
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
        slug: 'custom',
        name: 'Old',
      })

      const res = await request.patch(
        `/api/workspaces/${ws.id}/categories/${cat.id}`,
        { data: { name: 'New' } },
      )
      expect(res.status()).toBe(200)
      expect((await res.json()).name).toBe('New')
    })

    test('404 when targeting a GLOBAL category', async ({ request }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
      })
      const cat = await seedCategory({
        scope: 'GLOBAL',
        vertical: 'HOSPITAL',
        slug: 'icu',
        name: 'UTI',
      })
      const res = await request.patch(
        `/api/workspaces/${ws.id}/categories/${cat.id}`,
        { data: { name: 'Hijack' } },
      )
      expect(res.status()).toBe(404)
    })

    test('400 when body is empty', async ({ request }) => {
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
        slug: 'custom',
        name: 'X',
      })
      const res = await request.patch(
        `/api/workspaces/${ws.id}/categories/${cat.id}`,
        { data: {} },
      )
      expect(res.status()).toBe(400)
    })

    test('403 for non-ADMIN', async ({ request }) => {
      const outsider = await seedUser()
      const tenant = await seedTenantWithOwner({ ownerId: outsider.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: outsider.id,
      })
      const cat = await seedCategory({
        scope: 'WORKSPACE',
        tenantId: tenant.id,
        workspaceId: ws.id,
        slug: 'x',
        name: 'X',
      })
      await createUserFixture(request)
      const res = await request.patch(
        `/api/workspaces/${ws.id}/categories/${cat.id}`,
        { data: { name: 'Hijack' } },
      )
      expect(res.status()).toBe(403)
    })

    test('401 without session cookie', async ({ request }) => {
      const res = await request.patch(
        `/api/workspaces/${NON_EXISTENT_ID}/categories/${NON_EXISTENT_ID}`,
        { data: { name: 'Valid Name' } },
      )
      expect(res.status()).toBe(401)
    })
  })

  test.describe('DELETE /api/workspaces/:id/categories/:categoryId', () => {
    test('204 soft-deletes a custom category', async ({ request }) => {
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
        slug: 'custom',
        name: 'X',
      })

      const res = await request.delete(
        `/api/workspaces/${ws.id}/categories/${cat.id}`,
      )
      expect(res.status()).toBe(204)

      const [fresh] = await query<CategoryRow>(
        'SELECT * FROM "category" WHERE id = $1',
        [cat.id],
      )
      expect(fresh?.is_active).toBe(false)
    })

    test('409 CANNOT_DELETE_GERAL when targeting the general category', async ({
      request,
    }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
      })
      const geral = await seedCategory({
        scope: 'WORKSPACE',
        tenantId: tenant.id,
        workspaceId: ws.id,
        slug: 'general',
        name: 'Geral',
      })
      const res = await request.delete(
        `/api/workspaces/${ws.id}/categories/${geral.id}`,
      )
      expect(res.status()).toBe(409)
      expect((await res.json()).code).toBe('CANNOT_DELETE_GERAL')
    })

    test('404 when category does not exist', async ({ request }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
      })
      const res = await request.delete(
        `/api/workspaces/${ws.id}/categories/${NON_EXISTENT_ID}`,
      )
      expect(res.status()).toBe(404)
    })

    test('403 for non-ADMIN', async ({ request }) => {
      const outsider = await seedUser()
      const tenant = await seedTenantWithOwner({ ownerId: outsider.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: outsider.id,
      })
      const cat = await seedCategory({
        scope: 'WORKSPACE',
        tenantId: tenant.id,
        workspaceId: ws.id,
        slug: 'x',
        name: 'X',
      })
      await createUserFixture(request)
      const res = await request.delete(
        `/api/workspaces/${ws.id}/categories/${cat.id}`,
      )
      expect(res.status()).toBe(403)
    })

    test('401 without session cookie', async ({ request }) => {
      const res = await request.delete(
        `/api/workspaces/${NON_EXISTENT_ID}/categories/${NON_EXISTENT_ID}`,
      )
      expect(res.status()).toBe(401)
    })
  })
})
