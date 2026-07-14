import { listCategoriesForWorkspace } from '~/server/use-cases'
import { builder } from '../builder'
import { gqlError } from '../errors'
import { CategoryUnion } from '../types/category.type'

/**
 * workspaceCategories — merged GLOBAL + TENANT + WORKSPACE list with override
 * (WORKSPACE > TENANT > GLOBAL by slug). Any active member can query.
 */
builder.queryField('workspaceCategories', (t) =>
  t.field({
    type: [CategoryUnion],
    args: {
      workspaceId: t.arg.id({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const result = await listCategoriesForWorkspace(
        ctx.repos.workspaceRepo,
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.categoryRepo,
        ctx.principal,
        { workspaceId: String(args.workspaceId) },
      )
      if (!result.success) throw gqlError(result.code)
      return result.data
    },
  }),
)
