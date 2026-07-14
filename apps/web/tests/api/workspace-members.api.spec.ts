import { expect, test } from '@playwright/test'
import {
  query,
  resetDatabase,
  type AuditLogRow,
  type WorkspaceMembershipRow,
} from './fixtures/db'
import {
  createUserFixture,
  seedTenantWithOwner,
  seedUser,
  seedWorkspaceMembership,
  seedWorkspaceWithAdmin,
} from './fixtures/factories'

const NON_EXISTENT_ID = '00000000-0000-0000-0000-000000000000'

test.describe('/api/workspaces/:id/members', () => {
  test.beforeEach(async () => {
    await resetDatabase()
  })

  test.describe('POST /api/workspaces/:id/members', () => {
    test('201 adds a member and writes audit', async ({ request }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
      })

      const target = await seedUser({
        fullName: 'Target',
        email: 'target@movux.test',
      })

      const res = await request.post(`/api/workspaces/${ws.id}/members`, {
        data: { email: 'target@movux.test', role: 'COLABORADOR' },
      })
      expect(res.status()).toBe(201)
      const body = await res.json()
      expect(body).toMatchObject({
        workspaceId: ws.id,
        userId: target.id,
        role: 'COLABORADOR',
        isActive: true,
      })

      const audits = await query<AuditLogRow>(
        `SELECT * FROM "auditLog" WHERE entity_type = 'WORKSPACE_MEMBERSHIP' AND entity_id = $1`,
        [body.id],
      )
      expect(audits.length).toBeGreaterThanOrEqual(1)
    })

    test('404 when target email has no active user', async ({ request }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
      })
      const res = await request.post(`/api/workspaces/${ws.id}/members`, {
        data: { email: 'nobody@movux.test', role: 'COLABORADOR' },
      })
      expect(res.status()).toBe(404)
    })

    test('409 when user is already an active member', async ({ request }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
      })
      const res = await request.post(`/api/workspaces/${ws.id}/members`, {
        data: { email: owner.email, role: 'COLABORADOR' },
      })
      expect(res.status()).toBe(409)
    })

    test('403 when caller is not ADMIN of workspace', async ({ request }) => {
      const outsider = await seedUser()
      const tenant = await seedTenantWithOwner({ ownerId: outsider.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: outsider.id,
      })
      await createUserFixture(request)
      const res = await request.post(`/api/workspaces/${ws.id}/members`, {
        data: { email: 'someone@movux.test', role: 'COLABORADOR' },
      })
      expect(res.status()).toBe(403)
    })

    test('400 when email format is invalid', async ({ request }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
      })
      const res = await request.post(`/api/workspaces/${ws.id}/members`, {
        data: { email: 'not-an-email', role: 'COLABORADOR' },
      })
      expect(res.status()).toBe(400)
    })

    test('400 when role is invalid', async ({ request }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
      })
      const res = await request.post(`/api/workspaces/${ws.id}/members`, {
        data: { email: 'x@movux.test', role: 'INVALID' },
      })
      expect(res.status()).toBe(400)
    })

    test('201 reactivates a soft-deleted membership', async ({ request }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
      })

      const target = await seedUser({ email: 'target2@movux.test' })
      const mem = await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: target.id,
        role: 'COLABORADOR',
      })
      await query(
        'UPDATE "workspaceMembership" SET is_active = false WHERE id = $1',
        [mem.id],
      )

      const res = await request.post(`/api/workspaces/${ws.id}/members`, {
        data: { email: 'target2@movux.test', role: 'COORDENADOR' },
      })
      expect(res.status()).toBe(201)
      const body = await res.json()
      expect(body.id).toBe(mem.id) // reactivated, same row
      expect(body.role).toBe('COORDENADOR')
      expect(body.isActive).toBe(true)
    })

    test('401 without session cookie', async ({ request }) => {
      const res = await request.post(
        `/api/workspaces/${NON_EXISTENT_ID}/members`,
        { data: { email: 'x@movux.test', role: 'COLABORADOR' } },
      )
      expect(res.status()).toBe(401)
    })
  })

  test.describe('PATCH /api/workspaces/:id/members/:memberId', () => {
    test('200 updates role on happy path', async ({ request }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
      })
      const target = await seedUser()
      const mem = await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: target.id,
        role: 'COLABORADOR',
      })

      const res = await request.patch(
        `/api/workspaces/${ws.id}/members/${mem.id}`,
        { data: { role: 'COORDENADOR' } },
      )
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.role).toBe('COORDENADOR')
    })

    test('404 when membership does not exist', async ({ request }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
      })
      const res = await request.patch(
        `/api/workspaces/${ws.id}/members/${NON_EXISTENT_ID}`,
        { data: { role: 'COLABORADOR' } },
      )
      expect(res.status()).toBe(404)
    })

    test('409 CANNOT_DEMOTE_SELF when caller targets own membership (non-last admin)', async ({
      request,
    }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
      })
      // Seed a second ADMIN so LAST_ADMIN doesn't fire first.
      const helper = await seedUser({ email: 'helper@movux.test' })
      await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: helper.id,
        role: 'ADMIN',
      })
      const [ownerMem] = await query<WorkspaceMembershipRow>(
        'SELECT * FROM "workspaceMembership" WHERE workspace_id = $1 AND user_id = $2',
        [ws.id, owner.user.id],
      )
      const res = await request.patch(
        `/api/workspaces/${ws.id}/members/${ownerMem.id}`,
        { data: { role: 'COORDENADOR' } },
      )
      expect(res.status()).toBe(409)
      expect((await res.json()).code).toBe('CANNOT_DEMOTE_SELF')
    })

    test('409 LAST_ADMIN when sole ADMIN demotes themselves', async ({
      request,
    }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
      })
      const [ownerMem] = await query<WorkspaceMembershipRow>(
        'SELECT * FROM "workspaceMembership" WHERE workspace_id = $1 AND user_id = $2',
        [ws.id, owner.user.id],
      )
      const res = await request.patch(
        `/api/workspaces/${ws.id}/members/${ownerMem.id}`,
        { data: { role: 'COORDENADOR' } },
      )
      expect(res.status()).toBe(409)
      expect((await res.json()).code).toBe('LAST_ADMIN')
    })

    test('403 when caller is not ADMIN', async ({ request }) => {
      const outsider = await seedUser()
      const tenant = await seedTenantWithOwner({ ownerId: outsider.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: outsider.id,
      })
      const [outsiderMem] = await query<WorkspaceMembershipRow>(
        'SELECT * FROM "workspaceMembership" WHERE workspace_id = $1 AND user_id = $2',
        [ws.id, outsider.id],
      )
      await createUserFixture(request)
      const res = await request.patch(
        `/api/workspaces/${ws.id}/members/${outsiderMem.id}`,
        { data: { role: 'COLABORADOR' } },
      )
      expect(res.status()).toBe(403)
    })

    test('401 without session cookie', async ({ request }) => {
      const res = await request.patch(
        `/api/workspaces/${NON_EXISTENT_ID}/members/${NON_EXISTENT_ID}`,
        { data: { role: 'COLABORADOR' } },
      )
      expect(res.status()).toBe(401)
    })
  })

  test.describe('DELETE /api/workspaces/:id/members/:memberId', () => {
    test('204 soft-deletes a non-last member', async ({ request }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
      })
      const target = await seedUser()
      const mem = await seedWorkspaceMembership({
        workspaceId: ws.id,
        userId: target.id,
        role: 'COLABORADOR',
      })

      const res = await request.delete(
        `/api/workspaces/${ws.id}/members/${mem.id}`,
      )
      expect(res.status()).toBe(204)

      const [fresh] = await query<WorkspaceMembershipRow>(
        'SELECT * FROM "workspaceMembership" WHERE id = $1',
        [mem.id],
      )
      expect(fresh?.is_active).toBe(false)
    })

    test('409 LAST_ADMIN when removing the last ADMIN', async ({ request }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
      })
      const [ownerMem] = await query<WorkspaceMembershipRow>(
        'SELECT * FROM "workspaceMembership" WHERE workspace_id = $1 AND user_id = $2',
        [ws.id, owner.user.id],
      )
      const res = await request.delete(
        `/api/workspaces/${ws.id}/members/${ownerMem.id}`,
      )
      expect(res.status()).toBe(409)
      expect((await res.json()).code).toBe('LAST_ADMIN')
    })

    test('403 when caller is not ADMIN', async ({ request }) => {
      const outsider = await seedUser()
      const tenant = await seedTenantWithOwner({ ownerId: outsider.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: outsider.id,
      })
      const [outsiderMem] = await query<WorkspaceMembershipRow>(
        'SELECT * FROM "workspaceMembership" WHERE workspace_id = $1 AND user_id = $2',
        [ws.id, outsider.id],
      )
      await createUserFixture(request)
      const res = await request.delete(
        `/api/workspaces/${ws.id}/members/${outsiderMem.id}`,
      )
      expect(res.status()).toBe(403)
    })

    test('404 when membership does not exist', async ({ request }) => {
      const owner = await createUserFixture(request)
      const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
      const ws = await seedWorkspaceWithAdmin({
        tenantId: tenant.id,
        ownerId: owner.user.id,
      })
      const res = await request.delete(
        `/api/workspaces/${ws.id}/members/${NON_EXISTENT_ID}`,
      )
      expect(res.status()).toBe(404)
    })

    test('401 without session cookie', async ({ request }) => {
      const res = await request.delete(
        `/api/workspaces/${NON_EXISTENT_ID}/members/${NON_EXISTENT_ID}`,
      )
      expect(res.status()).toBe(401)
    })
  })
})
