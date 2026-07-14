import { builder } from '../builder'
import { SpecialtyType } from './specialty.type'

export const WorkspaceSpecialtyAssignmentType = builder.simpleObject(
  'WorkspaceSpecialtyAssignment',
  {
    fields: (t) => ({
      workspaceId: t.id(),
      specialty: t.field({ type: SpecialtyType }),
    }),
  },
)
