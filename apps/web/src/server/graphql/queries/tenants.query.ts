import { getTenantById, listTenantsForUser } from '~/server/use-cases'
import { builder } from '../builder'
import { gqlError } from '../errors'
import { TenantType } from '../types/tenant.type'

/**
 * myTenants — list active tenants the caller is a member of.
 * Limited to first 100 in GraphQL (cursor pagination stays REST-only for now).
 */
builder.queryField('myTenants', (t) =>
  t.field({
    type: [TenantType],
    resolve: async (_root, _args, ctx) => {
      const result = await listTenantsForUser(
        ctx.repos.tenantRepo,
        ctx.principal,
        {
          limit: 100,
        },
      )
      if (!result.success) throw gqlError(result.code)
      return result.data.data
    },
  }),
)

/** tenant(id) — tenant detail. SUPER_ADMIN scope enforced in the use case. */
builder.queryField('tenant', (t) =>
  t.field({
    type: TenantType,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const result = await getTenantById(
        ctx.repos.tenantRepo,
        ctx.repos.tenantMembershipRepo,
        ctx.principal,
        { tenantId: String(args.id) },
      )
      if (!result.success) throw gqlError(result.code)
      return result.data
    },
  }),
)
