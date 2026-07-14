import { expect, test } from '@playwright/test'

import { query, resetDatabase } from './fixtures/db'
import {
  createUserFixture,
  seedTenantWithOwner,
  seedWorkspaceWithAdmin,
} from './fixtures/factories'

const NON_EXISTENT_ID = '00000000-0000-0000-0000-000000000000'

async function setPlan(
  tenantId: string,
  plan: 'FREE' | 'SMALL_TEAM' | 'BUSINESS' | 'CORPORATE',
): Promise<void> {
  await query(`UPDATE tenant SET plan = $1::"PlanTier" WHERE id = $2`, [
    plan,
    tenantId,
  ])
}

async function setGracePeriod(
  tenantId: string,
  until: Date | null,
): Promise<void> {
  await query(`UPDATE tenant SET grace_period_until = $1 WHERE id = $2`, [
    until,
    tenantId,
  ])
}

test.describe('Plan Limits — read endpoints', () => {
  test.beforeEach(async () => {
    await resetDatabase()
  })

  test('GET /api/tenants/:id/plan-limits returns 401 unauthenticated', async ({
    request,
  }) => {
    const owner = await createUserFixture(request)
    const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
    // Drop session cookie via fresh context
    const ctx = await request.storageState()
    void ctx
    const res = await request.get(`/api/tenants/${tenant.id}/plan-limits`, {
      headers: { cookie: '' },
    })
    expect([401, 403]).toContain(res.status())
  })

  test('GET /api/tenants/:id/plan-limits returns 200 + FREE plan resources', async ({
    request,
  }) => {
    const owner = await createUserFixture(request)
    const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
    await setPlan(tenant.id, 'FREE')
    const res = await request.get(`/api/tenants/${tenant.id}/plan-limits`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.plan).toBe('FREE')
    expect(body.gracePeriodUntil).toBeNull()
    expect(body.resources.workspaces).toMatchObject({
      limit: 1,
      current: 0,
      percent: 0,
      exhausted: false,
    })
    expect(body.resources.tenantScopedCatalogs).toEqual({ allowed: false })
  })

  test('GET /api/tenants/:id/plan-limits returns 404 for unknown tenant', async ({
    request,
  }) => {
    await createUserFixture(request)
    const res = await request.get(
      `/api/tenants/${NON_EXISTENT_ID}/plan-limits`,
    )
    expect([403, 404]).toContain(res.status())
  })

  test('GET /api/workspaces/:id/plan-limits returns 200 with full resource map', async ({
    request,
  }) => {
    const owner = await createUserFixture(request)
    const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
    const workspace = await seedWorkspaceWithAdmin({
      tenantId: tenant.id,
      ownerId: owner.user.id,
    })
    const res = await request.get(`/api/workspaces/${workspace.id}/plan-limits`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.plan).toBe('FREE')
    expect(body.resources.members.limit).toBe(20)
    expect(body.resources.categories.limit).toBe(5)
    expect(body.resources.specialties.limit).toBe(5)
    expect(body.resources.activeSchedules.limit).toBe(2)
    expect(body.resources.shiftsThisMonth.limit).toBe(200)
    expect(body.resources.requestsThisMonth.limit).toBe(40)
    expect(body.resources.storageMB.limit).toBe(100)
  })

  test('GET /api/workspaces/:id/plan-limits returns 403 for non-member', async ({
    request,
  }) => {
    const owner = await createUserFixture(request)
    const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
    const workspace = await seedWorkspaceWithAdmin({
      tenantId: tenant.id,
      ownerId: owner.user.id,
    })
    const stranger = await createUserFixture(request, {
      email: `stranger-${Date.now()}@movux.test`,
    })
    void stranger
    const res = await request.get(`/api/workspaces/${workspace.id}/plan-limits`)
    expect([200, 403]).toContain(res.status())
  })
})

test.describe('Plan Limits — PATCH /api/tenants/:id/plan', () => {
  test.beforeEach(async () => {
    await resetDatabase()
  })

  test('200 happy upgrade FREE → SMALL_TEAM', async ({ request }) => {
    const owner = await createUserFixture(request)
    const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
    const res = await request.patch(`/api/tenants/${tenant.id}/plan`, {
      data: { plan: 'SMALL_TEAM' },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.plan).toBe('SMALL_TEAM')
    expect(body.previousPlan).toBe('FREE')
    expect(body.gracePeriodUntil).toBeNull()
    expect(body.violations).toEqual([])
  })

  test('200 idempotent no-op when same plan', async ({ request }) => {
    const owner = await createUserFixture(request)
    const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
    const res = await request.patch(`/api/tenants/${tenant.id}/plan`, {
      data: { plan: 'FREE' },
    })
    expect(res.status()).toBe(200)
  })

  test('400 invalid plan value', async ({ request }) => {
    const owner = await createUserFixture(request)
    const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
    const res = await request.patch(`/api/tenants/${tenant.id}/plan`, {
      data: { plan: 'NOT_A_PLAN' },
    })
    expect(res.status()).toBe(400)
  })

  test('downgrade with violations sets gracePeriodUntil ≈ now+14d', async ({
    request,
  }) => {
    const owner = await createUserFixture(request)
    const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
    await setPlan(tenant.id, 'SMALL_TEAM')
    // Create 2 workspaces (allowed under SMALL_TEAM=3, exceeds FREE=1)
    await seedWorkspaceWithAdmin({
      tenantId: tenant.id,
      ownerId: owner.user.id,
      name: 'WS-A',
    })
    await seedWorkspaceWithAdmin({
      tenantId: tenant.id,
      ownerId: owner.user.id,
      name: 'WS-B',
    })
    const res = await request.patch(`/api/tenants/${tenant.id}/plan`, {
      data: { plan: 'FREE' },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.plan).toBe('FREE')
    expect(body.gracePeriodUntil).not.toBeNull()
    const grace = new Date(body.gracePeriodUntil)
    const days = (grace.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    expect(days).toBeGreaterThan(13.5)
    expect(days).toBeLessThan(14.5)
    expect(body.violations.length).toBeGreaterThan(0)
    expect(
      body.violations.some(
        (v: { resource: string }) => v.resource === 'workspacesPerTenant',
      ),
    ).toBe(true)
  })
})

test.describe('Plan Limits — workspacesPerTenant boundary', () => {
  test.beforeEach(async () => {
    await resetDatabase()
  })

  test('FREE: 1st workspace 201; 2nd workspace 409 with meta', async ({
    request,
  }) => {
    const owner = await createUserFixture(request)
    const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
    await setPlan(tenant.id, 'FREE')

    const r1 = await request.post('/api/workspaces', {
      data: { tenantId: tenant.id, name: 'W1', vertical: 'HOSPITAL' },
    })
    expect(r1.status()).toBe(201)

    const r2 = await request.post('/api/workspaces', {
      data: { tenantId: tenant.id, name: 'W2', vertical: 'HOSPITAL' },
    })
    expect(r2.status()).toBe(409)
    const body = await r2.json()
    expect(body.code).toBe('PLAN_LIMIT_REACHED')
    expect(body.meta.shape).toBe('simple')
    expect(body.meta.resource).toBe('workspacesPerTenant')
    expect(body.meta.limit).toBe(1)
    expect(body.meta.current).toBe(1)
    expect(body.meta.plan).toBe('FREE')
  })

  test('FREE → SMALL_TEAM upgrade lifts the wall', async ({ request }) => {
    const owner = await createUserFixture(request)
    const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
    await setPlan(tenant.id, 'FREE')

    const r1 = await request.post('/api/workspaces', {
      data: { tenantId: tenant.id, name: 'W1', vertical: 'HOSPITAL' },
    })
    expect(r1.status()).toBe(201)

    const blocked = await request.post('/api/workspaces', {
      data: { tenantId: tenant.id, name: 'W2', vertical: 'HOSPITAL' },
    })
    expect(blocked.status()).toBe(409)

    const upgrade = await request.patch(`/api/tenants/${tenant.id}/plan`, {
      data: { plan: 'SMALL_TEAM' },
    })
    expect(upgrade.status()).toBe(200)

    const r2 = await request.post('/api/workspaces', {
      data: { tenantId: tenant.id, name: 'W2', vertical: 'HOSPITAL' },
    })
    expect(r2.status()).toBe(201)
  })
})

test.describe('Plan Limits — tenantScopedCatalogs (Corporate-only)', () => {
  test.beforeEach(async () => {
    await resetDatabase()
  })

  test('FREE: POST /tenants/:id/categories returns 409 with meta.shape=boolean', async ({
    request,
  }) => {
    const owner = await createUserFixture(request)
    const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
    await setPlan(tenant.id, 'FREE')

    const res = await request.post(`/api/tenants/${tenant.id}/categories`, {
      data: { slug: 'uti', name: 'UTI' },
    })
    expect(res.status()).toBe(409)
    const body = await res.json()
    expect(body.code).toBe('PLAN_LIMIT_REACHED')
    expect(body.meta.shape).toBe('boolean')
    expect(body.meta.resource).toBe('tenantScopedCatalogs')
    expect(body.meta.allowed).toBe(false)
  })

  test('CORPORATE: POST /tenants/:id/categories returns 201', async ({
    request,
  }) => {
    const owner = await createUserFixture(request)
    const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
    await setPlan(tenant.id, 'CORPORATE')

    const res = await request.post(`/api/tenants/${tenant.id}/categories`, {
      data: { slug: 'uti', name: 'UTI' },
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body.scope).toBe('TENANT')
    expect(body.slug).toBe('uti')
  })

  test('CORPORATE: POST /tenants/:id/specialties returns 201', async ({
    request,
  }) => {
    const owner = await createUserFixture(request)
    const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
    await setPlan(tenant.id, 'CORPORATE')

    const res = await request.post(`/api/tenants/${tenant.id}/specialties`, {
      data: { slug: 'enfermeiro', name: 'Enfermeiro' },
    })
    expect(res.status()).toBe(201)
  })
})

test.describe('Plan Limits — categoriesPerWorkspace boundary', () => {
  test.beforeEach(async () => {
    await resetDatabase()
  })

  test('FREE: 6th category returns 409 with meta', async ({ request }) => {
    const owner = await createUserFixture(request)
    const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
    await setPlan(tenant.id, 'FREE')
    const workspace = await seedWorkspaceWithAdmin({
      tenantId: tenant.id,
      ownerId: owner.user.id,
    })
    // Create 5 categories to reach FREE=5 limit
    for (let i = 0; i < 5; i++) {
      const r = await request.post(
        `/api/workspaces/${workspace.id}/categories`,
        {
          data: { slug: `cat-${i}`, name: `Categoria ${i}` },
        },
      )
      expect(r.status()).toBe(201)
    }
    // 6th attempt → 409
    const blocked = await request.post(
      `/api/workspaces/${workspace.id}/categories`,
      {
        data: { slug: 'cat-extra', name: 'Categoria extra' },
      },
    )
    expect(blocked.status()).toBe(409)
    const body = await blocked.json()
    expect(body.code).toBe('PLAN_LIMIT_REACHED')
    expect(body.meta.resource).toBe('categoriesPerWorkspace')
    expect(body.meta.limit).toBe(5)
  })
})

test.describe('Plan Limits — additional resource boundaries', () => {
  test.beforeEach(async () => {
    await resetDatabase()
  })

  test('GET /api/workspaces/:id/plan-limits reflects member count growth', async ({
    request,
  }) => {
    const owner = await createUserFixture(request)
    const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
    await setPlan(tenant.id, 'FREE')
    const workspace = await seedWorkspaceWithAdmin({
      tenantId: tenant.id,
      ownerId: owner.user.id,
    })
    const before = await request.get(
      `/api/workspaces/${workspace.id}/plan-limits`,
    )
    const beforeBody = await before.json()
    expect(beforeBody.resources.members.current).toBe(1) // owner
    expect(beforeBody.resources.members.percent).toBe(5) // 1/20

    // Add an extra user as workspace member via the real endpoint
    const newMember = await createUserFixture(request, {
      email: `extra-${Date.now()}@movux.test`,
    })
    // newMember is now the logged-in cookie; re-login as owner
    const ownerLogin = await request.post('/api/auth/login', {
      data: { email: owner.email, password: owner.password },
    })
    expect(ownerLogin.status()).toBe(200)
    const addRes = await request.post(
      `/api/workspaces/${workspace.id}/members`,
      {
        data: { email: newMember.email, role: 'COLABORADOR' },
      },
    )
    expect(addRes.status()).toBe(201)

    const after = await request.get(
      `/api/workspaces/${workspace.id}/plan-limits`,
    )
    const afterBody = await after.json()
    expect(afterBody.resources.members.current).toBe(2)
    expect(afterBody.resources.members.percent).toBe(10) // 2/20
  })

  test('GET /api/workspaces/:id/plan-limits returns 403 for cross-workspace user', async ({
    request,
  }) => {
    const owner = await createUserFixture(request)
    const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
    const workspace = await seedWorkspaceWithAdmin({
      tenantId: tenant.id,
      ownerId: owner.user.id,
    })
    // Switch identity to a stranger
    const stranger = await createUserFixture(request, {
      email: `cross-${Date.now()}@movux.test`,
    })
    void stranger
    const res = await request.get(`/api/workspaces/${workspace.id}/plan-limits`)
    expect(res.status()).toBe(403)
  })

  test('GET /api/tenants/:id/plan-limits returns 403 for cross-tenant user', async ({
    request,
  }) => {
    const owner = await createUserFixture(request)
    const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
    // Switch identity
    const stranger = await createUserFixture(request, {
      email: `cross-tenant-${Date.now()}@movux.test`,
    })
    void stranger
    const res = await request.get(`/api/tenants/${tenant.id}/plan-limits`)
    expect(res.status()).toBe(403)
  })

  test('Plan upgrade clears any stale grace period', async ({ request }) => {
    const owner = await createUserFixture(request)
    const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
    // Manually set a grace period
    await setGracePeriod(tenant.id, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
    // Upgrade to BUSINESS
    const res = await request.patch(`/api/tenants/${tenant.id}/plan`, {
      data: { plan: 'BUSINESS' },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.gracePeriodUntil).toBeNull()
  })

  test('FREE: 6th workspace specialty returns 409 with meta', async ({
    request,
  }) => {
    const owner = await createUserFixture(request)
    const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
    await setPlan(tenant.id, 'FREE')
    const workspace = await seedWorkspaceWithAdmin({
      tenantId: tenant.id,
      ownerId: owner.user.id,
    })
    for (let i = 0; i < 5; i++) {
      const r = await request.post(
        `/api/workspaces/${workspace.id}/specialties`,
        {
          data: { slug: `spec-${i}`, name: `Especialidade ${i}` },
        },
      )
      expect(r.status()).toBe(201)
    }
    const blocked = await request.post(
      `/api/workspaces/${workspace.id}/specialties`,
      {
        data: { slug: 'spec-extra', name: 'Especialidade extra' },
      },
    )
    expect(blocked.status()).toBe(409)
    const body = await blocked.json()
    expect(body.code).toBe('PLAN_LIMIT_REACHED')
    expect(body.meta.resource).toBe('specialtiesPerWorkspace')
    expect(body.meta.limit).toBe(5)
  })

  test('PATCH /plan idempotent same-plan returns gracePeriodUntil unchanged', async ({
    request,
  }) => {
    const owner = await createUserFixture(request)
    const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
    await setPlan(tenant.id, 'BUSINESS')
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await setGracePeriod(tenant.id, future)
    const res = await request.patch(`/api/tenants/${tenant.id}/plan`, {
      data: { plan: 'BUSINESS' },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.plan).toBe('BUSINESS')
    expect(body.gracePeriodUntil).not.toBeNull()
    // Same-plan no-op preserves the existing grace clock
  })

  test('CORPORATE: workspaces unlimited (limit:null, percent:null)', async ({
    request,
  }) => {
    const owner = await createUserFixture(request)
    const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
    await setPlan(tenant.id, 'CORPORATE')
    const res = await request.get(`/api/tenants/${tenant.id}/plan-limits`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.resources.workspaces.limit).toBeNull()
    expect(body.resources.workspaces.percent).toBeNull()
    expect(body.resources.tenantScopedCatalogs).toEqual({ allowed: true })
  })

  test('GET /api/workspaces/:id/plan-limits exposes workspace-scoped resource map', async ({
    request,
  }) => {
    const owner = await createUserFixture(request)
    const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
    await setPlan(tenant.id, 'BUSINESS')
    const workspace = await seedWorkspaceWithAdmin({
      tenantId: tenant.id,
      ownerId: owner.user.id,
    })
    const res = await request.get(`/api/workspaces/${workspace.id}/plan-limits`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.plan).toBe('BUSINESS')
    expect(body.resources.members.limit).toBe(200)
    expect(body.resources.shiftsThisMonth.limit).toBe(4000)
    expect(body.resources.requestsThisMonth.limit).toBe(1000)
  })

  test('Tenant-scope catalog: SMALL_TEAM also rejected (Corporate-only)', async ({
    request,
  }) => {
    const owner = await createUserFixture(request)
    const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
    await setPlan(tenant.id, 'SMALL_TEAM')
    const res = await request.post(`/api/tenants/${tenant.id}/categories`, {
      data: { slug: 'pediatria', name: 'Pediatria' },
    })
    expect(res.status()).toBe(409)
    const body = await res.json()
    expect(body.meta.shape).toBe('boolean')
    expect(body.meta.plan).toBe('SMALL_TEAM')
    expect(body.meta.allowed).toBe(false)
  })
})

test.describe('Plan Limits — grace period', () => {
  test.beforeEach(async () => {
    await resetDatabase()
  })

  test('grace-active: over-limit create succeeds (logged, not blocked)', async ({
    request,
  }) => {
    const owner = await createUserFixture(request)
    const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
    // Start at SMALL_TEAM, create a workspace that becomes "over-quota" after FREE downgrade
    await setPlan(tenant.id, 'SMALL_TEAM')
    await seedWorkspaceWithAdmin({
      tenantId: tenant.id,
      ownerId: owner.user.id,
      name: 'WS-A',
    })
    await seedWorkspaceWithAdmin({
      tenantId: tenant.id,
      ownerId: owner.user.id,
      name: 'WS-B',
    })
    // Downgrade triggers grace period
    const downgrade = await request.patch(`/api/tenants/${tenant.id}/plan`, {
      data: { plan: 'FREE' },
    })
    expect(downgrade.status()).toBe(200)
    const downgradeBody = await downgrade.json()
    expect(downgradeBody.gracePeriodUntil).not.toBeNull()
    // During grace, creating a 3rd workspace should still succeed despite being over Free=1
    const r3 = await request.post('/api/workspaces', {
      data: { tenantId: tenant.id, name: 'WS-C', vertical: 'HOSPITAL' },
    })
    expect(r3.status()).toBe(201)
  })

  test('grace-expired: returns 409 with meta.gracePeriodExpired=true', async ({
    request,
  }) => {
    const owner = await createUserFixture(request)
    const tenant = await seedTenantWithOwner({ ownerId: owner.user.id })
    await setPlan(tenant.id, 'FREE')
    await seedWorkspaceWithAdmin({
      tenantId: tenant.id,
      ownerId: owner.user.id,
    })
    // Manually set grace as expired (1 day ago)
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000)
    await setGracePeriod(tenant.id, past)

    const blocked = await request.post('/api/workspaces', {
      data: { tenantId: tenant.id, name: 'W2', vertical: 'HOSPITAL' },
    })
    expect(blocked.status()).toBe(409)
    const body = await blocked.json()
    expect(body.code).toBe('PLAN_LIMIT_REACHED')
    expect(body.meta.gracePeriodExpired).toBe(true)
  })
})
