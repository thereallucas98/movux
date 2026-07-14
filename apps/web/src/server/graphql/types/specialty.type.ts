import { builder } from '../builder'
import { SpecialtyScopeEnum } from '../enums/specialty.enum'
import { WorkspaceVerticalEnum } from '../enums/workspace.enum'

export const SpecialtyType = builder.simpleObject('Specialty', {
  fields: (t) => ({
    id: t.id(),
    scope: t.field({ type: SpecialtyScopeEnum }),
    vertical: t.field({ type: WorkspaceVerticalEnum, nullable: true }),
    tenantId: t.id({ nullable: true }),
    workspaceId: t.id({ nullable: true }),
    slug: t.string(),
    name: t.string(),
    description: t.string({ nullable: true }),
    isActive: t.boolean(),
    createdAt: t.field({ type: 'DateTime' }),
    updatedAt: t.field({ type: 'DateTime' }),
    source: t.field({ type: SpecialtyScopeEnum }),
  }),
})
