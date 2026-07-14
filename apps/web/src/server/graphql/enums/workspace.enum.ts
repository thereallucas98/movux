import { builder } from '../builder'

export const WorkspaceRoleEnum = builder.enumType('WorkspaceRole', {
  values: ['ADMIN', 'COORDENADOR', 'COLABORADOR'] as const,
})

export const WorkspaceVerticalEnum = builder.enumType('WorkspaceVertical', {
  values: ['HOSPITAL', 'CLINIC', 'GYM', 'OTHER'] as const,
})
