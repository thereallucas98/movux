import { assignUsersToShift, unassignUser } from '~/server/use-cases'
import { builder } from '../builder'
import { gqlError } from '../errors'
import { AssignmentType } from '../types/assignment.type'

builder.mutationField('assignUsersToShift', (t) =>
  t.field({
    type: [AssignmentType],
    args: {
      workspaceId: t.arg.id({ required: true }),
      shiftId: t.arg.id({ required: true }),
      userIds: t.arg({ type: ['ID'], required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const result = await assignUsersToShift(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.scheduleRepo,
        ctx.repos.shiftRepo,
        ctx.repos.assignmentRepo,
        ctx.repos.userSpecialtyRepo,
        ctx.repos.shiftCompositionRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        {
          workspaceId: String(args.workspaceId),
          shiftId: String(args.shiftId),
          userIds: args.userIds.map(String),
        },
      )
      if (!result.success) {
        if (result.code === 'SHIFT_OVERLAP_CONFLICT') {
          throw gqlError(result.code, undefined, {
            conflicts: result.conflicts,
            alternatives: result.alternatives,
          })
        }
        throw gqlError(result.code)
      }
      return result.data
    },
  }),
)

builder.mutationField('unassignUser', (t) =>
  t.boolean({
    args: { assignmentId: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const result = await unassignUser(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.assignmentRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        { assignmentId: String(args.assignmentId) },
      )
      if (!result.success) throw gqlError(result.code)
      return true
    },
  }),
)
