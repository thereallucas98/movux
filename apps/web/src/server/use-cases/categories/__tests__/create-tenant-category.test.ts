import { describe, expect, it, vi } from 'vitest'

import { createTenantCategory } from '../create-tenant-category.use-case'
import {
  makeAuditRepoMock,
  makeCategoryRepoMock,
  makeMembershipRepoMock,
} from '../../__tests__/helpers'

vi.mock('~/lib/db', () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({}),
    ),
    tenant: {
      findFirst: vi.fn().mockResolvedValue({
        id: 'tenant-1',
        plan: 'CORPORATE',
        gracePeriodUntil: null,
        timezone: 'America/Sao_Paulo',
      }),
    },
  },
}))

const principal = { userId: 'user-1', role: 'USER' }

function authorized() {
  return makeMembershipRepoMock({
    findActive: vi
      .fn()
      .mockResolvedValue({ role: 'SUPER_ADMIN', isActive: true }),
  })
}

describe('createTenantCategory', () => {
  it('returns UNAUTHENTICATED when no principal', async () => {
    const result = await createTenantCategory(
      makeMembershipRepoMock(),
      makeCategoryRepoMock(),
      makeAuditRepoMock(),
      null,
      { tenantId: 't-1', slug: 'uti', name: 'UTI' },
    )
    expect(result).toEqual({ success: false, code: 'UNAUTHENTICATED' })
  })

  it('returns FORBIDDEN when not SuperAdmin', async () => {
    const repo = makeMembershipRepoMock({
      findActive: vi.fn().mockResolvedValue(null),
    })
    const result = await createTenantCategory(
      repo,
      makeCategoryRepoMock(),
      makeAuditRepoMock(),
      principal,
      { tenantId: 't-1', slug: 'uti', name: 'UTI' },
    )
    expect(result).toEqual({ success: false, code: 'FORBIDDEN' })
  })

  it('CORPORATE plan persists and audits', async () => {
    const created = {
      id: 'cat-1',
      scope: 'TENANT' as const,
      vertical: null,
      tenantId: 't-1',
      workspaceId: null,
      slug: 'uti',
      name: 'UTI',
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const categoryRepo = makeCategoryRepoMock({
      create: vi.fn().mockResolvedValue(created),
    })
    const auditRepo = makeAuditRepoMock()
    const result = await createTenantCategory(
      authorized(),
      categoryRepo,
      auditRepo,
      principal,
      { tenantId: 't-1', slug: 'uti', name: 'UTI' },
    )
    if (!result.success) throw new Error('expected success')
    expect(result.data.scope).toBe('TENANT')
    expect(auditRepo.log).toHaveBeenCalled()
  })
})
