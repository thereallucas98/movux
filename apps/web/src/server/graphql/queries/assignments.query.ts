import { getAssignmentById, listAssignmentsForShift } from '~/server/use-cases'
import { builder } from '../builder'
import { gqlError } from '../errors'
import { AssignmentType } from '../types/assignment.type'

builder.queryField('shiftAssignments', (t) =>
  t.field({
    type: [AssignmentType],
    args: { shiftId: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const result = await listAssignmentsForShift(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.scheduleRepo,
        ctx.repos.shiftRepo,
        ctx.repos.assignmentRepo,
        ctx.repos.userSpecialtyRepo,
        ctx.repos.shiftCompositionRepo,
        ctx.principal,
        { shiftId: String(args.shiftId) },
      )
      if (!result.success) throw gqlError(result.code)
      return result.data
    },
  }),
)

builder.queryField('assignment', (t) =>
  t.field({
    type: AssignmentType,
    args: { id: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const result = await getAssignmentById(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.assignmentRepo,
        ctx.repos.userSpecialtyRepo,
        ctx.repos.shiftCompositionRepo,
        ctx.principal,
        { assignmentId: String(args.id) },
      )
      if (!result.success) throw gqlError(result.code)
      return result.data
    },
  }),
)
