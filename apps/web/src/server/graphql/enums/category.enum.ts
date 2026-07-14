import { builder } from '../builder'

export const CategoryScopeEnum = builder.enumType('CategoryScope', {
  values: ['GLOBAL', 'TENANT', 'WORKSPACE'] as const,
})
