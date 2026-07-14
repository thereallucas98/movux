import { expect, test } from '@playwright/test'
import {
  query,
  resetDatabase,
  type AuditLogRow,
  type MembershipRow,
  type TenantRow,
} from './fixtures/db'
import {
  createUserFixture,
  seedTenantWithOwner,
  seedUser,
} from './fixtures/factories'

const NON_EXISTENT_ID = '00000000-0000-0000-0000-000000000000'

test.describe('/api/tenants', () => {
  test.beforeEach(async () => {
    await resetDatabase()
  })

  test.describe('POST /api/tenants', () => {
    test('201 creates a tenant and auto-adds caller as SUPER_ADMIN', async ({
      request,
    }) => {
      const { user } = await createUserFixture(request)

      const res = await request.post('/api/tenants', {
        data: { name: 'Hospital Central', timezone: 'America/Sao_Paulo' },
      })

      expect(res.status()).toBe(201)
      const body = await res.json()
      expect(body.tenant).toMatchObject({
        name: 'Hospital Central',
        timezone: 'America/Sao_Paulo',
        isActive: true,
      })
      expect(body.membership).toMatchObject({
        tenantId: body.tenant.id,
        userId: user.id,
        role: 'SUPER_ADMIN',
        isActive: true,
      })

      const memberships = await query<MembershipRow>(
        'SELECT * FROM "tenantMembership" WHERE tenant_id = $1',
        [body.tenant.id],
      )
      expect(memberships).toHaveLength(1)
    })

    test('201 defaults timezone to America/Sao_Paulo when omitted', async ({
      request,
    }) => {
      await createUserFixture(request)
      const res = await request.post('/api/tenants', {
        data: { name: 'Clínica Luz' },
      })
      expect(res.status()).toBe(201)
      const body = await res.json()
      expect(body.tenant.timezone).toBe('America/Sao_Paulo')
    })

    test('401 without session cookie', async ({ request }) => {
      const res = await request.post('/api/tenants', {
        data: { name: 'Anon Tenant' },
      })
      expect(res.status()).toBe(401)
    })

    test('400 when name is too short', async ({ request }) => {
      await createUserFixture(request)
      const res = await request.post('/api/tenants', {
        data: { name: 'x' },
      })
      expect(res.status()).toBe(400)
    })

    test('400 when body is empty', async ({ request }) => {
      await createUserFixture(request)
      const res = await request.post('/api/tenants', { data: {} })
      expect(res.status()).toBe(400)
    })

    test('400 when timezone is not a valid IANA zone', async ({ request }) => {
      await createUserFixture(request)
      const res = await request.post('/api/tenants', {
        data: { name: 'Hospital X', timezone: 'Not/A/Real_Zone' },
      })
      expect(res.status()).toBe(400)
    })
  })

  test.describe('GET /api/tenants', () => {
    test('200 lists only tenants the caller belongs to', async ({
      request,
    }) => {
      const owner = await createUserFixture(request)
      await seedTenantWithOwner({ ownerId: owner.user.id, name: 'Mine A' })
      await seedTenantWithOwner({ ownerId: owner.user.id, name: 'Mine B' })

      const outsider = await seedUser({ fullName: 'Other Owner' })
      await seedTenantWithOwner({ ownerId: outsider.id, name: 'Not Mine' })

      const res = await request.get('/api/tenants')
      expect(res.status()).toBe(200)
      const body = await res.json()
      const names = body.data.map((t: { name: string }) => t.name).sort()
      expect(names).toEqual(['Mine A', 'Mine B'])
      expect(body.nextCursor).toBeNull()
    })

    test('200 returns empty list when caller has no tenants', async ({
      request,
    }) => {
      await createUserFixture(request)
      const res = await request.get('/api/tenants')
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.data).toEqual([])
      expect(body.nextCursor).toBeNull()
    })

    test('200 paginates with nextCursor when more than limit', async ({
      request,
    }) => {
      const owner = await createUserFixture(request)
      for (let i = 0; i < 3; i += 1) {
        await seedTenantWithOwner({
          ownerId: owner.user.id,
          name: `Tenant ${i}`,
        })
      }
      const res = await request.get('/api/tenants?limit=2')
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.data).toHaveLength(2)
      expect(body.nextCursor).toBeTruthy()

      const res2 = await request.get(
        `/api/tenants?limit=2&cursor=${encodeURIComponent(body.nextCursor)}`,
      )
      expect(res2.status()).toBe(200)
      const body2 = await res2.json()
      expect(body2.data).toHaveLength(1)
      expect(body2.nextCursor).toBeNull()
    })

    test('401 without session cookie', async ({ request }) => {
      const res = await request.get('/api/tenants')
      expect(res.status()).toBe(401)
    })
  })

  test.describe('GET /api/tenants/:id', () => {
    test('200 returns tenant with memberships for SUPER_ADMIN', async ({
      request,
    }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({
        ownerId: owner.user.id,
        name: 'Detail Hospital',
      })

      const res = await request.get(`/api/tenants/${tenant.id}`)
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body).toMatchObject({
        id: tenant.id,
        name: 'Detail Hospital',
      })
      expect(body.memberships).toHaveLength(1)
      expect(body.memberships[0].user.id).toBe(owner.user.id)
      expect(body.nextMembershipCursor).toBeNull()
    })

    test('403 when caller is not a member', async ({ request }) => {
      const outsider = await seedUser()
      const tenant = await seedTenantWithOwner({ ownerId: outsider.id })

      await createUserFixture(request)
      const res = await request.get(`/api/tenants/${tenant.id}`)
      expect(res.status()).toBe(403)
    })

    test('403 for nonexistent tenant (non-member semantics)', async ({
      request,
    }) => {
      await createUserFixture(request)
      const res = await request.get(`/api/tenants/${NON_EXISTENT_ID}`)
      expect(res.status()).toBe(403)
    })

    test('401 without session cookie', async ({ request }) => {
      const res = await request.get(`/api/tenants/${NON_EXISTENT_ID}`)
      expect(res.status()).toBe(401)
    })
  })

  test.describe('PATCH /api/tenants/:id', () => {
    test('200 updates tenant name and writes audit log', async ({
      request,
    }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })

      const res = await request.patch(`/api/tenants/${tenant.id}`, {
        data: { name: 'Renamed Hospital' },
      })
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.name).toBe('Renamed Hospital')

      const audits = await query<AuditLogRow>(
        `SELECT * FROM "auditLog" WHERE entity_type = 'TENANT' AND entity_id = $1`,
        [tenant.id],
      )
      expect(audits.length).toBeGreaterThanOrEqual(1)
    })

    test('400 when body is empty', async ({ request }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const res = await request.patch(`/api/tenants/${tenant.id}`, { data: {} })
      expect(res.status()).toBe(400)
    })

    test('403 when caller is not SUPER_ADMIN of the tenant', async ({
      request,
    }) => {
      const outsider = await seedUser()
      const tenant = await seedTenantWithOwner({ ownerId: outsider.id })
      await createUserFixture(request)
      const res = await request.patch(`/api/tenants/${tenant.id}`, {
        data: { name: 'Hijack' },
      })
      expect(res.status()).toBe(403)
    })

    test('403 for nonexistent tenant', async ({ request }) => {
      await createUserFixture(request)
      const res = await request.patch(`/api/tenants/${NON_EXISTENT_ID}`, {
        data: { name: 'Ghost' },
      })
      expect(res.status()).toBe(403)
    })

    test('401 without session cookie', async ({ request }) => {
      const res = await request.patch(`/api/tenants/${NON_EXISTENT_ID}`, {
        data: { name: 'Valid Name' },
      })
      expect(res.status()).toBe(401)
    })
  })

  test.describe('DELETE /api/tenants/:id', () => {
    test('204 soft-deletes tenant and cascades memberships', async ({
      request,
    }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })

      const res = await request.delete(`/api/tenants/${tenant.id}`)
      expect(res.status()).toBe(204)

      const fresh = await query<TenantRow>(
        'SELECT * FROM "tenant" WHERE id = $1',
        [tenant.id],
      )
      expect(fresh[0]?.is_active).toBe(false)
      expect(fresh[0]?.deleted_at).not.toBeNull()

      const memberships = await query<MembershipRow>(
        'SELECT * FROM "tenantMembership" WHERE tenant_id = $1 AND is_active = true',
        [tenant.id],
      )
      expect(memberships).toHaveLength(0)
    })

    test('403 for non-member', async ({ request }) => {
      const outsider = await seedUser()
      const tenant = await seedTenantWithOwner({ ownerId: outsider.id })
      await createUserFixture(request)
      const res = await request.delete(`/api/tenants/${tenant.id}`)
      expect(res.status()).toBe(403)
    })

    test('401 without session cookie', async ({ request }) => {
      const res = await request.delete(`/api/tenants/${NON_EXISTENT_ID}`)
      expect(res.status()).toBe(401)
    })
  })
})
