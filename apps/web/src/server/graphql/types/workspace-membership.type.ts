import { builder } from '../builder'
import { WorkspaceRoleEnum } from '../enums/workspace.enum'
import { UserType } from './user.type'

export const WorkspaceMembershipType = builder.simpleObject(
  'WorkspaceMembership',
  {
    fields: (t) => ({
      id: t.id(),
      workspaceId: t.id(),
      userId: t.id(),
      role: t.field({ type: WorkspaceRoleEnum }),
      isActive: t.boolean(),
      createdAt: t.field({ type: 'DateTime' }),
      user: t.field({ type: UserType, nullable: true }),
    }),
  },
)
