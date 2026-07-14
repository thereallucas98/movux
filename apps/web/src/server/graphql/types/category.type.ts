import { builder } from '../builder'
import { CategoryScopeEnum } from '../enums/category.enum'
import { WorkspaceVerticalEnum } from '../enums/workspace.enum'

export const GlobalCategoryType = builder.simpleObject('GlobalCategory', {
  fields: (t) => ({
    id: t.id(),
    scope: t.field({ type: CategoryScopeEnum }),
    vertical: t.field({ type: WorkspaceVerticalEnum }),
    slug: t.string(),
    name: t.string(),
    description: t.string({ nullable: true }),
    isActive: t.boolean(),
    createdAt: t.field({ type: 'DateTime' }),
    updatedAt: t.field({ type: 'DateTime' }),
  }),
})

export const TenantCategoryType = builder.simpleObject('TenantCategory', {
  fields: (t) => ({
    id: t.id(),
    scope: t.field({ type: CategoryScopeEnum }),
    tenantId: t.id(),
    slug: t.string(),
    name: t.string(),
    description: t.string({ nullable: true }),
    isActive: t.boolean(),
    createdAt: t.field({ type: 'DateTime' }),
    updatedAt: t.field({ type: 'DateTime' }),
  }),
})

export const WorkspaceCategoryType = builder.simpleObject('WorkspaceCategory', {
  fields: (t) => ({
    id: t.id(),
    scope: t.field({ type: CategoryScopeEnum }),
    tenantId: t.id(),
    workspaceId: t.id(),
    slug: t.string(),
    name: t.string(),
    description: t.string({ nullable: true }),
    isActive: t.boolean(),
    createdAt: t.field({ type: 'DateTime' }),
    updatedAt: t.field({ type: 'DateTime' }),
  }),
})

interface CategoryShape {
  scope: string
  tenantId?: string | null
  workspaceId?: string | null
}

export const CategoryUnion = builder.unionType('CategoryUnion', {
  types: [GlobalCategoryType, TenantCategoryType, WorkspaceCategoryType],
  resolveType: (value) => {
    const v = value as CategoryShape
    if (v.scope === 'GLOBAL') return 'GlobalCategory'
    if (v.scope === 'TENANT') return 'TenantCategory'
    return 'WorkspaceCategory'
  },
})
