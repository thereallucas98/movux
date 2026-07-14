import { expect, test } from '@playwright/test'
import {
  query,
  resetDatabase,
  type AuditLogRow,
  type SpecialtyRow,
} from './fixtures/db'
import {
  createUserFixture,
  seedSpecialty,
  seedTenantWithOwner,
  seedUser,
  seedWorkspaceMembership,
  seedWorkspaceWithAdmin,
} from './fixtures/factories'

const NON_EXISTENT_ID = '00000000-0000-0000-0000-000000000000'

test.describe('/api/workspaces/:id/specialties', () => {
  test.beforeEach(async () => {
    await resetDatabase()
  })

  test.describe('POST /api/workspaces/:id/specialties', () => {
    test('201 creates a custom specialty and writes audit', async ({
      request,
    }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
      })

      const res = await request.post(`/api/workspaces/${ws.id}/specialties`, {
        data: { slug: 'custom_role', name: 'Custom Role' },
      })
      expect(res.status()).toBe(201)
      const body = await res.json()
      expect(body).toMatchObject({
        scope: 'WORKSPACE',
        slug: 'custom_role',
        name: 'Custom Role',
        workspaceId: ws.id,
      })

      const audits = await query<AuditLogRow>(
        `SELECT * FROM "auditLog" WHERE entity_type = 'WORKSPACE_SPECIALTY' AND entity_id = $1`,
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
      await request.post(`/api/workspaces/${ws.id}/specialties`, {
        data: { slug: 'dup_role', name: 'First' },
      })
      const res = await request.post(`/api/workspaces/${ws.id}/specialties`, {
        data: { slug: 'dup_role', name: 'Second' },
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
      const res = await request.post(`/api/workspaces/${ws.id}/specialties`, {
        data: { slug: 'valid_slug', name: 'Valid Name' },
      })
      expect(res.status()).toBe(403)
    })

    test('400 when slug is invalid (uppercase)', async ({ request }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
      })
      const res = await request.post(`/api/workspaces/${ws.id}/specialties`, {
        data: { slug: 'INVALID SPACE', name: 'X' },
      })
      expect(res.status()).toBe(400)
    })

    test('accepts underscores in slug (e.g., nurse_tech)', async ({
      request,
    }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
      })
      const res = await request.post(`/api/workspaces/${ws.id}/specialties`, {
        data: { slug: 'nurse_tech', name: 'Técnico Enfermagem' },
      })
      expect(res.status()).toBe(201)
    })

    test('401 without session cookie', async ({ request }) => {
      const res = await request.post(
        `/api/workspaces/${NON_EXISTENT_ID}/specialties`,
        { data: { slug: 'valid_slug', name: 'Valid Name' } },
      )
      expect(res.status()).toBe(401)
    })
  })

  test.describe('GET /api/workspaces/:id/specialties', () => {
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

      await seedSpecialty({
        scope: 'GLOBAL',
        vertical: 'HOSPITAL',
        slug: 'nurse',
        name: 'Enfermeiro GLOBAL',
      })
      await seedSpecialty({
        scope: 'GLOBAL',
        vertical: 'HOSPITAL',
        slug: 'doctor',
        name: 'Médico(a)',
      })
      await seedSpecialty({
        scope: 'WORKSPACE',
        tenantId: tenant.id,
        workspaceId: ws.id,
        slug: 'nurse',
        name: 'Enfermeiro CUSTOM',
      })

      const res = await request.get(`/api/workspaces/${ws.id}/specialties`)
      expect(res.status()).toBe(200)
      const body: Array<{ slug: string; source: string; name: string }> =
        await res.json()

      const nurse = body.find((s) => s.slug === 'nurse')
      expect(nurse?.source).toBe('WORKSPACE')
      expect(nurse?.name).toBe('Enfermeiro CUSTOM')

      const doctor = body.find((s) => s.slug === 'doctor')
      expect(doctor?.source).toBe('GLOBAL')
    })

    test('200 also works for COLABORADOR', async ({ request }) => {
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

      const res = await request.get(`/api/workspaces/${ws.id}/specialties`)
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
      const res = await request.get(`/api/workspaces/${ws.id}/specialties`)
      expect(res.status()).toBe(403)
    })

    test('401 without session cookie', async ({ request }) => {
      const res = await request.get(
        `/api/workspaces/${NON_EXISTENT_ID}/specialties`,
      )
      expect(res.status()).toBe(401)
    })
  })

  test.describe('PATCH /api/workspaces/:id/specialties/:specialtyId', () => {
    test('200 updates a WORKSPACE-scope specialty', async ({ request }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
      })
      const sp = await seedSpecialty({
        scope: 'WORKSPACE',
        tenantId: tenant.id,
        workspaceId: ws.id,
        slug: 'custom',
        name: 'Old',
      })

      const res = await request.patch(
        `/api/workspaces/${ws.id}/specialties/${sp.id}`,
        { data: { name: 'New' } },
      )
      expect(res.status()).toBe(200)
      expect((await res.json()).name).toBe('New')
    })

    test('404 when targeting a GLOBAL specialty', async ({ request }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
      })
      const sp = await seedSpecialty({
        scope: 'GLOBAL',
        vertical: 'HOSPITAL',
        slug: 'nurse',
        name: 'Enfermeiro',
      })
      const res = await request.patch(
        `/api/workspaces/${ws.id}/specialties/${sp.id}`,
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
      const sp = await seedSpecialty({
        scope: 'WORKSPACE',
        tenantId: tenant.id,
        workspaceId: ws.id,
        slug: 'custom',
        name: 'X',
      })
      const res = await request.patch(
        `/api/workspaces/${ws.id}/specialties/${sp.id}`,
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
      const sp = await seedSpecialty({
        scope: 'WORKSPACE',
        tenantId: tenant.id,
        workspaceId: ws.id,
        slug: 'x',
        name: 'X',
      })
      await createUserFixture(request)
      const res = await request.patch(
        `/api/workspaces/${ws.id}/specialties/${sp.id}`,
        { data: { name: 'Valid Name' } },
      )
      expect(res.status()).toBe(403)
    })

    test('401 without session cookie', async ({ request }) => {
      const res = await request.patch(
        `/api/workspaces/${NON_EXISTENT_ID}/specialties/${NON_EXISTENT_ID}`,
        { data: { name: 'Valid Name' } },
      )
      expect(res.status()).toBe(401)
    })
  })

  test.describe('DELETE /api/workspaces/:id/specialties/:specialtyId', () => {
    test('204 soft-deletes a custom specialty', async ({ request }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
      })
      const sp = await seedSpecialty({
        scope: 'WORKSPACE',
        tenantId: tenant.id,
        workspaceId: ws.id,
        slug: 'custom',
        name: 'X',
      })

      const res = await request.delete(
        `/api/workspaces/${ws.id}/specialties/${sp.id}`,
      )
      expect(res.status()).toBe(204)

      const [fresh] = await query<SpecialtyRow>(
        'SELECT * FROM "specialty" WHERE id = $1',
        [sp.id],
      )
      expect(fresh?.is_active).toBe(false)
    })

    test('404 when specialty does not exist', async ({ request }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
      })
      const res = await request.delete(
        `/api/workspaces/${ws.id}/specialties/${NON_EXISTENT_ID}`,
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
      const sp = await seedSpecialty({
        scope: 'WORKSPACE',
        tenantId: tenant.id,
        workspaceId: ws.id,
        slug: 'x',
        name: 'X',
      })
      await createUserFixture(request)
      const res = await request.delete(
        `/api/workspaces/${ws.id}/specialties/${sp.id}`,
      )
      expect(res.status()).toBe(403)
    })

    test('401 without session cookie', async ({ request }) => {
      const res = await request.delete(
        `/api/workspaces/${NON_EXISTENT_ID}/specialties/${NON_EXISTENT_ID}`,
      )
      expect(res.status()).toBe(401)
    })
  })
})
