import type {
  ListPage,
  TenantRepository,
  TenantRow,
} from '~/server/repositories/tenant.repository'
import type { Principal } from './create-tenant.use-case'

export interface ListTenantsForUserInput {
  cursor?: string | null
  limit?: number
}

export type ListTenantsForUserResult =
  | { success: true; data: ListPage<TenantRow> }
  | { success: false; code: 'UNAUTHENTICATED' }

export async function listTenantsForUser(
  tenantRepo: TenantRepository,
  principal: Principal | null,
  input: ListTenantsForUserInput,
): Promise<ListTenantsForUserResult> {
  if (!principal) {
    return { success: false, code: 'UNAUTHENTICATED' }
  }
  const limit = input.limit ?? 20
  const data = await tenantRepo.listForUser(
    principal.userId,
    input.cursor ?? null,
    limit,
  )
  return { success: true, data }
}
