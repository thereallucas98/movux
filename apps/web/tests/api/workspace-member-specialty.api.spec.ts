import { expect, test } from '@playwright/test'
import { query, resetDatabase } from './fixtures/db'
import type {
  UserSpecialtyRow,
  WorkspaceMembershipRow,
} from './fixtures/db'
import {
  createUserFixture,
  seedSpecialty,
  seedTenantWithOwner,
  seedUser,
  seedUserSpecialty,
  seedWorkspaceMembership,
  seedWorkspaceWithAdmin,
} from './fixtures/factories'

const NON_EXISTENT_ID = '00000000-0000-0000-0000-000000000000'

test.describe('/api/workspaces/:id/members/:memberId/specialty', () => {
  test.beforeEach(async () => {
    await resetDatabase()
  })

  test.describe('PATCH — assign specialty', () => {
    test('200 ADMIN assigns specialty (happy path + audit)', async ({
      request,
    }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
      })
      const target = await seedUser()
      const membership = await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: target.id,
        role: 'COLABORADOR',
      })
      const specialty = await seedSpecialty({
        scope: 'WORKSPACE',
        tenantId: tenant.id,
        workspaceId: ws.id,
        slug: 'nurse_custom',
        name: 'Enfermeiro Custom',
      })

      const res = await request.patch(
        `/api/workspaces/${ws.id}/members/${membership.id}/specialty`,
        { data: { specialtyId: specialty.id } },
      )
      expect(res.status()).toBe(200)

      const [row] = await query<UserSpecialtyRow>(
        'SELECT * FROM "userSpecialty" WHERE user_id = $1 AND workspace_id = $2 AND is_active = true',
        [target.id, ws.id],
      )
      expect(row.specialty_id).toBe(specialty.id)
    })

    test('200 COORDENADOR can also assign', async ({ request }) => {
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
        role: 'COORDENADOR',
      })

      const target = await seedUser()
      const membership = await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: target.id,
        role: 'COLABORADOR',
      })
      const specialty = await seedSpecialty({
        scope: 'WORKSPACE',
        tenantId: tenant.id,
        workspaceId: ws.id,
        slug: 'custom_role',
        name: 'Custom',
      })

      const res = await request.patch(
        `/api/workspaces/${ws.id}/members/${membership.id}/specialty`,
        { data: { specialtyId: specialty.id } },
      )
      expect(res.status()).toBe(200)
    })

    test('403 for COLABORADOR', async ({ request }) => {
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
      const target = await seedUser()
      const membership = await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: target.id,
        role: 'COLABORADOR',
      })
      const specialty = await seedSpecialty({
        scope: 'WORKSPACE',
        tenantId: tenant.id,
        workspaceId: ws.id,
        slug: 'custom_role',
        name: 'Custom',
      })

      const res = await request.patch(
        `/api/workspaces/${ws.id}/members/${membership.id}/specialty`,
        { data: { specialtyId: specialty.id } },
      )
      expect(res.status()).toBe(403)
    })

    test('reassignment soft-deletes old row and creates new', async ({
      request,
    }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
      })
      const target = await seedUser()
      const membership = await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: target.id,
        role: 'COLABORADOR',
      })
      const spOld = await seedSpecialty({
        scope: 'WORKSPACE',
        tenantId: tenant.id,
        workspaceId: ws.id,
        slug: 'old_role',
        name: 'Old',
      })
      const spNew = await seedSpecialty({
        scope: 'WORKSPACE',
        tenantId: tenant.id,
        workspaceId: ws.id,
        slug: 'new_role',
        name: 'New',
      })
      await seedUserSpecialty({
        userId: target.id,
        workspaceId: ws.id,
        specialtyId: spOld.id,
      })

      await request.patch(
        `/api/workspaces/${ws.id}/members/${membership.id}/specialty`,
        { data: { specialtyId: spNew.id } },
      )

      const rows = await query<UserSpecialtyRow>(
        'SELECT * FROM "userSpecialty" WHERE user_id = $1 AND workspace_id = $2 ORDER BY created_at',
        [target.id, ws.id],
      )
      expect(rows).toHaveLength(2)
      expect(rows[0].is_active).toBe(false)
      expect(rows[0].specialty_id).toBe(spOld.id)
      expect(rows[1].is_active).toBe(true)
      expect(rows[1].specialty_id).toBe(spNew.id)
    })

    test('404 TARGET_MEMBER_NOT_FOUND', async ({ request }) => {
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
        slug: 'role',
        name: 'Role',
      })

      const res = await request.patch(
        `/api/workspaces/${ws.id}/members/${NON_EXISTENT_ID}/specialty`,
        { data: { specialtyId: sp.id } },
      )
      expect(res.status()).toBe(404)
      expect((await res.json()).code).toBe('TARGET_MEMBER_NOT_FOUND')
    })

    test('404 SPECIALTY_NOT_IN_WORKSPACE (specialty from another tenant)', async ({
      request,
    }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
      })
      const target = await seedUser()
      const membership = await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: target.id,
        role: 'COLABORADOR',
      })
      // Specialty scoped to a DIFFERENT workspace
      const otherOwner = await seedUser()
      const otherTenant = await seedTenantWithOwner({ ownerId: otherOwner.id })
      const otherWs = await seedWorkspaceWithAdmin({
        tenantId: otherTenant.id,
        ownerId: otherOwner.id,
      })
      const foreignSpec = await seedSpecialty({
        scope: 'WORKSPACE',
        tenantId: otherTenant.id,
        workspaceId: otherWs.id,
        slug: 'foreign',
        name: 'Foreign',
      })

      const res = await request.patch(
        `/api/workspaces/${ws.id}/members/${membership.id}/specialty`,
        { data: { specialtyId: foreignSpec.id } },
      )
      expect(res.status()).toBe(404)
      expect((await res.json()).code).toBe('SPECIALTY_NOT_IN_WORKSPACE')
    })

    test('400 invalid specialtyId', async ({ request }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
      })
      const target = await seedUser()
      const membership = await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: target.id,
        role: 'COLABORADOR',
      })
      const res = await request.patch(
        `/api/workspaces/${ws.id}/members/${membership.id}/specialty`,
        { data: { specialtyId: 'not-a-uuid' } },
      )
      expect(res.status()).toBe(400)
    })

    test('401 without session cookie', async ({ request }) => {
      const res = await request.patch(
        `/api/workspaces/${NON_EXISTENT_ID}/members/${NON_EXISTENT_ID}/specialty`,
        { data: { specialtyId: NON_EXISTENT_ID } },
      )
      expect(res.status()).toBe(401)
    })
  })

  test.describe('DELETE — unset specialty', () => {
    test('204 unsets active specialty', async ({ request }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
      })
      const target = await seedUser()
      const membership = await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: target.id,
        role: 'COLABORADOR',
      })
      const sp = await seedSpecialty({
        scope: 'WORKSPACE',
        tenantId: tenant.id,
        workspaceId: ws.id,
        slug: 'role',
        name: 'Role',
      })
      await seedUserSpecialty({
        userId: target.id,
        workspaceId: ws.id,
        specialtyId: sp.id,
      })

      const res = await request.delete(
        `/api/workspaces/${ws.id}/members/${membership.id}/specialty`,
      )
      expect(res.status()).toBe(204)

      const rows = await query<UserSpecialtyRow>(
        'SELECT * FROM "userSpecialty" WHERE user_id = $1 AND workspace_id = $2 AND is_active = true',
        [target.id, ws.id],
      )
      expect(rows).toHaveLength(0)
    })

    test('404 when no active assignment', async ({ request }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
      })
      const target = await seedUser()
      const membership = await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: target.id,
        role: 'COLABORADOR',
      })

      const res = await request.delete(
        `/api/workspaces/${ws.id}/members/${membership.id}/specialty`,
      )
      expect(res.status()).toBe(404)
    })

    test('403 for COLABORADOR', async ({ request }) => {
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
      const target = await seedUser()
      const membership = await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: target.id,
        role: 'COLABORADOR',
      })

      const res = await request.delete(
        `/api/workspaces/${ws.id}/members/${membership.id}/specialty`,
      )
      expect(res.status()).toBe(403)
    })

    test('401 without session cookie', async ({ request }) => {
      const res = await request.delete(
        `/api/workspaces/${NON_EXISTENT_ID}/members/${NON_EXISTENT_ID}/specialty`,
      )
      expect(res.status()).toBe(401)
    })
  })

  test.describe('cross-task: specialty soft-delete with active UserSpecialty', () => {
    test('DELETE specialty returns 409 CANNOT_DELETE_IN_USE when assigned', async ({
      request,
    }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
      })
      const target = await seedUser()
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: target.id,
        role: 'COLABORADOR',
      })
      const sp = await seedSpecialty({
        scope: 'WORKSPACE',
        tenantId: tenant.id,
        workspaceId: ws.id,
        slug: 'role',
        name: 'Role',
      })
      await seedUserSpecialty({
        userId: target.id,
        workspaceId: ws.id,
        specialtyId: sp.id,
      })

      const res = await request.delete(
        `/api/workspaces/${ws.id}/specialties/${sp.id}`,
      )
      expect(res.status()).toBe(409)
      expect((await res.json()).code).toBe('CANNOT_DELETE_IN_USE')
    })
  })
})
