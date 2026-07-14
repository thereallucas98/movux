import { expect, test } from '@playwright/test'
import {
  query,
  resetDatabase,
  type AuditLogRow,
  type MembershipRow,
} from './fixtures/db'
import {
  createUserFixture,
  seedMembership,
  seedTenantWithOwner,
  seedUser,
} from './fixtures/factories'

const NON_EXISTENT_ID = '00000000-0000-0000-0000-000000000000'

test.describe('/api/tenants/:id/members', () => {
  test.beforeEach(async () => {
    await resetDatabase()
  })

  test.describe('POST /api/tenants/:id/members', () => {
    test('201 adds a SUPER_ADMIN member and writes audit log', async ({
      request,
    }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })

      const target = await seedUser({ fullName: 'Target User' })

      const res = await request.post(`/api/tenants/${tenant.id}/members`, {
        data: { userId: target.id, role: 'SUPER_ADMIN' },
      })
      expect(res.status()).toBe(201)
      const body = await res.json()
      expect(body).toMatchObject({
        tenantId: tenant.id,
        userId: target.id,
        role: 'SUPER_ADMIN',
        isActive: true,
      })

      const audits = await query<AuditLogRow>(
        `SELECT * FROM "auditLog" WHERE entity_type = 'TENANT_MEMBERSHIP' AND entity_id = $1`,
        [body.id],
      )
      expect(audits.length).toBeGreaterThanOrEqual(1)
    })

    test('404 when target user does not exist', async ({ request }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const res = await request.post(`/api/tenants/${tenant.id}/members`, {
        data: { userId: NON_EXISTENT_ID, role: 'SUPER_ADMIN' },
      })
      expect(res.status()).toBe(404)
    })

    test('409 when user is already an active member', async ({ request }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })

      const res = await request.post(`/api/tenants/${tenant.id}/members`, {
        data: { userId: owner.user.id, role: 'SUPER_ADMIN' },
      })
      expect(res.status()).toBe(409)
    })

    test('403 when caller is not SUPER_ADMIN of the tenant', async ({
      request,
    }) => {
      const outsider = await seedUser()
      const tenant = await seedTenantWithOwner({ ownerId: outsider.id })

      await createUserFixture(request)
      const res = await request.post(`/api/tenants/${tenant.id}/members`, {
        data: { userId: outsider.id, role: 'SUPER_ADMIN' },
      })
      expect(res.status()).toBe(403)
    })

    test('400 when body is missing role', async ({ request }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const res = await request.post(`/api/tenants/${tenant.id}/members`, {
        data: { userId: NON_EXISTENT_ID },
      })
      expect(res.status()).toBe(400)
    })

    test('401 without session cookie', async ({ request }) => {
      const res = await request.post(
        `/api/tenants/${NON_EXISTENT_ID}/members`,
        { data: { userId: NON_EXISTENT_ID, role: 'SUPER_ADMIN' } },
      )
      expect(res.status()).toBe(401)
    })
  })

  test.describe('GET /api/tenants/:id/members', () => {
    test('200 returns paginated members for SUPER_ADMIN', async ({
      request,
    }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })

      const res = await request.get(`/api/tenants/${tenant.id}/members`)
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.data).toHaveLength(1)
      expect(body.data[0]).toMatchObject({
        role: 'SUPER_ADMIN',
        isActive: true,
        user: { id: owner.user.id },
      })
      expect(body.nextCursor).toBeNull()
    })

    test('200 paginates when more than limit', async ({ request }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })

      for (let i = 0; i < 2; i += 1) {
        const u = await seedUser({ fullName: `Extra ${i}` })
        await seedMembership({ tenantId: tenant.id, userId: u.id })
      }

      const res = await request.get(
        `/api/tenants/${tenant.id}/members?limit=2`,
      )
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.data).toHaveLength(2)
      expect(body.nextCursor).toBeTruthy()
    })

    test('403 when caller is not a member', async ({ request }) => {
      const outsider = await seedUser()
      const tenant = await seedTenantWithOwner({ ownerId: outsider.id })
      await createUserFixture(request)
      const res = await request.get(`/api/tenants/${tenant.id}/members`)
      expect(res.status()).toBe(403)
    })

    test('401 without session cookie', async ({ request }) => {
      const res = await request.get(`/api/tenants/${NON_EXISTENT_ID}/members`)
      expect(res.status()).toBe(401)
    })
  })

  test.describe('DELETE /api/tenants/:id/members/:memberId', () => {
    test('204 soft-deletes a non-last member', async ({ request }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })

      const second = await seedUser({ fullName: 'Second' })
      const secondMembership = await seedMembership({
        tenantId: tenant.id,
        userId: second.id,
      })

      const res = await request.delete(
        `/api/tenants/${tenant.id}/members/${secondMembership.id}`,
      )
      expect(res.status()).toBe(204)

      const fresh = await query<MembershipRow>(
        'SELECT * FROM "tenantMembership" WHERE id = $1',
        [secondMembership.id],
      )
      expect(fresh[0]?.is_active).toBe(false)
    })

    test('409 when removing the last SUPER_ADMIN', async ({ request }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })

      const [ownerMembership] = await query<MembershipRow>(
        'SELECT * FROM "tenantMembership" WHERE tenant_id = $1 AND user_id = $2',
        [tenant.id, owner.user.id],
      )

      const res = await request.delete(
        `/api/tenants/${tenant.id}/members/${ownerMembership.id}`,
      )
      expect(res.status()).toBe(409)
    })

    test('403 when caller is not SUPER_ADMIN of the tenant', async ({
      request,
    }) => {
      const outsider = await seedUser()
      const tenant = await seedTenantWithOwner({ ownerId: outsider.id })
      const [outsiderMembership] = await query<MembershipRow>(
        'SELECT * FROM "tenantMembership" WHERE tenant_id = $1 AND user_id = $2',
        [tenant.id, outsider.id],
      )

      await createUserFixture(request)
      const res = await request.delete(
        `/api/tenants/${tenant.id}/members/${outsiderMembership.id}`,
      )
      expect(res.status()).toBe(403)
    })

    test('404 when membership does not belong to the tenant', async ({
      request,
    }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const res = await request.delete(
        `/api/tenants/${tenant.id}/members/${NON_EXISTENT_ID}`,
      )
      expect(res.status()).toBe(404)
    })

    test('401 without session cookie', async ({ request }) => {
      const res = await request.delete(
        `/api/tenants/${NON_EXISTENT_ID}/members/${NON_EXISTENT_ID}`,
      )
      expect(res.status()).toBe(401)
    })
  })
})
