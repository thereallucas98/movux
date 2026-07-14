import { builder } from '../builder'
import { WorkspaceVerticalEnum } from '../enums/workspace.enum'

export const WorkspaceType = builder.simpleObject('Workspace', {
  fields: (t) => ({
    id: t.id(),
    tenantId: t.id(),
    name: t.string(),
    timezone: t.string(),
    vertical: t.field({ type: WorkspaceVerticalEnum }),
    isActive: t.boolean(),
    createdAt: t.field({ type: 'DateTime' }),
    updatedAt: t.field({ type: 'DateTime' }),
  }),
})
