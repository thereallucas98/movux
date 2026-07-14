import { listSpecialtiesForWorkspace } from '~/server/use-cases'
import { builder } from '../builder'
import { gqlError } from '../errors'
import { SpecialtyType } from '../types/specialty.type'

/**
 * workspaceSpecialties — merged GLOBAL + TENANT + WORKSPACE list with override
 * (WORKSPACE > TENANT > GLOBAL by slug). Any active member can query.
 */
builder.queryField('workspaceSpecialties', (t) =>
  t.field({
    type: [SpecialtyType],
    args: {
      workspaceId: t.arg.id({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const result = await listSpecialtiesForWorkspace(
        ctx.repos.workspaceRepo,
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.specialtyRepo,
        ctx.principal,
        { workspaceId: String(args.workspaceId) },
      )
      if (!result.success) throw gqlError(result.code)
      return result.data
    },
  }),
)
