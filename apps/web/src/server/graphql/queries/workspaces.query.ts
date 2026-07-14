import { getWorkspaceById, listWorkspacesForUser } from '~/server/use-cases'
import { builder } from '../builder'
import { gqlError } from '../errors'
import { WorkspaceType } from '../types/workspace.type'

/** myWorkspaces — active workspaces the caller belongs to. */
builder.queryField('myWorkspaces', (t) =>
  t.field({
    type: [WorkspaceType],
    resolve: async (_root, _args, ctx) => {
      const result = await listWorkspacesForUser(
        ctx.repos.workspaceRepo,
        ctx.principal,
        { limit: 100 },
      )
      if (!result.success) throw gqlError(result.code)
      return result.data.data
    },
  }),
)

/** workspace(id) — workspace detail. Any active member can query. */
builder.queryField('workspace', (t) =>
  t.field({
    type: WorkspaceType,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const result = await getWorkspaceById(
        ctx.repos.workspaceRepo,
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.userSpecialtyRepo,
        ctx.principal,
        { workspaceId: String(args.id) },
      )
      if (!result.success) throw gqlError(result.code)
      return result.data
    },
  }),
)
