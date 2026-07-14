import { builder } from '../builder'

export const SpecialtyScopeEnum = builder.enumType('SpecialtyScope', {
  values: ['GLOBAL', 'TENANT', 'WORKSPACE'] as const,
})
