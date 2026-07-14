import { expect, test } from '@playwright/test'
import { resetDatabase, query } from './fixtures/db'
import type { WorkspaceMembershipRow } from './fixtures/db'
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

test.describe('GET /api/workspaces/:id/members/:memberId', () => {
  test.beforeEach(async () => {
    await resetDatabase()
  })

  test('200 returns member detail with null specialty when none assigned', async ({
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

    const res = await request.get(
      `/api/workspaces/${ws.id}/members/${ownerMem.id}`,
    )
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.membership.id).toBe(ownerMem.id)
    expect(body.user.id).toBe(owner.user.id)
    expect(body.specialty).toBeNull()
  })

  test('200 returns member detail with specialty inline', async ({
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
      slug: 'custom_spec',
      name: 'Custom Spec',
    })
    await seedUserSpecialty({
      userId: target.id,
      workspaceId: ws.id,
      specialtyId: specialty.id,
    })

    const res = await request.get(
      `/api/workspaces/${ws.id}/members/${membership.id}`,
    )
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.specialty.slug).toBe('custom_spec')
    expect(body.specialty.name).toBe('Custom Spec')
  })

  test('403 for non-member', async ({ request }) => {
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
    const res = await request.get(
      `/api/workspaces/${ws.id}/members/${outsiderMem.id}`,
    )
    expect(res.status()).toBe(403)
  })

  test('404 when memberId does not exist', async ({ request }) => {
    const owner = await createUserFixture(request)
    const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
    const ws = await seedWorkspaceWithAdmin({
      tenantId: tenant.id,
      ownerId: owner.user.id,
    })
    const res = await request.get(
      `/api/workspaces/${ws.id}/members/${NON_EXISTENT_ID}`,
    )
    expect(res.status()).toBe(404)
  })

  test('401 without session cookie', async ({ request }) => {
    const res = await request.get(
      `/api/workspaces/${NON_EXISTENT_ID}/members/${NON_EXISTENT_ID}`,
    )
    expect(res.status()).toBe(401)
  })
})
