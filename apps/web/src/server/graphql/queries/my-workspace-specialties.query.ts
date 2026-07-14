import { GraphQLError } from 'graphql'

import { builder } from '../builder'
import { WorkspaceSpecialtyAssignmentType } from '../types/workspace-specialty-assignment.type'

/**
 * myWorkspaceSpecialties — list of { workspaceId, specialty } for each
 * workspace the caller has an active specialty in.
 */
builder.queryField('myWorkspaceSpecialties', (t) =>
  t.field({
    type: [WorkspaceSpecialtyAssignmentType],
    resolve: async (_root, _args, ctx) => {
      if (!ctx.principal) {
        throw new GraphQLError('Unauthenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      const rows = await ctx.repos.userSpecialtyRepo.listByUser(
        ctx.principal.userId,
      )
      return rows.map((r) => ({
        workspaceId: r.workspaceId,
        specialty: {
          id: r.specialty.id,
          scope: r.specialty.scope,
          vertical: r.specialty.vertical,
          tenantId: null,
          workspaceId: null,
          slug: r.specialty.slug,
          name: r.specialty.name,
          description: r.specialty.description,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          source: r.specialty.scope,
        },
      }))
    },
  }),
)
